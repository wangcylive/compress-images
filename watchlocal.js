import chokidar from 'chokidar'
import tinify from 'tinify'

const watchPaths = ['/Users/wangchunyang/Pictures/tinify'] // 监听目录
const tinifyFileName = 'tinify' // 压缩后的文件名称添加标识
const watchIgnore = /ignore/ // 忽略
const minSize = 1024 * 5 // 大于 5kb压缩
const tinifyKeys = ['NpmW5gDcjz1WgMg7JLJMwLZ26Gps7clY', 'mh1DJYXnv2nVG9PVpkFvhVNssFgMtpn5'] // outlook, gmail

// 记录正在压缩中的图片
const tinifyCompressingSet = new Set()

function setTinifyKey(update = false) {
  if (update) {
    tinifyKeys.push(tinifyKeys.shift())
  }
  tinify.key = tinifyKeys[0]
}

/**
 * tinify 压缩图片
 * @param path 文件路径
 * @param stats 文件状态
 * @returns {Promise<void>}
 */
async function tinifyImg(path, stats) {
  setTinifyKey()
  const [filePath, fileSuffix] = path.split(/\.(?=[^.]+$)/)
  if (!/\.(jpe?g|png|gif)$/.test(path)) {
    return
  }
  if (tinifyCompressingSet.has(path)) {
    return
  }
  if (stats.size < minSize) {
    return
  }
  tinifyCompressingSet.add(path)
  if (tinify.compressionCount < 50) {
    setTinifyKey(true)
  }
  const newPath = filePath + `.${tinifyFileName}.` + fileSuffix
  console.log('compressionCount', tinify.compressionCount, 'compress', newPath)
  // 如果第一次压缩失败，延迟 3s 再次压缩，2次失败删除压缩中的状态
  const compress = (isFirst = true) => {
    tinify.fromFile(path).toFile(newPath).then(() => {
      tinifyCompressingSet.delete(path)
    }).catch(err => {
      if (isFirst) {
        setTimeout(() => {
          compress(false)
        }, 3 * 1e3)
      } else {
        tinifyCompressingSet.delete(path)
      }
      console.error('tinify err', err)
    })
  }
  return compress()
}

const watcher = chokidar.watch(watchPaths, {
  persistent: true,
  ignored: [new RegExp('\\.' + tinifyFileName + '\\.[^.]+$'), watchIgnore], // 忽略已压缩的图片 /\.tinify\.[^.]+$/
  alwaysStat: true,
  ignoreInitial: true, // 忽略初始化
})

watcher.on('add', (path, stats) => {
  if (path && stats) {
    tinifyImg(path, stats)
  }
})