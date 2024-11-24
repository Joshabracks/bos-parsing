import { existsSync, lstatSync, readdirSync, readFileSync } from 'fs'

const EXTENSION_REGEX = /.([\w\d]+)$/
const ENTRIES_REGEX = /^[^\s][^\n]+[\S\s]+?(?=\n\s*\n)/gm

const args = process.argv.reduce((res, arg) => {
    if (arg.match(/^[^=]+=[^=]+$/)) {
        const split = arg.split(/=/);
        res[split[0]] = split[1]
    }
    return res
}, {})

if (!args.PATH) throw(new Error('CLI Argument PATH is missing'))

if (!existsSync(args.PATH)) throw(new Error(`Unable to find path: ${args.PATH}`))

function getBosFilesRecursive(path) {
    const stats = lstatSync(path)
    if (stats.isDirectory()) {
        const directory = readdirSync(path)
        let files = []
        directory.forEach(entry => {
            files = files.concat(getBosFilesRecursive(`${path}/${entry}`))
        })
        return files
    }
    const match = path.match(EXTENSION_REGEX)
    if (!match || match[1] != 'bos') return []
    const file = readFileSync(path).toString() + "\n"
    if (!file) return []
    return [file]
}

const files = getBosFilesRecursive(args.PATH)
const fullBos = files.join('\n').replace(/\r\n/g, '\n')
const entries = []
let entry = ENTRIES_REGEX.exec(fullBos)
while (entry !== null) {
    entries.push(entry[0].trim())
    entry = ENTRIES_REGEX.exec(fullBos)
}



function parseObject(entry) {
    const lines = entry.trim().split("\n")
    const keyLine = lines.shift().trim()
    const key = keyLine.match(/^%\w+/)?.[0]?.replace(/%/, '')
    if (!key) return null
    const keyEnum = keyLine.match(/<[\w\s]+>/)?.[0]
    const body = {}
    lines.forEach(line => {
        const match = line.trim().match(/^(\w+):\s(.*)$/)
        if (!match) return
        const lineKey = match[1]
        const lineValue = match[2]
        body[lineKey] = lineValue
    })
    return { key, body, enum: keyEnum, type: 'object' }
}

function parseEnum(entry) {
    const lines = entry.trim().split("\n")
    const keyLine = lines.shift()
    const qualifiers = keyLine.match(/\w+/g)
    const key = qualifiers.shift()
    const body = []
    lines.forEach(line => {
        if (!qualifiers.length) {
            body.push(line.trim())
            return
        }
        const entries = line.trim().split(/\s+/)
        const subBody = {key: entries.shift()}
        qualifiers.forEach((qualifier, index) => {
            subBody[qualifier] = entries[index]
        })
        body.push(subBody)
    })
    return {key, body, type: 'enum'}
}

function parseDefinition(entry) {
    const lines = entry.trim().split("\n")
    const keyLine = lines.shift()
    const key = keyLine?.trim().replace(/@/, '')
    if (!key) return null
    const body = {required: {}, optional: {}}
    lines.forEach(line => {
        const [varType, varName] = line.trim().split(/\s+/)
        console.log(line, varType, varName)
        if (!varType || !varName) return
        if (varType.match(/^:/)) {
            body.required[varName] = varType.replace(/:/, '')
        } else {
            body.optional[varName] = varType
        }
    })
    return {key, body, type: 'definition'}
}

function parseEntry(entry) {
    switch(entry[0]) {
        case "<":
            return parseEnum(entry)
        case "@":
            return parseDefinition(entry)
        case "%":
            return parseObject(entry)
    }
    console.error("Unable to parse entry: \n", entry)
    return null
}

function parseEntries(result, entry) {
    const parsedEntry = parseEntry(entry)
    if (!parsedEntry) return result
    // result[parsedEntry.type][parsedEntry.key] = parsedEntry.body
    switch(parsedEntry.type) {
        case 'definition':
            result[parsedEntry.type][parsedEntry.key] = parsedEntry.body
            break;
        case 'enum':
            result[parsedEntry.type][parsedEntry.key] = parsedEntry.body
            break;
        case 'object':
            if (!result[parsedEntry.type][parsedEntry.key]) {
                result[parsedEntry.type][parsedEntry.key] = []
            }
            result[parsedEntry.type][parsedEntry.key].push({body: parsedEntry.body, enum: parsedEntry.enum})
            break;
    }
    return result
}

const parsedEntries = entries.reduce(parseEntries, {object: {}, enum: {}, definition: {}})

console.log(JSON.stringify(parsedEntries, null, 2))