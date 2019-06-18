const Binance = require('binance-api-node').default
const bitcoinaverage = require('bitcoinaverage');

const fs = require("fs");
const contents = fs.readFileSync('../settings.json');
const settings = JSON.parse(contents);

const binance = Binance({
  apiKey: settings.exchange.binance.key,
  apiSecret: settings.exchange.binance.secret,
  // getTime: xxx // time generator function, optional, defaults to () => Date.now()
});

const cc = require('cryptocompare')
cc.setApiKey(settings.exchange.cryptocompare.key);


const getDeposits = async() => {
    const results = await binance.depositHistory();
    let totalUSD = 0;
    let totalBTC = 0;
    for (const deposit of results.depositList) {
        const { asset, amount, insertTime } = deposit;
        const priceHistorical = await cc.priceHistorical(asset, ['USD', 'BTC'], new Date(insertTime)).catch(error => console.log(error));;
        totalUSD += (priceHistorical.USD * amount) || 0;
        totalBTC += (priceHistorical.BTC * amount) || 0;
    }
    return { USD: totalUSD, BTC: totalBTC };
}

const getWithdraws = async() => {
    const results = await binance.withdrawHistory();
    let totalUSD = 0;
    let totalBTC = 0;
    for (const withdraw of results.withdrawList) {
        const { asset, amount, successTime } = withdraw;
        const priceHistorical = await cc.priceHistorical(asset, ['USD', 'BTC'], new Date(successTime)).catch(error => console.log(error));
        totalUSD += (priceHistorical.USD * amount) || 0;
        totalBTC += (priceHistorical.BTC * amount) || 0;
    }
    return { USD: totalUSD, BTC: totalBTC };
}

const getTotalFunds = async() => {
    const depositTotal = await getDeposits();
    const withdrawTotal = await getWithdraws();

    return { USD: (depositTotal.USD - withdrawTotal.USD), BTC: (depositTotal.BTC - withdrawTotal.BTC) };
}

getTotalFunds().then(result => console.log(result));
