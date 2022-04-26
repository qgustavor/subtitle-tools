const assParser = require('ass-parser')
const assStringify = require('ass-stringify')
const fs = require('fs').promises

exports.command = 'shift-times <files..>'
exports.describe = 'Shift times in ASS subtitle files'
exports.builder = {
  time: {
    alias: 't',
    describe: 'time to be shifted',
    demandOption: true,
    type: 'number'
  }
}

exports.handler = (argv) => runCommand(argv).catch(err => {
  console.error(err.stack)
  process.exit(1)
})

async function runCommand (argv) {
  const { files, time } = argv

  for (let file of files) {
    const data = await fs.readFile(file, 'utf-8')
    const parsedData = assParser(data, { comments: true })

    const events = parsedData.find(e => e.section.endsWith('Events')).body
    for (let { key, value } of events) {
      if (key !== 'Dialogue') continue
      value.Start = formatTimestamp(parseTimestamp(value.Start) + time)
      value.End = formatTimestamp(parseTimestamp(value.End) + time)
    }
    
    const output = file.replace(/\.ass/g, '.shift_' + time + '.ass')
    await fs.writeFile(output, assStringify(parsedData))
  }
}

// Hacky one-liners ¯\_(ツ)_/¯
function parseTimestamp (timestamp) {
  return timestamp.split(':').reduce((sum, e) => sum * 60 + Number(e), 0)
}

function formatTimestamp (timestamp) {
  return new Date(timestamp * 1000).toISOString().substr(12, 10)
}
