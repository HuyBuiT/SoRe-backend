// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// Interface for ReputationTracker
interface IReputationTracker {
    function trackBookingCreated(address buyer, uint256 bookingId) external;
    function trackBookingAccepted(address kol, uint256 bookingId) external;
    function trackBookingCompleted(address kol, address buyer, uint256 bookingId, uint256 rating) external;
}

/**
 * @title TimeBooking
 * @dev Smart contract for KOL time booking with NFT tickets
 * @author SoRe Team
 */
contract TimeBooking is ERC721URIStorage, ReentrancyGuard, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _bookingIds;
    Counters.Counter private _tokenIds;
    
    // Booking status enum
    enum BookingStatus {
        Pending,      // 0 - Waiting for KOL response
        Accepted,     // 1 - KOL accepted, session in progress
        Rejected,     // 2 - KOL rejected, refunded
        Completed,    // 3 - Session completed successfully
        Cancelled,    // 4 - Buyer cancelled
        Disputed,     // 5 - Buyer reported issue
        Expired       // 6 - Auto-expired after 5 days
    }
    
    // Booking structure
    struct Booking {
        uint256 bookingId;
        uint256 tokenId;        // NFT token ID for this booking
        address buyer;
        address kol;
        uint256 pricePerSlot;
        uint256 totalSlots;
        uint256 totalAmount;
        uint256 fromTime;       // Unix timestamp
        uint256 toTime;         // Unix timestamp
        string reason;
        BookingStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 sessionEndTime; // When session actually ends for dispute period
        bool disputeReported;
        uint256 rating; // Buyer's rating (0-50, representing 0-5 stars scaled by 10)
        bool ratingSubmitted;
    }
    
    // Mappings
    mapping(uint256 => Booking) public bookings;
    mapping(address => uint256[]) public buyerBookings;
    mapping(address => uint256[]) public kolBookings;
    mapping(uint256 => string) private _tokenURIs;
    
    // Constants
    uint256 public constant EXPIRY_PERIOD = 5 days;
    uint256 public constant DISPUTE_PERIOD = 1 days;
    uint256 public constant MIN_SLOT_DURATION = 30 minutes;
    
    // Platform fee (e.g., 2.5%)
    uint256 public platformFeePercent = 250; // 2.5% * 100
    address public feeRecipient;
    
    // Reputation tracking
    IReputationTracker public reputationTracker;
    
    // Events
    event BookingCreated(
        uint256 indexed bookingId,
        uint256 indexed tokenId,
        address indexed buyer,
        address kol,
        uint256 totalAmount,
        uint256 fromTime,
        uint256 toTime
    );
    
    event BookingStatusChanged(
        uint256 indexed bookingId,
        BookingStatus oldStatus,
        BookingStatus newStatus,
        address changedBy
    );
    
    event PaymentReleased(
        uint256 indexed bookingId,
        address indexed recipient,
        uint256 amount
    );
    
    event DisputeReported(
        uint256 indexed bookingId,
        address indexed reporter,
        string reason
    );
    
    event RatingSubmitted(
        uint256 indexed bookingId,
        address indexed buyer,
        uint256 rating
    );
    
    constructor(
        string memory name,
        string memory symbol,
        address _feeRecipient
    ) ERC721(name, symbol) {
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Set the reputation tracker contract (only owner)
     */
    function setReputationTracker(address _reputationTracker) external onlyOwner {
        reputationTracker = IReputationTracker(_reputationTracker);
    }
    
    /**
     * @dev Create a new booking and mint NFT ticket
     */
    function createBooking(
        address _kol,
        uint256 _pricePerSlot,
        uint256 _totalSlots,
        uint256 _fromTime,
        uint256 _toTime,
        string memory _reason,
        string memory _tokenURI
    ) external payable nonReentrant {
        require(_kol != address(0), "Invalid KOL address");
        require(_kol != msg.sender, "Cannot book yourself");
        require(_totalSlots > 0, "Invalid slot count");
        require(_fromTime > block.timestamp, "Invalid start time");
        require(_toTime > _fromTime, "Invalid time range");
        require((_toTime - _fromTime) >= (MIN_SLOT_DURATION * _totalSlots), "Duration too short");
        
        uint256 totalAmount = _pricePerSlot * _totalSlots;
        require(msg.value == totalAmount, "Incorrect payment amount");
        
        // Create booking
        _bookingIds.increment();
        uint256 newBookingId = _bookingIds.current();
        
        // Mint NFT ticket
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, _tokenURI);
        
        // Store booking data
        bookings[newBookingId] = Booking({
            bookingId: newBookingId,
            tokenId: newTokenId,
            buyer: msg.sender,
            kol: _kol,
            pricePerSlot: _pricePerSlot,
            totalSlots: _totalSlots,
            totalAmount: totalAmount,
            fromTime: _fromTime,
            toTime: _toTime,
            reason: _reason,
            status: BookingStatus.Pending,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            sessionEndTime: 0,
            disputeReported: false,
            rating: 0,
            ratingSubmitted: false
        });
        
        // Update mappings
        buyerBookings[msg.sender].push(newBookingId);
        kolBookings[_kol].push(newBookingId);
        
        emit BookingCreated(newBookingId, newTokenId, msg.sender, _kol, totalAmount, _fromTime, _toTime);
        
        // Track reputation for booking creation
        if (address(reputationTracker) != address(0)) {
            reputationTracker.trackBookingCreated(msg.sender, newBookingId);
        }
    }
    
    /**
     * @dev KOL accepts a booking
     */
    function acceptBooking(uint256 _bookingId) external {
        Booking storage booking = bookings[_bookingId];
        require(booking.kol == msg.sender, "Only KOL can accept");
        require(booking.status == BookingStatus.Pending, "Invalid status");
        require(block.timestamp < booking.createdAt + EXPIRY_PERIOD, "Booking expired");
        
        BookingStatus oldStatus = booking.status;
        booking.status = BookingStatus.Accepted;
        booking.updatedAt = block.timestamp;
        
        emit BookingStatusChanged(_bookingId, oldStatus, BookingStatus.Accepted, msg.sender);
        
        // Track reputation for booking acceptance
        if (address(reputationTracker) != address(0)) {
            reputationTracker.trackBookingAccepted(msg.sender, _bookingId);
        }
    }
    
    /**
     * @dev KOL rejects a booking with automatic refund
     */
    function rejectBooking(uint256 _bookingId) external nonReentrant {
        Booking storage booking = bookings[_bookingId];
        require(booking.kol == msg.sender, "Only KOL can reject");
        require(booking.status == BookingStatus.Pending, "Invalid status");
        
        BookingStatus oldStatus = booking.status;
        booking.status = BookingStatus.Rejected;
        booking.updatedAt = block.timestamp;
        
        // Refund buyer
        _refundBuyer(booking);
        
        emit BookingStatusChanged(_bookingId, oldStatus, BookingStatus.Rejected, msg.sender);
    }
    
    /**
     * @dev Buyer cancels a pending booking
     */
    function cancelBooking(uint256 _bookingId) external nonReentrant {
        Booking storage booking = bookings[_bookingId];
        require(booking.buyer == msg.sender, "Only buyer can cancel");
        require(booking.status == BookingStatus.Pending, "Invalid status");
        
        BookingStatus oldStatus = booking.status;
        booking.status = BookingStatus.Cancelled;
        booking.updatedAt = block.timestamp;
        
        // Refund buyer
        _refundBuyer(booking);
        
        emit BookingStatusChanged(_bookingId, oldStatus, BookingStatus.Cancelled, msg.sender);
    }
    
    /**
     * @dev Mark session as completed (called by KOL after session ends)
     */
    function completeSession(uint256 _bookingId) external {
        Booking storage booking = bookings[_bookingId];
        require(booking.kol == msg.sender, "Only KOL can complete");
        require(booking.status == BookingStatus.Accepted, "Invalid status");
        require(block.timestamp >= booking.toTime, "Session not ended yet");
        
        booking.sessionEndTime = block.timestamp;
        booking.updatedAt = block.timestamp;
        
        // Status remains Accepted - will auto-complete after dispute period
    }
    
    /**
     * @dev Buyer reports a dispute
     */
    function reportDispute(uint256 _bookingId, string memory _reason) external {
        Booking storage booking = bookings[_bookingId];
        require(booking.buyer == msg.sender, "Only buyer can report");
        require(booking.status == BookingStatus.Accepted, "Invalid status");
        require(booking.sessionEndTime > 0, "Session not completed");
        require(block.timestamp <= booking.sessionEndTime + DISPUTE_PERIOD, "Dispute period expired");
        require(!booking.disputeReported, "Already reported");
        
        booking.disputeReported = true;
        booking.status = BookingStatus.Disputed;
        booking.updatedAt = block.timestamp;
        
        emit DisputeReported(_bookingId, msg.sender, _reason);
        emit BookingStatusChanged(_bookingId, BookingStatus.Accepted, BookingStatus.Disputed, msg.sender);
    }
    
    /**
     * @dev Buyer rates the completed session
     */
    function rateSession(uint256 _bookingId, uint256 _rating) external {
        Booking storage booking = bookings[_bookingId];
        require(booking.buyer == msg.sender, "Only buyer can rate");
        require(booking.status == BookingStatus.Accepted || booking.status == BookingStatus.Completed, "Invalid status");
        require(booking.sessionEndTime > 0, "Session not completed");
        require(_rating >= 0 && _rating <= 50, "Rating must be 0-50 (0-5 stars * 10)");
        require(!booking.ratingSubmitted, "Rating already submitted");
        
        booking.rating = _rating;
        booking.ratingSubmitted = true;
        booking.updatedAt = block.timestamp;
        
        emit RatingSubmitted(_bookingId, msg.sender, _rating);
    }
    
    /**
     * @dev Release payment to KOL (auto-called or manually by platform)
     */
    function releasePayment(uint256 _bookingId) external nonReentrant {
        Booking storage booking = bookings[_bookingId];
        require(
            booking.status == BookingStatus.Accepted && 
            booking.sessionEndTime > 0 && 
            block.timestamp > booking.sessionEndTime + DISPUTE_PERIOD &&
            !booking.disputeReported,
            "Cannot release payment"
        );
        
        BookingStatus oldStatus = booking.status;
        booking.status = BookingStatus.Completed;
        booking.updatedAt = block.timestamp;
        
        // Calculate platform fee
        uint256 platformFee = (booking.totalAmount * platformFeePercent) / 10000;
        uint256 kolPayment = booking.totalAmount - platformFee;
        
        // Transfer payments
        if (platformFee > 0) {
            payable(feeRecipient).transfer(platformFee);
        }
        payable(booking.kol).transfer(kolPayment);
        
        emit PaymentReleased(_bookingId, booking.kol, kolPayment);
        emit BookingStatusChanged(_bookingId, oldStatus, BookingStatus.Completed, address(this));
        
        // Track reputation for booking completion
        if (address(reputationTracker) != address(0)) {
            uint256 rating = booking.ratingSubmitted ? booking.rating : 25; // Default 2.5 stars if no rating
            reputationTracker.trackBookingCompleted(booking.kol, booking.buyer, _bookingId, rating);
        }
    }
    
    /**
     * @dev Handle expired bookings (auto-refund after 5 days)
     */
    function handleExpiredBooking(uint256 _bookingId) external nonReentrant {
        Booking storage booking = bookings[_bookingId];
        require(booking.status == BookingStatus.Pending, "Invalid status");
        require(block.timestamp >= booking.createdAt + EXPIRY_PERIOD, "Not expired yet");
        
        BookingStatus oldStatus = booking.status;
        booking.status = BookingStatus.Expired;
        booking.updatedAt = block.timestamp;
        
        // Refund buyer
        _refundBuyer(booking);
        
        emit BookingStatusChanged(_bookingId, oldStatus, BookingStatus.Expired, msg.sender);
    }
    
    /**
     * @dev Internal function to refund buyer
     */
    function _refundBuyer(Booking memory booking) internal {
        payable(booking.buyer).transfer(booking.totalAmount);
        emit PaymentReleased(booking.bookingId, booking.buyer, booking.totalAmount);
    }
    
    /**
     * @dev Get booking details
     */
    function getBooking(uint256 _bookingId) external view returns (Booking memory) {
        return bookings[_bookingId];
    }
    
    /**
     * @dev Get buyer's booking IDs
     */
    function getBuyerBookings(address _buyer) external view returns (uint256[] memory) {
        return buyerBookings[_buyer];
    }
    
    /**
     * @dev Get KOL's booking IDs
     */
    function getKOLBookings(address _kol) external view returns (uint256[] memory) {
        return kolBookings[_kol];
    }
    
    /**
     * @dev Check if booking can be auto-completed
     */
    function canAutoComplete(uint256 _bookingId) external view returns (bool) {
        Booking memory booking = bookings[_bookingId];
        return booking.status == BookingStatus.Accepted &&
               booking.sessionEndTime > 0 &&
               block.timestamp > booking.sessionEndTime + DISPUTE_PERIOD &&
               !booking.disputeReported;
    }
    
    /**
     * @dev Set platform fee (only owner)
     */
    function setPlatformFee(uint256 _feePercent) external onlyOwner {
        require(_feePercent <= 1000, "Fee too high"); // Max 10%
        platformFeePercent = _feePercent;
    }
    
    /**
     * @dev Set fee recipient (only owner)
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Override tokenURI to return custom URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return super.tokenURI(tokenId);
    }
    
    /**
     * @dev Get total number of bookings
     */
    function getTotalBookings() external view returns (uint256) {
        return _bookingIds.current();
    }
    
    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}