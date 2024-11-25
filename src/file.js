import {lstatSync, readdirSync, readFileSync} from 'fs'

const EXTENSION_REGEX = /.([\w\d]+)$/

export function getBosFilesRecursive(path) {
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
