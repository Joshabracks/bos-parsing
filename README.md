# BOS Parser
npmjs parsing package for the (Batching Object System) data notation.  For syntax specifications, visit the [bos-highlighter](https://github.com/Joshabracks/bos-highlighting) github.

## Installation 
```console
npm i bos-parser
```
## Use

```javascript
import parser from 'bos-parser'

// compile path should be the root directory of the project where the bos files reside

const compiled = parser.compile('<path>')

// files are compiled to JSON format.  Do what you will with them
```