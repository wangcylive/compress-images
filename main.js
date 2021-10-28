import imagemin from 'imagemin'
import imageminJpegRecompress from 'imagemin-jpeg-recompress'
import imageminPngquant from 'imagemin-pngquant'
import {getCompressionRatio, getCompressImageJson, setCompressImageJson, mkdirsPromise, formatFileSize, consoleColor, findNotExistent} from './utils'
import fsp from 'fs/promises'
import path from 'path'

console.log(33)

async function startImagemin() {
  const files = await imagemin(['src/**/*.{jpg,jpeg,png}'], {
    // destination: 'build/images',
    plugins: [
      imageminJpegRecompress({
        target: 0.8,
        min: 60,
        max: 80,
      }),
      imageminPngquant({
        quality: [0.6, 0.8]
      })
    ]
  })

  const localData = await getCompressImageJson()

  // 过滤掉不存在的文件
  const compressedList = localData.compressedList || []
  const notExistent = await findNotExistent(compressedList)
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
          // 备份原图片
          await mkdirsPromise(path.join('bak_images', path.dirname(sourcePath)))
          await fsp.rename(sourcePath, path.join('bak_images', sourcePath))
          await fsp.writeFile(sourcePath, data).catch(err => {
            console.error('compress error', sourcePath, err)
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

export default startImagemin