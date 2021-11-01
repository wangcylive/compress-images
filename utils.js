import fsp from 'fs/promises'
import path from 'path'

export const compressedImagesJsonPath = 'imageless.json'

export const backupDir = 'imageless_backup'

export async function asyncLoadPkgJson() {
  const data = await fsp.readFile(path.join(process.cwd(), 'package.json'), 'utf-8')
  if (data) {
    return JSON.parse(data)
  }
  return null
}

export async function getCompressImageJson() {
  const pkgJson = await asyncLoadPkgJson()
  const defaultJson = {name: pkgJson.name || 'imageless', version: pkgJson.version || '1.0.0', totalSourceFileSize: 0, totalCompressedFileSize: 0, compressionRatio: 0, compressedList: []}
  return fsp.readFile(compressedImagesJsonPath, 'utf-8').then(data => {
    let value = defaultJson
    try {
      value = JSON.parse(data)
    } catch (e) {}
    return value
  }).catch((e) => {
    return defaultJson
  })
}

export function setCompressImageJson(data) {
  return fsp.writeFile(compressedImagesJsonPath, JSON.stringify(data, null, 2), 'utf-8')
}

// 创建文件夹目录
// export function mkdirsPromise(dirname) {
//   return new Promise((resolve) => {
//     const mkdirs = (dirname, callback) => {
//       fs.access(dirname, (err) => {
//         if (!err) {
//           callback()
//         } else {
//           mkdirs(path.dirname(dirname), () => {
//             fs.mkdir(dirname, callback)
//           })
//         }
//       })
//     }
//     mkdirs(dirname, resolve)
//   })
// }

/**
 * 计算压缩百分比，保留2位小数点
 * @param compressed
 * @param uncompressed
 * @return {string}
 */
export function getCompressionRatio(compressed, uncompressed) {
  if (uncompressed === 0) {
    return '0%'
  }
  return Math.floor((1 - compressed / uncompressed) * 1e4) / 1e2 + '%'
}

export function formatFileSize (value) {
  const unitArray = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const floatSize = parseFloat(value)
  const index = Math.floor(Math.log(floatSize) / Math.log(1024))
  const size = (floatSize / Math.pow(1024, index)).toFixed(2)
  return size + unitArray[index]
}

export function consoleColor(text) {
  return `\x1b[31m${text}\x1b[0m`
}

// 过滤不存的文件
export function findNotExistent(compressedList) {
  return new Promise((resolve, reject) => {
    Promise.all(compressedList.map((item) => {
      return fsp.access(item.sourcePath).then(() => null).catch((err) => {
        return item.sourcePath
      })
    })).then((paths) => {
      resolve(paths.filter((item) => item))
    })
  })
}