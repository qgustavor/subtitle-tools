import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

// commandDir is not supported with ESM yet, define commands one by one here:
import * as shiftTimesModule from './commands/shift-times.js'
import * as listFontsModule from './commands/list-fonts.js'
import * as mergeModule from './commands/merge.js'

process.title = 'Subtitle Tools'

// eslint-disable-next-line no-unused-expressions
yargs(hideBin(process.argv))
  // Define each command here too
  .command(shiftTimesModule)
  .command(listFontsModule)
  .command(mergeModule)
  .recommendCommands()
  .demandCommand(1)
  .help()
  .argv
