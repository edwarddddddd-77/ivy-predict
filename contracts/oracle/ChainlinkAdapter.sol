// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IPredictionMarket.sol";

/**
 * @title ChainlinkAdapter
 * @notice Adapter for integrating Chainlink oracles with prediction markets
 * @dev Handles data requests and market resolution
 */
contract ChainlinkAdapter is ChainlinkClient, Ownable {
    using Chainlink for Chainlink.Request;

    // Chainlink configuration (BSC Testnet)
    address private oracle;
    bytes32 private jobId;
    uint256 private fee;

    // Request tracking
    struct OracleRequest {
        address market;
        uint256 timestamp;
        bool fulfilled;
        uint256 result;
    }

    mapping(bytes32 => OracleRequest) public requests;
    mapping(address => bytes32) public marketToRequest;

    // Events
    event ResultRequested(
        bytes32 indexed requestId,
        address indexed market,
        string dataSource
    );

    event ResultFulfilled(
        bytes32 indexed requestId,
        address indexed market,
        uint256 result
    );

    event MarketResolved(
        address indexed market,
        uint256 winningOutcome
    );

    /**
     * @notice Initialize Chainlink adapter
     * @param _link LINK token address on BSC
     * @param _oracle Chainlink oracle address
     * @param _jobId Chainlink job ID for external API calls
     * @param _fee LINK fee per request
     */
    constructor(
        address _link,
        address _oracle,
        bytes32 _jobId,
        uint256 _fee
    ) Ownable(msg.sender) {
        setChainlinkToken(_link);
        oracle = _oracle;
        jobId = _jobId;
        fee = _fee;
    }

    /**
     * @notice Request market resolution from external API
     * @param market Address of the prediction market
     * @param apiUrl URL of the data source
     * @param path JSON path to the result value
     * @return requestId Chainlink request ID
     */
    function requestMarketResolution(
        address market,
        string memory apiUrl,
        string memory path
    ) external onlyOwner returns (bytes32 requestId) {
        require(IPredictionMarket(market).getMarketInfo().state == IPredictionMarket.MarketState.Active, "Market not active");

        Chainlink.Request memory req = buildChainlinkRequest(
            jobId,
            address(this),
            this.fulfill.selector
        );

        // Set the URL to perform the GET request on
        req.add("get", apiUrl);
        req.add("path", path);

        // Multiply by 1 to remove decimals (if result is integer)
        req.addInt("times", 1);

        // Send the request
        requestId = sendChainlinkRequest(req, fee);

        // Store request info
        requests[requestId] = OracleRequest({
            market: market,
            timestamp: block.timestamp,
            fulfilled: false,
            result: 0
        });

        marketToRequest[market] = requestId;

        emit ResultRequested(requestId, market, apiUrl);
    }

    /**
     * @notice Request sports result from Chainlink sports data feed
     * @param market Address of the prediction market
     * @param eventId Sports event identifier
     * @return requestId Chainlink request ID
     */
    function requestSportsResult(
        address market,
        string memory eventId
    ) external onlyOwner returns (bytes32 requestId) {
        // This is a simplified version - in production, use Chainlink Sports Data
        string memory apiUrl = string(abi.encodePacked(
            "https://api.sports-data.io/v1/events/",
            eventId,
            "/result"
        ));

        return this.requestMarketResolution(market, apiUrl, "winner");
    }

    /**
     * @notice Request cryptocurrency price data
     * @param market Address of the prediction market
     * @param symbol Crypto symbol (e.g., "BTC")
     * @param targetPrice Price threshold
     * @return requestId Chainlink request ID
     */
    function requestPriceResult(
        address market,
        string memory symbol,
        uint256 targetPrice
    ) external onlyOwner returns (bytes32 requestId) {
        // Use Chainlink Price Feed for crypto prices
        string memory apiUrl = string(abi.encodePacked(
            "https://api.coingecko.com/api/v3/simple/price?ids=",
            symbol,
            "&vs_currencies=usd"
        ));

        requestId = this.requestMarketResolution(market, apiUrl, "usd");

        // Store target price for comparison in fulfill()
        requests[requestId].result = targetPrice;
    }

    /**
     * @notice Chainlink callback function
     * @param _requestId The request ID
     * @param _result The result from the oracle
     */
    function fulfill(
        bytes32 _requestId,
        uint256 _result
    ) public recordChainlinkFulfillment(_requestId) {
        OracleRequest storage request = requests[_requestId];
        require(!request.fulfilled, "Request already fulfilled");

        request.fulfilled = true;
        request.result = _result;

        emit ResultFulfilled(_requestId, request.market, _result);

        // Automatically resolve the market
        _resolveMarket(request.market, _result);
    }

    /**
     * @notice Resolve the prediction market with the oracle result
     * @param market Address of the market
     * @param result Oracle result
     */
    function _resolveMarket(address market, uint256 result) private {
        IPredictionMarket predictionMarket = IPredictionMarket(market);

        // Determine winning outcome based on result
        // For binary markets: 0 = NO, 1 = YES
        // For categorical markets: result is the outcome index
        uint256 winningOutcome = result;

        // Validate outcome
        IPredictionMarket.MarketInfo memory info = predictionMarket.getMarketInfo();
        require(winningOutcome < info.outcomes.length, "Invalid outcome");

        // Resolve the market
        predictionMarket.resolveMarket(winningOutcome);

        emit MarketResolved(market, winningOutcome);
    }

    /**
     * @notice Manual resolution in case of oracle failure
     * @param market Address of the market
     * @param winningOutcome The winning outcome index
     */
    function manualResolve(
        address market,
        uint256 winningOutcome
    ) external onlyOwner {
        IPredictionMarket(market).resolveMarket(winningOutcome);
        emit MarketResolved(market, winningOutcome);
    }

    /**
     * @notice Update Chainlink configuration
     */
    function updateChainlinkConfig(
        address _oracle,
        bytes32 _jobId,
        uint256 _fee
    ) external onlyOwner {
        oracle = _oracle;
        jobId = _jobId;
        fee = _fee;
    }

    /**
     * @notice Withdraw LINK tokens
     */
    function withdrawLink() external onlyOwner {
        LinkTokenInterface link = LinkTokenInterface(chainlinkTokenAddress());
        require(link.transfer(msg.sender, link.balanceOf(address(this))), "Unable to transfer");
    }

    /**
     * @notice Get request status
     */
    function getRequestStatus(bytes32 requestId)
        external
        view
        returns (
            address market,
            uint256 timestamp,
            bool fulfilled,
            uint256 result
        )
    {
        OracleRequest memory request = requests[requestId];
        return (request.market, request.timestamp, request.fulfilled, request.result);
    }
}
