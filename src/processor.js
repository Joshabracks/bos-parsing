

export function processParsedEntries({ objects, enums, definitions }) {
    const result = {}
    for (let key in objects) {
        const definition = definitions[key]
        if (!definition) throw new Error(`${key} is not defined`)
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
            for (let defKey in definition.optional) {
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
            const objEnums = obj.enum?.trim()?.split(' ')
            if (objEnums?.length) {
                const enumKey = objEnums.shift()
                const enumList = enums[enumKey]
                if (!enumList) {
                    console.error(`enum "${enumKey} not found"`)
                    return
                }
                const indexRegex = new RegExp(`<${enumKey}>`, 'g')
                const stringRegex = new RegExp(`<~${enumKey}>`, 'g')
                const lowerCaseRegex = new RegExp(`<~~${enumKey}>`, 'g')
                const capitalizedRegex = new RegExp(`<~~~${enumKey}>`, 'g')
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
                        const newObjResult = {}
                        const keyVal = e.key
                        delete e.key
                        e[enumKey] = keyVal
                        for (let eKey in e) {
                            if (!e[eKey]) continue
                            console.log(e[eKey])
                            const _indexRegex = new RegExp(`<${eKey}>`, 'g')
                            const _stringRegex = new RegExp(`<~${eKey}>`, 'g')
                            const _lowerCaseRegex = new RegExp(`<~~${eKey}>`, 'g')
                            const _capitalizedRegex = new RegExp(`<~~~${eKey}>`, 'g')
                            const lowerCaseE = e[eKey].toLowerCase()
                            const capitalizedE = e[eKey].slice(0, 1).toUpperCase() + e[eKey].slice(1, e[eKey].length - 1).toLowerCase()
                            for (let objResultKey in objResult) {
                                if (typeof objResult[objResultKey] === 'string') {
                                    newObjResult[objResultKey] = objResult[objResultKey]
                                        .replace(_indexRegex, index)
                                        .replace(_stringRegex, eKey)
                                        .replace(_lowerCaseRegex, lowerCaseE)
                                        .replace(_capitalizedRegex, capitalizedE)
                                    continue
                                }
                                if (objResult[objResultKey]?.constructor?.name === 'Array' && typeof objResult[objResultKey][0] === 'string') {
                                    newObjResult[objResultKey] = objResult[objResultKey].map(entry => {
                                        const res = entry
                                            .replace(_indexRegex, index)
                                            .replace(_stringRegex, e)
                                            .replace(_lowerCaseRegex, lowerCaseE)
                                            .replace(_capitalizedRegex, capitalizedE)
                                        return res
                                    })
                                    continue
                                }
                                newObjResult[objResultKey] = objResult[objResultKey]
                            }
                        }
                    }
                })
            } else {
                result[key].push(objResult)
            }
        })
    }
    return result
}