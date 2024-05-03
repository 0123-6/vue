import type { GlobalAPI } from 'types/global-api'
import { mergeOptions } from '../util/index'

export function initMixin(Vue: GlobalAPI) {
  /**
   * 给Vue构造函数添加mixin静态方法
   * @param mixin
   */
  Vue.mixin = function (mixin: Object) {
    // 将this.options和传入的mixin对象混合
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
