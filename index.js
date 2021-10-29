#!/usr/bin/env node
import imageless from './main.js'
const args = process.argv[2]
if (['-h', '-help'].includes(args)) {
  console.log(`
usage: minimage
  -h help
  -b [<dir>] Backup source file
`)
} else {
  const needBackup = ['-b', '-backup'].includes(args)
  const backupDir = process.argv[3] || '_bak_minimage'
  if (needBackup) {
    imageless(backupDir)
  } else {
    imageless()
  }
}
