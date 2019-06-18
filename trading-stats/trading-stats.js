const Binance = require('binance-api-node').default

const fs = require("fs");
const contents = fs.readFileSync('../settings.json');
const settings = JSON.parse(contents);

const binance = Binance({
  apiKey: settings.exchange.binance.key,
  apiSecret: settings.exchange.binance.secret,
  // getTime: xxx // time generator function, optional, defaults to () => Date.now()
})

const getDeposits = async() => {
    const deposits = {};
    const results = await binance.depositHistory();
    results.depositList.forEach((deposit) => {
        const { asset, amount } = deposit;
        deposits[asset] = (asset in deposits) ? deposits[asset] + amount : amount;
    });
    return deposits;
}

const getWithdraws = async() => {
    const withdraws = {};
    const results = await binance.withdrawHistory();
    results.withdrawList.forEach((withdraw) => {
        const { asset, amount } = withdraw;
        withdraws[asset] = (asset in withdraws) ? withdraws[asset] + amount : amount;
    });
    return withdraws;
}

const getTotalFunds = async() => {
    const deposits = await getDeposits();
    const withdraws = await getWithdraws();

}

getTotalFunds().then(result => console.log(''));
