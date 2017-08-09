const assParser = require('ass-parser')
const fs = require('fs')

exports.command = 'list-fonts <files..>'
exports.describe = 'List fonts in ASS subtitle files'
exports.builder = {}

exports.handler = (argv) => runCommand(argv).catch(err => {
  console.error(err.stack)
  process.exit(1)
})

async function runCommand (argv) {
  const files = argv.files
  const result = new Set()

  for (let file of files) {
    const data = await readFile(file)
    const parsedData = assParser(data, { comments: true })

    parsedData.forEach(part => {
      const isStyles = part.section.endsWith('Styles')
      const isEvents = part.section.endsWith('Events')
      if (!isStyles && !isEvents) return

      part.body.forEach(bodyPart => {
        if (isStyles && bodyPart.key === 'Style') {
          result.add(bodyPart.value.Fontname)
        }
        if (isEvents && bodyPart.key === 'Dialogue') {
          const tags = bodyPart.value.Text.match(/\{[^}]+}/g)
          const fonts = tags && tags.map(e => {
            return (e.replace(/^\{|\}$/g, '').match(/\\fn([^\\]+)/g) || []).pop()
          }).filter(e => e)

          if (fonts && fonts.length > 0) {
            result.add(fonts.pop().replace(/^\\fn/, ''))
          }
        }
      })
    })
  }

  console.log(Array.from(result).join('\n'))
}

function readFile (path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf-8', (err, data) => {
      if (err) return reject(err)
      resolve(data)
    })
  })
}
