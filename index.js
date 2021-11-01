#!/usr/bin/env node
import imageless, {deleteImagelessJson} from './imageless.js'

const args = process.argv[2]
if (args === '-h') {
  console.log(`
usage: imageless
  -h help
  -d delete imageless.json file
`)
} else if (args === '-d') {
  deleteImagelessJson()
} else {
  imageless(true)
}
