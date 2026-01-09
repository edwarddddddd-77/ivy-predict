// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ChainlinkFeeds
 * @notice Chainlink Price Feed addresses for different networks
 * @dev Reference: https://docs.chain.link/data-feeds/price-feeds/addresses
 */
library ChainlinkFeeds {
    // ============ BSC Mainnet ============

    function getBSCMainnetFeed(string memory symbol) internal pure returns (address) {
        bytes32 symbolHash = keccak256(abi.encodePacked(symbol));

        // BTC/USD
        if (symbolHash == keccak256(abi.encodePacked("BTC/USD"))) {
            return 0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf;
        }
        // ETH/USD
        else if (symbolHash == keccak256(abi.encodePacked("ETH/USD"))) {
            return 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e;
        }
        // BNB/USD
        else if (symbolHash == keccak256(abi.encodePacked("BNB/USD"))) {
            return 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE;
        }
        // USDT/USD
        else if (symbolHash == keccak256(abi.encodePacked("USDT/USD"))) {
            return 0xB97Ad0E74fa7d920791E90258A6E2085088b4320;
        }
        // USDC/USD
        else if (symbolHash == keccak256(abi.encodePacked("USDC/USD"))) {
            return 0x51597f405303C4377E36123cBc172b13269EA163;
        }
        // ADA/USD
        else if (symbolHash == keccak256(abi.encodePacked("ADA/USD"))) {
            return 0xa767f745331D267c7751297D982b050c93985627;
        }
        // DOT/USD
        else if (symbolHash == keccak256(abi.encodePacked("DOT/USD"))) {
            return 0xC333eb0086309a16aa7c8308DfD32c8BBA0a2592;
        }
        // LINK/USD
        else if (symbolHash == keccak256(abi.encodePacked("LINK/USD"))) {
            return 0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8;
        }
        // MATIC/USD
        else if (symbolHash == keccak256(abi.encodePacked("MATIC/USD"))) {
            return 0x7CA57b0cA6367191c94C8914d7Df09A57655905f;
        }
        // SOL/USD
        else if (symbolHash == keccak256(abi.encodePacked("SOL/USD"))) {
            return 0x0E8A53Dd9C13589df6382F13da6b9EC8f919B323;
        }
        // XRP/USD
        else if (symbolHash == keccak256(abi.encodePacked("XRP/USD"))) {
            return 0x93A67D414896A280bF8FFB3b389fE3686E014fda;
        }

        revert("Price feed not found");
    }

    // ============ BSC Testnet ============

    function getBSCTestnetFeed(string memory symbol) internal pure returns (address) {
        bytes32 symbolHash = keccak256(abi.encodePacked(symbol));

        // BTC/USD
        if (symbolHash == keccak256(abi.encodePacked("BTC/USD"))) {
            return 0x5741306c21795FdCBb9b265Ea0255F499DFe515C;
        }
        // ETH/USD
        else if (symbolHash == keccak256(abi.encodePacked("ETH/USD"))) {
            return 0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7;
        }
        // BNB/USD
        else if (symbolHash == keccak256(abi.encodePacked("BNB/USD"))) {
            return 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526;
        }
        // USDT/USD
        else if (symbolHash == keccak256(abi.encodePacked("USDT/USD"))) {
            return 0xEca2605f0BCF2BA5966372C99837b1F182d3D620;
        }
        // LINK/USD
        else if (symbolHash == keccak256(abi.encodePacked("LINK/USD"))) {
            return 0x1B329402Cb1825C6F30A0d92aB9E2862BE47333f;
        }
        // DAI/USD
        else if (symbolHash == keccak256(abi.encodePacked("DAI/USD"))) {
            return 0xE4eE17114774713d2De0eC0f035d4F7665fc025D;
        }

        revert("Price feed not found");
    }

    // ============ Ethereum Mainnet ============

    function getEthereumMainnetFeed(string memory symbol) internal pure returns (address) {
        bytes32 symbolHash = keccak256(abi.encodePacked(symbol));

        // BTC/USD
        if (symbolHash == keccak256(abi.encodePacked("BTC/USD"))) {
            return 0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c;
        }
        // ETH/USD
        else if (symbolHash == keccak256(abi.encodePacked("ETH/USD"))) {
            return 0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419;
        }
        // LINK/USD
        else if (symbolHash == keccak256(abi.encodePacked("LINK/USD"))) {
            return 0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c;
        }
        // USDT/USD
        else if (symbolHash == keccak256(abi.encodePacked("USDT/USD"))) {
            return 0x3E7d1eAB13ad0104d2750B8863b489D65364e32D;
        }
        // USDC/USD
        else if (symbolHash == keccak256(abi.encodePacked("USDC/USD"))) {
            return 0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6;
        }

        revert("Price feed not found");
    }

    // ============ Polygon Mainnet ============

    function getPolygonMainnetFeed(string memory symbol) internal pure returns (address) {
        bytes32 symbolHash = keccak256(abi.encodePacked(symbol));

        // BTC/USD
        if (symbolHash == keccak256(abi.encodePacked("BTC/USD"))) {
            return 0xc907E116054Ad103354f2D350FD2514433D57F6f;
        }
        // ETH/USD
        else if (symbolHash == keccak256(abi.encodePacked("ETH/USD"))) {
            return 0xF9680D99D6C9589e2a93a78A04A279e509205945;
        }
        // MATIC/USD
        else if (symbolHash == keccak256(abi.encodePacked("MATIC/USD"))) {
            return 0xAB594600376Ec9fD91F8e885dADF0CE036862dE0;
        }
        // LINK/USD
        else if (symbolHash == keccak256(abi.encodePacked("LINK/USD"))) {
            return 0xd9FFdb71EbE7496cC440152d43986Aae0AB76665;
        }

        revert("Price feed not found");
    }

    // ============ Arbitrum Mainnet ============

    function getArbitrumMainnetFeed(string memory symbol) internal pure returns (address) {
        bytes32 symbolHash = keccak256(abi.encodePacked(symbol));

        // BTC/USD
        if (symbolHash == keccak256(abi.encodePacked("BTC/USD"))) {
            return 0x6ce185860a4963106506C203335A2910413708e9;
        }
        // ETH/USD
        else if (symbolHash == keccak256(abi.encodePacked("ETH/USD"))) {
            return 0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612;
        }
        // LINK/USD
        else if (symbolHash == keccak256(abi.encodePacked("LINK/USD"))) {
            return 0x86E53CF1B870786351Da77A57575e79CB55812CB;
        }
        // ARB/USD
        else if (symbolHash == keccak256(abi.encodePacked("ARB/USD"))) {
            return 0xb2A824043730FE05F3DA2efaFa1CBbe83fa548D6;
        }

        revert("Price feed not found");
    }

    // ============ Helper Functions ============

    /**
     * @notice Get price feed for any supported network
     * @param chainId Chain ID (56=BSC, 97=BSC Testnet, 1=Ethereum, etc.)
     * @param symbol Asset symbol (e.g., "BTC/USD")
     */
    function getFeed(uint256 chainId, string memory symbol) internal pure returns (address) {
        if (chainId == 56) {
            return getBSCMainnetFeed(symbol);
        } else if (chainId == 97) {
            return getBSCTestnetFeed(symbol);
        } else if (chainId == 1) {
            return getEthereumMainnetFeed(symbol);
        } else if (chainId == 137) {
            return getPolygonMainnetFeed(symbol);
        } else if (chainId == 42161) {
            return getArbitrumMainnetFeed(symbol);
        }

        revert("Chain not supported");
    }

    /**
     * @notice Check if symbol is supported on a chain
     */
    function isSupported(uint256 chainId, string memory symbol) internal pure returns (bool) {
        // Try to get feed address, if it reverts, symbol is not supported
        // Note: Cannot use try-catch with internal functions
        bytes32 symbolHash = keccak256(abi.encodePacked(symbol));

        if (chainId == 56) {
            // Check BSC Mainnet symbols
            if (symbolHash == keccak256(abi.encodePacked("BTC/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("ETH/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("BNB/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("USDT/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("USDC/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("ADA/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("DOT/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("LINK/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("MATIC/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("SOL/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("XRP/USD"))) return true;
        } else if (chainId == 97) {
            // Check BSC Testnet symbols
            if (symbolHash == keccak256(abi.encodePacked("BTC/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("ETH/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("BNB/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("USDT/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("LINK/USD"))) return true;
            if (symbolHash == keccak256(abi.encodePacked("DAI/USD"))) return true;
        }

        return false;
    }

    /**
     * @notice Get all supported symbols for BSC Mainnet
     */
    function getBSCMainnetSymbols() internal pure returns (string[] memory) {
        string[] memory symbols = new string[](11);
        symbols[0] = "BTC/USD";
        symbols[1] = "ETH/USD";
        symbols[2] = "BNB/USD";
        symbols[3] = "USDT/USD";
        symbols[4] = "USDC/USD";
        symbols[5] = "ADA/USD";
        symbols[6] = "DOT/USD";
        symbols[7] = "LINK/USD";
        symbols[8] = "MATIC/USD";
        symbols[9] = "SOL/USD";
        symbols[10] = "XRP/USD";
        return symbols;
    }

    /**
     * @notice Get all supported symbols for BSC Testnet
     */
    function getBSCTestnetSymbols() internal pure returns (string[] memory) {
        string[] memory symbols = new string[](6);
        symbols[0] = "BTC/USD";
        symbols[1] = "ETH/USD";
        symbols[2] = "BNB/USD";
        symbols[3] = "USDT/USD";
        symbols[4] = "LINK/USD";
        symbols[5] = "DAI/USD";
        return symbols;
    }
}
