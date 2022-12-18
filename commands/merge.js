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
  },
  allowKeyOverride: {
    describe: 'allow overriding info values',
    type: 'boolean'
  },
  allowNewParts: {
    describe: 'allow adding parts (like Aegisub Extradata) when merging',
    type: 'boolean'
  },
  sortEvents: {
    describe: 'sort events after merging',
    type: 'boolean',
    default: true
  }
}

exports.handler = (argv) => runCommand(argv).catch(err => {
  console.error(err.stack)
  process.exit(1)
})

async function runCommand (argv) {
  const { files, output, allowKeyOverride, allowNewParts, sortEvents } = argv

  let result
  for (const file of files) {
    const data = await fs.promises.readFile(file)
    const parsedData = assParser(data, { comments: true })

    if (!result) {
      result = parsedData
      continue
    }

    // TODO match subtitle resolutions
    for (const part of parsedData) {
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
            if (allowKeyOverride) {
              existingKey.value = bodyPart.value
            }
          } else if (bodyPart.key !== 'Format') {
            target.body.push(bodyPart)
          }
        })
      } else if (allowNewParts) {
        result.push(part)
      }
    }
  }

  if (sortEvents) {
    result.find(e => e.section === 'Events').body.sort((a, b) => {
      if (a.key === 'Format') return -1
      if (b.key === 'Format') return 1
      return a.value.Start.localeCompare(b.value.Start)
    })
  }

  await fs.promises.writeFile(output,
    assStringify(result)
    .replaceAll(/(Format: )(.*)/g, (all, prefix, suffix) => prefix + suffix.replaceAll(' ', ''))
    .replaceAll('\r', '')
    .replaceAll('\n', '\r\n')
  )
}
