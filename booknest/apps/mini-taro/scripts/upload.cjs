const fs = require('node:fs')
const path = require('node:path')
const ci = require('miniprogram-ci')

const appid = process.env.WECHAT_MINI_APP_ID
const privateKey = process.env.WECHAT_MINI_PRIVATE_KEY
const version = process.env.MINI_UPLOAD_VERSION || require('../package.json').version || '0.0.1'
const desc = process.env.MINI_UPLOAD_DESC || `BookNest Mini Pro ${version}`

if (!appid || !privateKey) {
  throw new Error('Missing WECHAT_MINI_APP_ID or WECHAT_MINI_PRIVATE_KEY')
}

const keyPath = path.join(__dirname, '../private.key')
fs.writeFileSync(keyPath, privateKey)

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: path.join(__dirname, '../dist'),
  privateKeyPath: keyPath,
  ignores: ['node_modules/**/*'],
})

async function main() {
  await ci.upload({
    project,
    version,
    desc,
    setting: {
      es6: true,
      minify: true,
      autoPrefixWXSS: true,
    },
    onProgressUpdate: console.log,
  })
}

main().finally(() => {
  if (fs.existsSync(keyPath)) fs.unlinkSync(keyPath)
})
