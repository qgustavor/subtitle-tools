export function getSection (script, name) {
  return script.find(e => e.section === name)?.body
}

export function getResolution (script) {
  const info = getSection(script, 'Script Info')

  // Default values when undefined are 384x288
  // https://github.com/libass/libass/blob/1a533e5d5df5dcc7b7238dddfd524d21a72fddbd/libass/ass.c#L1769
  return [
    Number(info.find(e => e.key === 'PlayResX')?.value) || 384,
    Number(info.find(e => e.key === 'PlayResY')?.value) || 288
  ]
}

export function setScriptInfo (script, key, value) {
  const info = getSection(script, 'Script Info')
  const entry = info.find(e => e.key === key)

  if (entry) {
    entry.value = value
  } else {
    info.push({ key, value })
  }
}

export function parseTimestamp (timestamp) {
  return timestamp.split(':').reduce((sum, e) => sum * 60 + Number(e), 0)
}

export function formatTimestamp (time) {
  return new Date(time * 1000).toISOString().substr(12, 10)
}

// Based on https://github.com/arch1t3cht/Aegisub/blob/9591ce216f8ab14be7b1b32c27b98e6cde6a557f/src/resolution_resampler.cpp
export function transformDrawing (drawing, shiftX, shiftY, scaleX, scaleY) {
  let isX = true
  let result = ''

  for (const cur of drawing.split(' ')) {
    let val = Number(cur)
    if (val) {
      if (isX) {
        val = (val + shiftX) * scaleX
      } else {
        val = (val + shiftY) * scaleY
      }
      // round to eighth-pixels
      val = Math.round(val * 8) / 8
      result += val
      result += ' '
      isX = !isX
    } else if (cur.length === 1) {
      const c = cur[0].toLowerCase()
      if (c === 'm' || c === 'n' || c === 'l' || c === 'b' || c === 's' || c === 'p' || c === 'c') {
        isX = true
        result += c
        result += ' '
      }
    }
  }

  return result
}

export function resampleTags (block, state) {
  switch (block.type) {
    case 'bord':
      // fallthrough
    case 'shad':
      // fallthrough
    case 'fs':
      block.numericArgv *= state.ry
      break

    case 'pos':
      // fallthrough
    case 'org':
      block.wrappedArgv[0] = (Number(block.wrappedArgv[0]) + state.marginLeft) * state.rx
      block.wrappedArgv[1] = (Number(block.wrappedArgv[1]) + state.marginTop) * state.ry
      break

    case 'move':
      // fallthrough
    case 'clip':
      // fallthrough
    case 'iclip':
      if (block.type === 'move' || block.wrappedArgv.length === 4) {
        block.wrappedArgv[0] = (Number(block.wrappedArgv[0]) + state.marginLeft) * state.rx
        block.wrappedArgv[1] = (Number(block.wrappedArgv[1]) + state.marginTop) * state.ry
        block.wrappedArgv[2] = (Number(block.wrappedArgv[2]) + state.marginLeft) * state.rx
        block.wrappedArgv[3] = (Number(block.wrappedArgv[3]) + state.marginTop) * state.ry
      } else {
        const lastIndex = block.wrappedArgv.length - 1
        block.wrappedArgv[lastIndex] = transformDrawing(block.wrappedArgv[lastIndex], state.marginLeft, state.marginTop, state.rx, state.ry)
      }
      break

    case 'xbord':
      // fallthrough
    case 'xshad':
      // fallthrough
    case 'fscx':
      block.numericArgv *= state.ar
      break

    case 'ybord':
      // fallthrough
    case 'yshad':
      // fallthrough
    case 'fscy':
      break

    case 'drawing':
      block.value = transformDrawing(block.value, state.marginLeft, state.marginTop, state.rx, state.ry)
      break
  }
}

export function commentedRegex (source, flags) {
  return new RegExp(source.replaceAll(/ *\/\/.*/g, '').replaceAll(/ *\n */g, '').trim(), flags)
}

const tagRegex = commentedRegex(String.raw`
  \\([0-9a-z]+)       // Tag name
  (                   // Tag arguments
    ([\d.]+)|           // Numeric argument
    \(([^\\)]+)\)|      // Wrapped argument
    ([^\\]+)            // Any other kind of argument
  )
  ([^\\]*)            // Anything that was not matched until the next tag
`, 'g')

export function parseBlocks (line) {
  let isDrawing = false
  return (line.match(/\{.*?\}|[^{}]+/g) ?? []).map(e => {
    if (!e.startsWith('{')) {
      return { type: isDrawing ? 'drawing' : 'text', value: e }
    }
    return Array.from(
      e.slice(1, -1).matchAll(tagRegex)
    ).map(([all, type, argv, numericArgv, wrappedArgv, textArgv, extraArgv]) => {
      if (wrappedArgv) wrappedArgv = wrappedArgv.split(/ *, */g)
      if (type === 'p') isDrawing = Number(numericArgv) !== 0
      return { type, argv, numericArgv, wrappedArgv, textArgv, extraArgv }
    })
  }).flat()
}

function compileArgument (arg) {
  if (typeof arg !== 'number') return arg
  return arg.toFixed(3).replace(/\.0+$/, '')
}

