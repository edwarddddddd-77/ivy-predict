import { expect } from "chai";
import { ethers } from "hardhat";
import { PredictionMarket, ChainlinkAdapter } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PredictionMarket", function () {
  let market: PredictionMarket;
  let oracleResolver: ChainlinkAdapter;
  let creator: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const question = "Will BTC reach $100,000 by March 2026?";
  const outcomes = ["YES", "NO"];
  let endTime: number;
  let resolutionTime: number;
  const liquidityParameter = ethers.parseEther("100");

  beforeEach(async function () {
    [creator, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock oracle resolver
    const LINK_TOKEN = ethers.getAddress("0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06"); // BSC Testnet
    const ORACLE = ethers.getAddress("0xCC79157eb46F5624204f47AB42b3906cAA40eaB7");
    const JOB_ID = ethers.encodeBytes32String("test-job");
    const FEE = ethers.parseEther("0.1");

    const ChainlinkAdapterFactory = await ethers.getContractFactory("ChainlinkAdapter");
    oracleResolver = await ChainlinkAdapterFactory.deploy(LINK_TOKEN, ORACLE, JOB_ID, FEE);

    // Set times
    const now = await time.latest();
    endTime = now + 30 * 24 * 60 * 60; // 30 days from now
    resolutionTime = endTime + 7 * 24 * 60 * 60; // 7 days after end

    // Deploy prediction market
    const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarket");
    market = await PredictionMarketFactory.deploy(
      question,
      outcomes,
      endTime,
      resolutionTime,
      liquidityParameter,
      creator.address,
      await oracleResolver.getAddress()
    );
  });

  describe("Deployment", function () {
    it("Should set correct initial values", async function () {
      const info = await market.getMarketInfo();

      expect(info.question).to.equal(question);
      expect(info.outcomes).to.deep.equal(outcomes);
      expect(info.endTime).to.equal(endTime);
      expect(info.resolutionTime).to.equal(resolutionTime);
      expect(info.state).to.equal(0); // MarketState.Active
      expect(info.creator).to.equal(creator.address);
      expect(info.liquidityParameter).to.equal(liquidityParameter);
    });

    it("Should initialize quantities to zero", async function () {
      const quantities = await market.getQuantities();
      expect(quantities[0]).to.equal(0);
      expect(quantities[1]).to.equal(0);
    });

    it("Should set creator as owner", async function () {
      expect(await market.owner()).to.equal(creator.address);
    });
  });

  describe("Buying Shares", function () {
    it("Should allow buying shares", async function () {
      const amount = ethers.parseEther("1");

      await expect(
        market.connect(user1).buyShares(0, 0, { value: amount })
      ).to.emit(market, "SharesPurchased");

      // Check user balance
      const shares = await market.getUserShares(user1.address, 0);
      expect(shares).to.be.gt(0);
    });

    it("Should update quantities after purchase", async function () {
      const amount = ethers.parseEther("1");

      const quantitiesBefore = await market.getQuantities();
      await market.connect(user1).buyShares(0, 0, { value: amount });
      const quantitiesAfter = await market.getQuantities();

      expect(quantitiesAfter[0]).to.be.gt(quantitiesBefore[0]);
    });

    it("Should increase total volume", async function () {
      const amount = ethers.parseEther("1");

      const volumeBefore = (await market.getMarketInfo()).totalVolume;
      await market.connect(user1).buyShares(0, 0, { value: amount });
      const volumeAfter = (await market.getMarketInfo()).totalVolume;

      expect(volumeAfter).to.equal(volumeBefore + amount);
    });

    it("Should update price after purchase", async function () {
      const priceBefore = await market.getPrice(0);

      await market.connect(user1).buyShares(0, 0, {
        value: ethers.parseEther("10"),
      });

      const priceAfter = await market.getPrice(0);

      // Price should increase
      expect(priceAfter).to.be.gt(priceBefore);
    });

    it("Should revert when market has ended", async function () {
      // Fast forward to after end time
      await time.increaseTo(endTime + 1);

      await expect(
        market.connect(user1).buyShares(0, 0, {
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Market has ended");
    });

    it("Should revert with zero amount", async function () {
      await expect(
        market.connect(user1).buyShares(0, 0, { value: 0 })
      ).to.be.revertedWith("Must send BNB");
    });

    it("Should revert with invalid outcome ID", async function () {
      await expect(
        market.connect(user1).buyShares(2, 0, {
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Invalid outcome ID");
    });

    it("Should respect slippage protection", async function () {
      const amount = ethers.parseEther("1");
      const minShares = ethers.parseEther("1000000"); // Unrealistically high

      await expect(
        market.connect(user1).buyShares(0, minShares, { value: amount })
      ).to.be.revertedWith("Slippage too high");
    });
  });

  describe("Selling Shares", function () {
    beforeEach(async function () {
      // User buys shares first
      await market.connect(user1).buyShares(0, 0, {
        value: ethers.parseEther("5"),
      });
    });

    it("Should allow selling shares", async function () {
      const sharesToSell = ethers.parseEther("1");

      await expect(
        market.connect(user1).sellShares(0, sharesToSell, 0)
      ).to.emit(market, "SharesSold");
    });

    it("Should transfer BNB to seller", async function () {
      const sharesToSell = ethers.parseEther("1");
      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await market.connect(user1).sellShares(0, sharesToSell, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // Should receive BNB (minus gas)
      expect(balanceAfter).to.be.gt(balanceBefore - gasUsed);
    });

    it("Should decrease quantities", async function () {
      const sharesToSell = ethers.parseEther("1");

      const quantitiesBefore = await market.getQuantities();
      await market.connect(user1).sellShares(0, sharesToSell, 0);
      const quantitiesAfter = await market.getQuantities();

      expect(quantitiesAfter[0]).to.be.lt(quantitiesBefore[0]);
    });

    it("Should revert when selling more than owned", async function () {
      const userShares = await market.getUserShares(user1.address, 0);
      const tooMuch = userShares + ethers.parseEther("100");

      await expect(
        market.connect(user1).sellShares(0, tooMuch, 0)
      ).to.be.revertedWith("Insufficient shares");
    });
  });

  describe("Liquidity Management", function () {
    it("Should allow adding liquidity", async function () {
      const amount = ethers.parseEther("10");

      await expect(
        market.connect(user1).addLiquidity({ value: amount })
      ).to.emit(market, "LiquidityAdded");

      const lpTokens = await market.lpTokenBalances(user1.address);
      expect(lpTokens).to.be.gt(0);
    });

    it("Should allow removing liquidity", async function () {
      const amount = ethers.parseEther("10");

      // Add liquidity first
      await market.connect(user1).addLiquidity({ value: amount });
      const lpTokens = await market.lpTokenBalances(user1.address);

      // Remove liquidity
      await expect(
        market.connect(user1).removeLiquidity(lpTokens)
      ).to.emit(market, "LiquidityRemoved");
    });

    it("Should return BNB when removing liquidity", async function () {
      const amount = ethers.parseEther("10");

      await market.connect(user1).addLiquidity({ value: amount });
      const lpTokens = await market.lpTokenBalances(user1.address);

      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await market.connect(user1).removeLiquidity(lpTokens);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // Should receive most of the BNB back (minus fees and gas)
      expect(balanceAfter).to.be.closeTo(
        balanceBefore + amount - gasUsed,
        ethers.parseEther("1")
      );
    });

    it("Should revert when removing more LP tokens than owned", async function () {
      const amount = ethers.parseEther("10");

      await market.connect(user1).addLiquidity({ value: amount });
      const lpTokens = await market.lpTokenBalances(user1.address);

      await expect(
        market.connect(user1).removeLiquidity(lpTokens + 1n)
      ).to.be.revertedWith("Insufficient LP tokens");
    });
  });

  describe("Market Resolution", function () {
    beforeEach(async function () {
      // Users buy shares
      await market.connect(user1).buyShares(0, 0, {
        value: ethers.parseEther("5"),
      }); // YES
      await market.connect(user2).buyShares(1, 0, {
        value: ethers.parseEther("3"),
      }); // NO

      // Fast forward past end time
      await time.increaseTo(endTime + 1);
    });

    it("Should allow oracle to resolve market", async function () {
      const winningOutcome = 0; // YES wins

      await expect(
        oracleResolver.manualResolve(await market.getAddress(), winningOutcome)
      )
        .to.emit(market, "MarketResolved")
        .withArgs(winningOutcome, await time.latest());

      const info = await market.getMarketInfo();
      expect(info.state).to.equal(2); // MarketState.Resolved
      expect(info.winningOutcome).to.equal(winningOutcome);
    });

    it("Should revert if non-oracle tries to resolve", async function () {
      await expect(
        market.connect(user1).resolveMarket(0)
      ).to.be.revertedWith("Only oracle can resolve");
    });

    it("Should revert if resolving before end time", async function () {
      // Deploy new market
      const now = await time.latest();
      const futureEnd = now + 365 * 24 * 60 * 60; // 1 year from now

      const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarket");
      const futureMarket = await PredictionMarketFactory.deploy(
        question,
        outcomes,
        futureEnd,
        futureEnd + 7 * 24 * 60 * 60,
        liquidityParameter,
        creator.address,
        await oracleResolver.getAddress()
      );

      await expect(
        oracleResolver.manualResolve(await futureMarket.getAddress(), 0)
      ).to.be.revertedWith("Market not ended yet");
    });
  });

  describe("Claiming Winnings", function () {
    beforeEach(async function () {
      // Users buy shares
      await market.connect(user1).buyShares(0, 0, {
        value: ethers.parseEther("5"),
      }); // YES
      await market.connect(user2).buyShares(1, 0, {
        value: ethers.parseEther("3"),
      }); // NO

      // Fast forward and resolve
      await time.increaseTo(endTime + 1);
      await oracleResolver.manualResolve(await market.getAddress(), 0); // YES wins
    });

    it("Should allow winners to claim", async function () {
      await expect(market.connect(user1).claimWinnings()).to.emit(
        market,
        "WinningsClaimed"
      );
    });

    it("Should transfer winnings to winner", async function () {
      const balanceBefore = await ethers.provider.getBalance(user1.address);

      const tx = await market.connect(user1).claimWinnings();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(user1.address);

      // Should receive winnings
      expect(balanceAfter).to.be.gt(balanceBefore - gasUsed);
    });

    it("Should revert if user has no winning shares", async function () {
      await expect(market.connect(user2).claimWinnings()).to.be.revertedWith(
        "No winning shares"
      );
    });

    it("Should prevent double claiming", async function () {
      await market.connect(user1).claimWinnings();

      await expect(market.connect(user1).claimWinnings()).to.be.revertedWith(
        "No winning shares"
      );
    });

    it("Should revert if market not resolved", async function () {
      // Deploy new unresolved market
      const now = await time.latest();

      const PredictionMarketFactory = await ethers.getContractFactory("PredictionMarket");
      const newMarket = await PredictionMarketFactory.deploy(
        question,
        outcomes,
        now + 30 * 24 * 60 * 60,
        now + 37 * 24 * 60 * 60,
        liquidityParameter,
        creator.address,
        await oracleResolver.getAddress()
      );

      await expect(newMarket.connect(user1).claimWinnings()).to.be.revertedWith(
        "Market not resolved"
      );
    });
  });

  describe("Fee Distribution", function () {
    it("Should accumulate protocol fees", async function () {
      const feesBefore = await market.accumulatedProtocolFees();

      await market.connect(user1).buyShares(0, 0, {
        value: ethers.parseEther("10"),
      });

      const feesAfter = await market.accumulatedProtocolFees();

      expect(feesAfter).to.be.gt(feesBefore);
    });

    it("Should accumulate creator fees", async function () {
      const feesBefore = await market.accumulatedCreatorFees();

      await market.connect(user1).buyShares(0, 0, {
        value: ethers.parseEther("10"),
      });

      const feesAfter = await market.accumulatedCreatorFees();

      expect(feesAfter).to.be.gt(feesBefore);
    });

    it("Should allow owner to withdraw protocol fees", async function () {
      await market.connect(user1).buyShares(0, 0, {
        value: ethers.parseEther("10"),
      });

      const balanceBefore = await ethers.provider.getBalance(creator.address);

      const tx = await market.connect(creator).withdrawProtocolFees();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(creator.address);

      expect(balanceAfter).to.be.gt(balanceBefore - gasUsed);
    });

    it("Should allow creator to withdraw creator fees", async function () {
      await market.connect(user1).buyShares(0, 0, {
        value: ethers.parseEther("10"),
      });

      const balanceBefore = await ethers.provider.getBalance(creator.address);

      const tx = await market.connect(creator).withdrawCreatorFees();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(creator.address);

      expect(balanceAfter).to.be.gt(balanceBefore - gasUsed);
    });
  });

  describe("Emergency Controls", function () {
    it("Should allow owner to pause", async function () {
      await market.connect(creator).pause();

      await expect(
        market.connect(user1).buyShares(0, 0, {
          value: ethers.parseEther("1"),
        })
      ).to.be.reverted;
    });

    it("Should allow owner to unpause", async function () {
      await market.connect(creator).pause();
      await market.connect(creator).unpause();

      await expect(
        market.connect(user1).buyShares(0, 0, {
          value: ethers.parseEther("1"),
        })
      ).to.not.be.reverted;
    });

    it("Should allow owner to cancel market", async function () {
      await market.connect(creator).cancelMarket();

      const info = await market.getMarketInfo();
      expect(info.state).to.equal(4); // MarketState.Cancelled
    });
  });
});
