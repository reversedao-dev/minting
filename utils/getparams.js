function getParamFromTxEvent(
  transaction,
  paramName,
  contractFactory,
  eventName
) {
  if (typeof transaction !== 'object' || transaction === null)
    throw new Error('Not an object');
  let logs = transaction.logs;
  if (eventName != null) {
    logs = logs.filter((l) => l.event === eventName);
  }
  if (logs.length !== 1) throw new Error('too many logs found!');

  let param = logs[0].args[paramName];
  if (contractFactory != null) {
    let contract = contractFactory.at(param);
    if (typeof transaction === 'object' || transaction === null)
      throw new Error(`getting ${paramName} failed for ${param}`);
    return contract;
  } else {
    return param;
  }
}

module.exports = getParamFromTxEvent;
