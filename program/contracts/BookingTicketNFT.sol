// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./TimeBooking.sol";

/**
 * @title BookingTicketNFT
 * @dev Helper contract for generating NFT metadata for booking tickets
 */
contract BookingTicketNFT {
    
    struct TicketMetadata {
        string name;
        string description;
        string image;
        address buyer;
        address kol;
        uint256 fromTime;
        uint256 toTime;
        uint256 totalAmount;
        string reason;
        uint8 status;
    }
    
    /**
     * @dev Generate NFT metadata for a booking ticket
     */
    function generateTicketMetadata(
        address _buyer,
        address _kol,
        uint256 _fromTime,
        uint256 _toTime,
        uint256 _totalAmount,
        string memory _reason,
        uint8 _status
    ) external pure returns (TicketMetadata memory) {
        
        string memory statusText = getStatusText(_status);
        
        return TicketMetadata({
            name: string(abi.encodePacked("SoRe Booking Ticket #", _toString(_fromTime))),
            description: string(abi.encodePacked(
                "Time booking session ticket on SoRe platform. ",
                "Session: ", _reason, ". ",
                "Status: ", statusText
            )),
            image: "https://ipfs.io/ipfs/QmYourTicketImageHash", // Replace with actual IPFS hash
            buyer: _buyer,
            kol: _kol,
            fromTime: _fromTime,
            toTime: _toTime,
            totalAmount: _totalAmount,
            reason: _reason,
            status: _status
        });
    }
    
    /**
     * @dev Get status text from enum value
     */
    function getStatusText(uint8 _status) public pure returns (string memory) {
        if (_status == 0) return "Pending";
        if (_status == 1) return "Accepted";
        if (_status == 2) return "Rejected";
        if (_status == 3) return "Completed";
        if (_status == 4) return "Cancelled";
        if (_status == 5) return "Disputed";
        if (_status == 6) return "Expired";
        return "Unknown";
    }
    
    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}