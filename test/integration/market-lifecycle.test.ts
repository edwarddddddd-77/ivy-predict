import { expect } from "chai";
import { ethers } from "hardhat";
import {
  PredictionMarketFactory,
  PredictionMarket,
  ChainlinkAdapter,
} from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("Market Lifecycle Integration Test", function () {
  let factory: PredictionMarketFactory;
  let oracleResolver: ChainlinkAdapter;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let trader1: SignerWithAddress;
  let trader2: SignerWithAddress;
  let trader3: SignerWithAddress;
  let lpProvider: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator, trader1, trader2, trader3, lpProvider] =
      await ethers.getSigners();

    // Deploy ChainlinkAdapter
    const LINK_TOKEN = ethers.getAddress("0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06");
    const ORACLE = ethers.getAddress("0xCC79157eb46F5624204f47AB42b3906cAA40eaB7");
    const JOB_ID = ethers.encodeBytes32String("test-job");
    const FEE = ethers.parseEther("0.1");

    const ChainlinkAdapterFactory = await ethers.getContractFactory(
      "ChainlinkAdapter"
    );
    oracleResolver = await ChainlinkAdapterFactory.deploy(
      LINK_TOKEN,
      ORACLE,
      JOB_ID,
      FEE
    );

    // Deploy PredictionMarketFactory
    const PredictionMarketFactoryContract = await ethers.getContractFactory(
      "PredictionMarketFactory"
    );
    factory = await PredictionMarketFactoryContract.deploy(
      await oracleResolver.getAddress()
    );
  });

  describe("Complete Market Lifecycle: BTC Price Prediction", function () {
    let market: PredictionMarket;
    let marketAddress: string;
    let endTime: number;
    let resolutionTime: number;

    it("Step 1: Creator creates a binary market", async function () {
      const question = "Will BTC reach $100,000 by March 2026?";
      const now = await time.latest();
      endTime = now + 30 * 24 * 60 * 60; // 30 days
      resolutionTime = endTime + 7 * 24 * 60 * 60; // 7 days after

      const creationFee = await factory.marketCreationFee();
      const initialLiquidity = ethers.parseEther("10");

      const tx = await factory
        .connect(creator)
        .createBinaryMarket(question, endTime, resolutionTime, {
          value: creationFee + initialLiquidity,
        });

      const receipt = await tx.wait();

      // Extract market address from event
      const event = receipt?.logs
        .map((log: any) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "MarketCreated");

      expect(event).to.not.be.undefined;
      marketAddress = event!.args.marketAddress;

      market = await ethers.getContractAt("PredictionMarket", marketAddress);

      console.log("    ✓ Market created at:", marketAddress);
      console.log("    ✓ Question:", question);
    });

    it("Step 2: Initial market state verification", async function () {
      const info = await market.getMarketInfo();

      expect(info.state).to.equal(0); // Active
      expect(info.totalVolume).to.be.gt(0); // Has initial liquidity

      const priceYes = await market.getPrice(0);
      const priceNo = await market.getPrice(1);

      console.log("    ✓ Initial YES price:", ethers.formatEther(priceYes));
      console.log("    ✓ Initial NO price:", ethers.formatEther(priceNo));

      // Prices should be roughly equal initially
      expect(priceYes).to.be.closeTo(priceNo, ethers.parseEther("0.1"));
    });

    it("Step 3: Liquidity provider adds liquidity", async function () {
      const liquidityAmount = ethers.parseEther("50");

      await expect(
        market.connect(lpProvider).addLiquidity({ value: liquidityAmount })
      )
        .to.emit(market, "LiquidityAdded")
        .withArgs(lpProvider.address, liquidityAmount, await market.lpTokenBalances(lpProvider.address));

      const totalLiquidity = await market.totalLiquidity();
      console.log("    ✓ Total liquidity:", ethers.formatEther(totalLiquidity), "BNB");
    });

    it("Step 4: Trader1 buys YES shares", async function () {
      const buyAmount = ethers.parseEther("5");

      const priceBeforeTx = await market.getPrice(0);

      await expect(
        market.connect(trader1).buyShares(0, 0, { value: buyAmount })
      ).to.emit(market, "SharesPurchased");

      const shares = await market.getUserShares(trader1.address, 0);
      const priceAfter = await market.getPrice(0);

      console.log("    ✓ Trader1 bought YES shares:", ethers.formatEther(shares));
      console.log("    ✓ YES price after:", ethers.formatEther(priceAfter));
      console.log("    ✓ Price change:", ethers.formatEther(priceAfter - priceBeforeTx));

      // Price should have increased
      expect(priceAfter).to.be.gt(priceBeforeTx);
    });

    it("Step 5: Trader2 buys NO shares", async function () {
      const buyAmount = ethers.parseEther("3");

      const priceBeforeTx = await market.getPrice(1);

      await expect(
        market.connect(trader2).buyShares(1, 0, { value: buyAmount })
      ).to.emit(market, "SharesPurchased");

      const shares = await market.getUserShares(trader2.address, 1);
      const priceAfter = await market.getPrice(1);

      console.log("    ✓ Trader2 bought NO shares:", ethers.formatEther(shares));
      console.log("    ✓ NO price after:", ethers.formatEther(priceAfter));

      // NO price should have increased
      expect(priceAfter).to.be.gt(priceBeforeTx);
    });

    it("Step 6: Trader3 enters the market and buys YES", async function () {
      const buyAmount = ethers.parseEther("8");

      await market.connect(trader3).buyShares(0, 0, { value: buyAmount });

      const priceYes = await market.getPrice(0);
      const priceNo = await market.getPrice(1);
      const oddsYes = await market.getOdds(0);

      console.log("    ✓ Current YES probability:", (Number(priceYes) / 1e18 * 100).toFixed(2) + "%");
      console.log("    ✓ Current NO probability:", (Number(priceNo) / 1e18 * 100).toFixed(2) + "%");
      console.log("    ✓ YES odds:", ethers.formatEther(oddsYes) + "x");

      // YES should have higher probability now
      expect(priceYes).to.be.gt(priceNo);
    });

    it("Step 7: Trader1 sells some shares for profit", async function () {
      const initialShares = await market.getUserShares(trader1.address, 0);
      const sharesToSell = initialShares / 3n; // Sell 1/3

      const balanceBefore = await ethers.provider.getBalance(trader1.address);

      const tx = await market.connect(trader1).sellShares(0, sharesToSell, 0);
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;

      const balanceAfter = await ethers.provider.getBalance(trader1.address);
      const payout = balanceAfter - balanceBefore + gasUsed;

      console.log("    ✓ Trader1 sold shares for:", ethers.formatEther(payout), "BNB");

      const remainingShares = await market.getUserShares(trader1.address, 0);
      expect(remainingShares).to.equal(initialShares - sharesToSell);
    });

    it("Step 8: Market reaches end time", async function () {
      console.log("    ⏳ Fast-forwarding time to market end...");

      await time.increaseTo(endTime + 1);

      // Should not allow more trading
      await expect(
        market.connect(trader1).buyShares(0, 0, {
          value: ethers.parseEther("1"),
        })
      ).to.be.revertedWith("Market has ended");

      console.log("    ✓ Market is now locked for trading");
    });

    it("Step 9: Oracle resolves the market", async function () {
      const winningOutcome = 0; // YES wins (BTC reached $100k)

      await expect(
        oracleResolver.manualResolve(marketAddress, winningOutcome)
      )
        .to.emit(market, "MarketResolved")
        .withArgs(winningOutcome, await time.latest());

      const info = await market.getMarketInfo();
      expect(info.state).to.equal(2); // Resolved
      expect(info.winningOutcome).to.equal(winningOutcome);

      console.log("    ✓ Market resolved: YES wins!");
    });

    it("Step 10: Winners claim their rewards", async function () {
      // Trader1 claims (has YES shares)
      const trader1BalanceBefore = await ethers.provider.getBalance(
        trader1.address
      );
      const trader1Shares = await market.getUserShares(trader1.address, 0);

      if (trader1Shares > 0) {
        await market.connect(trader1).claimWinnings();

        const trader1BalanceAfter = await ethers.provider.getBalance(
          trader1.address
        );
        console.log(
          "    ✓ Trader1 claimed:",
          ethers.formatEther(trader1BalanceAfter - trader1BalanceBefore),
          "BNB (approximate, excluding gas)"
        );
      }

      // Trader3 claims (has YES shares)
      const trader3Shares = await market.getUserShares(trader3.address, 0);
      if (trader3Shares > 0) {
        await market.connect(trader3).claimWinnings();
        console.log("    ✓ Trader3 claimed winnings");
      }

      // Trader2 cannot claim (has NO shares)
      await expect(market.connect(trader2).claimWinnings()).to.be.revertedWith(
        "No winning shares"
      );
      console.log("    ✓ Trader2 (NO holder) cannot claim");
    });

    it("Step 11: LP provider removes liquidity", async function () {
      const lpTokens = await market.lpTokenBalances(lpProvider.address);

      if (lpTokens > 0) {
        const balanceBefore = await ethers.provider.getBalance(
          lpProvider.address
        );

        await market.connect(lpProvider).removeLiquidity(lpTokens);

        const balanceAfter = await ethers.provider.getBalance(
          lpProvider.address
        );

        console.log(
          "    ✓ LP provider removed liquidity, received:",
          ethers.formatEther(balanceAfter - balanceBefore),
          "BNB (approximate)"
        );
      }
    });

    it("Step 12: Creator withdraws fees", async function () {
      const protocolFees = await market.accumulatedProtocolFees();
      const creatorFees = await market.accumulatedCreatorFees();

      console.log("    ✓ Protocol fees:", ethers.formatEther(protocolFees), "BNB");
      console.log("    ✓ Creator fees:", ethers.formatEther(creatorFees), "BNB");

      if (creatorFees > 0) {
        await market.connect(creator).withdrawCreatorFees();
        console.log("    ✓ Creator withdrew fees");
      }
    });

    it("Step 13: Final market statistics", async function () {
      const info = await market.getMarketInfo();

      console.log("\n    📊 FINAL MARKET STATISTICS:");
      console.log("    ═══════════════════════════");
      console.log("    Total Volume:", ethers.formatEther(info.totalVolume), "BNB");
      console.log("    Winning Outcome:", info.outcomes[Number(info.winningOutcome)]);
      console.log("    Final YES Price:", (Number(await market.getPrice(0)) / 1e18 * 100).toFixed(2) + "%");
      console.log("    Final NO Price:", (Number(await market.getPrice(1)) / 1e18 * 100).toFixed(2) + "%");
      console.log("    Market State: Resolved");
      console.log("    ═══════════════════════════\n");
    });
  });

  describe("Complete Market Lifecycle: Election Prediction (Multi-outcome)", function () {
    it("Should handle 4-outcome market lifecycle", async function () {
      const question = "Who will win the 2026 election?";
      const outcomes = ["Candidate A", "Candidate B", "Candidate C", "Candidate D"];
      const now = await time.latest();
      const endTime = now + 60 * 24 * 60 * 60; // 60 days
      const resolutionTime = endTime + 1 * 24 * 60 * 60;
      const liquidityParameter = ethers.parseEther("200");

      // Create market
      const creationFee = await factory.marketCreationFee();
      const tx = await factory
        .connect(creator)
        .createCategoricalMarket(
          question,
          outcomes,
          endTime,
          resolutionTime,
          liquidityParameter,
          { value: creationFee + ethers.parseEther("20") }
        );

      const receipt = await tx.wait();
      const event = receipt?.logs
        .map((log: any) => {
          try {
            return factory.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e: any) => e?.name === "MarketCreated");

      const marketAddress = event!.args.marketAddress;
      const market = await ethers.getContractAt(
        "PredictionMarket",
        marketAddress
      );

      console.log("\n    📊 Multi-outcome Market Created:");
      console.log("    Question:", question);

      // Traders buy different outcomes
      await market.connect(trader1).buyShares(0, 0, {
        value: ethers.parseEther("3"),
      }); // Candidate A
      await market.connect(trader2).buyShares(1, 0, {
        value: ethers.parseEther("5"),
      }); // Candidate B
      await market.connect(trader3).buyShares(2, 0, {
        value: ethers.parseEther("2"),
      }); // Candidate C

      // Check probabilities
      for (let i = 0; i < 4; i++) {
        const price = await market.getPrice(i);
        console.log(
          `    ${outcomes[i]}: ${(Number(price) / 1e18 * 100).toFixed(2)}%`
        );
      }

      // Fast forward and resolve
      await time.increaseTo(endTime + 1);
      await oracleResolver.manualResolve(marketAddress, 1); // Candidate B wins

      // Winner claims
      await market.connect(trader2).claimWinnings();

      console.log("    ✓ Winner (Candidate B holder) claimed rewards\n");
    });
  });
});
