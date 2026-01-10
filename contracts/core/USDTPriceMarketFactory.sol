// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./USDTPricePredictionMarket.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title USDTPriceMarketFactory
 * @notice Factory for creating USDT-based ultra-short-term price prediction markets
 * @dev Same as PriceMarketFactory but creates USDT markets instead of BNB markets
 */
contract USDTPriceMarketFactory is Ownable {
    // ============ State Variables ============

    // USDT token address
    address public immutable usdtToken;

    // Chainlink Price Feed addresses on BSC Testnet
    mapping(string => address) public priceFeeds;

    // All created markets
    address[] public allMarkets;
    mapping(address => bool) public isMarket;

    // Market creation fee (in BNB, to prevent spam)
    uint256 public creationFee = 0.01 ether; // 0.01 BNB

    // Default liquidity parameter for LMSR (in USDT, 18 decimals)
    uint256 public defaultLiquidityParameter = 100 * 10**18; // 100 USDT

    // Protocol settings
    address public protocolTreasury;
    bool public paused;

    // ============ Events ============

    event MarketCreated(
        address indexed market,
        string assetSymbol,
        USDTPricePredictionMarket.Duration duration,
        address indexed creator,
        uint256 timestamp
    );

    event PriceFeedAdded(string indexed symbol, address priceFeed);
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event LiquidityParameterUpdated(uint256 oldParam, uint256 newParam);

    // ============ Constructor ============

    constructor(address _protocolTreasury, address _usdtToken) Ownable(msg.sender) {
        require(_protocolTreasury != address(0), "Invalid treasury");
        require(_usdtToken != address(0), "Invalid USDT address");

        protocolTreasury = _protocolTreasury;
        usdtToken = _usdtToken;

        // Initialize common price feeds on BSC Testnet
        _addPriceFeed("BTC/USD", 0x5741306c21795FdCBb9b265Ea0255F499DFe515C);
        _addPriceFeed("ETH/USD", 0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7);
        _addPriceFeed("BNB/USD", 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526);
    }

    // ============ Market Creation ============

    /**
     * @notice Create a new USDT-based price prediction market
     * @param assetSymbol Asset to predict (e.g., "BTC/USD")
     * @param duration Market duration (0=1h, 1=4h, 2=24h)
     * @return market Address of the created market
     */
    function createMarket(
        string memory assetSymbol,
        USDTPricePredictionMarket.Duration duration
    ) external payable returns (address market) {
        require(!paused, "Factory paused");
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(priceFeeds[assetSymbol] != address(0), "Price feed not supported");

        // Create new USDT market
        USDTPricePredictionMarket newMarket = new USDTPricePredictionMarket(
            assetSymbol,
            duration,
            priceFeeds[assetSymbol],
            defaultLiquidityParameter,
            msg.sender,
            usdtToken
        );

        market = address(newMarket);

        // Register market
        allMarkets.push(market);
        isMarket[market] = true;

        // Transfer creation fee (BNB) to treasury
        (bool success, ) = protocolTreasury.call{value: msg.value}("");
        require(success, "Fee transfer failed");

        emit MarketCreated(market, assetSymbol, duration, msg.sender, block.timestamp);

        return market;
    }

    /**
     * @notice Quick create: BTC 1-hour USDT market
     */
    function createBTC1H() external payable returns (address) {
        return this.createMarket{value: msg.value}("BTC/USD", USDTPricePredictionMarket.Duration.ONE_HOUR);
    }

    /**
     * @notice Quick create: ETH 1-hour USDT market
     */
    function createETH1H() external payable returns (address) {
        return this.createMarket{value: msg.value}("ETH/USD", USDTPricePredictionMarket.Duration.ONE_HOUR);
    }

    /**
     * @notice Quick create: BNB 4-hour USDT market
     */
    function createBNB4H() external payable returns (address) {
        return this.createMarket{value: msg.value}("BNB/USD", USDTPricePredictionMarket.Duration.FOUR_HOURS);
    }

    /**
     * @notice Quick create: BTC 4-hour USDT market
     */
    function createBTC4H() external payable returns (address) {
        return this.createMarket{value: msg.value}("BTC/USD", USDTPricePredictionMarket.Duration.FOUR_HOURS);
    }

    /**
     * @notice Quick create: BTC 24-hour USDT market
     */
    function createBTC24H() external payable returns (address) {
        return this.createMarket{value: msg.value}("BTC/USD", USDTPricePredictionMarket.Duration.ONE_DAY);
    }

    /**
     * @notice Quick create: ETH 24-hour USDT market
     */
    function createETH24H() external payable returns (address) {
        return this.createMarket{value: msg.value}("ETH/USD", USDTPricePredictionMarket.Duration.ONE_DAY);
    }

    /**
     * @notice Quick create: BNB 24-hour USDT market
     */
    function createBNB24H() external payable returns (address) {
        return this.createMarket{value: msg.value}("BNB/USD", USDTPricePredictionMarket.Duration.ONE_DAY);
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
     * @notice Get total number of markets created
     */
    function getMarketCount() external view returns (uint256) {
        return allMarkets.length;
    }

    /**
     * @notice Get markets in a range
     * @param start Start index
     * @param limit Number of markets to return
     */
    function getMarkets(uint256 start, uint256 limit) external view returns (address[] memory) {
        uint256 end = start + limit;
        if (end > allMarkets.length) {
            end = allMarkets.length;
        }

        uint256 length = end - start;
        address[] memory markets = new address[](length);

        for (uint256 i = 0; i < length; i++) {
            markets[i] = allMarkets[start + i];
        }

        return markets;
    }

    /**
     * @notice Get all markets (warning: may be gas intensive)
     */
    function getAllMarkets() external view returns (address[] memory) {
        return allMarkets;
    }

    /**
     * @notice Get price feed for an asset
     */
    function getPriceFeed(string memory symbol) external view returns (address) {
        return priceFeeds[symbol];
    }
}
