import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
import type { GlobalAPI } from 'types/global-api'

function Vue(options) {
  if (__DEV__ && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 执行初始化方法
  this._init(options)
}

/**
 * Vue2的源代码被打包为vue.js，global.Vue = factory()，进入到core/instance/index.ts文件
 * 此时Vue是一个构造函数，typeof Vue === 'function'，Vue.length === 1表示接受1个参数options,Vue.name === 'Vue',
 * Vue.prototype.__proto__ === Object.prototype，
 * Vue.prototype只有1个属性，Vue.prototype.constructor === Vue
 */

/**
 * initMixin函数，参数为Vue构造函数，作用为给Vue.prototype添加一个_init方法
 * + Vue.prototype._init
 */
//@ts-expect-error Vue has function type
initMixin(Vue)

/**
 * stateMixin函数，给Vue.prototype添加了和数据相关的$data,$props属性，其中vm.$data === vm._data,
 * 添加了和数据相关的$set,$delete,$watch方法
 * + Vue.prototype.$data
 * + Vue.prototype.$props
 * + Vue.prototype.$set
 * + Vue.prototype.$delete
 * + Vue.prototype.$watch
 */
//@ts-expect-error Vue has function type
stateMixin(Vue)

/**
 * eventsMixin函数，给Vue.prototype添加了和事件处理相关的方法
 * Vue.prototype.$on
 * Vue.prototype.$once
 * Vue.prototype.$off
 * Vue.prototype.$emit
 */
//@ts-expect-error Vue has function type
eventsMixin(Vue)

/**
 * lifecycleMixin函数，给Vue.prototype添加生命周期相关方法
 * Vue.prototype._update
 * Vue.prototype.$forceUpdate
 * Vue.prototype.$destroy
 */
//@ts-expect-error Vue has function type
lifecycleMixin(Vue)

/**
 * 定义一系列render编译函数
 * 定义Vue.prototype.$nextTick,让我们可以在DOM更新后做一些事情
 * 定义Vue.prototype._render
 */
//@ts-expect-error Vue has function type
renderMixin(Vue)

export default Vue as unknown as GlobalAPI




// Vue原理相关

// Vue2的响应式原理是什么？


/**
 * stateMixin函数做了什么？
 * stateMixin(Vue)为Vue.prototype添加了state状态管理相关的属性和方法
 * Vue.prototype.$data
 * Vue.prototype.$props
 * Vue.prototype.$set
 * Vue.prototype.$delete
 * Vue.prototype.$watch
 *
 *
 *
 */
































































































