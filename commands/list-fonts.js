import parse from '@qgustavor/ass-parser'
import { getSubtitleFonts } from '../lib/utils.js'
import fs from 'fs'

export const command = 'list-fonts <files...>'
export const describe = 'List fonts in ASS subtitle files'
export const builder = {}

export const handler = (argv) => runCommand(argv).catch(err => {
  console.error(err.stack)
  process.exit(1)
})

async function runCommand (argv) {
  const files = argv.files
  const usedFonts = new Set()

  for (const file of files) {
    const data = await fs.promises.readFile(file, 'utf-8')
    const { fonts, missingStyles } = getSubtitleFonts(parse(data))

    if (missingStyles.size) {
      const missingStylesArr = Array.from(missingStyles).sort()
      console.warn(`Missing styles in ${file}: ${missingStylesArr.join(', ')}`)
    }

    usedFonts.add(...fonts)
  }

  console.log(Array.from(usedFonts).sort().join('\n'))
}
