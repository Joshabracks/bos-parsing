import parser from "../src/index.js"
import assert from "node:assert"
import { expected } from "./expected.js"
import path from "node:path";

const RED = "\u001b[31m";
const BLUE = "\u001b[34m";
const GREEN = "\u001b[32m";
const RESET = "\u001b[0m";

console.log(BLUE, `running unit test on ${path.resolve('./test')}`, RESET)
parser.setDebug(true)
const start = Date.now()
const res = parser.compile('./')
const end = Date.now()
const compileTime = (end - start) / 1000
console.log(`BOS compile time: ${RED}${compileTime}${RESET}`)
assert.equal(JSON.stringify(res), JSON.stringify(expected))

const errors = parser.getErrors()
errors.forEach(assert.fail)

console.log(GREEN, `Test Successful`, RESET)
