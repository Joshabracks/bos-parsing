const errors = []
let debug = false

export function setDebug(bool) {
    debug = bool
}

export function getErrors() {
    return errors
}

export function logError(e) {
    if (debug) console.error(e)
    errors.push(e)
}

export function clearErrors() {
    while (errors.length) errors.shift()
}
