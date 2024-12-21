import parser from "../src/index.js"
import assert from "node:assert"
import { expected } from "./expected.js"

const res = parser.compile('./')

assert.equal(JSON.stringify(res), JSON.stringify(expected))
