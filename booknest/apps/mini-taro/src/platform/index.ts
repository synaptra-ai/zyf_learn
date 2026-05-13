import Taro from '@tarojs/taro'

export function isWeapp() {
  return Taro.getEnv() === Taro.ENV_TYPE.WEAPP
}

export function isH5() {
  return Taro.getEnv() === Taro.ENV_TYPE.WEB
}
