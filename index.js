#!/usr/bin/env node

const pkg = require('./package.json')
process.title = 'Subtitle Tools'

require('yargs')
  .commandDir('commands')
  .recommendCommands()
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .epilogue('for more information check ' + pkg.homepage)
  .argv
