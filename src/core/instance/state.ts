import Watcher from '../observer/watcher'
import Dep, { pushTarget, popTarget } from '../observer/dep'
import { initSetup } from 'v3/apiSetup'

import {
  set,
  del,
  observe,
  defineReactive,
  toggleObserving
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  isArray,
  isReserved,
  handleError,
  nativeWatch,
  validateProp,
  isPlainObject,
  isServerRendering,
  invokeWithErrorHandling,
  isFunction
} from '../util/index'
import type { Component } from 'types/component'
import { shallowReactive, TrackOpTypes } from 'v3'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/**
 * 在vm上设置data的每一个属性的代理
 * @param target
 * @param sourceKey
 * @param key
 */
export function proxy(target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter() {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter(val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * new Vue的核心方法，将vm.$data和vm.$props响应式化
 * @param vm
 */
export function initState(vm: Component) {
  // 获取vm.$options
  const opts = vm.$options
  // 如果存在props，初始化props???
  if (opts.props) initProps(vm, opts.props)

  // Composition API
  initSetup(vm)

  // 如果存在options.methods,初始化methods
  if (opts.methods) initMethods(vm, opts.methods)
  // 如果存在data,响应式化data
  if (opts.data) {
    initData(vm)
  } else {
    const ob = observe((vm._data = {}))
    ob && ob.vmCount++
  }
  // 如果存在options.computed,初始化computed
  if (opts.computed) initComputed(vm, opts.computed)
  // 如果存在watch,初始化watch
  if (opts.watch && opts.watch !== nativeWatch) {
    initWatch(vm, opts.watch)
  }
}

/**
 * 初始化props
 * @param vm
 * @param propsOptions
 */
function initProps(vm: Component, propsOptions: Object) {
  // 获取propsData
  const propsData = vm.$options.propsData || {}
  // 定义vm._props
  vm._props = shallowReactive({})
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  vm.$options._propKeys = []
  const isRoot = !vm.$parent
  // root instance props should be converted
  if (!isRoot) {
    toggleObserving(false)
  }
  for (const key in propsOptions) {
    vm.$options._propKeys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    defineReactive(vm._props, key, value, undefined, true /* shallow */)
    // static vm._props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy vm._props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  toggleObserving(true)
}

/**
 * 将vm.$options.data响应式化
 * @param vm
 */
function initData(vm: Component) {
  // 获取data
  let data: any = vm.$options.data
  data = vm._data = isFunction(data) ? getData(data, vm) : data || {}
  // 遍历key，在vm上设置映射
  for (const key of Object.keys(data)) {
    if (!isReserved(key)) {
      // 在vm上定义key的代理
      proxy(vm, `_data`, key)
    }
  }
  // 将data可观察化
  const ob = observe(data)
  ob && ob.vmCount++
}

export function getData(data: Function, vm: Component): any {
  // #7573 disable dep collection when invoking data getters
  pushTarget()
  try {
    return data.call(vm, vm)
  } catch (e: any) {
    handleError(e, vm, `data()`)
    return {}
  } finally {
    popTarget()
  }
}

const computedWatcherOptions = { lazy: true }

/**
 * 初始化计算属性
 * @param vm
 * @param computed
 */
function initComputed(vm: Component, computed: Object) {
  // 计算属性存在在vm._computedWatchers对象上,
  // 如果vm._comp9utedWatchers不存在，那么创建
  if (!vm._computedWatchers) {
    vm._computedWatchers = Object.create(null);
  }
  // 遍历options.computed
  for (const key in computed) {
    // 获取computed[key],可能为函数或对象
    const userDef = computed[key]
    // 定义computed的getter函数
    const getter = isFunction(userDef) ? userDef : userDef.get
    // create internal watcher for the computed property.
    // 创建一个通用的观察者,配置为lazy
    // 为什么不直接使用这个watcher呢？
    // 这个观察者没有回调函数
    // 当get时，如果观察者是dirty，则重新评估
    vm._computedWatchers[key] = new Watcher(vm, getter, noop, computedWatcherOptions)
    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    // 如果key在vm上不存在，在vm上定义计算属性
    defineComputed(vm, key, userDef)
  }
}

export function defineComputed(
  target: any,
  key: string,
  userDef: Record<string, any> | (() => any)
) {
  const shouldCache = !isServerRendering()
  if (isFunction(userDef)) {
    sharedPropertyDefinition.get = shouldCache
      ? createComputedGetter(key)
      : createGetterInvoker(userDef)
    sharedPropertyDefinition.set = noop
  } else {
    sharedPropertyDefinition.get = userDef.get
      ? shouldCache && userDef.cache !== false
        ? createComputedGetter(key)
        : createGetterInvoker(userDef.get)
      : noop
    sharedPropertyDefinition.set = userDef.set || noop
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * 使用闭包的写法，之后调用getter时无需传递key参数
 * 也可以理解为柯里化函数
 * @param key
 */
function createComputedGetter(key) {
  // 用户自定义watch的getter函数
  return function computedGetter() {
    // 获取此时watcher观察者对象
    const watcher = this._computedWatchers && this._computedWatchers[key]
    // 如果watcher存在,正常一定存在
    if (watcher) {
      // 如果watcher不是最新值，获取最新值
      if (watcher.dirty) {
        watcher.evaluate()
      }
      // ???难道不是get时就已经做好依赖收集了吗？
      // 什么时候Dep.target存在？
      if (Dep.target) {
        if (__DEV__ && Dep.target.onTrack) {
          Dep.target.onTrack({
            effect: Dep.target,
            target: this,
            type: TrackOpTypes.GET,
            key
          })
        }
        // 重新收集依赖？？？
        watcher.depend()
      }
      return watcher.value
    }
  }
}

function createGetterInvoker(fn) {
  return function computedGetter() {
    return fn.call(this, this)
  }
}

function initMethods(vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    if (__DEV__) {
      if (typeof methods[key] !== 'function') {
        warn(
          `Method "${key}" has type "${typeof methods[
            key
          ]}" in the component definition. ` +
            `Did you reference the function correctly?`,
          vm
        )
      }
      if (props && hasOwn(props, key)) {
        warn(`Method "${key}" has already been defined as a prop.`, vm)
      }
      if (key in vm && isReserved(key)) {
        warn(
          `Method "${key}" conflicts with an existing Vue instance method. ` +
            `Avoid defining component methods that start with _ or $.`
        )
      }
    }
    vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
  }
}

/**
 * 初始化new Vue(options)中options的watch对象
 * @param vm
 * @param watch
 */
function initWatch(vm: Component, watch: Object) {
  // 遍历watch对象
  for (const key in watch) {
    const handler = watch[key]
    if (isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

/**
 * 给指定vm添加一个观察者，观察指定表达式的变化,触发handler处理函数
 * 处理输入，本质是整理好输入后，调用vm.$watch(expOrFn, handler, options)方法
 * @param vm
 * @param expOrFn
 * @param handler
 * @param options
 */
function createWatcher(
  vm: Component,
  expOrFn: string | (() => any),
  handler: any,
  options?: Object
) {
  // const myWatch = {
  //   name(value, oldValue) {
  //
  //   },
  //   age: {
  //     handler(newVal, oldVal) {
  //       console.log('newVal: ', newVal);
  //     },
  //     deep: true,
  //   }
  // }
  // 如果handler是对象的话
  if (isPlainObject(handler)) {
    // 获取options
    options = handler
    // 获取handler
    handler = handler.handler
  }
  // 如果handler为字符串，则使用vm[handler]
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  return vm.$watch(expOrFn, handler, options)
}

/**
 * stateMixin函数，给Vue.prototype添加了和数据相关的$data,$props属性，
 * 添加了和数据相关的$set,$delete,$watch方法
 * @param Vue
 */
export function stateMixin(Vue: typeof Component) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  // $data的配置
  const dataDef: any = {}
  // $data.getter
  dataDef.get = function () {
    return this._data
  }

  // $props的配置
  const propsDef: any = {}
  // $props.getter
  propsDef.get = function () {
    return this._props
  }
  if (__DEV__) {
    // $data.setter，表示不期望被执行
    dataDef.set = function () {
      warn(
        'Avoid replacing instance root $data. ' +
          'Use nested data properties instead.',
        this
      )
    }
    // $props.setter，表示不期望被执行
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  // Vue.prototype添加$data属性,类型为Object
  // Vue实例观察的数据对象，Vue实例代理了对其data对象属性的访问,
  // 即Vue实例代理了对new Vue(options)中options.data()的访问
  Object.defineProperty(Vue.prototype, '$data', dataDef)

  // Vue.prototype添加$props属性,类型为Object类型
  // 表示当前vm需要接收的参数定义
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  /**
   * Vue.prototype添加$set方法,该方法为Vue.set方法的别名,
   * Vue.set(target, propertyName/index, value)
   * 其中target为对象或数组
   * propertyName/index为字符串/数字
   * value为任意值
   * 返回value
   * 该方法用于向响应式对象中添加一个属性，并设置该属性同样为响应式的，且触发视图更新，
   * vm已经new出来之后，如果需要动态添加属性，则必须使用该方法，直接添加则该属性就不是响应式的
   */
  Vue.prototype.$set = set

  // Vue.prototype添加$delete方法,和$set方法一样，该方法是Vue.delete方法的别名
  Vue.prototype.$delete = del

  /**
   * Vue.prototype添加$watch方法
   * @param expOrFn
   * @param cb
   * @param options
   */
  Vue.prototype.$watch = function (
    expOrFn: string | (() => any),
    cb: any,
    options?: Record<string, any>
  ): Function {
    const vm: Component = this
    // 如果cb是对象的形式,则先整体输入，在调用vm.$watch
    if (isPlainObject(cb)) {
      return createWatcher(vm, expOrFn, cb, options)
    }
    options = options || {}
    // 此方法为options的watch触发，为用户定义的观察者
    options.user = true
    // 新建一个观察者实例，监听vm.exp，变化时调用cb回调函数
    const watcher = new Watcher(vm, expOrFn, cb, options)
    // watch和computed的区别
    // 1. watch有回调函数,computed没有回调函数
    // 2. watch可以立即执行,computed不可以
    // 3. watch可以被取消观察，computed不可以
    // 如果是立即执行
    if (options.immediate) {
      const info = `callback for immediate watcher "${watcher.expression}"`
      // 入栈和出栈操作要是可以自动完成就好了，比如可以定义一个函数，接收一个函数，在执行前调用
      // pushTarget(),在结束后调用popTarget(),
      pushTarget()
      invokeWithErrorHandling(cb, vm, [watcher.value], vm, info)
      popTarget()
    }
    return function unwatchFn() {
      watcher.teardown()
    }
  }


}
