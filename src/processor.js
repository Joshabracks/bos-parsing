import { logError } from "./util.js"

export function processParsedEntries({ objects, enums, definitions }) {
    const result = {}
    for (let key in objects) {
        const definition = definitions[key]
        const allKeys = Object.keys(definition.required).concat(Object.keys(definition.optional))
        if (!definition) throw new Error(`${key} is not defined within definitions:\n ${JSON.stringify(definitions, null, 2)}`)
        objects[key].forEach(obj => {
            const objResult = {}
            // for (let defKey in definition.required) {
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
                    // const fieldName = defKey.replace(/[\[\]]/g, '')
                    let parsedField = parseField(field.replace(/[\[\]]/g, ''), obj.body[defKey], true)
                    if (parsedField?.constructor?.name !== 'Array') {
                        logError(`${key}.${defKey} must be an array.  found: ${obj.body[defKey]}`)
                        return
                    }
                    
                    objResult[defKey] = parsedField
                } else {
                    // const fieldName = defKey.trim()
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
                const indexRegex = new RegExp(`<${obj.enum}>`, 'g')
                const stringRegex = new RegExp(`<~${obj.enum}>`, 'g')
                const lowerCaseRegex = new RegExp(`<~~${obj.enum}>`, 'g')
                const capitalizedRegex = new RegExp(`<~~~${obj.enum}>`, 'g')
                
                enumList.forEach((e, index) => {
                    if (typeof e === 'string') {
                        const lowerCaseE = e.toLowerCase()
                        const capitalizedE = e.slice(0, 1).toUpperCase() + e.slice(1, e.length - 1).toLowerCase()
                        const newObjResult = {}
                        for (let objResultKey in objResult) {
                            if (typeof objResult[objResultKey] === 'string') {
                                newObjResult[objResultKey] = objResult[objResultKey]
                                    .replace(indexRegex, index)
                                    .replace(stringRegex, e)
                                    .replace(lowerCaseRegex, lowerCaseE)
                                    .replace(capitalizedRegex, capitalizedE)
                                continue
                            }
                            if (objResult[objResultKey]?.constructor?.name === 'Array' && typeof objResult[objResultKey][0] === 'string') {
                                newObjResult[objResultKey] = objResult[objResultKey].map(entry => {
                                    const res = entry
                                        .replace(indexRegex, index)
                                        .replace(stringRegex, e)
                                        .replace(lowerCaseRegex, lowerCaseE)
                                        .replace(capitalizedRegex, capitalizedE)
                                    return res
                                })
                                continue
                            }
                            newObjResult[objResultKey] = objResult[objResultKey]
                        }
                        result[key].push(newObjResult)
                    } else {
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
                            const _indexRegex = new RegExp(`<${eKey}>`, 'g')
                            const _stringRegex = new RegExp(`<~${eKey}>`, 'g')
                            const _lowerCaseRegex = new RegExp(`<~~${eKey}>`, 'g')
                            const _capitalizedRegex = new RegExp(`<~~~${eKey}>`, 'g')
                            const lowerCaseE = eCopy[eKey].toLowerCase()
                            const capitalizedE = eCopy[eKey].slice(0, 1).toUpperCase() + eCopy[eKey].slice(1, eCopy[eKey].length).toLowerCase()
                            for (let objResultKey in objResult) {
                                if (!newObjResult[objResultKey]) {
                                    newObjResult[objResultKey] = objResult[objResultKey]
                                }
                                if (typeof objResult[objResultKey] === 'string') {
                                    newObjResult[objResultKey] = newObjResult[objResultKey]
                                    .replace(_indexRegex, index)
                                    .replace(_stringRegex, eKey.replace(/_/g, ' '))
                                    .replace(_lowerCaseRegex, lowerCaseE.replace(/_/g, ' '))
                                    .replace(_capitalizedRegex, capitalizedE.replace(/_/g, ' '))
                                    continue
                                }
                                
                                if (objResult[objResultKey]?.constructor?.name === 'Array' && typeof objResult[objResultKey][0] === 'string') {
                                    newObjResult[objResultKey] = objResult[objResultKey].map(entry => {
                                        const res = entry
                                            .replace(_indexRegex, index)
                                            .replace(_stringRegex, eKey.replace(/_/g, ' '))
                                            .replace(_lowerCaseRegex, lowerCaseE.replace(/_/g, ' '))
                                            .replace(_capitalizedRegex, capitalizedE.replace(/_/g, ' '))
                                        return res
                                    })
                                    continue
                                }
                                // newObjResult[objResultKey] = objResult[objResultKey]
                            }
                        }
                        result[key].push(newObjResult)
                    }
                })
            } else {
                result[key].push(objResult)
            }
        })
    }
    return result
}