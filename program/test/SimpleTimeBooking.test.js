const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TimeBooking Contract - Basic Tests", function () {
  let timeBooking;
  let owner, buyer, kol, feeRecipient;
  
  const PRICE_PER_SLOT = ethers.utils.parseEther("0.1"); // 0.1 SOMI per slot
  const TOTAL_SLOTS = 2;
  const TOTAL_AMOUNT = PRICE_PER_SLOT.mul(TOTAL_SLOTS);
  
  beforeEach(async function () {
    [owner, buyer, kol, feeRecipient] = await ethers.getSigners();
    
    const TimeBooking = await ethers.getContractFactory("TimeBooking");
    timeBooking = await TimeBooking.deploy(
      "SoRe Booking Tickets",
      "SREBT", 
      feeRecipient.address
    );
    await timeBooking.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await timeBooking.owner()).to.equal(owner.address);
    });

    it("Should set the correct fee recipient", async function () {
      expect(await timeBooking.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the correct platform fee", async function () {
      const fee = await timeBooking.platformFeePercent();
      expect(fee.toString()).to.equal("250"); // 2.5%
    });
  });

  describe("Booking Creation", function () {
    it("Should create a booking and mint NFT", async function () {
      const fromTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const toTime = fromTime + 3600; // 1 hour duration
      const reason = "1-on-1 consultation";
      const tokenURI = "ipfs://QmTestHash";

      const tx = await timeBooking.connect(buyer).createBooking(
        kol.address,
        PRICE_PER_SLOT,
        TOTAL_SLOTS,
        fromTime,
        toTime,
        reason,
        tokenURI,
        { value: TOTAL_AMOUNT }
      );

      const receipt = await tx.wait();
      const bookingCreatedEvent = receipt.events.find(e => e.event === "BookingCreated");
      
      expect(bookingCreatedEvent).to.not.be.undefined;
      expect(bookingCreatedEvent.args.buyer).to.equal(buyer.address);
      expect(bookingCreatedEvent.args.kol).to.equal(kol.address);
      expect(bookingCreatedEvent.args.totalAmount.toString()).to.equal(TOTAL_AMOUNT.toString());

      // Check NFT was minted to buyer
      const tokenId = bookingCreatedEvent.args.tokenId;
      expect(await timeBooking.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("Should fail if payment amount is incorrect", async function () {
      const fromTime = Math.floor(Date.now() / 1000) + 3600;
      const toTime = fromTime + 3600;

      try {
        await timeBooking.connect(buyer).createBooking(
          kol.address,
          PRICE_PER_SLOT,
          TOTAL_SLOTS,
          fromTime,
          toTime,
          "test reason",
          "ipfs://test",
          { value: TOTAL_AMOUNT.sub(1) } // Incorrect amount
        );
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.message).to.include("Incorrect payment amount");
      }
    });
  });

  describe("Booking Management", function () {
    let bookingId;

    beforeEach(async function () {
      const fromTime = Math.floor(Date.now() / 1000) + 3600;
      const toTime = fromTime + 3600;

      const tx = await timeBooking.connect(buyer).createBooking(
        kol.address,
        PRICE_PER_SLOT,
        TOTAL_SLOTS,
        fromTime,
        toTime,
        "Test booking",
        "ipfs://test",
        { value: TOTAL_AMOUNT }
      );

      const receipt = await tx.wait();
      bookingId = receipt.events.find(e => e.event === "BookingCreated").args.bookingId;
    });

    it("Should allow KOL to accept booking", async function () {
      await timeBooking.connect(kol).acceptBooking(bookingId);

      const booking = await timeBooking.getBooking(bookingId);
      expect(booking.status.toString()).to.equal("1"); // Accepted
    });

    it("Should allow KOL to reject booking", async function () {
      await timeBooking.connect(kol).rejectBooking(bookingId);

      const booking = await timeBooking.getBooking(bookingId);
      expect(booking.status.toString()).to.equal("2"); // Rejected
    });

    it("Should allow buyer to cancel pending booking", async function () {
      await timeBooking.connect(buyer).cancelBooking(bookingId);

      const booking = await timeBooking.getBooking(bookingId);
      expect(booking.status.toString()).to.equal("4"); // Cancelled
    });
  });

  describe("Platform Fee Management", function () {
    it("Should allow owner to set platform fee", async function () {
      await timeBooking.setPlatformFee(500); // 5%
      const fee = await timeBooking.platformFeePercent();
      expect(fee.toString()).to.equal("500");
    });

    it("Should not allow setting fee higher than 10%", async function () {
      try {
        await timeBooking.setPlatformFee(1001); // 10.01%
        expect.fail("Transaction should have failed");
      } catch (error) {
        expect(error.message).to.include("Fee too high");
      }
    });
  });
});