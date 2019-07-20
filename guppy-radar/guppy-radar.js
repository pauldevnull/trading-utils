#!/usr/bin/env node

const Binance = require('binance-api-node').default;
const cliProgress = require('cli-progress');
const cryptocurrencies = require('cryptocurrencies');
const settings = require('../settings.json');
const binance = Binance({
    apiKey: settings.exchange.binance.key,
    apiSecret: settings.exchange.binance.secret,
});
const cloneDeep = require('lodash/cloneDeep');
const isEqual = require('lodash/isEqual');
const tulind = require('tulind');


const emaIntervals = [30, 35, 40, 45, 50, 60];

Array.prototype.isSorted = function() {
  return (function(direction) {
    return this.reduce(function(prev, next, i, arr) {
      if (direction === undefined)
        return (direction = prev <= next ? 1 : -1) || true;
      else
        return (direction + 1 ?
          (arr[i-1] <= next) : 
          (arr[i-1] >  next));
    }) ? Number(direction) : false;
  }).call(this);
}

const compare = ( a, b ) =>  {
  if (a.openTime < b.openTime) return -1;
  if (a.openTime > b.openTime) return 1;
  return 0;
}


const intervalToHours = {
    '1m': (1/60),
    '3m': (3/60),
    '5m': (5/60),
    '15m': (15/60),
    '30m': (30/60),
    '1h': (1),
    '2h': (2),
    '4h': (4),
    '6h': (6),
    '8h': (8),
    '12h': (12),
    '1d': (24),
    '3d': (24 * 3),
    '1w': (24 * 7),
    '1M': (24 * 28),
}


const getGuppyHistoryForSymbol = async(symbol, interval, limit) => {
    // Intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
    const results = [];

    let date = Date.now();
    let counter = 0;
    let result = await binance.candles({ symbol, interval, limit, endTime: date });
    let candles = new Set(result);

    counter += 1;
    while (!!result && result.length) {
        date = date - (60 * 1000 * 60 * (intervalToHours[interval]) * result.length); // 60 * 1000 * 60 * 4 = 4 hours
        result = await binance.candles({ symbol, interval, limit, endTime: date });
        candles = new Set(Array.from(candles).concat(result));
        // console.log('Request End Time: ' + date);
    }

    const sorted = Array.from(candles).sort(compare);

    // console.log('Total Candles: ' + sorted.length);

    // const progressBar = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);
    // progressBar.start(sorted.length, 0);


    let color = null;    
    // const closes = sorted.map(candle => parseFloat(candle.close));

    for (let i = 0; i < sorted.length; i++) {
        const subSorted = sorted.slice(0, i + 1);
        const closes = subSorted.map(candle => parseFloat(candle.close));
        const getEma = async(period) => await tulind.indicators.ema.indicator([closes], [period]); 

        const emas = await Promise.all(emaIntervals.map(interval => getEma(interval)));
        const values = emas.map(ema => ema[0][ema[0].length - 1]);

        const isSorted = values.isSorted();
        const isRed = isSorted === 1;
        const isGreen = isSorted === -1;
        const isGrey = !isRed && !isGreen;

        const mostRecentCandle = subSorted[subSorted.length - 1];
        const timestamp = new Date(mostRecentCandle.openTime);
        const price = parseFloat(mostRecentCandle.close);

        if (isGreen && color !== 'green') {
            // console.log(new Date(subSorted[subSorted.length - 1].openTime) + ': green');
            color = 'green';
            results.push({ timestamp, color, price });
        }
        if (isRed && color !== 'red') {
            // console.log(new Date(subSorted[subSorted.length - 1].openTime) + ': red');
            color = 'red';
            results.push({ timestamp, color, price });
        }
        if (isGrey && color !== 'grey') {
            // console.log(new Date(subSorted[subSorted.length - 1].openTime) + ': grey');
            color = 'grey';
            results.push({ timestamp, color, price });
        }
        if (i % 5000 === 0) console.log(i + ' of ' + sorted.length);
        // progressBar.update(i);

    }
    // progressBar.stop();

    return { candles: sorted, guppy: results };
}


const backtest = async(pair, interval) => {
    const startingUsdBalance = 1000;

    const { candles, guppy } = await getGuppyHistoryForSymbol(pair, interval, 1000);
    console.log('Guppy Length: ' + guppy.length);

    // console.log(new Date(candles[0].openTime));
    // console.log(new Date(candles[candles.length - 1].openTime));

    const buyAndHoldBtcAmount = (startingUsdBalance / parseFloat(candles[0].close));
    const buyAndHoldUsdRevenue = (parseFloat(candles[candles.length - 1].close) * buyAndHoldBtcAmount);
    const buyAndHoldRevenue = {
        BTC: buyAndHoldBtcAmount,
        USD: buyAndHoldUsdRevenue,
    }

    const buyAndHoldUsdProfit = buyAndHoldUsdRevenue - startingUsdBalance;

    let usdBalance = startingUsdBalance;
    let currentBtcBalance = 0;
    let strategyProfit = 0;
    let lastColor = null;

    guppy.forEach((result) => {
        if (lastColor != result.color) {
            if (result.color === 'green') {
                // Buy BTC
                currentBtcBalance += (usdBalance / result.price);
                usdBalance -= usdBalance;
            } else if (result.color === 'red') {
                // Sell BTC
                usdBalance += currentBtcBalance * result.price;
                currentBtcBalance -= currentBtcBalance;
            }
            // console.log('usd: ' + usdBalance + ', btc: ' + currentBtcBalance);
            lastColor = result.color;
        }
    });

    if (currentBtcBalance > 0) usdBalance += (currentBtcBalance * guppy[guppy.length - 1].price);

    const guppyUsdProfit = usdBalance - startingUsdBalance;



    console.log('    Interval: ' + interval);
    console.log('Buy And Hold: $' + buyAndHoldUsdProfit);
    console.log('       Guppy: $' + guppyUsdProfit);
    // console.log('Percent Diff: ' + (1 - (buyAndHoldUsdProfit / guppyUsdProfit)) * 100 + '%');
    console.log('');
}



// getAllCandles('4h', 1000, ['USDT']).then(result => console.log(result));
// getGuppyHistoryForSymbol('BTCUSDT', '4h', 1000).then(results => console.log(results.slice(60, results.length)));

// Intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M

// backtest('BTCUSDT', '1m').then(result => null);
// backtest('BTCUSDT', '3m').then(result => null);
backtest('BTCUSDT', '5m').then(result => null);
// backtest('BTCUSDT', '15m').then(result => null);
// backtest('BTCUSDT', '30m').then(result => null);

// backtest('BTCUSDT', '1h').then(result => null);
// backtest('BTCUSDT', '2h').then(result => null);
// backtest('BTCUSDT', '4h').then(result => null);
// backtest('BTCUSDT', '6h').then(result => null);
// backtest('BTCUSDT', '8h').then(result => null);
// backtest('BTCUSDT', '12h').then(result => null);
// backtest('BTCUSDT', '1d').then(result => null);
// backtest('BTCUSDT', '3d').then(result => null);
// backtest('BTCUSDT', '1w').then(result => null);
// backtest('BTCUSDT', '1M').then(result => null);


/*
    - is it accurate?
    - what is the best time interval?
    - get average green length and average red length
    - use averages to buy or sell on intra-intervals during trend
    - local candles and append/refresh candle functions
    - local guppy and append/refresh guppy functions
    - automatic trading
    - persisted state

*/
