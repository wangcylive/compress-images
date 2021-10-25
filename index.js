import imagemin from 'imagemin'
import imageminJpegtran from'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import fsp from 'fs/promises'
import * as path from 'path'

const compareImageJsonPath = 'compress.images.json'

function getCompareImageJson() {
  return fsp.readFile(compareImageJsonPath, 'utf-8').then(data => {
    let value = null
    try {
      value = JSON.parse(data)
    } catch (e) {}
    return value
  }).catch((e) => {
    return null
  })
}

function setCompareImageJson(data) {
  return fsp.writeFile(compareImageJsonPath, JSON.stringify(data, null, 2), 'utf-8')
}

const defaultJson = {name: 'compare images', version: '1.0.0', sourceSize: 1, compressedSize: 1, compressionList: []}

async function compress() {
  const files = await imagemin(['assets/*.{jpg,png}'], {
    // destination: 'build/images',
    plugins: [
      imageminJpegtran(),
      imageminPngquant({
        quality: [0.6, 0.8]
      })
    ]
  });

  let json = await getCompareImageJson() || {}
  let compressTotal = 0 // 记录当次压缩文件数
  files.forEach((item) => {
    const {sourcePath, data} = item
    const dirname = path.dirname(sourcePath)
    const extname = path.extname(sourcePath)
    const basename = path.basename(sourcePath, extname)
    // fs.writeFile(sourcePath, data, err => {
    //   if (err) {
    //     console.log('writeFile error', err)
    //     return
    //   }
    //   console.log('writeFile success')
    // })
  })
  console.log(files);
}

// compress()
