import { existsSync, write, writeFileSync } from 'fs'
import { parseEntries } from './preProcessor.js'
import { getBosFilesRecursive } from './file.js';
import { processParsedEntries } from './processor.js';

const ENTRIES_REGEX = /^[^\s][^\n]+[\S\s]+?(?=\n\s*\n)/gm
const args = process.argv.reduce((res, arg) => {
    if (arg.match(/^[^=]+=[^=]+$/)) {
        const split = arg.split(/=/);
        res[split[0]] = split[1]
    }
    return res
}, {})

if (!args.PATH) throw (new Error('CLI Argument PATH is missing'))

if (!existsSync(args.PATH)) throw (new Error(`Unable to find path: ${args.PATH}`))

const files = getBosFilesRecursive(args.PATH)
const fullBos = files.join('\n').replace(/\r\n/g, '\n')
const entries = []
let entry = ENTRIES_REGEX.exec(fullBos)
while (entry !== null) {
    entries.push(entry[0].trim())
    entry = ENTRIES_REGEX.exec(fullBos)
}
const parsedEntries = entries.reduce(parseEntries, { objects: {}, enums: {}, definitions: {} })
writeFileSync(`./entries.json`, JSON.stringify(parsedEntries, null, 2))
const processedEntries = processParsedEntries(parsedEntries)
writeFileSync(`./out.json`, JSON.stringify(processedEntries, null, 2))