export function compileBlocks (blocks) {
  return blocks.map(block => {
    if (block.type === 'text' || block.type === 'drawing') {
      return block.value
    }

    const value = block.numericArgv
      ? compileArgument(Number(block.numericArgv))
      : block.wrappedArgv
        ? `(${block.wrappedArgv.map(compileArgument).join(',')})`
        : block.textArgv

    return '{\\' + block.type + value + (block.extraArgv || '') + '}'
  }).join('').replaceAll('}{', '')
}

export function resampleLine (state, line) {
  const blocks = parseBlocks(line.Text)

  for (const block of blocks) {
    resampleTags(block, state)
  }

  line.Text = compileBlocks(blocks)

  if (Number(line.MarginL)) line.MarginL = Math.round((Number(line.MarginL) + state.marginLeft) * state.rx)
  if (Number(line.MarginR)) line.MarginR = Math.round((Number(line.MarginR) + state.marginRight) * state.rx)
  if (Number(line.MarginV)) line.MarginV = Math.round((Number(line.MarginV) + state.marginTop) * state.ry)
}

function resampleStyle (state, style) {
  style.Fontsize = Math.round(style.Fontsize * state.ry)
  style.Outline = compileArgument(style.Outline * state.ry)
  style.Spacing = compileArgument(style.Spacing * state.rx)
  style.Shadow = compileArgument(style.Shadow * state.ry)
  style.ScaleX = compileArgument(style.ScaleX * state.ar)
  style.MarginL = Math.round((Number(style.MarginL) + state.marginLeft) * state.rx)
  style.MarginR = Math.round((Number(style.MarginR) + state.marginRight) * state.rx)
  style.MarginV = Math.round((Number(style.MarginV) + state.marginTop) * state.ry)
}

export function resampleResolution (ass, settings) {
  const newAr = settings.destX / settings.destY
  let horizontalStretch = 1.0
  let oldAr = settings.sourceX / settings.sourceY
  let borderHorizontally = newAr > oldAr

  // Don't convert aspect ratio if it's very close to correct
  // (for reference, 848x480 <-> 1280x720 is .006)
  if (Math.abs(oldAr - newAr) / newAr > 0.01) {
    switch (settings.arMode) {
      case 'RemoveBorder':
        borderHorizontally = !borderHorizontally
        // fallthrough
      case 'AddBorder':
        if (borderHorizontally) {
          // Wider/Shorter
          settings.marginLeft = settings.marginRight = (settings.sourceY * newAr - settings.sourceX) / 2
        } else {
          // Taller/Narrower
          settings.marginTop = settings.marginBottom = (settings.sourceX / newAr - settings.sourceY) / 2
        }
        break
      case 'Stretch':
        horizontalStretch = newAr / oldAr
        break
      case 'Manual':
        oldAr =
          (settings.sourceX + settings.marginLeft + settings.marginRight) /
          (settings.sourceY + settings.marginTop + settings.marginBottom)

        if (Math.abs(oldAr - newAr) / newAr > 0.01) {
          horizontalStretch = newAr / oldAr
        }
        break
    }
  }

  // Add margins to original resolution
  settings.marginTop ||= 0
  settings.marginLeft ||= 0
  settings.marginRight ||= 0
  settings.marginBottom ||= 0
  settings.sourceX += settings.marginLeft + settings.marginRight
  settings.sourceY += settings.marginTop + settings.marginBottom

  const state = {
    marginTop: settings.marginTop,
    marginLeft: settings.marginLeft,
    marginRight: settings.marginRight,
    marginBottom: settings.marginBottom,
    rx: settings.destX / settings.sourceX,
    ry: settings.destY / settings.sourceY,
    ar: horizontalStretch
  }

  const styles = getSection(ass, 'V4+ Styles')
  for (const style of styles) {
    if (style.key === 'Style') {
      resampleStyle(state, style.value)
    }
  }

  const events = getSection(ass, 'Events')
  for (const line of events) {
    if (line.key === 'Dialogue') {
      resampleLine(state, line.value)
    }
  }

  setScriptInfo(ass, 'PlayResX', settings.destX)
  setScriptInfo(ass, 'PlayResY', settings.destY)
}

