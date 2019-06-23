#!/usr/bin/env node

const args = require('minimist')(process.argv.slice(2));
const Binance = require('binance-api-node').default;
const chalk = require('chalk');
const cloneDeep = require('lodash/cloneDeep');
const fs = require('fs');
const inquirer = require('inquirer');
const settings = require('../settings.json');
const binance = Binance({
    apiKey: settings.exchange.binance.key,
    apiSecret: settings.exchange.binance.secret,
});

const questions = [
    {  type: 'list',   name: 'exchange', message: '    Exchange: ', choices: ['Binance'], default: 'Binance' },
    {  type: 'input',  name: 'pair',     message: '        Pair: ' },
    {  type: 'number', name: 'amount',   message: '      Amount: ' },
    {  type: 'number', name: 'buyPrice', message: '   Buy Price: ' },
    {  type: 'number', name: 'stopPrice', message: '  Stop Price: ' },
];

const placeBuyOrder = async(answers) => {
    console.log('placeBuyOrder');

    const { exchange, pair, amount, buyPrice, stopPrice } = answers;
    const order = { symbol: pair, side: 'BUY', quantity: amount, price: buyPrice, useServerTime: true };
    const result = await binance.order(order);
    return { answers, order: result };
}

const waitForFulfillment = (answers, order) => {
    console.log('waitForFulfillment');
    const { exchange, pair, amount, buyPrice, stopPrice } = answers;

    binance.myTrades({  useServerTime: true, symbol: pair }).then((history) => {
        const matched = history.filter(orderHistory => orderHistory.orderId === order.orderId);

        matched.forEach(match => console.log(match.orderId));
        if (matched.length) {
            console.log('placeStopLossOrder');

            const stopLossOrder = { symbol: pair, side: 'SELL', quantity: amount, type: 'STOP_LOSS_LIMIT', price: stopPrice, stopPrice, useServerTime: true };
            binance.order(stopLossOrder).then(result => process.exit());
        }
    });
}

const executePrompt = () => inquirer.prompt(questions).then(async(answers) => {
    return await placeBuyOrder(answers);
});

console.log();
executePrompt().then((result) => {
    const {answers, order} = result;
    setInterval(() => waitForFulfillment(answers, order), (5  * 1000));
});

// TODO: cancel order on close
