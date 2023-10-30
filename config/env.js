const portfinder = require('portfinder')
// const internalIp = require('internal-ip')
const [development, production] = ['development', 'production']
const isProd = process.env.NODE_ENV === production
// const ip = internalIp.internalIpV4Sync()

function getPort() {
  return portfinder.getPortPromise().then((port) => {
    global.devMiddlewareServerPort = port
    return port
  })
}
function getProjectEnv() {
  return {
    PROJECT_ENV: JSON.stringify(process.env.PROJECT_ENV || 'prod'),
  }
}

module.exports = {
  development,
  production,
  isProd,
  getPort,
  getProjectEnv,
  // ip,
}
