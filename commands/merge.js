const assParser = require('ass-parser')
const assStringify = require('ass-stringify')
const fs = require('fs')

exports.command = 'merge <files..>'
exports.describe = 'Merge ASS subtitle files'
exports.builder = {
  output: {
    alias: 'o',
    describe: 'output file path',
    demandOption: true,
    type: 'string',
    normalize: true
  }
}

exports.handler = (argv) => runCommand(argv).catch(err => {
  console.error(err.stack)
  process.exit(1)
})

async function runCommand (argv) {
  const files = argv.files
  const output = argv.output

  let result
  for (let file of files) {
    const data = await readFile(file)
    const parsedData = assParser(data, { comments: true })
    if (result) {
      parsedData.forEach(part => {
        const target = result.find(e => part.section === e.section)
        if (target) {
          part.body.forEach(bodyPart => {
            const existingKey =
              // merge all dialogue lines
              part.section === 'Events' ? null
              // don't duplicate comments
              : part.section === 'Script Info' && bodyPart.type === 'comment'
              ? target.body.find(e => e.type === 'comment' && bodyPart.value === e.value)
              // merge styles, styles with same name are overwritten
              : part.section.endsWith('Styles') && bodyPart.key === 'Style'
              ? target.body.find(e => e.key === 'Style' && bodyPart.value.Name === e.value.Name)
              // merge other data
              : target.body.find(e => bodyPart.key === e.key)

            if (existingKey) {
              existingKey.value = bodyPart.value
            } else {
              target.body.push(bodyPart)
            }
          })
        } else {
          result.push(e)
        }
      })
    } else {
      result = parsedData
    }
  }

  await writeFile(output, assStringify(result))
}

function readFile (path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, data) => {
      if (err) return reject(err)
      resolve(data)
    })
  })
}

function writeFile (path, data) {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, 'utf-8', (err) => {
      if (err) return reject(err)
      resolve()
    })
  })
}
