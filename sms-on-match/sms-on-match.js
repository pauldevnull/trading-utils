const Binance = require('binance-api-node').default;
const cloneDeep = require('lodash/cloneDeep');
const cryptocurrencies = require('cryptocurrencies');
const flatten = require('lodash/flatten');
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

const separateSymbols = (pair) => {
    const two = pair.substring(0, 2);
    const three = pair.substring(0, 3);
    const four = pair.substring(0, 4);

    const symbols = cryptocurrencies.symbols();

    if (symbols.includes(four)) {
        return { first: four, second: pair.substring(4, pair.length) }
    } else if (symbols.includes(three)) {
        return { first: three, second: pair.substring(3, pair.length) }
    } else if (symbols.includes(two)) {
        return { first: two, second: pair.substring(2, pair.length) }
    }
    return null;
}

const getOpenOrders = async(localOpenOrders) => {
    const openOrders = await binance.openOrders({ useServerTime: true });

    const updatedLocalOpenOrders = cloneDeep(localOpenOrders);
    const localOpenOrderIds = localOpenOrders.binance.map(order => order.orderId);

    for (const openOrder of openOrders) {
        if (!localOpenOrderIds.includes(openOrder.orderId)) {
            updatedLocalOpenOrders.binance.push(openOrder);
            localOpenOrderIds.push(openOrder.orderId);
        }
    }

    localOpenOrders.binance.forEach(async(localOpenOrder, index) => {
        let matchedOpenOrder = openOrders.filter(openOrder => openOrder.orderId === localOpenOrder.orderId);
        matchedOpenOrder = !!matchedOpenOrder && matchedOpenOrder.length === 1 ? matchedOpenOrder[0] : null;

        if (!matchedOpenOrder) {

            updatedLocalOpenOrders.binance.splice(index, 1);

            const tradeHistory = await binance.myTrades({  useServerTime: true, symbol: localOpenOrder.symbol });
            const matchedTrades = tradeHistory.filter(trade => trade.orderId === localOpenOrder.orderId);
            const matchedTrade = matchedTrades && matchedTrades.length === 1 ? matchedTrades[0] : null;

            if (matchedTrade) {
                const { isBuyer, symbol, price, qty, quoteQty } = matchedTrade;
                const separated = separateSymbols(symbol);
                const firstSymbol = separated ? separated.first : '';
                const secondSymbol = separated ? separated.second : '';

                const body = (isBuyer ? 'buy ' : 'sell ') + qty + ' ' + firstSymbol + ' at ' + price + ' ' + secondSymbol + ' for ' + (parseFloat(qty) * parseFloat(price)) + ' ' + secondSymbol;

                const sms = { subject: 'FILLED',  body };
                sendSMS(sms);
            }

        }
    });

    fs.writeFileSync('./open-orders.json', JSON.stringify(updatedLocalOpenOrders, null, 4));
}

setInterval(() => {
    fs.readFile('./open-orders.json', 'utf8', (err, localOpenOrders) => {
        if (err) {
            console.log(err);
        }
        getOpenOrders(JSON.parse(localOpenOrders)).then(result => result);
    });
}, (10  * 1000));