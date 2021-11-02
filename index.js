#!/usr/bin/env node
import imageless, {deleteImagelessJson, getVersion} from './imageless.js'

const args = process.argv[2]
if (args === '-h') {
  console.log(`
usage: imageless
  -h help
  -d delete imageless.json file
  -v imageless version
`)
} else if (args === '-d') {
  deleteImagelessJson()
} else if (args === '-v') {
  getVersion()
} else {
  imageless(true)
}
