// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PricePredictionMarket.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PriceMarketFactory
 * @notice Factory for creating ultra-short-term price prediction markets
 * @dev Simplifies market creation with pre-configured price feeds
 */
contract PriceMarketFactory is Ownable {
    // ============ State Variables ============

    // Chainlink Price Feed addresses on BSC Testnet
    mapping(string => address) public priceFeeds;

    // All created markets
    address[] public allMarkets;
    mapping(address => bool) public isMarket;

    // Market creation fee (to prevent spam)
    uint256 public creationFee = 0.01 ether; // 0.01 BNB

    // Default liquidity parameter for LMSR
    uint256 public defaultLiquidityParameter = 100 ether;

    // Protocol settings
    address public protocolTreasury;
    bool public paused;

    // ============ Events ============

    event MarketCreated(
        address indexed market,
        string assetSymbol,
        PricePredictionMarket.Duration duration,
        address indexed creator,
        uint256 timestamp
    );

    event PriceFeedAdded(string indexed symbol, address priceFeed);
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event LiquidityParameterUpdated(uint256 oldParam, uint256 newParam);

    // ============ Constructor ============

    constructor(address _protocolTreasury) Ownable(msg.sender) {
        require(_protocolTreasury != address(0), "Invalid treasury");
        protocolTreasury = _protocolTreasury;

        // Initialize common price feeds on BSC Testnet
        // Note: These are placeholder addresses, replace with actual Chainlink feeds
        _addPriceFeed("BTC/USD", 0x5741306c21795FdCBb9b265Ea0255F499DFe515C);
        _addPriceFeed("ETH/USD", 0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7);
        _addPriceFeed("BNB/USD", 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526);
    }

    // ============ Market Creation ============

    /**
     * @notice Create a new price prediction market
     * @param assetSymbol Asset to predict (e.g., "BTC/USD")
     * @param duration Market duration (0=1h, 1=4h, 2=24h)
     * @return market Address of the created market
     */
    function createMarket(
        string memory assetSymbol,
        PricePredictionMarket.Duration duration
    ) external payable returns (address market) {
        require(!paused, "Factory paused");
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(priceFeeds[assetSymbol] != address(0), "Price feed not supported");

        // Create new market
        PricePredictionMarket newMarket = new PricePredictionMarket(
            assetSymbol,
            duration,
            priceFeeds[assetSymbol],
            defaultLiquidityParameter,
            msg.sender
        );

        market = address(newMarket);

        // Register market
        allMarkets.push(market);
        isMarket[market] = true;

        // Transfer creation fee to treasury
        (bool success, ) = protocolTreasury.call{value: msg.value}("");
        require(success, "Fee transfer failed");

        emit MarketCreated(market, assetSymbol, duration, msg.sender, block.timestamp);

        return market;
    }

    /**
     * @notice Quick create: BTC 1-hour market
     */
    function createBTC1H() external payable returns (address) {
        return this.createMarket{value: msg.value}("BTC/USD", PricePredictionMarket.Duration.ONE_HOUR);
    }

    /**
     * @notice Quick create: ETH 1-hour market
     */
    function createETH1H() external payable returns (address) {
        return this.createMarket{value: msg.value}("ETH/USD", PricePredictionMarket.Duration.ONE_HOUR);
    }

    /**
     * @notice Quick create: BNB 4-hour market
     */
    function createBNB4H() external payable returns (address) {
        return this.createMarket{value: msg.value}("BNB/USD", PricePredictionMarket.Duration.FOUR_HOURS);
    }

    // ============ Admin Functions ============

    /**
     * @notice Add or update a price feed
     * @param symbol Asset symbol (e.g., "BTC/USD")
     * @param priceFeed Chainlink Price Feed address
     */
    function addPriceFeed(string memory symbol, address priceFeed) external onlyOwner {
        _addPriceFeed(symbol, priceFeed);
    }

    function _addPriceFeed(string memory symbol, address priceFeed) private {
        require(priceFeed != address(0), "Invalid price feed");
        priceFeeds[symbol] = priceFeed;
        emit PriceFeedAdded(symbol, priceFeed);
    }

    /**
     * @notice Update creation fee
     */
    function setCreationFee(uint256 newFee) external onlyOwner {
        uint256 oldFee = creationFee;
        creationFee = newFee;
        emit CreationFeeUpdated(oldFee, newFee);
    }

    /**
     * @notice Update default liquidity parameter
     */
    function setLiquidityParameter(uint256 newParam) external onlyOwner {
        require(newParam > 0, "Invalid parameter");
        uint256 oldParam = defaultLiquidityParameter;
        defaultLiquidityParameter = newParam;
        emit LiquidityParameterUpdated(oldParam, newParam);
    }

    /**
     * @notice Update protocol treasury
     */
    function setProtocolTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury");
        protocolTreasury = newTreasury;
    }

    /**
     * @notice Pause/unpause market creation
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    // ============ View Functions ============

    /**
     * @notice Get all markets
     */
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    /**
     * @notice Get number of markets
     */
    function getMarketCount() external view returns (uint256) {
        return allMarkets.length;
    }

    /**
     * @notice Get markets by range
     * @param start Start index
     * @param count Number of markets to return
     */
    function getMarkets(uint256 start, uint256 count)
        external
        view
        returns (address[] memory markets)
    {
        uint256 end = start + count;
        if (end > allMarkets.length) {
            end = allMarkets.length;
        }

        markets = new address[](end - start);
        for (uint256 i = start; i < end; i++) {
            markets[i - start] = allMarkets[i];
        }

        return markets;
    }

    /**
     * @notice Get active markets (not ended yet)
     */
    function getActiveMarkets() external view returns (address[] memory) {
        // Count active markets first
        uint256 activeCount = 0;
        for (uint256 i = 0; i < allMarkets.length; i++) {
            PricePredictionMarket market = PricePredictionMarket(allMarkets[i]);
            if (market.state() == PricePredictionMarket.MarketState.Active) {
                activeCount++;
            }
        }

        // Create result array
        address[] memory activeMarkets = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allMarkets.length; i++) {
            PricePredictionMarket market = PricePredictionMarket(allMarkets[i]);
            if (market.state() == PricePredictionMarket.MarketState.Active) {
                activeMarkets[index] = allMarkets[i];
                index++;
            }
        }

        return activeMarkets;
    }

    /**
     * @notice Get supported assets
     */
    function getSupportedAssets() external view returns (string[] memory) {
        // For now, return hardcoded list
        // In production, maintain a dynamic list
        string[] memory assets = new string[](3);
        assets[0] = "BTC/USD";
        assets[1] = "ETH/USD";
        assets[2] = "BNB/USD";
        return assets;
    }

    /**
     * @notice Check if price feed exists for symbol
     */
    function hasPriceFeed(string memory symbol) external view returns (bool) {
        return priceFeeds[symbol] != address(0);
    }
}
