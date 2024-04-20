import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'
import { version } from 'v3'

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
initGlobalAPI(Vue)

/**
 * Vue.$isServer
 */
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

/**
 * $ssrContext
 */
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get() {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

/**
 * FunctionalRenderContext
 */
// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

/**
 * Vue.version
 */
Vue.version = version

export default Vue
