const ERC20 = artifacts.require('ERC20');
const TokenVesting = artifacts.require('TokenVesting');

const truffleAssert = require('truffle-assertions');

const { duration, increaseTimeTo } = require('./utils');

const { BN } = web3.utils;

contract('TokenVesting', (accounts) => {
  const amount = new BN(10000);
  const owner = accounts[1];
  const beneficiary = accounts[0];
  const tokenDeployer = accounts[2];

  beforeEach(async function () {
    this.token = await ERC20.new(
      'Test',
      'TEST',
      new BN('500000000000000000000000000', 10),
      { from: tokenDeployer }
    );

    this.start =
      (await web3.eth.getBlock('latest')).timestamp + duration.minutes(1); // +1 minute so it starts after contract instantiation

    this.cliff = duration.years(1);
    this.duration = duration.years(2);

    this.vesting = await TokenVesting.new(
      beneficiary,
      this.start,
      this.cliff,
      this.duration,
      true,
      owner,
      { from: owner }
    );

    // transfer tokens to vesting contract
    await this.token.transfer(this.vesting.address, amount, {
      from: tokenDeployer,
    });
  });

  it('cannot be released before cliff', async function () {
    await truffleAssert.reverts(this.vesting.release(this.token.address));
  });

  it('can be released after cliff', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(1));
    const result = await this.vesting.release(this.token.address);

    truffleAssert.eventEmitted(result, 'TokensReleased');
  });

  it('should release proper amount after cliff', async function () {
    await increaseTimeTo(this.start + this.cliff);

    const { receipt } = await this.vesting.release(this.token.address);

    const releaseTime = (await web3.eth.getBlock(receipt.blockNumber))
      .timestamp;

    const balance = await this.token.balanceOf(beneficiary);

    const elapsed = new BN(releaseTime - this.start);

    const durationBN = new BN(this.duration);

    assert.ok(balance.eq(amount.mul(elapsed).div(durationBN)));
  });

  it('should linearly release tokens during vesting period', async function () {
    const vestingPeriod = this.duration - this.cliff;
    const checkpoints = 4;

    for (let i = 1; i <= checkpoints; i++) {
      const now = this.start + this.cliff + i * (vestingPeriod / checkpoints);
      await increaseTimeTo(now);

      await this.vesting.release(this.token.address);
      const balance = await this.token.balanceOf(beneficiary);
      const expectedVesting = amount
        .mul(new BN(now - this.start))
        .div(new BN(this.duration));

      assert.ok(balance.eq(expectedVesting));
    }
  });

  it('should have released all after end', async function () {
    await increaseTimeTo(this.start + this.duration);
    await this.vesting.release(this.token.address);
    const balance = await this.token.balanceOf(beneficiary);
    assert.ok(balance.eq(amount));
  });

  it('should be revoked by owner if revocable is set', async function () {
    const result = await this.vesting.revoke(this.token.address, {
      from: owner,
    });

    truffleAssert.eventEmitted(result, 'TokenVestingRevoked');
  });

  it('should fail to be revoked by owner if revocable not set', async function () {
    const vesting = await TokenVesting.new(
      beneficiary,
      this.start,
      this.cliff,
      this.duration,
      false,
      owner,
      { from: owner }
    );

    await truffleAssert.reverts(
      vesting.revoke(this.token.address, { from: owner })
    );
  });

  it('should return the non-vested tokens when revoked by owner', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(12));

    const vested = await this.vesting.getVestedAmount(this.token.address);

    await this.vesting.revoke(this.token.address, { from: owner });

    const ownerBalance = await this.token.balanceOf(owner);

    assert.ok(ownerBalance.eq(amount.sub(vested)));
  });

  it('should keep the vested tokens when revoked by owner', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(12));

    const vestedPre = await this.vesting.getVestedAmount(this.token.address);

    await this.vesting.revoke(this.token.address, { from: owner });

    const vestedPost = await this.vesting.getVestedAmount(this.token.address);

    assert.ok(vestedPre.eq(vestedPost));
  });

  it('should fail to be revoked a second time', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(12));

    await this.vesting.getVestedAmount(this.token.address);

    await this.vesting.revoke(this.token.address, { from: owner });

    await truffleAssert.reverts(
      this.vesting.revoke(this.token.address, { from: owner })
    );
  });
});
