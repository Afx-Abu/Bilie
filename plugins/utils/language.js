const Config = require('./config');
const fs = require('fs');
const chalk = require('chalk');

if (fs.existsSync('./plugins/utils/language/' + Config.LANG + '.json')) {
    console.log(
        chalk.green.bold('BILIE ' + Config.VERSION + '...')
    );

    var json = JSON.parse(fs.readFileSync('./plugins/utilslanguage/' + Config. + '.json'));
} else {
    console.log(
        chalk.red.bold('You entered an invalid language. English language was chosen.')
    );

    var json = JSON.parse(fs.readFileSync('./plugins/utilslanguage/EN.json'));
}

function getString(file) {
    return json['STRINGS'][file];
}

module.exports = {
    language: json,
    getString: getString
}
