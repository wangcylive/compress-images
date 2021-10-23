import imagemin from 'imagemin'
import imageminJpegtran from'imagemin-jpegtran'
import imageminPngquant from 'imagemin-pngquant'
import fs from 'fs'
import * as path from 'path'

async function a() {
  const files = await imagemin(['assets/*.{jpg,png}'], {
    // destination: 'build/images',
    plugins: [
      imageminJpegtran(),
      imageminPngquant({
        quality: [0.6, 0.8]
      })
    ]
  });

  files.forEach((item) => {
    const {sourcePath, data} = item
    const dirname = path.dirname(sourcePath)
    const extname = path.extname(sourcePath)
    const basename = path.basename(sourcePath, extname)
    fs.writeFile(path.join(dirname, basename + '.compare' + extname), data, err => {
      if (err) {
        console.log('writeFile error', err)
        return
      }
      console.log('writeFile success')
    })
  })
  console.log(files);
}

// const sourcePath = 'assets/apps.43559.9007199266245973.a4166e79-16a2-4eb2-89ef-ece5c26af02e.png'
// const extname = path.extname(sourcePath)
// const basename = path.basename(sourcePath, extname)
// console.log(basename, extname)

a()
