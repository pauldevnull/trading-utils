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
const CoinbasePro = require('coinbase-pro');
const coinbaseProClient = new CoinbasePro.AuthenticatedClient(
    settings.exchange.coinbase.key,
    settings.exchange.coinbase.secret,
    settings.exchange.coinbase.passphrase,
    settings.exchange.coinbase.apiURI,
);

// TODO: get total invested for coinbase

// const getCoinbaseInvested = async() => {
    
// }

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

const getBinanceBalances = async() => {
    return binance.accountInfo({ useServerTime: true }).then((result) => {
        return result.balances.filter(cur => (parseFloat(cur.free) + parseFloat(cur.locked)) > 0)
            .reduce((acc, cur) => {
                acc[cur.asset] = parseFloat(cur.free) + parseFloat(cur.locked);
                return acc;
            }, {});
    });
}

// const getCoinbaseBalances = async() => {
//     return new Promise((resolve, reject) => {
//             coinbaseProClient.getCoinbaseAccounts().then(result => {
//                 resolve(result.reduce((obj, item) => {
//                     obj[item.currency] = item.balance
//                     return obj;
//                 }));
//             }).catch(error => console.log(error));
//         }, {}).then((result) => {
//             const balanceFields = omit(result, [
//                 'id',
//                 'name',
//                 'balance',
//                 'currency',
//                 'type',
//                 'primary',
//                 'active',
//                 'destination_tag_name',
//                 'destination_tag_regex',
//                 'hold_balance',
//                 'hold_currency',
//             ]);
//             return Object.entries(balanceFields)
//                 .filter(entry => entry[1] && parseFloat(entry[1]) > 0)
//                 .reduce((acc, entry) => { 
//                     acc[entry[0]] = parseFloat(entry[1]);
//                     return acc;
//                 }, {});
//         });
// }

// const getCoinbaseProBalances = async() => {
//     return new Promise((resolve, reject) => {
//             coinbaseProClient.getCoinbaseProAccounts().then(result => {
//                 resolve(result.reduce((obj, item) => {
//                     obj[item.currency] = item.balance
//                     return obj;
//                 }));
//             }).catch(error => console.log(error));
//         }, {}).then((result) => {
//             const balanceFields = omit(result, [
//                 'id',
//                 'name',
//                 'balance',
//                 'currency',
//                 'type',
//                 'primary',
//                 'active',
//                 'destination_tag_name',
//                 'destination_tag_regex',
//                 'hold_balance',
//                 'hold_currency',
//             ]);
//             return Object.entries(balanceFields)
//                 .filter(entry => entry[1] && parseFloat(entry[1]) > 0)
//                 .reduce((acc, entry) => { 
//                     acc[entry[0]] = parseFloat(entry[1]);
//                     return acc;
//                 }, {});
//         });
// }

const getTotalBalance = async() => {
    const quotesPromise = coinMarketCapClient.get('https://api.coinmarketcap.com/v2/ticker?convert=BTC').then((result) => {
        return result.data.data;
    });
    const binancePromise = getBinanceBalances();
    // const coinbasePromise = getCoinbaseBalances();
    // const [quotes, binanceBalances, coinbaseBalances] = await Promise.all([quotesPromise, binancePromise, coinbasePromise]);
    const [quotes, binanceBalances] = await Promise.all([quotesPromise, binancePromise]);

    const allCoins = Array.from(new Set(Object.keys(binanceBalances)));
    const balances = allCoins.map((coin) => {
        return { asset: coin, balance: get(binanceBalances, coin, 0) }
    });

    // const allCoins = Array.from(new Set(Object.keys(binanceBalances).concat(Object.keys(coinbaseBalances))));
    // const balances = allCoins.map((coin) => {
    //     return { asset: coin, balance: (get(binanceBalances, coin, 0) + get(coinbaseBalances, coin, 0)) }
    // });

    const currencies = ['USD', 'BTC'];
    return balances.reduce((acc, cur) => {
        const quote = Object.values(quotes).filter(quote => !!quote && quote.symbol === cur.asset);
        ['USD', 'BTC'].forEach((currency) => {
            const quotePrice = quote.length && quote[0] && quote[0].quotes[currency].price;
            if (!acc[currency]) acc[currency] = 0;
            acc[currency] += (cur.balance * quotePrice);
        });
        return pick(acc, currencies);
    }, {});
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

// getCoinbaseBalances().then(result => console.log(result));

// getCoinbaseBalances().then(result => console.log(result));

// getTotalBalance().then(result => console.log(result));
