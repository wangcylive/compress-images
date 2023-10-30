import portfinder from 'portfinder'
import {internalIpV4Sync} from 'internal-ip'

export const [development, production] = ['development', 'production']

export const isProd = process.env.NODE_ENV === production
export const ip = internalIpV4Sync()

export function getPort() {
  return portfinder.getPortPromise().then((port) => {
    global.devMiddlewareServerPort = port
    return port
  })
}

export function getProjectEnv() {
  return {
    PROJECT_ENV: JSON.stringify(process.env.PROJECT_ENV || 'prod'),
  }
}
