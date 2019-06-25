#!/usr/bin/env node

const Binance = require('binance-api-node').default;
const cloneDeep = require('lodash/cloneDeep');
const fs = require('fs');
const nodemailer = require('nodemailer');
const settings = require('../settings.json');
const binance = Binance({
    apiKey: settings.exchange.binance.key,
    apiSecret: settings.exchange.binance.secret,
});
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: settings.service.gmail.email,
        pass: settings.service.gmail.password,
  }
});
const ora = require('ora');

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

const checkAlerts = async(alerts) => {
    const tickers = await binance.allBookTickers();
    alerts.binance.forEach((alert, index) => {
        const { pair, condition, trigger, triggered } = alert;
        
        if (!triggered && ['price-above', 'price-below'].includes(condition)) {
            const { askPrice, bidPrice } = tickers[pair];
            const midMarketPrice = parseFloat(askPrice) - ((parseFloat(askPrice) - parseFloat(bidPrice)) / 2);
            
            if (condition === 'price-above') {
                if (midMarketPrice >= trigger) {
                    const body = 'Binance: ' + pair + ' crossed above ' + trigger;
                    const sms = { subject: 'PRICE',  body };
                    sendSMS(sms);
                    const updatedAlerts = cloneDeep(alerts);
                    // updatedAlerts.binance.splice(index, 1);
                    updatedAlerts.binance[index].triggered = true;
                    fs.writeFileSync('./alerts.json', JSON.stringify(updatedAlerts, null, 4));
                }
            } else {
                if (midMarketPrice <= trigger) {
                    const body = 'Binance: ' + pair + ' crossed below ' + trigger;
                    const sms = { subject: 'PRICE',  body };
                    sendSMS(sms);
                    const updatedAlerts = cloneDeep(alerts);
                    // updatedAlerts.binance.splice(index, 1);
                    updatedAlerts.binance[index].triggered = true;
                    fs.writeFileSync('./alerts.json', JSON.stringify(updatedAlerts, null, 4));
                }
            }
        }
    });
}


console.log();
const spinner = ora('Detecting price alerts...').start();

setInterval(() => {
    fs.readFile('./alerts.json', 'utf8', (err, alerts) => {
        if (err) {
            console.log(err);
        }
        checkAlerts(JSON.parse(alerts)).then(result => result);
    });
}, (10  * 1000));
