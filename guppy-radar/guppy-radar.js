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
const tulind = require('tulind');
// const EMA = require('technicalindicators').EMA;


// const getAllCandles = async(interval, limit, currencies) => {
//     const tickers = await binance.allBookTickers();
//     const progressBar = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);
    
//     const filtered = Object.keys(tickers).filter((ticker) => {
//         const result = currencies.filter(currency => ticker.indexOf(currency) > -1);
//         return !!result.length;
//     });
//     const pairs = (filtered && filtered.length) ? filtered : Object.keys(tickers);

//     progressBar.start(pairs.length, 0);
//     let value = 0;
//     const results = [];
//     for(const pair of pairs) {
//         const { askPrice, bidPrice } = tickers[pair];
//         const midMarketPrice = parseFloat(askPrice) - ((parseFloat(askPrice) - parseFloat(bidPrice)) / 2);
//         const fibRetracements = await getFibRetracementsForSymbol(pair, interval, limit);

//         if (fibRetracements) {
//             const lowRange = fibRetracements['0.618'] + ((fibRetracements['0.5'] - fibRetracements['0.618']) / 2);
//             const highRange = fibRetracements['0.382'] - ((fibRetracements['0.382'] - fibRetracements['0.5']) / 2);
        
//             if ((midMarketPrice < highRange && midMarketPrice > fibRetracements['0.5']) || (midMarketPrice > lowRange && midMarketPrice < fibRetracements['0.5'])) {
//                 // console.log(pair + ': ' + midMarketPrice + ' between (' + lowRange + ', ' + highRange + ')');
//                 results.push(pair);
//             }
//         }
//         value += 1;
//         progressBar.update(value);
//     }
//     progressBar.stop();
//     // console.log('COMPLETE');
//     return results;
// } 

const emaIntervals = [3, 5, 8, 10, 12, 15, 30, 35, 40, 45, 50, 60];

const emas = {
     3: 0,
     5: 0,
     8: 0,
    10: 0,
    12: 0,
    15: 0,
    30: 0,
    35: 0,
    40: 0,
    45: 0,
    50: 0,
    60: 0,
}

const compare = ( a, b ) =>  {
  if (a.openTime < b.openTime) return -1;
  if (a.openTime > b.openTime) return 1;
  return 0;
}

const getGuppyHistoryForSymbol = async(symbol, interval, limit) => {
    // Intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
    const candles = await binance.candles({ symbol, interval, limit, endTime: Date.now() });

    const results = [];

    const sorted = candles.sort(compare);

    // let prevEMAs = {};

    // sorted.forEach((candle, index) => {

    //     Object.keys(emas).forEach((interval) => {

    //         const multiplier = (2 / (index + 1));
    //         const prevEMA = prevEMAs === {} ? parseFloat(candle.close) : prevEMAs[interval];
    //         const ema = (parseFloat(candle.close) - prevEMA) * multiplier + prevEMA;

    //         console.log(prevEMA);

    //         prevEMAs[interval] = ema;
    //         emas[interval] = ema;

    //         // console.log(multiplier);
    //     });



    //     console.log(new Date(candle.openTime));
    //     console.log(emas);
    //     console.log();

    //     // if (emaIntervals === Object.keys(emas)) {
    //     //     console.log(candle)
    //     // }
    // });

    const closes = sorted.map(candle => parseFloat(candle.close));
    const ema = await tulind.indicators.ema.indicator([closes], [6]); // 24 hours / 4 hour candles = period of 6

    console.log(ema[0][ema[0].length - 1]);


    return [];


    // const sortedSubList = subList.sort(compare);
    // let highestCandle = null;
    // subList.forEach(c => {
    //     if (!highestCandle) highestCandle = c;
    //     if (parseFloat(c.high) > parseFloat(highestCandle.high)) highestCandle = c;
    // });
    // highestCandle = !highestCandle ? lowest : highestCandle;

    // const highest = parseFloat(highestCandle.high);
    // const difference = parseFloat(highest - lowest);

    // return {
    //       '0.0': highest,
    //     '0.236': lowest + parseFloat((1 - 0.236) * difference),
    //     '0.382': lowest + parseFloat((1 - 0.382) * difference),
    //       '0.5': lowest + parseFloat(0.5 * difference),
    //     '0.618': lowest + parseFloat((1 - 0.618) * difference),
    //     '0.786': lowest + parseFloat((1 - 0.786) * difference),
    //       '1.0': lowest,
    // };
}

// getAllCandles('4h', 1000, ['USDT']).then(result => console.log(result));

getGuppyHistoryForSymbol('BTCUSDT', '4h', 1000).then(result => console.log(result));