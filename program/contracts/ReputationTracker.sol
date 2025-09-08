// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReputationNFT.sol";
import "./TimeBooking.sol";

/**
 * @title ReputationTracker
 * @dev Tracks on-chain activities and updates reputation scores in real-time
 * Monitors transactions, bookings, and interactions to calculate reputation points
 */
contract ReputationTracker is ReentrancyGuard, Ownable {
    
    ReputationNFT public reputationNFT;
    TimeBooking public timeBooking;
    
    // Activity tracking
    struct UserActivity {
        uint256 totalTransactions;
        uint256 totalVolumeTraded;
        uint256 totalBookingsAsKOL;
        uint256 totalBookingsAsBuyer;
        uint256 totalBookingsCompleted;
        uint256 totalRatingSum;
        uint256 totalRatingCount;
        uint256 lastActivityTime;
        mapping(address => bool) hasInteractedWith; // Prevent same-user spam
    }
    
    // Point configuration
    struct PointConfig {
        uint256 transactionBasePoints;     // Base points per transaction
        uint256 volumeMultiplier;         // Points per STT traded (scaled by 1e18)
        uint256 bookingCreatedPoints;     // Points for creating a booking
        uint256 bookingAcceptedPoints;    // Points for accepting a booking (KOL)
        uint256 bookingCompletedPoints;   // Points for completing a booking
        uint256 highRatingBonus;         // Bonus points for ratings >= 4.5
        uint256 diversityBonus;          // Points for interacting with new users
        uint256 activityStreakBonus;     // Points for consistent activity
    }
    
    // Social engagement tracking (for future integration)
    struct SocialMetrics {
        uint256 xFollowers;
        uint256 xEngagement;
        uint256 discordActivity;
        uint256 githubContributions;
        bool xConnected;
        bool discordConnected;
        bool githubConnected;
    }
    
    // State variables
    mapping(address => UserActivity) public userActivities;
    mapping(address => SocialMetrics) public socialMetrics;
    mapping(address => uint256) public userTokenHoldings;
    mapping(address => bool) public isRegisteredKOL;
    
    PointConfig public pointConfig;
    
    // Activity tracking
    mapping(bytes32 => bool) public processedTransactions;
    
    // Events
    event ActivityTracked(
        address indexed user,
        string activityType,
        uint256 points,
        uint256 newTotalScore
    );
    
    event UserRegistered(address indexed user, uint256 tokenId);
    event KOLStatusUpdated(address indexed user, bool isKOL);
    
    constructor(
        address _reputationNFT,
        address _timeBooking
    ) {
        reputationNFT = ReputationNFT(_reputationNFT);
        timeBooking = TimeBooking(_timeBooking);
        
        // Initialize default point configuration
        pointConfig = PointConfig({
            transactionBasePoints: 10,
            volumeMultiplier: 1, // 1 point per STT
            bookingCreatedPoints: 50,
            bookingAcceptedPoints: 75,
            bookingCompletedPoints: 100,
            highRatingBonus: 25,
            diversityBonus: 5,
            activityStreakBonus: 10
        });
    }
    
    /**
     * @dev Register user and mint reputation NFT
     */
    function registerUser() external nonReentrant {
        require(reputationNFT.userToTokenId(msg.sender) == 0, "User already registered");
        
        uint256 tokenId = reputationNFT.mintReputationNFT(msg.sender);
        
        // Initialize activity tracking
        userActivities[msg.sender].lastActivityTime = block.timestamp;
        
        emit UserRegistered(msg.sender, tokenId);
    }
    
    /**
     * @dev Track transaction activity (called by monitoring service or hooks)
     */
    function trackTransaction(
        address user,
        uint256 value,
        address interactedWith,
        bytes32 txHash
    ) external nonReentrant {
        require(!processedTransactions[txHash], "Transaction already processed");
        processedTransactions[txHash] = true;
        
        UserActivity storage activity = userActivities[user];
        
        // Track basic transaction
        activity.totalTransactions++;
        activity.totalVolumeTraded += value;
        activity.lastActivityTime = block.timestamp;
        
        uint256 points = pointConfig.transactionBasePoints;
        
        // Add volume-based points
        points += (value * pointConfig.volumeMultiplier) / 1e18;
        
        // Diversity bonus for interacting with new addresses
        if (interactedWith != address(0) && !activity.hasInteractedWith[interactedWith]) {
            points += pointConfig.diversityBonus;
            activity.hasInteractedWith[interactedWith] = true;
        }
        
        _updateUserReputation(user, "transaction", points);
        
        emit ActivityTracked(user, "transaction", points, _calculateTotalScore(user));
    }
    
    /**
     * @dev Track booking creation
     */
    function trackBookingCreated(address buyer, uint256 bookingId) external {
        require(msg.sender == address(timeBooking), "Only TimeBooking contract");
        
        UserActivity storage activity = userActivities[buyer];
        activity.totalBookingsAsBuyer++;
        activity.lastActivityTime = block.timestamp;
        
        uint256 points = pointConfig.bookingCreatedPoints;
        _updateUserReputation(buyer, "booking_created", points);
        
        emit ActivityTracked(buyer, "booking_created", points, _calculateTotalScore(buyer));
    }
    
    /**
     * @dev Track booking acceptance by KOL
     */
    function trackBookingAccepted(address kol, uint256 bookingId) external {
        require(msg.sender == address(timeBooking), "Only TimeBooking contract");
        
        UserActivity storage activity = userActivities[kol];
        activity.totalBookingsAsKOL++;
        activity.lastActivityTime = block.timestamp;
        
        uint256 points = pointConfig.bookingAcceptedPoints;
        _updateUserReputation(kol, "booking_accepted", points);
        
        // Update KOL status if not already set
        if (!isRegisteredKOL[kol]) {
            isRegisteredKOL[kol] = true;
            reputationNFT.setKOLStatus(kol, true);
            emit KOLStatusUpdated(kol, true);
        }
        
        emit ActivityTracked(kol, "booking_accepted", points, _calculateTotalScore(kol));
    }
    
    /**
     * @dev Track booking completion and rating
     */
    function trackBookingCompleted(
        address kol,
        address buyer,
        uint256 bookingId,
        uint256 rating
    ) external {
        require(msg.sender == address(timeBooking), "Only TimeBooking contract");
        
        // Update KOL activity
        UserActivity storage kolActivity = userActivities[kol];
        kolActivity.totalBookingsCompleted++;
        kolActivity.totalRatingSum += rating;
        kolActivity.totalRatingCount++;
        kolActivity.lastActivityTime = block.timestamp;
        
        // Update buyer activity
        UserActivity storage buyerActivity = userActivities[buyer];
        buyerActivity.totalBookingsCompleted++;
        buyerActivity.lastActivityTime = block.timestamp;
        
        uint256 kolPoints = pointConfig.bookingCompletedPoints;
        uint256 buyerPoints = pointConfig.bookingCompletedPoints / 2; // Buyers get half points
        
        // High rating bonus for KOL
        if (rating >= 45) { // 4.5 stars (out of 5, scaled by 10)
            kolPoints += pointConfig.highRatingBonus;
        }
        
        _updateUserReputation(kol, "booking_completed", kolPoints);
        _updateUserReputation(buyer, "booking_participated", buyerPoints);
        
        emit ActivityTracked(kol, "booking_completed", kolPoints, _calculateTotalScore(kol));
        emit ActivityTracked(buyer, "booking_participated", buyerPoints, _calculateTotalScore(buyer));
    }
    
    /**
     * @dev Update token holding score (called periodically or on balance changes)
     */
    function updateTokenHoldings(address user, uint256 balance) external {
        require(msg.sender == owner() || msg.sender == user, "Unauthorized");
        
        userTokenHoldings[user] = balance;
        _updateUserReputation(user, "token_holding_update", 0);
        
        emit ActivityTracked(user, "token_holding_update", 0, _calculateTotalScore(user));
    }
    
    /**
     * @dev Update social metrics (for users who connect social accounts)
     */
    function updateSocialMetrics(
        address user,
        uint256 xFollowers,
        uint256 xEngagement,
        uint256 discordActivity,
        uint256 githubContributions,
        bool xConnected,
        bool discordConnected,
        bool githubConnected
    ) external {
        require(msg.sender == owner() || msg.sender == user, "Unauthorized");
        
        socialMetrics[user] = SocialMetrics({
            xFollowers: xFollowers,
            xEngagement: xEngagement,
            discordActivity: discordActivity,
            githubContributions: githubContributions,
            xConnected: xConnected,
            discordConnected: discordConnected,
            githubConnected: githubConnected
        });
        
        _updateUserReputation(user, "social_update", 0);
        
        emit ActivityTracked(user, "social_update", 0, _calculateTotalScore(user));
    }
    
    /**
     * @dev Calculate on-chain activity score
     */
    function calculateOnchainScore(address user) public view returns (uint256) {
        UserActivity storage activity = userActivities[user];
        
        uint256 score = 0;
        
        // Base transaction points
        score += activity.totalTransactions * pointConfig.transactionBasePoints;
        
        // Volume-based points
        score += (activity.totalVolumeTraded * pointConfig.volumeMultiplier) / 1e18;
        
        // Booking activity points
        score += activity.totalBookingsAsBuyer * pointConfig.bookingCreatedPoints;
        score += activity.totalBookingsAsKOL * pointConfig.bookingAcceptedPoints;
        score += activity.totalBookingsCompleted * pointConfig.bookingCompletedPoints;
        
        // Rating bonus for KOLs
        if (activity.totalRatingCount > 0) {
            uint256 avgRating = activity.totalRatingSum / activity.totalRatingCount;
            if (avgRating >= 45) { // 4.5+ average rating
                score += pointConfig.highRatingBonus * activity.totalBookingsCompleted;
            }
        }
        
        return score;
    }
    
    /**
     * @dev Calculate social engagement score
     */
    function calculateSocialScore(address user) public view returns (uint256) {
        SocialMetrics storage social = socialMetrics[user];
        
        uint256 score = 0;
        
        // X (Twitter) metrics
        if (social.xConnected) {
            score += social.xFollowers / 10; // 1 point per 10 followers
            score += social.xEngagement / 5;  // 1 point per 5 engagements
        }
        
        // Discord activity
        if (social.discordConnected) {
            score += social.discordActivity;
        }
        
        // GitHub contributions
        if (social.githubConnected) {
            score += social.githubContributions * 2; // 2 points per contribution
        }
        
        // Connection bonus
        uint256 connections = 0;
        if (social.xConnected) connections++;
        if (social.discordConnected) connections++;
        if (social.githubConnected) connections++;
        
        score += connections * 100; // 100 points per connected platform
        
        return score;
    }
    
    /**
     * @dev Calculate token holding score (10% weight)
     */
    function calculateTokenHoldingScore(address user) public view returns (uint256) {
        uint256 balance = userTokenHoldings[user];
        
        // 1 point per 100 STT held (scaled appropriately)
        return balance / (100 * 1e18);
    }
    
    /**
     * @dev Calculate total reputation score
     */
    function _calculateTotalScore(address user) internal view returns (uint256) {
        uint256 onchainScore = calculateOnchainScore(user);
        uint256 socialScore = calculateSocialScore(user);
        uint256 tokenScore = calculateTokenHoldingScore(user);
        
        // Weighted: 50% onchain, 40% social, 10% token holding
        return (onchainScore * 50 + socialScore * 40 + tokenScore * 10) / 100;
    }
    
    /**
     * @dev Update user's reputation NFT with latest scores
     */
    function _updateUserReputation(address user, string memory activityType, uint256 pointsEarned) internal {
        uint256 tokenId = reputationNFT.userToTokenId(user);
        if (tokenId == 0) return; // User not registered
        
        UserActivity storage activity = userActivities[user];
        
        uint256 onchainScore = calculateOnchainScore(user);
        uint256 socialScore = calculateSocialScore(user);
        uint256 tokenHoldingScore = calculateTokenHoldingScore(user);
        
        uint256 averageRating = activity.totalRatingCount > 0 
            ? activity.totalRatingSum / activity.totalRatingCount 
            : 0;
        
        reputationNFT.updateReputation(
            user,
            onchainScore,
            socialScore,
            tokenHoldingScore,
            activity.totalTransactions,
            activity.totalVolumeTraded,
            activity.totalBookingsCompleted,
            averageRating
        );
    }
    
    /**
     * @dev Get comprehensive user stats
     */
    function getUserStats(address user) external view returns (
        uint256 totalScore,
        uint256 onchainScore,
        uint256 socialScore,
        uint256 tokenHoldingScore,
        uint256 totalTransactions,
        uint256 totalVolumeTraded,
        uint256 totalBookingsCompleted,
        bool isKOL
    ) {
        UserActivity storage activity = userActivities[user];
        return (
            _calculateTotalScore(user),
            calculateOnchainScore(user),
            calculateSocialScore(user),
            calculateTokenHoldingScore(user),
            activity.totalTransactions,
            activity.totalVolumeTraded,
            activity.totalBookingsCompleted,
            isRegisteredKOL[user]
        );
    }
    
    /**
     * @dev Admin functions
     */
    function updatePointConfig(PointConfig memory newConfig) external onlyOwner {
        pointConfig = newConfig;
    }
    
    function setTimeBookingContract(address newTimeBooking) external onlyOwner {
        timeBooking = TimeBooking(newTimeBooking);
    }
    
    function setReputationNFTContract(address newReputationNFT) external onlyOwner {
        reputationNFT = ReputationNFT(newReputationNFT);
    }
    
    /**
     * @dev Bulk update user reputations (for maintenance)
     */
    function bulkUpdateReputations(address[] calldata users) external onlyOwner {
        for (uint256 i = 0; i < users.length; i++) {
            _updateUserReputation(users[i], "bulk_update", 0);
        }
    }
}