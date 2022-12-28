import parse, { detectStringifyOptions } from '@qgustavor/ass-parser'
import stringify from '@qgustavor/ass-stringify'
import { mergeSubtitles } from '../lib/utils.js'
import fs from 'fs'

export const command = 'merge <files..>'
export const describe = 'Merge ASS subtitle files'
export const builder = {
  output: {
    alias: 'o',
    describe: 'output file path',
    demandOption: true,
    type: 'string',
    normalize: true
  },
  allowKeyOverride: {
    describe: 'allow overriding info values',
    type: 'boolean'
  },
  allowNewParts: {
    describe: 'allow adding parts (like Aegisub Extradata) when merging',
    type: 'boolean'
  },
  mergeMetadata: {
    describe: 'allow merging metadata (like Script Info and Aegisub Extradata)',
    type: 'boolean'
  },
  sortEvents: {
    describe: 'sort events after merging',
    type: 'boolean',
    default: true
  },
  resolutionX: {
    describe: 'horizontal subtitle resolution',
    type: 'number'
  },
  resolutionY: {
    describe: 'vertical subtitle resolution',
    type: 'number'
  },
  arMode: {
    describe: 'aspect ratio handling mode',
    choices: ['RemoveBorder', 'AddBorder', 'Stretch']
  },
  lineCollisionMode: {
    describe: 'line collision handling mode',
    choices: ['Overlap', 'KeepFirst', 'ChangeAlignment', 'ChangeStyle'],
    default: 'Overlap'
  },
  styleCollisionMode: {
    describe: 'style collision handling mode',
    choices: ['Rename', 'KeepFirst', 'KeepLast'],
    default: 'Rename'
  },
  minCollisonOverlap: {
    describe: 'minimal overlap time in seconds to be considered a collision',
    type: 'number',
    default: 0.1
  },
  layerHandling: {
    describe: 'how layers are handled during collisions',
    choices: ['Unchanged', 'FirstAbove', 'LastAbove'],
    default: 'Unchanged'
  }
}

export const handler = (argv) => runCommand(argv).catch(err => {
  console.error(err.stack)
  process.exit(1)
})

async function runCommand (argv) {
  const subtitles = []
  let stringifyOptions

  for (const file of argv.files) {
    const data = await fs.promises.readFile(file, 'utf-8')
    const parsedData = parse(data, { comments: true, parseTimestamps: true })
    subtitles.push(parsedData)

    if (!stringifyOptions) {
      stringifyOptions = detectStringifyOptions(data)
    }
  }

  const result = mergeSubtitles(subtitles, argv)
  await fs.promises.writeFile(argv.output, stringify(result, stringifyOptions))
}
