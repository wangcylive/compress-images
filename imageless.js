import imagemin from 'imagemin'
import imageminMozjpeg from 'imagemin-mozjpeg'
import imageminPngquant from 'imagemin-pngquant'
import {compressedImagesJsonPath, backupDir, getCompressionRatio, getCompressImageJson, setCompressImageJson,
  formatFileSize, consoleColor, findNotExistent, asyncLoadPkgJson} from './utils.js'
import fsp from 'fs/promises'
import path from 'path'
import makeDir from 'make-dir'
import md5 from 'md5'

/**
 * 压缩图片
 * @param needBackup
 * @return {Promise<void>}
 */
async function imageless(needBackup) {
  const pkgJson = await asyncLoadPkgJson()
  let input = pkgJson?.imageless?.input || ['src/**/*.{jpg,jpeg,png}']
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
        /**
         * 本地保存数据和未压缩图片md5不一致，说明图片有更新
         * 并且压缩后的文件必须小于源文件
         */
        if (compressedMd5Map.get(sourcePath) !== oriMd5 && data.byteLength < oriFileSize) {
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
    curCompressedList.sort((a, b) => b.compressed - a.compressed)
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
      const showTableData = curCompressedList.map(({sourcePath, uncompressed, compressed, ratio}) => {
        return {
          path: sourcePath,
          origin: formatFileSize(uncompressed),
          current: formatFileSize(compressed),
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