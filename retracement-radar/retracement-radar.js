#!/usr/bin/env node

const Binance = require('binance-api-node').default;
const cliProgress = require('cli-progress');
const cryptocurrencies = require('cryptocurrencies');
const settings = require('../settings.json');
const binance = Binance({
    apiKey: settings.exchange.binance.key,
    apiSecret: settings.exchange.binance.secret,
});
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: settings.service.gmail.email,
        pass: settings.service.gmail.password,
  }
});

const sendSMS = (sms) => {
    const mailOptions = {
        from: settings.service.gmail.email,
        to: settings.service.gmail.receiver,
        subject: sms.subject,
        text: sms.body,
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

const compare = ( a, b ) =>  {
  if (a.low < b.low) return -1;
  if (a.low > b.low) return 1;
  return 0;
}

const compareTime = ( a, b ) =>  {
  if (a.openTime < b.openTime) return -1;
  if (a.openTime > b.openTime) return 1;
  return 0;
}

// TODO: profit score
const getAllCandles = async(interval, limit, currencies) => {
    const tickers = await binance.allBookTickers();
    const progressBar = new cliProgress.Bar({}, cliProgress.Presets.shades_classic);
    
    const filtered = Object.keys(tickers).filter((ticker) => {
        const result = currencies.filter(currency => ticker.indexOf(currency) > -1);
        return !!result.length;
    });
    const pairs = (filtered && filtered.length) ? filtered : Object.keys(tickers);

    progressBar.start(pairs.length, 0);
    let value = 0;
    const results = [];
    for(const pair of pairs) {
        const { askPrice, bidPrice } = tickers[pair];
        const midMarketPrice = parseFloat(askPrice) - ((parseFloat(askPrice) - parseFloat(bidPrice)) / 2);
        const fibRetracements = await getFibRetracementsForSymbol(pair, interval, limit);

        if (fibRetracements) {
            const lowRange = fibRetracements['0.618'] + ((fibRetracements['0.5'] - fibRetracements['0.618']) / 2);
            const highRange = fibRetracements['0.382'] - ((fibRetracements['0.382'] - fibRetracements['0.5']) / 2);
        
            if ((midMarketPrice < highRange && midMarketPrice > fibRetracements['0.5']) || (midMarketPrice > lowRange && midMarketPrice < fibRetracements['0.5'])) {
                // console.log(pair + ': ' + midMarketPrice + ' between (' + lowRange + ', ' + highRange + ')');
                results.push(pair);
            }
        }
        value += 1;
        progressBar.update(value);
    }
    progressBar.stop();
    // console.log('COMPLETE');
    return results;
} 

const getFibRetracementsForSymbol = async(symbol, interval, limit) => {
    // Intervals: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
    const candles = await binance.candles({ symbol, interval, limit, endTime: Date.now() });

    const sorted = candles.sort(compare);
    const lowest = parseFloat(sorted[0].low);
    const subList = candles.filter(candle => candle.openTime > sorted[0].openTime);

    // const sortedSubList = subList.sort(compare);
    let highestCandle = null;
    subList.forEach(c => {
        if (!highestCandle) highestCandle = c;
        if (parseFloat(c.high) > parseFloat(highestCandle.high)) highestCandle = c;
    });
    highestCandle = !highestCandle ? lowest : highestCandle;

    const highest = parseFloat(highestCandle.high);
    const difference = parseFloat(highest - lowest);

    return {
          '0.0': highest,
        '0.236': lowest + parseFloat((1 - 0.236) * difference),
        '0.382': lowest + parseFloat((1 - 0.382) * difference),
          '0.5': lowest + parseFloat(0.5 * difference),
        '0.618': lowest + parseFloat((1 - 0.618) * difference),
        '0.786': lowest + parseFloat((1 - 0.786) * difference),
          '1.0': lowest,
    };
}


getAllCandles('30m', 1000, ['USDT']).then(result => console.log(result));


// get last 507 (500) candles for 15 minute chart 
// (or 1500 candles for 3 minute chart)
// (or 125 for 1 hour chart)
// (or 31.25 for 4 hour chart)

// first click: 1
// 0.786
// 0.618
// 0.5
// 0.382
// 0.236
// second click: 0

// for each symbol...
// draw the first click (1) on the lowest price candle
// draw the second click (0) on the highest price candle
// if the current price is NEAR the 0.5 OR 0.618, then alert pair!
