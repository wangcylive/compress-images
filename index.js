import imagemin from 'imagemin'
import imageminJpegtran from'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import fs from 'fs'
import fsp from 'fs/promises'
import * as path from 'path'

const compressedImagesJsonPath = 'compressed.images.json'

const defaultJson = {name: 'compressed images', version: '1.0.0', totalSourceFileSize: 0, totalCompressedFileSize: 0, compressionRatio: 0, compressedList: []}
function getCompressImageJson() {
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

function setCompressImageJson(data) {
  return fsp.writeFile(compressedImagesJsonPath, JSON.stringify(data, null, 2), 'utf-8')
}

function mkdirs(dirname, callback) {
  fs.access(dirname, (err) => {
    if (!err) {
      callback()
    } else {
      mkdirs(path.dirname(dirname), () => {
        fs.mkdir(dirname, callback)
      })
    }
  })
}

mkdirs('a/b/c', () => {
  console.log('1')
})

/**
 * 计算压缩比例，保留两位小数点
 * @param compressed
 * @param uncompressed
 * @return {number}
 */
function getCompressionRatio(compressed, uncompressed) {
  if (uncompressed === 0) {
    return 0
  }
  return Math.floor((1 - compressed / uncompressed) * 100) / 100
}

function formatFileSize (value) {
  const unitArray = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  const floatSize = parseFloat(value)
  const index = Math.floor(Math.log(floatSize) / Math.log(1024))
  const size = (floatSize / Math.pow(1024, index)).toFixed(2)
  return size + unitArray[index]
}

function consoleColor(text) {
  return `\x1b[37;44;1m${text}\x1b[0m`
}

// 过滤不存的文件
function findNotExistent(compressedList) {
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

async function startCompress() {
  const files = await imagemin(['assets/**/*.{jpg,jpeg,png}'], {
    // destination: 'build/images',
    plugins: [
      imageminJpegtran(),
      imageminPngquant({
        quality: [0.6, 0.8]
      })
    ]
  })

  const localData = await getCompressImageJson()

  // 过滤掉不存在的文件
  const compressedList = localData.compressedList || []
  const notExistent = await findNotExistent(compressedList)
  console.log(notExistent)
  if (notExistent.length > 0) {
    for (let i = compressedList.length - 1; i >= 0; i--) {
      if (notExistent.includes(compressedList[i].sourcePath)) {
        compressedList.splice(i, 1)
      }
    }
  }
  const compressedPathMap = new Map(compressedList.map(item => [item.sourcePath, item.compressed]))
  const curCompressedList = []
  const promiseArr = []
  files.forEach((item) => {
    const {sourcePath, data} = item
    promiseArr.push(new Promise(async (resolve, reject) => {
      try {
        const stat = await fsp.stat(sourcePath)
        /**
         * 判断本地数据没有保存当前图片的信息（是否有路径，并且文件大小一致），下个版本使用MD5校验
         * 并且压缩后的文件必须小于源文件
         */
        if (compressedPathMap.get(sourcePath) !== stat.size && data.byteLength < stat.size) {
          // 删除重复的数据
          curCompressedList.some((item, index) => {
            if (item.sourcePath === sourcePath) {
              curCompressedList.splice(index, 1)
              return true
            }
          })
          curCompressedList.push({
            sourcePath,
            uncompressed: stat.size,
            compressed: data.byteLength,
            ratio: getCompressionRatio(data.byteLength, stat.size)
          })
          await fsp.writeFile(sourcePath, data).catch(err => {
            console.log('compress error', sourcePath, err)
          })
        }
        resolve()
      } catch (e) {
        console.error(e)
        resolve()
      }
    }))
  })
  Promise.all(promiseArr).then(() => {
    // 按压缩比例从高到底排序
    curCompressedList.sort((a, b) => b.ratio - a.ratio)
    localData.compressedList = (localData.compressedList || []).concat(curCompressedList)
    let totalSourceFileSize = 0
    let totalCompressedFileSize = 0
    localData.compressedList.forEach((item) => {
      totalSourceFileSize += item.uncompressed
      totalCompressedFileSize += item.compressed
    })
    const compressionRatio = getCompressionRatio(totalCompressedFileSize, totalSourceFileSize)
    localData.totalSourceFileSize = totalSourceFileSize
    localData.totalCompressedFileSize = totalCompressedFileSize
    localData.compressionRatio = compressionRatio
    setCompressImageJson(localData)
    if (curCompressedList.length > 0) {
      const curCompressedTotal = curCompressedList.reduce(((previousValue, currentValue) => previousValue + currentValue.compressed), 0)
      console.log(`This compressed file ${consoleColor(curCompressedList.length)}, a total of ${consoleColor(formatFileSize(curCompressedTotal))} reduction`)
      console.table(curCompressedList)
    }
    if (localData.compressedList.length > 0) {
      console.log(`A total of ${consoleColor(localData.compressedList.length)} images have been compressed, reducing ${consoleColor(formatFileSize(totalSourceFileSize - totalCompressedFileSize))}, with a compression ratio of ${consoleColor(getCompressionRatio(totalCompressedFileSize, totalSourceFileSize) * 100 + '%')}`)
    } else {
      console.log('There are no images that need to be compressed')
    }
  }).catch((e) => {
    console.error(e)
  })
}

// startCompress()

// fsp.rename('./assets/ico_refrash@3x.png', './build/ico_refrash@3x.png').then(res => {
//   console.log(res)
// })

// fsp.mkdir('./bak_compress/').then(res => {
//   console.log(res)
// })
