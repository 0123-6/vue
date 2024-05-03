import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions } from '../util/index'
import type { Component } from 'types/component'
import type { InternalComponentOptions } from 'types/options'
import { EffectScope } from 'v3/reactivity/effectScope'

// vm.uid,从0开始，是vm的唯一标识
let uid = 0

/**
 * initMixin函数，参数为Vue构造函数，作用为给Vue.prototype添加一个_init方法
 * @param Vue
 */
export function initMixin(Vue: typeof Component) {
  // 给Vue.prototype._init赋值
  Vue.prototype._init = function (options?: Record<string, any>) {
    /**
     * beforeCreate钩子前主要做了什么工作？
     * 1. 定义vm的一些基本属性，比如_uid,_isVue,__v_skip
     * 2. 如果options._isComponent,表示这是子组件，初始化一般子组件属性，比如_parentListeners获取父组件的一些方法
     * 3. 初始化生命周期相关的属性，
     * 4. 初始化事件，定义vm._events
     */
    // 定义vm指向当前this
    const vm: Component = this
    // a uid
    vm._uid = uid++
    // a flag to mark this as a Vue instance without having to do instanceof
    // check
    vm._isVue = true
    // avoid instances from being observed
    vm.__v_skip = true
    // effect scope
    // ？？？
    vm._scope = new EffectScope(true /* detached */)
    // #13134 edge case where a child component is manually created during the
    // render of a parent component
    vm._scope.parent = undefined
    vm._scope._vm = true
    // merge options
    // 如果这个vm是子组件的话，调用初始化一般组件函数
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options as any)
    } else {
      // new Vue()会进入到这里
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor as any),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    vm._renderProxy = vm
    // expose real self
    vm._self = vm
    // 初始化生命周期
    initLifecycle(vm)
    // 初始化事件
    initEvents(vm)
    // 初始化render
    initRender(vm)
    // 调用beforeCreate钩子
    // 在vm初始化之后，进行数据侦听和事件侦听之前同步调用
    callHook(vm, 'beforeCreate', undefined, false /* setContext */)
    // 初始化注入
    initInjections(vm) // resolve injections before data/props
    // 重点，将data和props响应式化
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    // vm创建完成后同步调用
    callHook(vm, 'created')
    // 如果options存在el属性，则调用vm.$mount方法
    if (vm.$options.el) {
      // 不使用单文件组件时，定义位于platforms/web/runtime-with-compiler.ts
      // 先将el编译，在挂载

      // 使用单文件组件时，会进入platforms/web/runtime/index.ts方法
      // 这是Vue.prototype.$mount的原生定义
      // 但是包含编译器的Vue版本中，会被覆盖
      // 这个方法基本啥也没做，只是获取了el对应的实际DOM元素
      // 然后返回调用mountComponent(this, el);
      vm.$mount(vm.$options.el)
    }
  }
}

/**
 * 初始化一般子组件
 * @param vm
 * @param options
 */
export function initInternalComponent(
  vm: Component,
  options: InternalComponentOptions
) {
  // 定义vm.$options,以vm.options为原型
  const opts = (vm.$options = Object.create((vm.constructor as any).options))
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  // vm.$options.parent =
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions!
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions(Ctor: typeof Component) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions(
  Ctor: typeof Component
): Record<string, any> | null {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
