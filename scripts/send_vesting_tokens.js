const BN = require('bn.js');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const BigNumber = require('bignumber.js');

const { getAllDistros } = require('../utils/airtable');

BigNumber.config({ EXPONENTIAL_AT: 1e9 });

const DECIMALS = new BigNumber(10).exponentiatedBy(18);

const COMPANY_WALLET = process.env.COMPANY_WALLET;
const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS;
const VESTING_FACTORY_ADDRESS = process.env.VESTING_FACTORY_ADDRESS;
const DISPERSE_CONTRACT_ADDRESS = process.env.DISPERSE_CONTRACT_ADDRESS;

module.exports = async function (cb) {
  try {
    if (
      !COMPANY_WALLET ||
      !TOKEN_CONTRACT_ADDRESS ||
      !VESTING_FACTORY_ADDRESS ||
      !DISPERSE_CONTRACT_ADDRESS
    )
      throw new Error('Missing configurations!');

    const distributions = await getAllDistros('Production');

    const disperseContract = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../build/contracts/Disperse.json'),
        'utf8'
      )
    );

    const disperseInstance = new web3.eth.Contract(
      disperseContract.abi,
      DISPERSE_CONTRACT_ADDRESS
    );

    const tokenContract = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../build/contracts/RefinableToken.json'),
        'utf8'
      )
    );

    const tokenInstance = new web3.eth.Contract(
      tokenContract.abi,
      TOKEN_CONTRACT_ADDRESS
    );

    const vestingFactoryContract = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, '../build/contracts/TokenVestingFactory.json'),
        'utf8'
      )
    );

    const factoryInstance = new web3.eth.Contract(
      vestingFactoryContract.abi,
      VESTING_FACTORY_ADDRESS
    );

    const from = (await web3.eth.getAccounts())[1];

    console.log({ from });

    if (!from) throw new Error('No from address');

    const finalCheck = distributions.map(
      ({ vestingContractAddress, walletAddress }) => ({
        vestingContractAddress,
        walletAddress,
      })
    );

    for (const { vestingContractAddress, walletAddress } of finalCheck) {
      const correctVestingAddress = web3.utils.toChecksumAddress(
        await factoryInstance.methods
          .vestingAddress(walletAddress.trim())
          .call()
      );

      const vestingAddressInDatabase = web3.utils.toChecksumAddress(
        vestingContractAddress
      );

      console.log(
        `Vesting address on blockchain is ${correctVestingAddress}, vesting address on airtable is ${vestingAddressInDatabase}`
      );

      if (correctVestingAddress !== vestingAddressInDatabase)
        throw new Error('VESTING CONTRACT ADDRESS MISMATCH!');
    }

    const addresses = distributions.map(({ vestingContractAddress }) =>
      vestingContractAddress.trim()
    );

    if (addresses.filter((a) => !a).length > 0)
      throw new Error('Some addresses are undefined');

    const amounts = distributions.map(({ tokensToVest }) => {
      return new BigNumber(tokensToVest).multipliedBy(DECIMALS);
    });

    console.log({
      addresses,
      amounts: amounts.map((r) => r.toString()),
    });

    const totalAmount = amounts.reduce((a, b) => a.plus(b));

    console.log(`Approving ${totalAmount.toString()} tokens for Disperse`);

    await tokenInstance.methods
      .approve(DISPERSE_CONTRACT_ADDRESS, totalAmount)
      .send({ from });

    console.log(`Approved ${totalAmount.toString()} tokens for Disperse`);

    const receipt = disperseInstance.methods
      .disperseToken(
        TOKEN_CONTRACT_ADDRESS,
        addresses,
        amounts.map((r) => r.toString())
      )
      .send({ from });

    receipt.on('transactionHash', console.log);
    receipt.on('receipt', () => {
      console.log(receipt);

      cb();
    });
  } catch (err) {
    console.log(err);
  }
};
