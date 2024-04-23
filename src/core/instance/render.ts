import {
  nextTick,
  emptyObject,
  defineReactive,
  isArray
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import VNode from '../vdom/vnode'

import type { Component } from 'types/component'
import { currentInstance, setCurrentInstance } from 'v3/currentInstance'
import { syncSetupSlots } from 'v3/apiSetup'

export function initRender(vm: Component) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees
  const options = vm.$options
  const parentVnode = (vm.$vnode = options._parentVnode!) // the placeholder node in parent tree
  const renderContext = parentVnode && (parentVnode.context as Component)
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  vm.$scopedSlots = parentVnode
    ? normalizeScopedSlots(
        vm.$parent!,
        parentVnode.data!.scopedSlots,
        vm.$slots
      )
    : emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  // @ts-expect-error
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  // @ts-expect-error
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data

  // 将vm.$attrs定义为响应式
  defineReactive(
    vm,
    '$attrs',
    (parentData && parentData.attrs) || emptyObject,
    null,
    true
  )
  // 将vm.$listeners定义为响应式
  defineReactive(
    vm,
    '$listeners',
    options._parentListeners || emptyObject,
    null,
    true
  )
}

export let currentRenderingInstance: Component | null = null

// for testing only
export function setCurrentRenderingInstance(vm: Component) {
  currentRenderingInstance = vm
}

/**
 * 定义Vue.prototype.$nextTick
 * 定义Vue.prototype._render
 * @param Vue
 */
export function renderMixin(Vue: typeof Component) {
  // install runtime convenience helpers
  // 给Vue.prototype定义一系列方法
  installRenderHelpers(Vue.prototype)

  // 定义Vue.prototype.$nextTick
  // Vue.prototype.$nextTick = nextTick.bind(this)可行？
  Vue.prototype.$nextTick = function (fn: (...args: any[]) => any) {
    return nextTick(fn, this)
  }

  /**
   * 定义Vue.prototype._render方法,返回一个VNode对象
   */
  Vue.prototype._render = function (): VNode {
    // 定义vm指向this
    const vm: Component = this
    // vm.$options._parentVnode存在,而且vm已经挂载了
    // 这说明当前vm是子组件，需要设置下vm的作用域
    if (vm.$options._parentVnode && vm._isMounted) {
      vm.$scopedSlots = normalizeScopedSlots(
        vm.$parent!,
        vm.$options._parentVnode.data!.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      )
      if (vm._slotsProxy) {
        syncSetupSlots(vm._slotsProxy, vm.$scopedSlots)
      }
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    // ???
    vm.$vnode = vm.$options._parentVnode!
    // render self
    // 这行代码将当前活动的组件实例保存在 prevInst 变量中
    const prevInst = currentInstance
    // 这行代码将当前正在渲染的组件实例保存在 prevRenderInst 变量中
    const prevRenderInst = currentRenderingInstance

    // 设置当前的vm
    setCurrentInstance(vm)
    // 设置当前正在渲染对象为当前vm
    currentRenderingInstance = vm

    // 核心操作,调用vm.$options.render函数，this为vm._renderProxy,参数为1个vm.$createElement
    // 渲染过程中取值，好像没有触发响应式？
    let vnode = vm.$options.render.call(vm._renderProxy, vm.$createElement)

    // 恢复正在渲染实例为之前的实例
    currentRenderingInstance = prevRenderInst
    // 恢复之前的实例
    setCurrentInstance(prevInst)

    // if the returned array contains only a single node, allow it
    if (isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // set parent
    // 将新vnode.parent设置为vm.$options._parentVnode
    vnode.parent = vm.$options._parentVnode
    // VNode创建完成，返回创建的vnode
    return vnode
  }
}
