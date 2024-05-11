import {
  remove,
  isObject,
  parsePath,
  _Set as Set,
  invokeWithErrorHandling,
  isFunction
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget, DepTarget } from './dep'
import { DebuggerEvent, DebuggerOptions } from 'v3/debug'

import type { SimpleSet } from '../util/index'
import type { Component } from 'types/component'
import { activeEffectScope, recordEffectScope } from 'v3/reactivity/effectScope'

// watcher的id
let uid = 0

/**
 * 观察者类的配置对象
 * @internal
 */
export interface WatcherOptions extends DebuggerOptions {
  // 是否深度观察,默认为true
  deep?: boolean
  // 是否为用户定义观察者,默认false
  user?: boolean
  // 是否为惰性观察者，主要用在options.computed上
  lazy?: boolean
  // 是否同步更新
  sync?: boolean
  // before函数,主要用于vm更新时，触发beforeUpdate函数
  before?: Function
}

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * @internal
 */
export default class Watcher implements DepTarget {
  vm?: Component | null
  expression: string
  cb: Function
  id: number
  deep: boolean
  user: boolean
  lazy: boolean
  sync: boolean
  dirty: boolean
  active: boolean
  deps: Array<Dep>
  newDeps: Array<Dep>
  depIds: SimpleSet
  newDepIds: SimpleSet
  // before函数,主要用于vm更新时，触发beforeUpdate函数
  before?: Function
  onStop?: Function
  noRecurse?: boolean
  getter: Function
  value: any
  post: boolean

  // dev only
  onTrack?: ((event: DebuggerEvent) => void) | undefined
  onTrigger?: ((event: DebuggerEvent) => void) | undefined

  /**
   * 观察者构造函数
   * @param vm vm实例
   * @param expOrFn 要观察的表达式或函数
   * @param cb 观察者发生变化时的回调函数
   * @param options 配置选项
   * @param isRenderWatcher 是否是render watcher
   */
  constructor(
    vm: Component | null,
    expOrFn: string | (() => any),
    cb: Function,
    options?: WatcherOptions | null,
    isRenderWatcher?: boolean
  ) {
    recordEffectScope(
      this,
      // if the active effect scope is manually created (not a component scope),
      // prioritize it
      activeEffectScope && !activeEffectScope._vm
        ? activeEffectScope
        : vm
        ? vm._scope
        : undefined
    )
    // 如果是渲染观察者
    if ((this.vm = vm) && isRenderWatcher) {
      // 将vm._watcher指向这个观察者对象,用来强制刷新组件
      vm._watcher = this
    }
    // options存在
    if (options) {
      // 是否深度观察,渲染观察者为false
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      // before函数,主要用于vm更新时，触发beforeUpdate函数
      this.before = options.before
    } else {
      // options不存在，默认全是false
      this.deep = this.user = this.lazy = this.sync = false
    }
    // 回调函数
    this.cb = cb
    // watcher.id
    this.id = ++uid // uid for batching
    // 是否是活跃状态
    this.active = true
    // ???
    this.post = false
    // 是否是脏数据,需要更新，用于惰性观察者
    this.dirty = this.lazy // for lazy watchers
    // 依赖数组
    this.deps = []
    // 新一次get过程中接触的依赖数组,watcher可以自动收集依赖
    this.newDeps = []
    // 依赖数组对应的set
    this.depIds = new Set()
    // 新一次get过程中对应的set
    this.newDepIds = new Set()
    // watcher的表达式
    this.expression = ''
    // parse expression for getter
    // 设置watcher.getter函数
    this.getter = isFunction(expOrFn) ? expOrFn : parsePath(expOrFn)
    // 设置watcher.value
    this.value = this.lazy ? undefined : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 获取watcher观察者的值，同时重新收集依赖
   * get方法主要由6部分组成
   * 1. 将当前watcher放入全局targetStack栈,同时将Dep.target指向当前watcher
   * 2. 调用this.getter(this.vm, this.vm)函数
   * 3. 如果是深度监听，则遍历获得的value？？？为什么？？？
   * 4. 获取值结束，当前watcher不再观察，从targetStack栈中弹出，重置Dep.target
   * 5. 进行依赖收集的清理工作
   * 6. 返回value
   */
  get() {
    // 将当前watcher放入全局的targetStack栈中,同时将Dep.target指向当前watcher
    pushTarget(this)

    let value = this.getter.call(this.vm, this.vm)
    // "touch" every property so they are all tracked as
    // dependencies for deep watching
    if (this.deep) {
      traverse(value)
    }

    // 获取值结束，当前watcher不再观察，从targetStack栈中弹出，重置Dep.target
    popTarget()
    // 进行依赖收集的清理工作
    this.cleanupDeps()

    return value
  }

  /**
   * Add a dependency to this directive.
   * 给观察者添加一个依赖项
   */
  addDep(dep: Dep) {
    // 获取依赖(发布者)的id
    const id = dep.id
    // 如果本地get过程中，第一次遇见这个依赖
    if (!this.newDepIds.has(id)) {
      // 将这个依赖添加到本次get时遇见的依赖的的数组中
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      // 如果这不仅是本次第一次遇见，还是watcher所有get时第一次遇见
      if (!this.depIds.has(id)) {
        // 那么将调用dep.addSub(this)，依赖将当前watcher加入到它的订阅列表中
        // 之后依赖变化时，会调用watcher.update()方法通知当前watcher
        dep.addSub(this)
      }
    }
    // 如果本次get时已经遇见过这个依赖了，啥也不做
  }

  /**
   * Clean up for dependency collection.
   * 依赖收集完成的清理和重置工作
   * router-view组件第1次渲染时观察了很多依赖，之后会观察很少？？？
   */
  cleanupDeps() {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp: any = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   * 当任意依赖项改变时调用
   */
  update() {
    // 如果是惰性观察者，则不用进行更新，只需将dirty设置为true，下次实际访问时再更新即可
    // 比如用户自定义计算属性，一般没有回调函数
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      // 如何是同步观察者，则调用this.run()函数，一般为异步观察者
      this.run()
    } else {
      // 异步观察者，将当前观察者放入scheduler调度队列中
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   * watcher.update方法最终执行的run方法
   * 1. 优化直接返回
   * 2. 调用this.get()获取watcher.value
   * 3. 调用watcher.cb
   */
  run() {
    // 优化，如果当前观察者不再活跃，直接返回
    if (!this.active) {
      return;
    }

    const value = this.get()
    if (
      value !== this.value ||
      // Deep watchers and watchers on Object/Arrays should fire even
      // when the value is the same, because the value may
      // have mutated.
      isObject(value) ||
      this.deep
    ) {
      // set new value
      const oldValue = this.value
      this.value = value
      if (this.user) {
        const info = `callback for watcher "${this.expression}"`
        invokeWithErrorHandling(
          this.cb,
          this.vm,
          [value, oldValue],
          this.vm,
          info
        )
      } else {
        this.cb.call(this.vm, value, oldValue)
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   * 惰性watcher专用方法，更新this.value,然后把dirty设置为false
   */
  evaluate() {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   * 手动触发所有依赖项的收集依赖方法，将当前watcher(Dep.target)放入到对应dep的订阅数组中
   */
  depend() {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown() {
    if (this.vm && !this.vm._isBeingDestroyed) {
      remove(this.vm._scope.effects, this)
    }
    if (this.active) {
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
      if (this.onStop) {
        this.onStop()
      }
    }
  }
}
