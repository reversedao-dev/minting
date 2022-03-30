const ERC20 = artifacts.require('ERC20');
const TokenVestingFactory = artifacts.require('TokenVestingFactory');
const TokenVesting = artifacts.require('TokenVesting');

const truffleAssert = require('truffle-assertions');

const { duration, getParamFromTxEvent } = require('./utils');

const { BN } = web3.utils;

contract('TokenVestingFactory', (accounts) => {
  const amount = new BN(10000);
  const owner = accounts[1];
  const beneficiary = accounts[0];
  const tokenDeployer = accounts[2];

  before(async function () {
    this.token = await ERC20.new(
      'Test',
      'TEST',
      new BN('500000000000000000000000000', 10),
      { from: tokenDeployer }
    );
    this.factory = await TokenVestingFactory.new({ from: tokenDeployer });

    this.start =
      (await web3.eth.getBlock('latest')).timestamp + duration.minutes(1); // +1 minute so it starts after contract instantiation

    this.cliff = duration.years(1);
    this.duration = duration.years(2);
  });

  it('creates a token vesting contract', async function () {
    const result = await this.factory.create(
      beneficiary,
      this.start,
      this.cliff,
      this.duration,
      true,
      owner,
      { from: owner }
    );

    truffleAssert.eventEmitted(result, 'ContractInstantiation');
  });

  it('reverts when recreating contract with the same beneficiary', async function () {
    await truffleAssert.reverts(
      this.factory.create(
        beneficiary,
        this.start,
        this.cliff,
        this.duration,
        true,
        owner,
        { from: owner }
      )
    );
  });

  it('has the correct owner', async function () {
    const result = await this.factory.create(
      accounts[5],
      this.start,
      this.cliff,
      this.duration,
      true,
      owner,
      { from: owner }
    );

    const address = getParamFromTxEvent(result, 'instantiation');

    const contractInstance = await TokenVesting.at(address);

    const actualOwner = await contractInstance.owner.call();

    assert.ok(actualOwner === owner);
  });

  it('allows msg.sender to find its contract address', async function () {
    const result = await this.factory.create(
      accounts[6],
      this.start,
      this.cliff,
      this.duration,
      true,
      owner,
      { from: owner }
    );

    const address = getParamFromTxEvent(result, 'instantiation');

    const returnedAddress = await this.factory.getVestingAddress.call({
      from: accounts[6],
    });

    assert.ok(address === returnedAddress);
  });
});
