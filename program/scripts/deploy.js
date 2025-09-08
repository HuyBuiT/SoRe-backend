const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Somnia testnet...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Check deployer balance
  const balance = await deployer.getBalance();
  console.log("💰 Account balance:", ethers.utils.formatEther(balance), "SOMI\n");

  if (balance.lt(ethers.utils.parseEther("0.1"))) {
    console.log("⚠️  WARNING: Low balance. Make sure you have enough SOMI for deployment.");
  }

  try {
    // Deploy ReputationNFT contract first
    console.log("📋 Deploying ReputationNFT contract...");
    const ReputationNFT = await ethers.getContractFactory("ReputationNFT");
    const reputationNFT = await ReputationNFT.deploy("SoRe Reputation", "SOREP");
    await reputationNFT.deployed();
    
    console.log("✅ ReputationNFT deployed to:", reputationNFT.address);
    console.log("🧾 Transaction hash:", reputationNFT.deployTransaction.hash);

    // Deploy TimeBooking contract
    console.log("\n📋 Deploying TimeBooking contract...");
    const TimeBooking = await ethers.getContractFactory("TimeBooking");
    
    // Constructor parameters
    const name = "SoRe Booking Tickets";
    const symbol = "SREBT";
    const feeRecipient = deployer.address; // Use deployer as initial fee recipient
    
    console.log("🔧 Contract parameters:");
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Fee Recipient:", feeRecipient);
    
    const timeBooking = await TimeBooking.deploy(name, symbol, feeRecipient);
    await timeBooking.deployed();
    
    console.log("✅ TimeBooking deployed to:", timeBooking.address);
    console.log("🧾 Transaction hash:", timeBooking.deployTransaction.hash);
    
    // Deploy ReputationTracker contract
    console.log("\n📋 Deploying ReputationTracker contract...");
    const ReputationTracker = await ethers.getContractFactory("ReputationTracker");
    const reputationTracker = await ReputationTracker.deploy(
      reputationNFT.address,
      timeBooking.address
    );
    await reputationTracker.deployed();
    
    console.log("✅ ReputationTracker deployed to:", reputationTracker.address);
    console.log("🧾 Transaction hash:", reputationTracker.deployTransaction.hash);
    
    // Deploy BookingTicketNFT helper contract
    console.log("\n📋 Deploying BookingTicketNFT helper contract...");
    const BookingTicketNFT = await ethers.getContractFactory("BookingTicketNFT");
    const ticketNFT = await BookingTicketNFT.deploy();
    await ticketNFT.deployed();
    
    console.log("✅ BookingTicketNFT helper deployed to:", ticketNFT.address);
    console.log("🧾 Transaction hash:", ticketNFT.deployTransaction.hash);
    
    // Wait for a few confirmations
    console.log("\n⏳ Waiting for confirmations...");
    await timeBooking.deployTransaction.wait(3);
    await ticketNFT.deployTransaction.wait(3);
    
    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Contract Summary:");
    console.log("═══════════════════════════════════════");
    console.log("TimeBooking Contract:", timeBooking.address);
    console.log("BookingTicketNFT Helper:", ticketNFT.address);
    console.log("Network: Somnia Testnet");
    console.log("Chain ID: 50312");
    console.log("Platform Fee: 2.5%");
    console.log("Fee Recipient:", feeRecipient);
    
    // Display useful information
    console.log("\n🔗 Useful Links:");
    console.log(`Somnia Testnet Explorer: https://explorer.somnia.network/address/${timeBooking.address}`);
    
    console.log("\n📝 Environment Variables for Frontend:");
    console.log("REACT_APP_TIME_BOOKING_CONTRACT_ADDRESS=" + timeBooking.address);
    console.log("REACT_APP_BOOKING_TICKET_NFT_CONTRACT_ADDRESS=" + ticketNFT.address);
    console.log("REACT_APP_SOMNIA_RPC_URL=https://dream-rpc.somnia.network");
    console.log("REACT_APP_CHAIN_ID=50312");
    
    // Save deployment info
    const deploymentInfo = {
      network: "somnia_testnet",
      chainId: 50312,
      timeBookingAddress: timeBooking.address,
      ticketNFTAddress: ticketNFT.address,
      deployerAddress: deployer.address,
      feeRecipient: feeRecipient,
      deploymentTime: new Date().toISOString(),
      contractName: name,
      contractSymbol: symbol
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      './deployment-info.json', 
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("\n💾 Deployment info saved to deployment-info.json");
    
  } catch (error) {
    console.error("\n❌ Deployment failed:");
    console.error(error.message);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log("\n💡 Solution: Add more SOMI to your wallet");
      console.log("   You can get testnet SOMI from Somnia faucet");
    }
    
    process.exit(1);
  }
}

// Run the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });