#!/usr/bin/env node

const Binance = require('binance-api-node').default;
const binance = Binance({
    apiKey: settings.exchange.binance.key,
    apiSecret: settings.exchange.binance.secret,
});
const settings = require('../settings.json');
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

// get last 507 (500) candles for 15 minute chart

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
