const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TimeBooking Contract", function () {
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
      expect(await timeBooking.platformFeePercent()).to.equal(ethers.BigNumber.from(250)); // 2.5%
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
      expect(bookingCreatedEvent.args.totalAmount).to.equal(TOTAL_AMOUNT);

      // Check NFT was minted to buyer
      const tokenId = bookingCreatedEvent.args.tokenId;
      expect(await timeBooking.ownerOf(tokenId)).to.equal(buyer.address);
    });

    it("Should fail if payment amount is incorrect", async function () {
      const fromTime = Math.floor(Date.now() / 1000) + 3600;
      const toTime = fromTime + 3600;

      await expect(
        timeBooking.connect(buyer).createBooking(
          kol.address,
          PRICE_PER_SLOT,
          TOTAL_SLOTS,
          fromTime,
          toTime,
          "test reason",
          "ipfs://test",
          { value: TOTAL_AMOUNT.sub(1) } // Incorrect amount
        )
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should fail if trying to book yourself", async function () {
      const fromTime = Math.floor(Date.now() / 1000) + 3600;
      const toTime = fromTime + 3600;

      await expect(
        timeBooking.connect(buyer).createBooking(
          buyer.address, // Trying to book yourself
          PRICE_PER_SLOT,
          TOTAL_SLOTS,
          fromTime,
          toTime,
          "test reason",
          "ipfs://test",
          { value: TOTAL_AMOUNT }
        )
      ).to.be.revertedWith("Cannot book yourself");
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
      await expect(timeBooking.connect(kol).acceptBooking(bookingId))
        .to.emit(timeBooking, "BookingStatusChanged")
        .withArgs(bookingId, 0, 1, kol.address); // Pending -> Accepted

      const booking = await timeBooking.getBooking(bookingId);
      expect(booking.status).to.equal(1); // Accepted
    });

    it("Should allow KOL to reject booking and refund buyer", async function () {
      const initialBalance = await buyer.getBalance();

      await timeBooking.connect(kol).rejectBooking(bookingId);

      const booking = await timeBooking.getBooking(bookingId);
      expect(booking.status).to.equal(2); // Rejected

      // Check if buyer was refunded (approximately, accounting for gas)
      const finalBalance = await buyer.getBalance();
      expect(finalBalance).to.be.gt(initialBalance.add(TOTAL_AMOUNT.div(2)));
    });

    it("Should allow buyer to cancel pending booking", async function () {
      const initialBalance = await buyer.getBalance();

      await timeBooking.connect(buyer).cancelBooking(bookingId);

      const booking = await timeBooking.getBooking(bookingId);
      expect(booking.status).to.equal(4); // Cancelled
    });

    it("Should not allow unauthorized users to accept booking", async function () {
      await expect(
        timeBooking.connect(buyer).acceptBooking(bookingId)
      ).to.be.revertedWith("Only KOL can accept");
    });
  });

  describe("Platform Fee Management", function () {
    it("Should allow owner to set platform fee", async function () {
      await timeBooking.setPlatformFee(500); // 5%
      expect(await timeBooking.platformFeePercent()).to.equal(ethers.BigNumber.from(500));
    });

    it("Should not allow setting fee higher than 10%", async function () {
      await expect(
        timeBooking.setPlatformFee(1001) // 10.01%
      ).to.be.revertedWith("Fee too high");
    });

    it("Should not allow non-owner to set fee", async function () {
      await expect(
        timeBooking.connect(buyer).setPlatformFee(300)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});