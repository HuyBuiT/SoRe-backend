// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title ReputationNFT
 * @dev Soulbound NFT (SBT) that represents user reputation in the SoRe ecosystem
 * NFT metadata dynamically updates based on user's on-chain activities and reputation score
 */
contract ReputationNFT is ERC721, ERC721URIStorage, ReentrancyGuard, Ownable {
    
    // Override required by Solidity
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private _tokenIdCounter;

    // Reputation levels
    enum ReputationLevel { Bronze, Silver, Gold, Diamond }

    // Reputation data structure
    struct ReputationData {
        uint256 totalScore;
        uint256 onchainScore;
        uint256 socialScore;
        uint256 tokenHoldingScore;
        ReputationLevel level;
        uint256 transactionCount;
        uint256 volumeTraded;
        uint256 bookingsCompleted;
        uint256 averageRating;
        uint256 lastUpdated;
        bool isKOL;
    }

    // Thresholds for reputation levels (can be configured)
    struct LevelThresholds {
        uint256 bronze;    // 0-999
        uint256 silver;    // 1000-2999
        uint256 gold;      // 3000-4999
        uint256 diamond;   // 5000+
    }

    // State variables
    mapping(address => uint256) public userToTokenId;
    mapping(uint256 => ReputationData) public reputationData;
    mapping(address => bool) public authorizedUpdaters;
    
    LevelThresholds public levelThresholds;
    
    // Events
    event ReputationUpdated(
        uint256 indexed tokenId,
        address indexed user,
        uint256 newScore,
        ReputationLevel newLevel
    );
    
    event SoulboundTransferAttempt(
        uint256 indexed tokenId,
        address from,
        address to
    );

    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) {
        // Initialize level thresholds
        levelThresholds = LevelThresholds({
            bronze: 0,
            silver: 1000,
            gold: 3000,
            diamond: 5000
        });
    }

    /**
     * @dev Mint a soulbound reputation NFT for a user
     */
    function mintReputationNFT(address to) external nonReentrant returns (uint256) {
        require(userToTokenId[to] == 0, "User already has reputation NFT");
        
        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();
        
        // Initialize reputation data
        reputationData[tokenId] = ReputationData({
            totalScore: 0,
            onchainScore: 0,
            socialScore: 0,
            tokenHoldingScore: 0,
            level: ReputationLevel.Bronze,
            transactionCount: 0,
            volumeTraded: 0,
            bookingsCompleted: 0,
            averageRating: 0,
            lastUpdated: block.timestamp,
            isKOL: false
        });
        
        userToTokenId[to] = tokenId;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _generateTokenURI(tokenId));
        
        emit ReputationUpdated(tokenId, to, 0, ReputationLevel.Bronze);
        
        return tokenId;
    }

    /**
     * @dev Update reputation data for a user (only authorized updaters)
     */
    function updateReputation(
        address user,
        uint256 onchainScore,
        uint256 socialScore,
        uint256 tokenHoldingScore,
        uint256 transactionCount,
        uint256 volumeTraded,
        uint256 bookingsCompleted,
        uint256 averageRating
    ) external {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized to update");
        
        uint256 tokenId = userToTokenId[user];
        require(tokenId != 0, "User doesn't have reputation NFT");
        
        ReputationData storage data = reputationData[tokenId];
        
        // Update individual scores
        data.onchainScore = onchainScore;
        data.socialScore = socialScore;
        data.tokenHoldingScore = tokenHoldingScore;
        data.transactionCount = transactionCount;
        data.volumeTraded = volumeTraded;
        data.bookingsCompleted = bookingsCompleted;
        data.averageRating = averageRating;
        
        // Calculate total score with weights (50% onchain, 40% social, 10% token holding)
        data.totalScore = (onchainScore * 50 + socialScore * 40 + tokenHoldingScore * 10) / 100;
        
        // Determine new level
        ReputationLevel newLevel = _calculateLevel(data.totalScore);
        data.level = newLevel;
        data.lastUpdated = block.timestamp;
        
        // Update token URI with new metadata
        _setTokenURI(tokenId, _generateTokenURI(tokenId));
        
        emit ReputationUpdated(tokenId, user, data.totalScore, newLevel);
    }

    /**
     * @dev Set KOL status for a user
     */
    function setKOLStatus(address user, bool isKOL) external {
        require(authorizedUpdaters[msg.sender] || msg.sender == owner(), "Not authorized");
        
        uint256 tokenId = userToTokenId[user];
        require(tokenId != 0, "User doesn't have reputation NFT");
        
        reputationData[tokenId].isKOL = isKOL;
        _setTokenURI(tokenId, _generateTokenURI(tokenId));
    }

    /**
     * @dev Calculate reputation level based on score
     */
    function _calculateLevel(uint256 score) internal view returns (ReputationLevel) {
        if (score >= levelThresholds.diamond) {
            return ReputationLevel.Diamond;
        } else if (score >= levelThresholds.gold) {
            return ReputationLevel.Gold;
        } else if (score >= levelThresholds.silver) {
            return ReputationLevel.Silver;
        } else {
            return ReputationLevel.Bronze;
        }
    }

    /**
     * @dev Generate dynamic metadata for the NFT
     */
    function _generateTokenURI(uint256 tokenId) internal view returns (string memory) {
        ReputationData memory data = reputationData[tokenId];
        address owner = ownerOf(tokenId);
        
        string memory levelName = _getLevelName(data.level);
        string memory levelColor = _getLevelColor(data.level);
        
        // Create JSON metadata
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{'
                        '"name": "SoRe Reputation #', tokenId.toString(), '",',
                        '"description": "Soulbound reputation NFT for SoRe ecosystem member",',
                        '"image": "data:image/svg+xml;base64,', _generateSVG(tokenId), '",',
                        '"attributes": [',
                        '{"trait_type": "Level", "value": "', levelName, '"},',
                        '{"trait_type": "Total Score", "value": ', data.totalScore.toString(), '},',
                        '{"trait_type": "Onchain Score", "value": ', data.onchainScore.toString(), '},',
                        '{"trait_type": "Social Score", "value": ', data.socialScore.toString(), '},',
                        '{"trait_type": "Token Holding Score", "value": ', data.tokenHoldingScore.toString(), '},',
                        '{"trait_type": "Transactions", "value": ', data.transactionCount.toString(), '},',
                        '{"trait_type": "Volume Traded", "value": "', (data.volumeTraded / 1e18).toString(), ' STT"},',
                        '{"trait_type": "Bookings Completed", "value": ', data.bookingsCompleted.toString(), '},',
                        '{"trait_type": "Average Rating", "value": ', data.averageRating.toString(), '},',
                        '{"trait_type": "KOL Status", "value": "', data.isKOL ? 'true' : 'false', '"},',
                        '{"trait_type": "Wallet Address", "value": "', Strings.toHexString(uint160(owner), 20), '"}',
                        '],'
                        '"soulbound": true'
                        '}'
                    )
                )
            )
        );
        
        return string(abi.encodePacked("data:application/json;base64,", json));
    }

    /**
     * @dev Generate SVG image for the NFT
     */
    function _generateSVG(uint256 tokenId) internal view returns (string memory) {
        ReputationData memory data = reputationData[tokenId];
        string memory levelColor = _getLevelColor(data.level);
        string memory levelName = _getLevelName(data.level);
        
        string memory svg = string(
            abi.encodePacked(
                '<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">',
                '<defs>',
                '<linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
                '<stop offset="0%" style="stop-color:', levelColor, ';stop-opacity:0.8"/>',
                '<stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1"/>',
                '</linearGradient>',
                '</defs>',
                '<rect width="400" height="400" fill="url(#bg)"/>',
                '<circle cx="200" cy="120" r="60" fill="white" opacity="0.1"/>',
                '<text x="200" y="130" text-anchor="middle" fill="white" font-size="24" font-weight="bold">SoRe</text>',
                '<text x="200" y="180" text-anchor="middle" fill="white" font-size="18">', levelName, ' Tier</text>',
                '<text x="200" y="220" text-anchor="middle" fill="white" font-size="16">Score: ', data.totalScore.toString(), '</text>',
                data.isKOL ? '<text x="200" y="250" text-anchor="middle" fill="#FFD700" font-size="14">KOL</text>' : '',
                '<text x="200" y="320" text-anchor="middle" fill="white" font-size="12" opacity="0.8">Reputation NFT #', tokenId.toString(), '</text>',
                '<text x="200" y="360" text-anchor="middle" fill="white" font-size="10" opacity="0.6">Soulbound Token</text>',
                '</svg>'
            )
        );
        
        return Base64.encode(bytes(svg));
    }

    /**
     * @dev Get level name as string
     */
    function _getLevelName(ReputationLevel level) internal pure returns (string memory) {
        if (level == ReputationLevel.Diamond) return "Diamond";
        if (level == ReputationLevel.Gold) return "Gold";
        if (level == ReputationLevel.Silver) return "Silver";
        return "Bronze";
    }

    /**
     * @dev Get level color for SVG
     */
    function _getLevelColor(ReputationLevel level) internal pure returns (string memory) {
        if (level == ReputationLevel.Diamond) return "#B9F2FF";
        if (level == ReputationLevel.Gold) return "#FFD700";
        if (level == ReputationLevel.Silver) return "#C0C0C0";
        return "#CD7F32";
    }

    /**
     * @dev Get user's reputation data
     */
    function getUserReputation(address user) external view returns (ReputationData memory) {
        uint256 tokenId = userToTokenId[user];
        require(tokenId != 0, "User doesn't have reputation NFT");
        return reputationData[tokenId];
    }

    /**
     * @dev Get users by level for leaderboard
     */
    function getUsersByLevel(ReputationLevel level, uint256 offset, uint256 limit) 
        external view returns (address[] memory users, uint256[] memory scores) {
        // This is a simplified implementation - in production, consider using a more efficient data structure
        uint256 totalSupply = _tokenIdCounter.current();
        address[] memory tempUsers = new address[](limit);
        uint256[] memory tempScores = new uint256[](limit);
        uint256 count = 0;
        uint256 skipped = 0;
        
        for (uint256 i = 1; i <= totalSupply && count < limit; i++) {
            if (_exists(i) && reputationData[i].level == level) {
                if (skipped < offset) {
                    skipped++;
                    continue;
                }
                tempUsers[count] = ownerOf(i);
                tempScores[count] = reputationData[i].totalScore;
                count++;
            }
        }
        
        // Resize arrays to actual count
        users = new address[](count);
        scores = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            users[i] = tempUsers[i];
            scores[i] = tempScores[i];
        }
        
        return (users, scores);
    }

    /**
     * @dev Override transfer to make NFT soulbound
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        // Allow minting (from == address(0)) but prevent transfers
        if (from != address(0)) {
            emit SoulboundTransferAttempt(tokenId, from, to);
            revert("Soulbound: Transfer not allowed");
        }
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Admin functions
     */
    function setAuthorizedUpdater(address updater, bool authorized) external onlyOwner {
        authorizedUpdaters[updater] = authorized;
    }

    function updateLevelThresholds(
        uint256 bronze,
        uint256 silver, 
        uint256 gold,
        uint256 diamond
    ) external onlyOwner {
        levelThresholds = LevelThresholds(bronze, silver, gold, diamond);
    }

    // Override required functions
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
}