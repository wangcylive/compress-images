# imageless
一行命令对项目中的所有图像进行压缩，并对源文件进行备份，可重复执行，不破坏项目结构和源代码。

对比 *image-minimizer-webpack-plugin* 不需要每次构建都压缩，减少发布的时间。

生成 *imageless.json* 文件作为压缩记录。

比较压缩前和压缩后的文件，压缩后文件变小才会起作用。

压缩文件使用 md5 判断，避免重复压缩。


## 支持的图片格式
* jpg
* png

## 安装
```
npm install imageless -g
```

## Command
```
imageless
```
执行压缩，备份原图片到 *imageless_backup* 文件夹
```
imageless -d
```
删除 *imageless.json* 文件

### 配置
*package.json* 可进行相关配置，以下为默认配置项
```json
{
  "imageless": {
    "input": ["src/**/*.{jpg,jpeg,png}"],
    "jpegOptions": {
      "quality": 70
    },
    "pngOptions": {
      "quality": [0.6, 0.8]
    }
  }
}
```

#### input
使用 [imagemin](https://www.npmjs.com/package/imagemin) 的 input 选项，可设置需要压缩的文件路径，也可过滤一些文件夹或文件
如 <code>["src/**/*.jpg", "!src/images/user.jpg"]</code>

#### jpegOptions
使用 [imagemin-mozjpeg](https://www.npmjs.com/package/imagemin-mozjpeg) 的 options，可设置 *jpeg* 格式图片压缩选项。<code>quality</code>设置压缩质量，范围 0 ~ 100，默认值 70

#### pngOptions
使用 [imagemin-pngquant](https://www.npmjs.com/package/imagemin-pngquant) 的 options，可设置 *png* 格式图片的压缩选项。<code>quality</code>设置压缩质量，格式<code>Array<min: number, max: number></code>，默认值 <code>[0.6, 0.8]</code>