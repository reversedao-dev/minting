const fs = require('fs');
const path = require('path');

const { getAllDistros, updateWithAddress } = require('../utils/airtable');

const COMPANY_WALLET = process.env.COMPANY_WALLET;
const VESTING_FACTORY_ADDRESS = process.env.VESTING_FACTORY_ADDRESS;

const STAGE = 'Production';

module.exports = async function (cb) {
  try {
    if (!COMPANY_WALLET || !VESTING_FACTORY_ADDRESS)
      throw new Error('Missing configurations!');

    const distributions = await getAllDistros(STAGE);

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

    const errors = [];

    // create a vesting contract for each distribution
    for (const {
      walletAddress,
      description,
      vestingStartDate,
      vestingCliff = 0,
      vestingEndDate,
      id,
      vestingContractAddress,
    } of distributions) {
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

      if (
        correctVestingAddress === '0x0000000000000000000000000000000000000000'
      ) {
        try {
          console.log(vestingStartDate);
          const start = new Date(vestingStartDate).getTime() / 1000;
          const duration = new Date(vestingEndDate).getTime() / 1000 - start;

          console.log(
            `Creating vesting contract for '${description}' @ ${walletAddress}`
          );

          console.log({
            walletAddress,
            start,
            vestingCliff,
            duration,
            COMPANY_WALLET,
          });

          const result = await factoryInstance.methods
            .create(
              walletAddress,
              start,
              vestingCliff,
              duration,
              true,
              COMPANY_WALLET
            )
            .send({ from });

          const contractAddress = result.events[0].address;

          console.log(
            `Updating airtable with address ${contractAddress} for ${description}`
          );

          await updateWithAddress(STAGE, id, contractAddress);
        } catch (err) {
          console.error(err);
          errors.push({ err, description });
        }
      } else {
        if (correctVestingAddress !== vestingAddressInDatabase) {
          console.log(
            `Updating airtable with address ${correctVestingAddress} for ${description}`
          );
          await updateWithAddress(STAGE, id, correctVestingAddress);
        }
      }
    }
    console.log(errors);
    cb();
  } catch (err) {
    console.log(err);
  }
};
