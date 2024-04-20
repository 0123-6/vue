import type { GlobalAPI } from 'types/global-api'
import { toArray, isFunction } from '../util/index'

export function initUse(Vue: GlobalAPI) {
  /**
   * 定义Vue.use方法，用来安装插件
   * @param plugin
   */
  Vue.use = function (plugin: Function | any) {
    // 定义this._installedPlugins为空数组
    const installedPlugins =
      this._installedPlugins || (this._installedPlugins = [])
    // 如果该插件已经存在在this._installedPlugins数组中，则直接返回
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 获取args数组
    const args = toArray(arguments, 1)
    // 将Vue放入args数组的开头???不是多此一举吗?
    args.unshift(this)
    // 如果plugin.install是函数
    if (isFunction(plugin.install)) {
      // 调用plugin.install方法，this为plugin自身，第一个参数为Vue构造函数,
      plugin.install.apply(plugin, args)
    } else if (isFunction(plugin)) {
      // 否则plugin自身为函数,则调用plugin，注意，此时this不存在,第一个参数为Vue构造函数
      plugin.apply(null, args)
    }
    // 将plugin添加到this._installedPlugins数组中
    installedPlugins.push(plugin)
    return this
  }
}
