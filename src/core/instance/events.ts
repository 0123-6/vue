import type { Component } from 'types/component'
import {
  toArray,
  isArray,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

/**
 * vm创建第2步，初始化事件
 * @param vm
 */
export function initEvents(vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

function add(event, fn) {
  target.$on(event, fn)
}

function remove(event, fn) {
  target.$off(event, fn)
}

function createOnceHandler(event, fn) {
  const _target = target
  return function onceHandler() {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

/**
 * 将父组件的事件附加到子组件上
 * @param vm
 * @param listeners
 * @param oldListeners
 */
export function updateComponentListeners(
  vm: Component,
  listeners: Object,
  oldListeners?: Object | null
) {
  target = vm
  updateListeners(
    listeners,
    oldListeners || {},
    add,
    remove,
    createOnceHandler,
    vm
  )
  target = undefined
}

/**
 * eventsMixin函数，给Vue.prototype添加了和事件处理相关的方法
 * Vue.prototype.$on
 * Vue.prototype.$once
 * Vue.prototype.$off
 * Vue.prototype.$emit
 * @param Vue
 */
export function eventsMixin(Vue: typeof Component) {
  // 钩子函数判断的正则表达式
  const hookRE = /^hook:/
  /**
   * Vue.prototype.$on方法的实现
   * 为vm添加一个订阅指定事件的函数
   * @param event
   * @param fn
   */
  Vue.prototype.$on = function (
    event: string | Array<string>,
    fn: Function
  ): Component {
    // 获取当前vm
    const vm: Component = this
    // 如果event是数组的话，则遍历调用
    if (isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      // 如果vm._events[event]不存在,则定义vm._events[event]为空数组
      // 将fn处理函数放入其中
      ;(vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      // 如果event是hook事件，则设置vm._hasHookEvent为true
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    // 返回当前vm
    return vm
  }

  /**
   * 添加一个只执行一次，然后就不可再次被执行的函数
   * @param event
   * @param fn
   */
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    // 获取vm
    const vm: Component = this
    // 定义一个闭包，将该闭包通过vm.$on添加到事件列表中,
    // 这个事件执行时，先将自身从vm._events[event]数组中移除，然后再执行，
    // 所以只能执行一次
    function on() {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    // 取消订阅会用到
    on.fn = fn
    // 将on闭包函数添加到vm._events[event]数组中
    vm.$on(event, on)
    return vm
  }

  /**
   * 从vm._events中移除指定处理函数
   * @param event
   * @param fn
   */
  Vue.prototype.$off = function (
    event?: string | Array<string>,
    fn?: Function
  ): Component {
    const vm: Component = this
    // all
    // vm.$off()将移除全部事件和对应的处理函数
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    // 如果event是数组，则递归调用自身
    if (isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    // 获取event对应的处理函数数组
    const cbs = vm._events[event!]
    // 如果处理函数数组不存在,直接返回
    if (!cbs) {
      return vm
    }
    // 如果没有指定处理函数，则将该event对应的处理函数数组清空
    if (!fn) {
      vm._events[event!] = null
      return vm
    }
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      // 正常情况为cb === fn
      // vm.$once定义的函数为比较cb.fn === fn
      if (cb === fn || cb.fn === fn) {
        // 如果找到，则移除该事件处理函数
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  /**
   * 触发vm._events[event]数组中的全部处理函数
   * @param event
   */
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    // 获取vm._events[event]数组
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      // 遍历vm._events[event]数组，调用每一个函数
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
