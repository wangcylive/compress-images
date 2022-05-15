#!/usr/bin/env node
import {tinifyImages, imageless, deleteImagelessJson, getVersion, restoreImages} from './imageless.js'

const args = process.argv[2]
if (args === '-h') {
  console.log(`
usage: imageless
  -l imagemin local
  -h help
  -d delete imageless.json file
  -v imageless version
  -r restore images
`)
} else if (args === '-d') {
  deleteImagelessJson()
} else if (args === '-v') {
  getVersion()
} else if (args === '-r') {
  restoreImages()
} else if (args === '-l') {
  imageless(true)
} else {
  tinifyImages(true)
}
