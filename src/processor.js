

export function processParsedEntries({ objects, enums, definitions }) {
    const result = {}
    for (let key in objects) {
        const definition = definitions[key]
        if (!definition) throw new Error(`${key} is not defined within definitions:\n ${JSON.stringify(definitions, null, 2)}`)
        objects[key].forEach(obj => {
            const objResult = {}
            for (let defKey in definition.required) {
                if (!obj.body[defKey]) {
                    console.error(`${key}: required field ${defKey} is not present in object ${JSON.stringify(obj)}`)
                    return
                }
                const field = definition.required[defKey]?.trim()
                if (!field) {
                    console.error(`${defKey}: not present in object: ${JSON.stringify(obj)}`)
                    return
                }
                if (obj.body[defKey]?.trim().match(/^\[.*\]$/)) {
                    // field is array
                    const fieldType = defKey.replace(/[\[\]]/g, '')
                    const field = JSON.parse(obj.body[defKey])
                    if (field?.constructor?.name !== 'Array') {
                        console.error(`${key}.${defKey} must be an array.  found: ${obj.body[defKey]}`)
                        return
                    }
                    // TODO: Confirm Array types match fieldType
                    objResult[defKey] = field
                } else {
                    const fieldType = defKey.trim()
                    // TODO: Confirm value matches fieldType
                    objResult[defKey] = obj.body[defKey]
                }
            }
            for (let defKey in definition.optional) {
                if (!obj.body[defKey]) continue
                if (defKey.match(/^\[\w+\]$/)) {
                    // field is array
                    const fieldType = defKey.replace(/[\[\]]/g, '')
                    const field = JSON.parse(obj.body[defKey])
                    if (field?.constructor?.name !== 'Array') {
                        console.error(`${key}.${defKey} must be an array.  found: ${obj.body[defKey]}`)
                        return
                    }
                    // TODO: Confirm Array types match fieldType
                    objResult[defKey] = field
                } else {
                    const fieldType = defKey.trim()
                    // TODO: Confirm value matches fieldType
                    objResult[defKey] = obj.body[defKey]
                }
            }
            if (!result[key]) {
                result[key] = []
            }
            if (obj.enum) {
                // const enumKey = objEnums.shift()
                const enumList = enums[obj.enum]
                if (!enumList) {
                    console.error(`enum "${obj.enum} not found"`)
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