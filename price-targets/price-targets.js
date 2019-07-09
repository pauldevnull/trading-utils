#!/usr/bin/env node

const args = require('minimist')(process.argv.slice(2));
const chalk = require('chalk');
const inquirer = require('inquirer');
const Table = require('cli-table3');

const buildTable = (buyingPower, entryPrice) => {
    const amount = buyingPower / entryPrice;
    const increments = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5, 0, -5, -10, -20, -30, -40, -50, -60, -70, -80, -90, -100];

    const styled = (increment, index, text) => {
        const intensity = (increment) => index * (155 / ((increments.length - 1) / 2)) ;

        const red = Math.round(increment === 0 ? 105 : (increment >= 0 ? 0 : intensity(increment) - 55));
        const green = Math.round(increment === 0 ? 105: (increment <= 0 ? 0 : 255 - intensity(increment)));
        const blue = increment === 0 ? 105 : 0;

        return chalk.rgb(red, green, blue)(text);
    };

    const targetAtPercent = (percent) => +((buyingPower + (buyingPower * percent)) / amount).toFixed(8);
    const targetAtFixed = (fixed) => +((buyingPower + fixed) / amount).toFixed(8);

    const changeLabel = (increment, isPercent) => {
        if (isPercent) return increment > 0 ? '+' + increment + '%:' : increment + '%:';
        return increment > 0 ? '+$' + increment + ':' : '-$' + Math.abs(increment) + ':';
    };
    
    const table = new Table({
      chars: { 'top': '' , 'top-mid': '' , 'top-left': '' , 'top-right': ''
             , 'bottom': '' , 'bottom-mid': '' , 'bottom-left': '' , 'bottom-right': ''
             , 'left': '' , 'left-mid': '' , 'mid': '' , 'mid-mid': ''
             , 'right': '' , 'right-mid': '' , 'middle': ' ' },
      style: { 'padding-left': 1, 'padding-right': 0 }
    });

    table.push([], ['', { content: chalk.bold('Amount:') }, { content:  chalk.bold.magenta(amount.toFixed(8)), colSpan: 3 }], []);
    
    increments.forEach((increment, index) => {
        const percentChangeLabel =  { content:  styled(increment, index, changeLabel(increment, true)), hAlign: 'right' };
        const percentChangePrice = { content: styled(increment, index, targetAtPercent(increment / 100)) };
        const fixedChangeLabel = { content:  styled(increment, index, changeLabel(increment, false)), hAlign: 'right' };
        const fixedChangePrice = { content: styled(increment, index, targetAtFixed(increment)) };
        const row = [ percentChangeLabel, percentChangePrice, '', fixedChangeLabel, fixedChangePrice ];
        table.push(row);
    });

    return table;
};

const providedBuyingPower = args['buying-power'] || args['buyingPower'] || args['bp'] || args._[0] || null;
const providedEntryPrice = args['entry-price'] || args['entryPrice'] || args['ep'] || args._[1] || null;

const questions = [
    { type: 'number', name: 'buyingPower', message: 'Buying Power: ', when: !providedBuyingPower },
    { type: 'number', name: 'entryPrice',  message: ' Entry Price: ', when: !providedEntryPrice },
];

const executePrompt = () => inquirer.prompt(questions).then((answers) => {
    const buyingPower = providedBuyingPower ? providedBuyingPower : answers.buyingPower;
    const entryPrice = providedEntryPrice ? providedEntryPrice : answers.entryPrice;

    const table = buildTable(buyingPower, entryPrice);
    console.log(table.toString() + '\n');
});

const styledArg = (text, arg) => chalk.yellow('? ') + text + chalk.cyan(parseFloat(arg));

console.log();
!!providedBuyingPower ? console.log(styledArg('Buying Power:  ', providedBuyingPower)) : null;
!!providedEntryPrice ? console.log(styledArg(' Entry Price:  ', providedEntryPrice)) : null;
executePrompt(providedBuyingPower, providedEntryPrice);
