import { logError } from "./util.js"

// const OBJECT_LINE_REGEX = /^\s+(?<key>\w+):\s(?<entry>[^\[].*[^\]]|\[[\s\S]+?\]|.{1,3})(?:\n|$)/
const ARRAY_REGEX = /^\[([\S\s]+)\]$/
const QUOTE_WRAPPER_REGEX = /,[\s\n]+("[^"]+")/g
const COMMA_REPLACE_REGEX = /__1742359509165__/g
const COMMA_REPLACE = "__1742359509165__"

function formatEntry(regexes, original, replacement, index) {
    const res = original
        .replace(regexes.index, index)
        .replace(regexes.string, replacement)
        .replace(regexes.lowerCase, replacement.toLowerCase())
        .replace(regexes.capitalized, replacement.split(/_/)
            .map(str => str
                .slice(0, 1)
                .toUpperCase() + str.slice(1, str.length)
                    .toLowerCase()
            )
        )
        .replace(/_/g, ' ')
    return res
}

function enumReplace({ entry, enums }) {
    for (let key in enums) {
        enums[key].forEach((enumerator, index) => {
            enumerator = typeof enumerator === 'string' ? { key: enumerator } : enumerator
            enumerator[key] = enumerator.key
            Object.keys(enumerator).forEach(subKey => {
                if (subKey === 'key') return
                if (!enumerator[subKey]) return
                const regexes = {
                    index: new RegExp(`<${subKey}>`, 'g'),
                    string: new RegExp(`<~${subKey}>`, 'g'),
                    lowerCase: new RegExp(`<~~${subKey}>`, 'g'),
                    capitalized: new RegExp(`<~~~${subKey}>`, 'g'),
                }
                entry = formatEntry(regexes, entry, enumerator[subKey], index)
            })
        })
    }
    return entry
}

function processObject({ object, enums, definition }) {
    const required = definition?.required || {}
    const optional = definition?.optional || {}
    const result = {}
    const keys = Object.keys(required).concat(Object.keys(optional))
    keys.forEach(key => {
        if ((key in required) && !(key in object.body)) {
            logError(`object missing required key: ${key}`)
            return
        } else if (!(key in object.body)) {
            logError(`object does not have key: ${key}`)
            return
        }
        let entryType = required[key] || optional[key]
        const arrayMatch = entryType.match(ARRAY_REGEX)
        if (arrayMatch) entryType = arrayMatch[1]
        let entry = enumReplace({ entry: object.body[key], enums })
        delete(entry.key)
        if (arrayMatch) {
            if (entryType === 'string') {
                const quoteWrappedEntries = entry.match(QUOTE_WRAPPER_REGEX) || []
                quoteWrappedEntries.forEach(match => {
                    const replacedMatch = match.replace(/,/g, COMMA_REPLACE)
                    entry = entry.replace(match, replacedMatch)
                })
            }

            entry = entry.trim().replace(/^\[/, '').replace(/\]$/, '').split(',')
            switch (entryType) {
                case 'string':
                    entry = entry.map(subEntry => subEntry.replace(COMMA_REPLACE_REGEX, ',').trim())
                    break
                case 'int':
                case 'float':
                    entry = entry.map(eval)
                    break
                case 'boolean':
                    entry = entry.map(a => a === 'true' ? true : false)
                    break
                default:
                // do nothing
            }
        } else {
            switch (entryType) {
                case 'string':
                    entry = entry.trim()
                    break
                case 'int':
                    entry = parseInt(entry)
                    break
                case 'float':
                    entry = parseFloat(entry)
                    break
                case 'boolean':
                    entry = entry === 'true' ? true : false
                    break
                default:
                // do nothing
            }
        }
        result[key] = entry
    })
    return result
}

export function processParsedEntries({ objects, enums, definitions }) {
    const result = {}
    for (let key in definitions) {
        const definition = definitions[key]
        const objectArray = objects[key]
        if (!objectArray || !definition) {
            logError(`missing object or definition for key: ${key}`)
            continue
        }
        result[key] = []
        objectArray.forEach(object => {
            const processedObject = processObject({ object, enums, definition })
            result[key].push(processedObject)
        })
    }
    return result
}