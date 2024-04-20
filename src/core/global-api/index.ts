import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'
import type { GlobalAPI } from 'types/global-api'

/**
 * 给Vue添加一些方法和属性
 * + Vue.config
 * + Vue.util对象，包含4个方法
 * + Vue.set
 * + Vue.delete
 * + Vue.nextTick
 * + Vue.observable
 *
 * + Vue.options对象，保存全局component,全局directive,全局filter,_base为Vue本身
 * + 定义Vue.use方法,用来给Vue安装插件
 * + Vue.mixin
 * + 定义Vue.extend，用来实现继承
 * + Vue.components 定义组件
 * + Vue.directive 定义指令
 * + Vue.filter 定义过滤器
 *
 * @param Vue
 */
export function initGlobalAPI(Vue: GlobalAPI) {
  // config
  // 定义Vue.config属性
  const configDef: Record<string, any> = {}
  configDef.get = () => config
  if (__DEV__) {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 定义Vue.config属性
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 定义Vue.util对象，包含4个方法
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // 定义Vue.set
  Vue.set = set
  // 定义Vue.delete
  Vue.delete = del
  // 定义Vue.nextTick
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 定义Vue.observable,这是一个实用方法，可以将任意对象响应式化
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  // 定义Vue.options属性，保存全局component,全局directive,全局filter,_base为Vue本身
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  // 把keep-alive组件放入Vue.options.components数组
  extend(Vue.options.components, builtInComponents)

  // 定义Vue.use方法,用来给Vue安装插件
  initUse(Vue)
  // 定义Vue.mixin方法
  initMixin(Vue)
  // 定义Vue.extend，用来实现继承
  initExtend(Vue)
  // 定义Vue.options对象的3个资源的定义方法
  initAssetRegisters(Vue)
}