export function mergeSubtitles (subtitles, options) {
  const {
    allowKeyOverride,
    allowNewParts,
    sortEvents,
    styleCollisionMode,
    lineCollisionMode,
    minCollisonOverlap,
    layerHandling,
    mergeMetadata
  } = options

  let result
  let resolutionX = options.resolutionX
  let resolutionY = options.resolutionY

  for (const subtitle of subtitles) {
    // Handle subtitle resolutions
    if (!resolutionX || !resolutionY) {
      ;[resolutionX, resolutionY] = getResolution(subtitle)
    } else {
      const [currentResX, currentResY] = getResolution(subtitle)
      if (currentResX !== resolutionX || currentResY !== resolutionX) {
        resampleResolution(subtitle, {
          sourceX: currentResX,
          sourceY: currentResY,
          destX: resolutionX,
          destY: resolutionY,
          arMode: options.arMode
        })
      }
    }

    // Use the first subtitle as the basis for merging
    if (!result) {
      result = subtitle
      continue
    }

    for (const part of subtitle) {
      const target = result.find(e => part.section === e.section)

      if (!target) {
        // Target does not have the section, add if allowed
        if (allowNewParts) {
          result.push(part)
        }
        continue
      }

      const subtitleStyleSuffix = Math.random().toString(36).slice(2, 10)
      const renamedStyles = new Map()
      const knownStyles = new Set()

      // Iterate each section line
      for (const bodyPart of part.body) {
        // Ignore Format lines, in most cases handling then is not required
        if (bodyPart.key === 'Format') continue

        if (part.section === 'V4+ Styles') {
          // Do the same for styles too
          knownStyles.add(bodyPart.value.Name)
          const existentStyle = target.body.find(e => e.key === 'Style' && bodyPart.value.Name === e.value.Name)

          if (!existentStyle) {
            target.body.push(bodyPart)
          } else if (styleCollisionMode === 'KeepLast') {
            // Remove old Style and add new
            target.body.splice(target.body.indexOf(existentStyle), 1, bodyPart)
          } else if (styleCollisionMode === 'Rename') {
            // Generate a new name using a per-file random suffix
            const newName = bodyPart.value.Name + '_' + subtitleStyleSuffix
            renamedStyles.set(bodyPart.value.Name, newName)
            bodyPart.value.Name = newName
            target.body.push(bodyPart)
          }
          // When styleCollisionMode is KeepFirst just don't add new styles
        } else if (part.section === 'Events') {
          // Always merge non-Dialogue lines
          if (bodyPart.key !== 'Dialogue') {
            target.body.push(bodyPart)
          } else {
            // Check for collisions
            const overlappingEvent = target.body.find(e =>
              e.key === 'Dialogue' &&
              (
                Math.min(e.value.End, bodyPart.value.End) -
                Math.max(e.value.Start, bodyPart.value.Start)
              ) > minCollisonOverlap
            )

            if (overlappingEvent) {
              // Overlap = ignore the overlap
              if (lineCollisionMode === 'KeepFirst') {
                // KeepFirst = skip adding new new event
                continue
              } else if (lineCollisionMode === 'ChangeAlignment') {
                // Check if the line is already top positioned
                const isOverrideTop = parseBlocks(bodyPart.value.Text).find(block => {
                  return (block.type === 'an' && block.numericArgv.match(/[789]/)) ||
                    (block.type === 'a' && block.numericArgv.match(/[567]/))
                })
                if (isOverrideTop) continue

                const styleName = renamedStyles.get(bodyPart.value.Style) ?? bodyPart.value.Style
                const styleInfo = getSection(target, 'V4+ Styles')
                  .find(style => style.value.Name === styleName)
                if (styleInfo && styleInfo.value.Alignment.match(/[789]/)) continue

                bodyPart.value.Text = '{\\an8}' + bodyPart.value.Text
              } else if (lineCollisionMode === 'ChangeStyle') {
                bodyPart.value.Style += '_overlap'
                if (!knownStyles.has(bodyPart.value.Style)) continue
              }

              if (layerHandling === 'FirstAbove') {
                overlappingEvent.value.Layer = bodyPart.value.Layer + 1
              } else if (layerHandling === 'LastAbove') {
                bodyPart.value.Layer = overlappingEvent.value.Layer + 1
              }
            }

            // Handle renamed styles
            const renamedStyle = renamedStyles.get(bodyPart.value.Style)
            if (renamedStyle) bodyPart.value.Style = renamedStyle

            target.body.push(bodyPart)
          }
        } else {
          // For everything else - like Script Info and Aegisub Project Garbage
          if (!mergeMetadata) continue
          if (bodyPart.type === 'comment') {
            // Do not duplicate comments
            const existentComment = target.body.find(e => e.type === 'comment' && bodyPart.value === e.value)
            if (!existentComment) target.body.push(bodyPart)
          } else {
            // Check for existent lines
            const existentLine = target.body.find(e => bodyPart.key === e.key)
            if (!existentLine) {
              target.body.push(bodyPart)
            } else if (allowKeyOverride) {
              existentLine.value = bodyPart.value
            }
          }
        }
      }
    }
  }

  if (sortEvents) {
    getSection(result, 'Events').sort((a, b) => {
      if (a.key === 'Format') return -1
      if (b.key === 'Format') return 1
      if (a.key === 'Comment') return 1
      if (b.key === 'Comment') return -1
      return a.value.Start - b.value.Start
    })
  }

  return result
}

export function getSubtitleFonts (subtitle) {
  const fonts = new Set()
  const missingStyles = new Set()
  const eventsSection = getSection(subtitle, 'Events')
  const styleSection = subtitle.find(e => e.section.includes('Styles')).body

  for (const event of eventsSection) {
    if (event.key !== 'Dialogue') continue

    const style = styleSection.find(e => e.value.Name === event.value.Style)
    if (!style) {
      missingStyles.add(event.value.Style)
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
      if (oldKey !== currentKey) fonts.add(currentKey)
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

  return { fonts, missingStyles }
}
