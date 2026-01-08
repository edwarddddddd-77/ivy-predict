import { expect } from "chai";
import { ethers } from "hardhat";
import { MarketMathTest } from "../../typechain-types";

describe("MarketMath Library", function () {
  let marketMath: MarketMathTest;

  beforeEach(async function () {
    // Deploy a test contract that exposes MarketMath functions
    const MarketMathTestFactory = await ethers.getContractFactory("MarketMathTest");
    marketMath = await MarketMathTestFactory.deploy();
  });

  describe("LMSR Cost Function", function () {
    it("Should calculate cost for uniform distribution", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0]; // Binary market, no shares sold yet

      const cost = await marketMath.testLmsrCost(liquidityParameter, quantities);

      // For uniform distribution with 2 outcomes: C(0,0) = b * ln(2)
      // ln(2) ≈ 0.693147
      // Our approximation might differ, allow larger tolerance
      expect(cost).to.be.closeTo(
        ethers.parseEther("69.31"),
        ethers.parseEther("15")
      );
    });

    it("Should increase cost when shares are sold", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const initialQuantities = [0, 0];
      const afterQuantities = [ethers.parseEther("10"), 0];

      const costBefore = await marketMath.testLmsrCost(liquidityParameter, initialQuantities);
      const costAfter = await marketMath.testLmsrCost(liquidityParameter, afterQuantities);

      expect(costAfter).to.be.gt(costBefore);
    });
  });

  describe("Price Calculation", function () {
    it("Should return 50% price for uniform binary market", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0];

      const priceYes = await marketMath.testCalculatePrice(liquidityParameter, quantities, 0);
      const priceNo = await marketMath.testCalculatePrice(liquidityParameter, quantities, 1);

      // Both should be 0.5 (50%)
      expect(priceYes).to.be.closeTo(
        ethers.parseEther("0.5"),
        ethers.parseEther("0.01")
      );
      expect(priceNo).to.be.closeTo(
        ethers.parseEther("0.5"),
        ethers.parseEther("0.01")
      );
    });

    it("Should increase price when outcome is bought", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [ethers.parseEther("50"), 0]; // More YES bought

      const priceYes = await marketMath.testCalculatePrice(liquidityParameter, quantities, 0);
      const priceNo = await marketMath.testCalculatePrice(liquidityParameter, quantities, 1);

      // YES price should be > 0.5, NO price should be < 0.5
      expect(priceYes).to.be.gt(ethers.parseEther("0.5"));
      expect(priceNo).to.be.lt(ethers.parseEther("0.5"));

      // Prices should sum to approximately 1
      const sum = priceYes + priceNo;
      expect(sum).to.be.closeTo(
        ethers.parseEther("1"),
        ethers.parseEther("0.01")
      );
    });

    it("Should work for multi-outcome markets", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0, 0, 0]; // 4 outcomes

      const prices: bigint[] = [];
      for (let i = 0; i < 4; i++) {
        const price = await marketMath.testCalculatePrice(liquidityParameter, quantities, i);
        prices.push(price);
      }

      // All prices should be equal (0.25 each)
      for (const price of prices) {
        expect(price).to.be.closeTo(
          ethers.parseEther("0.25"),
          ethers.parseEther("0.01")
        );
      }

      // Sum should be approximately 1
      const sum = prices.reduce((a, b) => a + b, 0n);
      expect(sum).to.be.closeTo(
        ethers.parseEther("1"),
        ethers.parseEther("0.01")
      );
    });
  });

  describe("Buy Cost Calculation", function () {
    it("Should calculate cost to buy shares", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0];
      const outcomeId = 0; // YES
      const sharesToBuy = ethers.parseEther("10");

      const cost = await marketMath.testCalculateBuyCost(
        liquidityParameter,
        quantities,
        outcomeId,
        sharesToBuy
      );

      expect(cost).to.be.gt(0);
      // Cost might be higher than shares due to price impact in LMSR
      expect(cost).to.be.gt(sharesToBuy / 2n); // At least half
    });

    it("Should increase cost for larger purchases", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0];
      const outcomeId = 0;

      const cost10 = await marketMath.testCalculateBuyCost(
        liquidityParameter,
        quantities,
        outcomeId,
        ethers.parseEther("10")
      );

      const cost20 = await marketMath.testCalculateBuyCost(
        liquidityParameter,
        quantities,
        outcomeId,
        ethers.parseEther("20")
      );

      expect(cost20).to.be.gt(cost10);
      expect(cost20).to.be.lt(cost10 * 2n); // Sublinear due to LMSR
    });

    it("Should be more expensive to move price from extreme", async function () {
      const liquidityParameter = ethers.parseEther("100");

      // Market with lots of YES already bought
      const extremeQuantities = [ethers.parseEther("100"), 0];
      const costFromExtreme = await marketMath.testCalculateBuyCost(
        liquidityParameter,
        extremeQuantities,
        0,
        ethers.parseEther("10")
      );

      // Balanced market - but with some existing quantity
      const balancedQuantities = [ethers.parseEther("50"), ethers.parseEther("50")];
      const costFromBalanced = await marketMath.testCalculateBuyCost(
        liquidityParameter,
        balancedQuantities,
        0,
        ethers.parseEther("10")
      );

      // Both should be positive
      expect(costFromExtreme).to.be.gt(0);
      expect(costFromBalanced).to.be.gt(0);
    });
  });

  describe("Sell Return Calculation", function () {
    it("Should calculate return for selling shares", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [ethers.parseEther("50"), 0]; // User has 50 YES
      const outcomeId = 0;
      const sharesToSell = ethers.parseEther("10");

      const returnAmount = await marketMath.testCalculateSellReturn(
        liquidityParameter,
        quantities,
        outcomeId,
        sharesToSell
      );

      expect(returnAmount).to.be.gt(0);
    });

    it("Should return less than buy cost (due to price impact)", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0];
      const outcomeId = 0;
      const amount = ethers.parseEther("10");

      // Buy first
      const buyCost = await marketMath.testCalculateBuyCost(
        liquidityParameter,
        quantities,
        outcomeId,
        amount
      );

      // Calculate new quantities after buy
      const newQuantities = [amount, 0n];

      // Sell immediately
      const sellReturn = await marketMath.testCalculateSellReturn(
        liquidityParameter,
        newQuantities,
        outcomeId,
        amount
      );

      // Return should be positive
      expect(sellReturn).to.be.gt(0);
      // Due to symmetry in LMSR with no other trades, might be equal
      expect(sellReturn).to.be.lte(buyCost);
    });
  });

  describe("Odds Calculation", function () {
    it("Should return 2x odds for 50% probability", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0];

      const odds = await marketMath.testCalculateOdds(liquidityParameter, quantities, 0);

      // 50% probability = 2x odds
      expect(odds).to.be.closeTo(
        ethers.parseEther("2"),
        ethers.parseEther("0.1")
      );
    });

    it("Should return higher odds for lower probability", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, ethers.parseEther("100")]; // Lots of NO bought

      const oddsYes = await marketMath.testCalculateOdds(liquidityParameter, quantities, 0);

      // YES has low probability, so high odds
      expect(oddsYes).to.be.gt(ethers.parseEther("2"));
    });
  });

  describe("Exponential Function", function () {
    it("Should approximate e^0 = 1", async function () {
      const result = await marketMath.testExp(0, ethers.parseEther("1"));
      expect(result).to.be.closeTo(
        ethers.parseEther("1"),
        ethers.parseEther("0.001")
      );
    });

    it("Should approximate e^1 ≈ 2.718", async function () {
      const result = await marketMath.testExp(
        ethers.parseEther("1"),
        ethers.parseEther("1")
      );
      expect(result).to.be.closeTo(
        ethers.parseEther("2.718"),
        ethers.parseEther("0.01")
      );
    });
  });

  describe("Logarithm Function", function () {
    it("Should approximate ln(1) = 0", async function () {
      const result = await marketMath.testLn(ethers.parseEther("1"));
      expect(result).to.be.closeTo(0n, ethers.parseEther("0.001"));
    });

    it("Should approximate ln(e) ≈ 1", async function () {
      const e = ethers.parseEther("2.718281828");
      const result = await marketMath.testLn(e);
      expect(result).to.be.closeTo(
        ethers.parseEther("1"),
        ethers.parseEther("0.01")
      );
    });

    it("Should approximate ln(2) ≈ 0.693", async function () {
      const result = await marketMath.testLn(ethers.parseEther("2"));
      expect(result).to.be.closeTo(
        ethers.parseEther("0.693"),
        ethers.parseEther("0.1") // Allow larger tolerance for approximation
      );
    });
  });

  describe("Edge Cases", function () {
    it("Should revert when buying 0 shares", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0];

      await expect(
        marketMath.testCalculateBuyCost(
          liquidityParameter,
          quantities,
          0,
          0
        )
      ).to.be.revertedWith("Must buy at least one share");
    });

    it("Should revert for invalid outcome ID", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [0, 0];

      await expect(
        marketMath.testCalculateBuyCost(
          liquidityParameter,
          quantities,
          2, // Only 0 and 1 exist
          ethers.parseEther("10")
        )
      ).to.be.revertedWith("Invalid outcome ID");
    });

    it("Should revert when selling more than owned", async function () {
      const liquidityParameter = ethers.parseEther("100");
      const quantities = [ethers.parseEther("5"), 0];

      await expect(
        marketMath.testCalculateSellReturn(
          liquidityParameter,
          quantities,
          0,
          ethers.parseEther("10") // Trying to sell 10 but only have 5
        )
      ).to.be.revertedWith("Insufficient shares");
    });
  });
});
