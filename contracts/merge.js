const { merge } = require('sol-merger');

// Get the merged code as a string
merge('./ERC20.sol').then(console.log);
