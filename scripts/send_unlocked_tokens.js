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

    const from = (await web3.eth.getAccounts())[1];

    console.log({ from });

    if (!from) throw new Error('No from address');

    const addresses = distributions.map(({ walletAddress }) => walletAddress);

    const amounts = distributions.map(({ upFrontTokens }) => {
      return new BigNumber(upFrontTokens).multipliedBy(DECIMALS);
    });

    console.log({
      addresses,
      amounts: amounts.map((r) => r.toString()),
    });

    const totalAmount = amounts.reduce((a, b) => a.plus(b));

    // console.log(`Approving ${totalAmount.toString()} tokens for Disperse`);

    // const ttt = tokenInstance.methods
    //   .approve(DISPERSE_CONTRACT_ADDRESS, totalAmount)
    //   .send({ from });

    // ttt.on('transactionHash', (hash) => {
    //   console.log('Approval tx hash:', hash);
    //   cb();
    // });

    // console.log(`Approved ${totalAmount.toString()} tokens for Disperse`);

    console.log(`Sending ${totalAmount.toString()} tokens via Disperse...`);

    const receipt = disperseInstance.methods
      .disperseToken(
        TOKEN_CONTRACT_ADDRESS,
        addresses,
        amounts.map((r) => r.toString())
      )
      .send({ from });

    receipt.on('transactionHash', (hash) => {
      console.log('Disperse tx hash:', hash);
      cb();
    });

    // cb();
  } catch (err) {
    console.log(err);
  }
};
