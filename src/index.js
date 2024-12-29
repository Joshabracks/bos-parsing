import { existsSync } from 'fs'
import { parseEntries } from './preProcessor.js'
import { getBosFilesRecursive } from './file.js';
import { processParsedEntries } from './processor.js';
import { getErrors, setDebug, clearErrors } from './util.js';

const ENTRIES_REGEX = /^[^\s][^\n]+[\S\s]+?(?=\n\s*\n)/gm

function compile(dirPath) {
    if (!existsSync(dirPath)) throw (new Error(`Unable to find path: ${dirPath}`))
    const files = getBosFilesRecursive(dirPath)
    const fullBos = files.join('\n').replace(/\r\n/g, '\n')
    const entries = []
    let entry = ENTRIES_REGEX.exec(fullBos)
    while (entry !== null) {
        entries.push(entry[0].trim())
        entry = ENTRIES_REGEX.exec(fullBos)
    }
    const parsedEntries = entries.reduce(parseEntries, { objects: {}, enums: {}, definitions: {} })
    const processedEntries = processParsedEntries(parsedEntries)
    return processedEntries
}

export default { compile, setDebug, getErrors, clearErrors }
