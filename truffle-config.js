const HDWalletProvider = require('truffle-hdwallet-provider');

require('dotenv').config(); // Store environment-specific variable from '.env' to process.env

const mnemonic = process.env.SECRET.trim();

module.exports = {
  compilers: {
    solc: {
      version: '0.8.4',
      settings: {
        optimizer: {
          enabled: false, // Default: false
          runs: 1000, // Default: 200
        },
      },
    },
  },
  networks: {
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*', // Match any network id
    },
    develop: {
      host: '127.0.0.1',
      port: 9545,
      network_id: '*', // Match any network id
    },
    ropsten: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          'https://ropsten.infura.io/v3/' + process.env.INFURA_API_KEY,
          0,
          10
        ),
      network_id: 3,
      gasPrice: 40000000000,
    },
    kovan: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          'https://kovan.infura.io/v3/' + process.env.INFURA_API_KEY,
          0,
          10
        ),
      network_id: 42,
      gasPrice: 40000000000,
    },
    rinkeby: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          'https://rinkeby.infura.io/v3/' + process.env.INFURA_API_KEY,
          0,
          10
        ),
      network_id: 4,
      gasPrice: 40000000000,
      skipDryRun: true,
      networkCheckTimeout: 999999,
    },
    // main ethereum network(mainnet)
    testnet: {
      provider: () =>
      new HDWalletProvider(
          mnemonic,
          `https://data-seed-prebsc-1-s1.binance.org:8545`),
      network_id: 97,
      confirmations: 10,
      timeoutBlocks: 200,
      gasPrice: 40000000000,
      skipDryRun: true
    },
    main: {
      provider: () =>
        new HDWalletProvider(
          mnemonic,
          'https://mainnet.infura.io/v3/' + process.env.INFURA_API_KEY,
          0,
          10
        ),
      network_id: 1,
      gasPrice: 158000000000,
      timeoutBlocks: 200,
      skipDryRun: true,
      networkCheckTimeout: 999999,
    },
  },
  compilers: {
    solc: {
      version: '^0.8.4',
    },
  },
};
