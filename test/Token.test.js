const ERC20 = artifacts.require('ERC20');
const BN = require('bn.js');

const deployERC20 = () => {
  return ERC20.new('Test', 'TEST', new BN('500000000000000000000000000', 10));
};

contract('ERC20', (accounts) => {
  let tokenInstance;

  before(async () => {
    tokenInstance = await deployERC20();
    assert.ok(tokenInstance);
  });

  it('should put 500 million Tokens in the first account', async () => {
    const balance = await tokenInstance.balanceOf.call(accounts[0]);
    assert(
      balance.valueOf().eq(new BN('500000000000000000000000000', 10)),
      "500000000 wasn't in the first account"
    );
  });

  it('should send coin correctly', () => {
    let refinable = tokenInstance;

    // Get initial balances of first and second account.
    const account_one = accounts[0];
    const account_two = accounts[1];

    let account_one_starting_balance;
    let account_two_starting_balance;
    let account_one_ending_balance;
    let account_two_ending_balance;

    const amount = new BN('1000000000000000000', 10);

    return refinable.balanceOf
      .call(account_one)
      .then((balance) => {
        account_one_starting_balance = balance;
        return refinable.balanceOf.call(account_two);
      })
      .then((balance) => {
        account_two_starting_balance = balance;
        return refinable.transfer(account_two, amount, { from: account_one });
      })
      .then(() => refinable.balanceOf.call(account_one))
      .then((balance) => {
        account_one_ending_balance = balance;
        return refinable.balanceOf.call(account_two);
      })
      .then((balance) => {
        account_two_ending_balance = balance;

        assert(
          account_one_ending_balance.eq(
            account_one_starting_balance.sub(amount)
          ),
          "Amount wasn't correctly taken from the sender"
        );
        assert(
          account_two_ending_balance.eq(
            account_two_starting_balance.add(amount)
          ),
          "Amount wasn't correctly sent to the receiver"
        );
      });
  });
});
