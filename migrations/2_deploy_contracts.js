const ERC20 = artifacts.require('ERC20');
const TokenVestingFactory = artifacts.require('TokenVestingFactory');

module.exports = function (deployer, _network, accounts) {
  console.log('deploy contract', {
    deployer: deployer,
    accounts: accounts,
    network: _network
  })
  try {
    // console.log({accounts});
    deployer.deploy(
      ERC20,
      'ReverseDao',
      'RDAO',
      '200000000000000000000000000', //200 million
      { gas: 1600000 }
    );

  } catch (err) {
    console.error('Error in deploying contract', err);
  }
};