# imageless
一行命令对项目中的所有图像进行压缩，并对源文件进行备份，可重复执行，不破坏项目结构和源代码。

全局安装，零配置，所有项目可以使用。

对比 *image-minimizer-webpack-plugin* 不需要每次构建都压缩，减少发布的时间；可以选择过滤某些文件或某个文件夹。

默认使用 tinify 在线服务压缩，也可使用 imagemin 不依赖第三方本地压缩

生成 *imageless.json* 文件作为压缩记录。

比较压缩前后的文件，保证压缩后文件一定变小。

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
执行 tinify 压缩，备份原图片到 *imageless_backup* 文件夹
```
imageless -l
```
执行 imagemin 压缩，备份原图片到 *imageless_backup* 文件夹
```
imageless -d
```
删除 *imageless.json* 文件
```
imageless -v
```
查看版本
```
imageless -r
```
还原压缩文件

### 配置
*package.json* 可进行 <code>imageless</code> 相关配置，以下为默认配置项
```json
{
  "imageless": {
    "input": ["src/**/*.{jpg,jpeg,png}"],
    "jpegOptions": {
      "quality": 70
    },
    "pngOptions": {
      "quality": [0.6, 0.8]
    },
    "minSize": 1024,
    "tinifyKey": "YOUR_API_KEY"
  }
}
```

#### input
使用 [globby](https://www.npmjs.com/package/globby) 的 patterns 选项，可设置需要压缩的文件路径，也可过滤一些文件夹或文件
如 <code>["src/**/*.{jpg,jpeg,png}", "!src/images/user.jpg"]</code>

### tinifyKey
使用 [tinify](https://tinify.cn/) 压缩图片，配置 *YOUR_API_KEY*，默认使用作者申请的 key，每月限制500张，可设置为自己申请的 key

#### jpegOptions
使用 [imagemin-mozjpeg](https://www.npmjs.com/package/imagemin-mozjpeg) 的 options，可设置 *jpeg* 格式图片压缩选项。<code>quality</code>设置压缩质量，范围 0 ~ 100，默认值 70

#### pngOptions
使用 [imagemin-pngquant](https://www.npmjs.com/package/imagemin-pngquant) 的 options，可设置 *png* 格式图片的压缩选项。<code>quality</code>设置压缩质量，格式<code>Array<min: number, max: number></code>，默认值 <code>[0.6, 0.8]</code>

#### minSize
大于等于 <code>minSize</code> 大小的图片才会被压缩，设置 *0* 所有的图片都压缩，默认 *1KB*