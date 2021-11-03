import imagemin from 'imagemin'
import imageminMozjpeg from 'imagemin-mozjpeg'
import imageminPngquant from 'imagemin-pngquant'
import {compressedImagesJsonPath, backupDir, getCompressionRatio, getCompressImageJson, setCompressImageJson,
  formatFileSize, consoleColor, findNotExistent, asyncLoadPkgJson} from './utils.js'
import fsp from 'fs/promises'
import path from 'path'
import makeDir from 'make-dir'
import md5 from 'md5'
import imageSize from 'image-size'

/**
 * 压缩图片
 * @param needBackup
 * @return {Promise<void>}
 */
async function imageless(needBackup) {
  const pkgJson = await asyncLoadPkgJson()
  const input = pkgJson?.imageless?.input || ['src/**/*.{jpg,jpeg,png}']
  const files = await imagemin(input, {
    // destination: 'build/images',
    plugins: [
      imageminMozjpeg({
        quality: 70,
        ...pkgJson?.imageless?.jpegOptions,
      }),
      imageminPngquant({
        quality: [0.6, 0.8],
        ...pkgJson?.imageless?.pngOptions,
      })
    ]
  })
  let minSize = 1024 * 6 // 默认大于等于6KB的文件才会压缩
  if (pkgJson?.imageless?.minSize >= 0) {
    minSize = pkgJson.imageless.minSize
  }

  const localData = await getCompressImageJson()

  // 过滤掉不存在的文件
  const compressedList = localData?.compressedList || []
  const notExistent = await findNotExistent(compressedList)
  if (notExistent.length > 0) {
    for (let i = compressedList.length - 1; i >= 0; i--) {
      if (notExistent.includes(compressedList[i].sourcePath)) {
        compressedList.splice(i, 1)
      }
    }
  }
  const compressedMd5Map = new Map(compressedList.map(item => [item.sourcePath, item.md5]))
  const curCompressedList = []
  const promiseArr = []
  files.forEach((item) => {
    const {sourcePath, data} = item
    promiseArr.push(new Promise(async (resolve, reject) => {
      try {
        const oriBuf = await fsp.readFile(sourcePath)
        const oriFileSize = oriBuf.byteLength
        const oriMd5 = await md5(oriBuf)
        const curMd5 = await md5(data)
        const {width, height} = await imageSize(oriBuf)
        /**
         * 本地保存数据和未压缩图片md5不一致，说明图片有更新
         * 压缩后的文件必须小于源文件
         * 源文件大小大于设置的最小文件大小
         */
        if (compressedMd5Map.get(sourcePath) !== oriMd5 && data.byteLength < oriFileSize && oriFileSize > minSize) {
          // 删除重复的数据
          compressedList.some((item, index) => {
            if (item.sourcePath === sourcePath) {
              compressedList.splice(index, 1)
              return true
            }
          })
          curCompressedList.push({
            sourcePath,
            md5: curMd5,
            uncompressed: oriFileSize,
            compressed: data.byteLength,
            dimension: `${width}x${height}`,
            ratio: getCompressionRatio(data.byteLength, oriFileSize)
          })
          // 备份原图片
          if (needBackup) {
            await makeDir(path.join(backupDir, path.dirname(sourcePath)))
            await fsp.rename(sourcePath, path.join(backupDir, sourcePath))
          }
          // 覆盖写入
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
    // 按压缩后文件大小从高到底排序
    curCompressedList.sort((a, b) => Number.parseFloat(b.ratio) - Number.parseFloat(a.ratio))
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
    localData.time = new Date().toUTCString()
    setCompressImageJson(localData)
    if (curCompressedList.length > 0) {
      const curCompressedTotal = curCompressedList.reduce(((previousValue, currentValue) => previousValue + currentValue.compressed), 0)
      console.log(`This compressed file ${consoleColor(curCompressedList.length)}, a total of ${consoleColor(formatFileSize(curCompressedTotal))} reduction`)
      const showTableData = curCompressedList.map(({sourcePath, uncompressed, compressed, ratio, dimension}) => {
        return {
          path: sourcePath,
          origin: formatFileSize(uncompressed),
          current: formatFileSize(compressed),
          dimension,
          ratio
        }
      })
      console.table(showTableData)
    }
    if (localData.compressedList.length > 0) {
      console.log(`A total of ${consoleColor(localData.compressedList.length)} images have been compressed, reducing ${consoleColor(formatFileSize(totalSourceFileSize - totalCompressedFileSize))}, with a compression ratio of ${consoleColor(getCompressionRatio(totalCompressedFileSize, totalSourceFileSize))}`)
    } else {
      console.log('There are no images that need to be compressed')
    }
  }).catch((e) => {
    console.error(e)
  })
}

export default imageless

/**
 * 删除 imageless.json
 * @return {Promise<void>}
 */
export function deleteImagelessJson() {
  return fsp.unlink(compressedImagesJsonPath).catch((err) => {
    console.error('unlink', err)
  })
}

/**
 * 获取版本号
 * @return {Promise<void>}
 */
export async function getVersion () {
  const json = JSON.parse(await fsp.readFile(new URL('./package.json', import.meta.url)))
  console.log(json.version)
}

/**
 * 还原文件
 * @return {Promise<void>}
 */
export async function restoreImages() {
  const data = await getCompressImageJson()
  const promiseArr = []
  data?.compressedList?.forEach(({sourcePath}) => {
    promiseArr.push(fsp.rename(path.join(backupDir, sourcePath), sourcePath).then(() => {
      // 还原成功删除 compressList 保存的数据
      data.compressedList.some((item, index, array) => {
        if (item.sourcePath === sourcePath) {
          array.splice(index, 1)
          return true
        }
      })
    }).catch((e) => {
      throw sourcePath
    }))
  })
  const results = await Promise.allSettled(promiseArr)
  data.time = new Date().toUTCString()
  setCompressImageJson(data)
  const successTotal = results.filter((result) => result.status === 'fulfilled').length
  const failTotal = results.length - successTotal
  console.log(`A total of ${consoleColor(successTotal)} files were restored${failTotal > 0 && ' and ' + consoleColor(failTotal) + ' failed'}`)
}