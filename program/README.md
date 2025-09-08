# SoRe Time Booking Smart Contracts 🕐⚡

A complete blockchain-based time booking system for KOLs (Key Opinion Leaders) with NFT tickets on Somnia testnet.

## 🌟 Features

### 🎫 NFT Ticket System
- **Booking NFTs**: Each booking generates a unique NFT ticket for the buyer
- **Proof of Purchase**: NFT serves as immutable proof of session booking
- **Transferable**: Tickets can be transferred between wallets
- **Rich Metadata**: Contains all booking details (time, KOL, reason, status)

### 💰 Smart Payment System
- **Escrow**: Payments held in smart contract until session completion
- **Auto-Refund**: 5-day expiry with automatic refund if KOL doesn't respond
- **Platform Fee**: Configurable fee system (default 2.5%)
- **Dispute Protection**: 24-hour window for buyers to report issues

### ⚡ Complete Booking Workflow

```
Buyer -> createBooking() -> [PENDING] -> KOL accepts/rejects
                              |
                              v
              ACCEPTED -> Session occurs -> completeSession()
                              |
                              v
                        24hr dispute period -> Auto payment release
```

## 📋 Smart Contract Architecture

### Core Contracts

1. **TimeBooking.sol** - Main booking contract
   - Handles all booking logic
   - Manages payments and escrow
   - Mints NFT tickets
   - Status workflow management

2. **BookingTicketNFT.sol** - NFT metadata helper
   - Generates ticket metadata
   - Status text conversion utilities

### Key Functions

#### For Buyers 👥
- `createBooking()` - Book KOL time and mint NFT ticket
- `cancelBooking()` - Cancel pending bookings (auto-refund)
- `reportDispute()` - Report issues within 24hrs of session

#### For KOLs 🎯
- `acceptBooking()` - Accept pending booking requests
- `rejectBooking()` - Reject bookings (auto-refund buyer)
- `completeSession()` - Mark session as completed

#### Automated Functions 🤖
- `handleExpiredBooking()` - Auto-refund after 5 days if no KOL response
- `releasePayment()` - Auto-release payment after dispute period

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- npm or yarn
- Somnia testnet SOMI tokens
- MetaMask or compatible wallet

### 1. Installation
```bash
cd /path/to/SoRe-backend/program
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your private key and RPC URL
```

### 3. Get Testnet Tokens
Visit [Somnia Faucet](https://faucet.somnia.network/) to get testnet SOMI

### 4. Compile Contracts
```bash
npm run compile
```

### 5. Run Tests
```bash
npm test
```

### 6. Deploy to Somnia Testnet
```bash
npm run deploy:testnet
```

## 📊 Contract Addresses

After deployment, you'll get:
- **TimeBooking Contract**: `0x...` (Main booking logic)
- **BookingTicketNFT Helper**: `0x...` (Metadata utilities)

## 💻 Frontend Integration

### Environment Variables
Add these to your React app `.env`:
```bash
REACT_APP_TIME_BOOKING_CONTRACT_ADDRESS=0x...
REACT_APP_BOOKING_TICKET_NFT_CONTRACT_ADDRESS=0x...
REACT_APP_SOMNIA_RPC_URL=https://testnet.somnia.network
REACT_APP_CHAIN_ID=50312
```

### Contract Interaction Examples

#### Create a Booking
```javascript
const timeBooking = new ethers.Contract(contractAddress, TimeBookingABI, signer);

const tx = await timeBooking.createBooking(
  kolAddress,           // KOL's wallet address
  pricePerSlot,        // Price per 30-min slot in wei
  totalSlots,          // Number of slots (min 1)
  fromTimestamp,       // Session start time (unix)
  toTimestamp,         // Session end time (unix)
  reason,              // Booking reason/description
  tokenURI,            // NFT metadata URI
  { value: totalAmount } // Payment in SOMI
);
```

#### Accept/Reject as KOL
```javascript
// Accept booking
await timeBooking.connect(kolSigner).acceptBooking(bookingId);

// Reject booking (auto-refunds buyer)
await timeBooking.connect(kolSigner).rejectBooking(bookingId);
```

#### Get Booking Data
```javascript
const booking = await timeBooking.getBooking(bookingId);
console.log({
  status: booking.status,      // 0=Pending, 1=Accepted, etc.
  buyer: booking.buyer,
  kol: booking.kol,
  amount: booking.totalAmount,
  nftTokenId: booking.tokenId
});
```

## 🔧 Configuration

### Platform Fee
```javascript
// Set platform fee (only contract owner)
await timeBooking.setPlatformFee(300); // 3%
```

### Fee Recipient
```javascript
// Set fee recipient address (only contract owner)
await timeBooking.setFeeRecipient(newRecipientAddress);
```

## ⚠️ Important Constants

- **Minimum Slot Duration**: 30 minutes
- **Booking Expiry**: 5 days (auto-refund if KOL doesn't respond)
- **Dispute Period**: 24 hours after session completion
- **Default Platform Fee**: 2.5%
- **Max Platform Fee**: 10%

## 🛡️ Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Access Control**: Role-based function access
- **Input Validation**: Comprehensive parameter checking
- **Overflow Protection**: SafeMath-equivalent built into Solidity 0.8+
- **Emergency Functions**: Owner-only emergency withdrawal

## 📈 Gas Optimization

- Efficient storage packing
- Batch operations where possible
- Minimal external calls
- Optimized for Somnia's gas costs

## 🧪 Testing

Comprehensive test suite covering:
- ✅ Contract deployment
- ✅ Booking creation and NFT minting
- ✅ Accept/reject workflow
- ✅ Payment handling and refunds
- ✅ Platform fee calculations
- ✅ Access control
- ✅ Edge cases and error conditions

Run tests:
```bash
npm test
```

## 📝 Smart Contract Events

Key events emitted:
- `BookingCreated` - New booking created
- `BookingStatusChanged` - Status updates
- `PaymentReleased` - Payments/refunds processed
- `DisputeReported` - Dispute filed by buyer

## 🌐 Network Details

**Somnia Testnet**
- Chain ID: `50311`
- RPC URL: `https://testnet.somnia.network`
- Block Explorer: `https://explorer.somnia.network`
- Faucet: `https://faucet.somnia.network`

## 🎯 Roadmap

- [ ] Multi-token payment support
- [ ] Advanced dispute resolution
- [ ] Recurring booking subscriptions
- [ ] Group session bookings
- [ ] Integration with calendar systems

## 📞 Support

For questions and support:
- Review the test files for usage examples
- Check the contract comments for detailed documentation
- Refer to frontend integration examples

---

Built with ❤️ for the SoRe platform on Somnia blockchain