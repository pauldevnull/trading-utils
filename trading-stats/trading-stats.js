const get = require('lodash/get');
const pick = require('lodash/pick');
const omit = require('lodash/omit');
const Binance = require('binance-api-node').default;
const fs = require("fs");
const contents = fs.readFileSync('../settings.json');
const settings = JSON.parse(contents);
const binance = Binance({
    apiKey: settings.exchange.binance.key,
    apiSecret: settings.exchange.binance.secret,
});
const cryptocompare = require('cryptocompare');
cryptocompare.setApiKey(settings.exchange.cryptocompare.key);
const axios = require('axios');
const coinMarketCapClient = axios.create({
    baseURL: 'https://pro-api.coinmarketcap.com/v1',
    timeout: 1000,
    headers: {
        'X-CMC_PRO_API_KEY': settings.exchange.coinmarketcap.key
    },
    qs: {
        start: 1,
        limit: 5000,
        convert: 'BTC'
    },
});

const getTotalInvested = async() => {
    const options = { useServerTime: true };
    const currencies = ['USD', 'BTC'];
    const binancePromises = [binance.depositHistory(options), binance.withdrawHistory(options)];
    const [ deposits, withdraws ] = await Promise.all(binancePromises);
    const depositsAndWithdraws = deposits.depositList.concat(withdraws.withdrawList);
    const historicalPricePromises = depositsAndWithdraws.map((transaction) => {
        const { asset, amount } = transaction;
        const transactionDate = new Date(get(transaction, 'insertTime', get(transaction, 'successTime')));
        return cryptocompare.priceHistorical(asset, currencies, transactionDate).catch(error => console.log(error)).then((result) => {
            result.isDeposit = 'insertTime' in transaction;
            currencies.forEach(currency => result[currency] = (result[currency] * amount) || 0);
            return result;
        });
    });
    const historicalPrices = await Promise.all(historicalPricePromises)
    return historicalPrices.reduce((acc, cur) => {
        currencies.forEach(currency => cur.isDeposit ? acc[currency] += cur[currency] : acc[currency] -= cur[currency]);
        return omit(acc, 'isDeposit');
    });
}

const getTotalBalance = async() => {
    const quotesPromise = coinMarketCapClient.get('https://api.coinmarketcap.com/v2/ticker?convert=BTC').then((result) => {
        return result.data.data;
    });
    const binancePromise = binance.accountInfo({ useServerTime: true }).then((result) => {
        return result.balances
    });
    const [quotes, balances] = await Promise.all([quotesPromise, binancePromise]);
    const positiveBalances = balances.filter(balance => (parseFloat(balance.free) + parseFloat(balance.locked)) > 0);
    const currencies = ['USD', 'BTC'];
    return positiveBalances.reduce((acc, cur) => {
        const { asset, free, locked } = cur;
        const total = parseFloat(free) + parseFloat(locked);
        const quote = Object.values(quotes).filter(quote => !!quote && quote.symbol === asset);
        currencies.forEach((currency) => {
            const quotePrice = quote.length && quote[0] && quote[0].quotes[currency].price;
            if (!acc[currency]) acc[currency] = 0;
            acc[currency] += (total * quotePrice);
        });
        return pick(acc, currencies);
    });
}

const getTradingSummary = async() => {
    const [ totalInvested, totalBalance ] = await Promise.all([getTotalInvested(), getTotalBalance()]);
    return ['USD', 'BTC'].map((currency) => {
        const invested = totalInvested[currency];
        const balance = totalBalance[currency];
        const profit = balance - invested;
        return { currency, invested, balance, profit };
    });
}


getTradingSummary().then(result => console.log(result));
