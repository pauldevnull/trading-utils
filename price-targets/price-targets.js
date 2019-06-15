const chalk = require('chalk');
const inquirer = require('inquirer');
const Table = require('cli-table3');

const questions = [
    {
      type: 'number',
      name: 'buyingPower',
      message: "Buying Power: ",
    },
    {
      type: 'number',
      name: 'entryPrice',
      message: " Entry Price: ",
    },
];

const buildTable = (buyingPower, entryPrice) => {
    const amount = buyingPower / entryPrice;
    const increments = [60, 50, 40, 30, 20, 10, 5, 0, -5, -10, -20, -30, -40, -50, -60];

    const styled = (increment, index, text) => {
        const intensity = (increment) => index * (255 / ((increments.length - 1) / 2));

        const red = Math.round(increment === 0 ? 105 : (increment >= 0 ? 0 : intensity(increment) - 255));
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

    increments.forEach((increment, index) => {
        const percentChangeLabel =  { content:  styled(increment, index, changeLabel(increment, true)) };
        const percentChangePrice = { content: styled(increment, index, targetAtPercent(increment / 100)) };
        const fixedChangeLabel = { content:  styled(increment, index, changeLabel(increment, false)) };
        const fixedChangePrice = { content: styled(increment, index, targetAtFixed(increment)) };
        const row = [ percentChangeLabel, percentChangePrice, '', fixedChangeLabel, fixedChangePrice ];
        table.push(row);
    });

    return table;
};

const executePrompt = () => inquirer.prompt(questions).then((answers) => {
    const { buyingPower, entryPrice } = answers;
    const amount = buyingPower / entryPrice;
    console.log(chalk.bold('\n        Amount:  ' + chalk.magenta(amount.toFixed(8)) + '\n'));

    const table = buildTable(buyingPower, entryPrice);
    console.log(table.toString());

    console.log();
});

console.log('');
executePrompt();
