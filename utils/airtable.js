require('dotenv').config();

const Airtable = require('airtable');

const AIRTABLE_BASE = process.env.AIRTABLE_BASE;

function camelize(str) {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

function hasDuplicates(array) {
  return new Set(array).size !== array.length;
}

const base = new Airtable().base(AIRTABLE_BASE);

const getAllDistros = async (stage) => {
  const raw = await base(`TGE Distribution (${stage})`)
    .select({ view: 'Filtered (removes NA)' })
    .all();

  const result = raw.map((item) => {
    const newObj = {};
    Object.keys(item.fields).forEach(
      (key) => (newObj[camelize(key)] = item.fields[key])
    );
    newObj['id'] = item.id;
    return newObj;
  });

  const addresses = result.map(({ walletAddress }) => walletAddress);

  if (hasDuplicates(addresses)) throw new Error('Addresses have duplicates!');

  return result;
};

const updateWithAddress = async (stage, id, address) => {
  await base(`TGE Distribution (${stage})`).update([
    {
      id,
      fields: {
        'Vesting Contract Address': address,
      },
    },
  ]);
};

const updateAsRegistered = async (stage, id) => {
  await base(`TGE Distribution (${stage})`).update([
    {
      id,
      fields: {
        registered: true,
      },
    },
  ]);
};

module.exports = { getAllDistros, updateWithAddress, updateAsRegistered };
