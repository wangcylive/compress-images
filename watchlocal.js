// https://tinify.cn/developers/reference/nodejs

import chokidar from 'chokidar'
import tinify from 'tinify'
import fsp from 'fs/promises'

const watchPaths = ['/Users/wangchunyang/Pictures/tinify'] // 监听目录
const tinifyFileName = 'tinify' // 压缩后的文件名称添加标识
const watchIgnore = /ignore/ // 忽略
const minSize = 1024 * 5 // 大于 5kb压缩
const tinifyKeys = ['NpmW5gDcjz1WgMg7JLJMwLZ26Gps7clY', 'mh1DJYXnv2nVG9PVpkFvhVNssFgMtpn5'] // outlook, gmail
const fileType = /\.(jpe?g|png|webp)$/ // 支持压缩文件类型

// 记录正在压缩中的图片
const tinifyCompressingSet = new Set()

function setTinifyKey(update = false) {
  if (update) {
    tinifyKeys.push(tinifyKeys.shift())
  }
  tinify.key = tinifyKeys[0]
}

/**
 * 获取文件 size，ps切图文件拿不到文件尺寸信息，轮训尝试
 * @param path
 * @returns {Promise<unknown>}
 */
function getFileStat(path) {
  return new Promise((resolve, reject) => {
    let timeoutID = -1
    let stopTimeoutID = -1
    let result = null
    const fn = () => {
      timeoutID = setTimeout(() => {
        fsp.stat(path).then(stat => {
          result = stat
          if (stat.size > 0) {
            resolve(stat)
            clearTimeout(stopTimeoutID)
          } else {
            fn()
          }
        })
      }, 500)
    }
    fn()
    stopTimeoutID = setTimeout(() => {
      resolve(result)
      clearTimeout(timeoutID)
    }, 60 * 1e3)
  })
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
  if (!fileType.test(path)) {
    return
  }
  if (tinifyCompressingSet.has(path)) {
    return
  }
  // 重新获取文件尺寸
  if (stats.size === 0) {
    stats = await getFileStat(path)
  }
  if (!stats || stats.size < minSize) {
    return
  }

  tinifyCompressingSet.add(path)
  const newPath = filePath + `.${tinifyFileName}.` + fileSuffix
  console.log('compress', newPath)
  // 如果第一次压缩失败，延迟 3s 再次压缩，2次失败删除压缩中的状态
  const compress = (isFirst = true) => {
    tinify.fromFile(path).toFile(newPath).then(() => {
      tinifyCompressingSet.delete(path)
      // 小于20次切换 key
      if (tinify.compressionCount < 20) {
        setTinifyKey(true)
      }
    }).catch(err => {
      /**
       * 有四种类型的错误。异常信息将包含更加详细的错误原因描述。
       * AccountError
       * 您的API密钥或API帐户存在问题。您的请求无法认证通过。如果达到了您的压缩限制， 您可以等到下一个日历月或升级您的订阅。 验证API密钥和帐户状态后，您可以重试该请求。
       * ClientError
       * 由于提交的数据存在问题，无法完成请求。异常消息将包含更多信息。您不应该重试该请求。
       * ServerError
       * 由于Tinify API暂时出现问题，无法完成请求。安全的做法是几分钟后再重试该请求。 如果您在较长时间内反复看到此错误，请与我们联系。
       * ConnectionError
       * 由于连接问题，请求无法发送到Tinify API。您应该检查网络连接。重试该请求是安全的。
       */
      if (err instanceof tinify.ClientError) {
        tinifyCompressingSet.delete(path)
      } else {
        if (err instanceof tinify.AccountError) {
          setTinifyKey(true)
        }
        if (isFirst) {
          setTimeout(() => {
            compress(false)
          }, 3 * 1e3)
        }
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