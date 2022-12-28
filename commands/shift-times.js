import parse, { detectStringifyOptions } from '@qgustavor/ass-parser'
import stringify from '@qgustavor/ass-stringify'
import fs from 'fs'

export const command = 'shift-times <files..>'
export const describe = 'Shift times in ASS subtitle files'
export const builder = {
  time: {
    alias: 't',
    describe: 'time to be shifted',
    demandOption: true,
    type: 'number'
  }
}

export const handler = (argv) => runCommand(argv).catch(err => {
  console.error(err.stack)
  process.exit(1)
})

async function runCommand (argv) {
  const { files, time } = argv
  console.warn('DEPRECATED COMMAND: it will be removed in future releases')
  console.warn('Use ffmpeg instead:')
  console.warn('  ffmpeg -itsoffset [offset] -i [source] [target]')

  for (const file of files) {
    const data = await fs.promises.readFile(file, 'utf-8')
    const parsedData = parse(data, { comments: true, parseTimestamps: true })
    const stringifyOptions = detectStringifyOptions(data)

    const events = parsedData.find(e => e.section.endsWith('Events')).body
    for (const { key, value } of events) {
      if (key !== 'Dialogue' || key !== 'Comment') continue
      value.Start += time
      value.End += time
    }

    const output = file.replace(/\.ass/g, '.shift_' + time + '.ass')
    await fs.promises.writeFile(output, stringify(parsedData, stringifyOptions))
  }
}
