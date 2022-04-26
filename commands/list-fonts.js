const assParser = require('ass-parser')
const fs = require('fs')

exports.command = 'list-fonts <files...>'
exports.describe = 'List fonts in ASS subtitle files'
exports.builder = {}

exports.handler = (argv) => runCommand(argv).catch(err => {
  console.error(err.stack)
  process.exit(1)
})

async function runCommand (argv) {
  const files = argv.files
  const usedFonts = new Set()

  for (let file of files) {
    const data = await fs.promises.readFile(file, 'utf-8')
    const parsed = assParser(data)
    const eventsSection = parsed.find(e => e.section === 'Events')
    const styleSection = parsed.find(e => e.section.includes('Styles'))

    // Get used fonts and variants
    for (const event of eventsSection.body) {
      if (event.key !== 'Dialogue') continue

      const style = styleSection.body.find(e => e.value.Name === event.value.Style)
      if (!style) {
        console.warn('Could not find style', event.value.Style)
        continue
      }
      let font = style.value.Fontname.trim()
      let isBold = Number(style.value.Bold) === -1
      let isItalic = Number(style.value.Italic) === -1

      const getKey = () => font + (isBold ? ':bold' : '') + (isItalic ? ':italic' : '')
      let currentKey = null
      const handleKey = () => {
        const oldKey = currentKey
        currentKey = getKey()
        if (oldKey !== currentKey) usedFonts.add(currentKey)
      }

      if (!event.value.Text.startsWith('{')) handleKey()
      const blocks = event.value.Text.replace(/\}\{/g, '').match(/\{.+?\}/g)
      if (!blocks) continue

      for (const block of blocks) {
        const tags = block.slice(1, -1).match(/\\fn[^\\]+|\\[ib]\d+/g) || []
        for (const tag of tags) {
          if (tag.startsWith('\\fn')) {
            font = tag.substr(3).trim()
          } else if (tag.startsWith('\\b')) {
            isBold = tag.substr(2) !== '0'
          } else if (tag.startsWith('\\i')) {
            isItalic = tag.substr(2) !== '0'
          }
        }
        handleKey()
      }
    }
  }

  console.log(Array.from(usedFonts).sort().join('\n'))
}
