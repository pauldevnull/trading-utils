const inquirer = require('inquirer');
const chalk = require('chalk');
const style = require('ansi-styles');

console.log('');


console.log(chalk.hex('#006400')('TEST'));
console.log(chalk.rgb(0, 150, 0)('TEST'));
console.log(chalk.rgb(0, 250, 0)('TEST'));

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

inquirer.prompt(questions).then(answers => {
	const { buyingPower, entryPrice } = answers;
	const amount = buyingPower / entryPrice;
	console.log('\n        Amount:  ' + chalk.magenta(amount.toFixed(8)) + '\n');
  	
	const targetAtPercent = (percent) => +((buyingPower + (buyingPower * percent)) / amount).toFixed(8);
	const targetAtFixed = (fixed) => +((buyingPower + fixed) / amount).toFixed(8);

	// const targets = (change) => targetAtPercent(change / 100) + targetAtFixed(change);

  	console.log(chalk.rgb(0, 220, 0)(' +20%: ' + targetAtPercent(0.2) + '\t +$20: ' + targetAtFixed(20)));
  	console.log(chalk.rgb(0, 160, 0)(' +10%: ' + targetAtPercent(0.1) + '\t +$10: ' + targetAtFixed(10)));
  	console.log(chalk.rgb(0, 100, 0)('  +5%: ' + targetAtPercent(0.05) + '\t  +$5: ' + targetAtFixed(5)));
  	console.log(chalk.gray('   0%: ' + entryPrice + '\t  +$0: ' + entryPrice));
  	console.log(chalk.rgb(100, 0, 0)('  -5%: ' + targetAtPercent(-0.05) + '\t  -$5: ' + targetAtFixed(-5)));
  	console.log(chalk.rgb(160, 0, 0)(' -10%: ' + targetAtPercent(-0.1) + '\t -$10: ' + targetAtFixed(-10)));
  	console.log(chalk.rgb(200, 0, 0)(' -20%: ' + targetAtPercent(-0.2) + '\t -$20: ' + targetAtFixed(-20)));

  	console.log();
});
