import { logError } from "./util.js"

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

export function processParsedEntries({ objects, enums, definitions }) {
    const result = {}
    for (let key in objects) {
        const definition = definitions[key]
        if (!definition) {
            logError(`${key} is not defined within definitions:\n ${JSON.stringify(definitions, null, 2)}`)
            continue
        }
        const allKeys = Object.keys(definition.required).concat(Object.keys(definition.optional))
        objects[key].forEach(obj => {
            const objResult = {}
            for (let i = 0; i < allKeys.length; i++) {
                const defKey = allKeys[i]
                if (definition.required[defKey] && !obj.body[defKey]) {
                    logError(`${key}: required field ${defKey} is not present in object ${JSON.stringify(obj)}`)
                    return
                }
                if (definition.optional[defKey] && !obj.body[defKey]) {
                    continue
                }
                const isRequired = Object.keys(definition.required).indexOf(defKey) !== -1
                const field = isRequired ? definition.required[defKey]?.trim() : definition.optional[defKey]?.trim()
                if (!field && !isRequired) {
                    logError(`${defKey}: not present in object: ${JSON.stringify(obj)}`, null, 2)
                    return
                }
                function parseField(fieldType, e, isArray = false) {
                    const primatives = ['string', 'int', 'float', 'boolean']
                    if (primatives.indexOf(fieldType) !== -1) {
                        return isArray ? JSON.parse(e) : e
                    }
                    const eKeys = enums[fieldType].map((e) => {
                        return typeof e === 'string' ? e : e?.key
                    })
                    if (!isArray) {
                        return eKeys.indexOf(e)
                    }
                    const eParsed = JSON.parse(e)
                    return eParsed.map(a => {
                        return eKeys.indexOf(a)
                    })
                }
                if (obj.body[defKey]?.trim().match(/^\[.*\]$/)) {
                    // field is array
                    let parsedField = parseField(field.replace(/[\[\]]/g, ''), obj.body[defKey], true)
                    if (parsedField?.constructor?.name !== 'Array') {
                        logError(`${key}.${defKey} must be an array.  found: ${obj.body[defKey]}`)
                        return
                    }

                    objResult[defKey] = parsedField
                } else {
                    objResult[defKey] = parseField(field, obj.body[defKey])
                }
            }
            if (!result[key]) {
                result[key] = []
            }
            if (obj.enum) {
                const enumList = enums[obj.enum]
                if (!enumList) {
                    logError(`enum "${obj.enum} not found"`)
                    return
                }
                enumList.forEach((e, index) => {
                    const eCopy = JSON.parse(JSON.stringify(e))
                    const newObjResult = {}
                    const keyVal = eCopy.key
                    delete eCopy.key
                    eCopy[obj.enum] = keyVal
                    if (!obj.meta_data.every(m => {
                        if (m.length === 1) return true
                        if (e[m[0]] === m[1]) return true
                        return false
                    })) {
                        return
                    }
                    for (let eKey in eCopy) {
                        if (!eCopy[eKey]) continue
                        const regexes = {
                            index: new RegExp(`<${eKey}>`, 'g'),
                            string: new RegExp(`<~${eKey}>`, 'g'),
                            lowerCase: new RegExp(`<~~${eKey}>`, 'g'),
                            capitalized: new RegExp(`<~~~${eKey}>`, 'g'),
                        }
                        for (let objResultKey in objResult) {
                            if (!newObjResult[objResultKey]) {
                                newObjResult[objResultKey] = objResult[objResultKey]
                            }
                            if (typeof objResult[objResultKey] === 'string') {
                                newObjResult[objResultKey] = formatEntry(regexes, newObjResult[objResultKey], eCopy[eKey], index)
                            }
                            else if (objResult[objResultKey]?.constructor?.name === 'Array') {
                                const entry = newObjResult[objResultKey] ? JSON.stringify(newObjResult[objResultKey]) : JSON.stringify(objResult[objResultKey])
                                newObjResult[objResultKey] = JSON.parse(formatEntry(regexes, entry, eCopy[eKey], index))
                            }
                        }
                    }
                    for (let objResultKey in newObjResult) {
                        if (typeof newObjResult[objResultKey] === 'string') {
                            try {
                                const evaluated = eval(newObjResult[objResultKey]);
                                newObjResult[objResultKey] = evaluated;
                            } catch { }
                        } else {
                            try {
                                newObjResult[objResultKey] = newObjResult[objResultKey].map(x => {
                                    try {
                                        const y = eval(x)
                                        return y
                                    } catch {
                                        return x
                                    }
                                    
                                })
                            } catch { }
                        }
                    }

                    result[key].push(newObjResult)
                })
            } else {
                console.log(objResult)
                result[key].push(objResult)
            }
        })
    }
    return result
}
