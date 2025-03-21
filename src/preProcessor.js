

function parseObject(entry) {
    const lines = entry.trim().split("\n")
    const keyLine = lines.shift().trim()
    const key = keyLine.split(' ').shift()
    if (!key) return null
    const enumMetaData = keyLine.match(/(?<=\w+\s)[\w=]+/g) || []
    const keyEnum = enumMetaData?.shift()
    const body = {}
    let openBraketEntry = ""
    lines.forEach(line => {
        if (openBraketEntry) {
            const match = line.trim().match(/^.*\]$/)
            if (match) {
                line = openBraketEntry + match;
                openBraketEntry = ""
            } else {
                openBraketEntry += line
                return
            }
        }
        let match = line.trim().match(/^\w+:\s*?\[[^\]]*?$/)
        if (match) { // line is open array
            openBraketEntry = match[0]
            return
        }
        match = line.trim().match(/^(\w+):\s(.*)$/)
        if (!match) return
        const lineKey = match[1]
        const lineValue = match[2]
        body[lineKey] = lineValue
    })
    return { key, body, enum: keyEnum, meta_data: enumMetaData.map(m => m.split(/=/)), type: 'object' }
}

function parseEnum(entry) {
    const lines = entry.trim().split("\n")
    const keyLine = lines.shift()
    const qualifiers = keyLine.replace(/^enum\s/, '').match(/\w+/g)
    const key = qualifiers.shift()
    const body = []
    lines.forEach(line => {
        if (!qualifiers.length) {
            body.push({key: line.trim()})
            return
        }
        const entries = line.trim().split(/\s+/)
        const subBody = { key: entries.shift() }
        qualifiers.forEach((qualifier, index) => {
            subBody[qualifier] = entries[index]
        })
        body.push(subBody)
    })
    return { key, body, type: 'enum' }
}

function parseDefinition(entry) {
    const lines = entry.trim().split("\n")
    const keyLine = lines.shift()
    const key = keyLine?.trim().replace(/@/, '')
    if (!key) return null
    const body = { required: {}, optional: {} }
    lines.forEach(line => {
        const [varType, varName] = line.trim().split(/\s+/)
        if (!varType || !varName) return
        if (varType.match(/^:/)) {
            body.required[varName] = varType.replace(/:/, '')
        } else {
            body.optional[varName] = varType
        }
    })
    return { key, body, type: 'definition' }
}

function parseEntry(entry) {
    if (entry.match(/^enum/)) return parseEnum(entry)
    if (entry.match(/^@/)) return parseDefinition(entry)
    if (entry.match(/^\w+\b/)) return parseObject(entry)
    console.error("Unable to parse entry: \n", entry)
    return null
}

export function parseEntries(result, entry) {
    const parsedEntry = parseEntry(entry)
    if (!parsedEntry) return result
    switch (parsedEntry.type) {
        case 'definition':
            result.definitions[parsedEntry.key] = parsedEntry.body
            break;
        case 'enum':
            result.enums[parsedEntry.key] = parsedEntry.body
            break;
        case 'object':
            if (!result.objects[parsedEntry.key]) {
                result.objects[parsedEntry.key] = []
            }
            result.objects[parsedEntry.key].push(parsedEntry)
            break;
    }
    return result
}