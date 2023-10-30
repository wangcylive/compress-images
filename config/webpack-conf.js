import path from 'path'
import {fileURLToPath} from 'url'
import webpack from 'webpack'
import nodeExternals from 'webpack-node-externals'
import {isProd, ip, getProjectEnv} from './env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename);

function webpackConf() {
  const node = {
    global: false,
    __filename: false,
    __dirname: false,
  }
  const plugins = [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        ...getProjectEnv(),
      },
    }),
  ]

  const alias = {
    '@': path.resolve(__dirname, '../src'),
    root: path.resolve(__dirname, '..'),
  }

  return {
    target: 'node',
    context: path.resolve(__dirname, '..'),
    mode: process.env.NODE_ENV,
    entry: './watchlocal.js',
    output: {
      path: path.resolve(`./dist`),
      filename: 'watchlocal.js',
      libraryTarget: 'commonjs2',
    },
    externals: [nodeExternals()],
    node: node,
    module: {
      rules: [
        {
          test: /\.[t|j]sx?$/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: {},
        },
      ],
    },

    resolve: {
      alias,
      extensions: ['.js', '.jsx', '.tsx', '.ts', '.json'],
    },

    stats: {
      modules: false,
      children: false,
    },

    plugins,
  }
}

export default webpackConf
