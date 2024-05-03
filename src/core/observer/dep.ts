import { DebuggerOptions, DebuggerEventExtraInfo } from 'v3'

// 依赖的id，初始值为0
let uid = 0

// 等待清除订阅者的依赖数组
const pendingCleanupDeps: Dep[] = []

/**
 * 清除所有dep的订阅者的函数
 */
export const cleanupDeps = () => {
  for (let i = 0; i < pendingCleanupDeps.length; i++) {
    const dep = pendingCleanupDeps[i]
    dep.subs = dep.subs.filter(s => s)
    // dep的等待状态设置为false
    dep._pending = false
  }
  // 重置pendingCleanupDeps为空数组
  pendingCleanupDeps.length = 0
}

/**
 * DepTarget，即观察者的结构
 * id,watcher的id
 * addDep，给watcher添加一个依赖项，如果第一次依赖，则依赖将该watcher放入到自己的订阅列表中
 * update方法，当watcher的deps中dep变化时会调用watcher.update来告知watcher需要更新
 * @internal
 */
export interface DepTarget extends DebuggerOptions {
  id: number
  addDep(dep: Dep): void
  update(): void
}

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * @internal
 */
export default class Dep {
  static target?: DepTarget | null
  id: number
  // 订阅数组可能为观察者或null，因为removeSub时设置为null
  subs: Array<DepTarget | null>
  // pending subs cleanup
  // 该dep是否等待被清理无效的订阅者
  _pending = false

  constructor() {
    // 设置dep的id，从0开始
    this.id = uid++
    // 设置观察者数组
    this.subs = []
  }

  /**
   * 添加一个观察者
   * @param sub
   */
  addSub(sub: DepTarget) {
    this.subs.push(sub)
  }

  /**
   * 移除一个订阅者
   * `removeSub` 函数在移除订阅者时并不直接删除对应的元素，而是将对应位置的元素置为 `null`。
   * 这是因为在 Vue 中的依赖追踪系统中，订阅者的数量可能会很大，
   * 如果直接删除元素，可能会导致数组的移动操作，影响性能。
   * 相反，将订阅者置为 `null`，可以保留数组的长度，避免了数组的移动操作。
   * 同时，将订阅者置为 `null` 之后，会将该订阅者标记为待清理状态，
   * 将其放入 `pendingCleanupDeps` 数组中。
   * 然后，在下一个调度器刷新时，会执行清理操作，
   * 将标记为 `null` 的订阅者从数组中移除，从而实现订阅者的清理，避免了性能问题。
   * 这种做法可以提高性能，特别是在订阅者数量较大的情况下。
   * 因为直接删除数组元素会导致后面的元素向前移动，时间复杂度为 O(n)，
   * 而将订阅者置为 `null` 只是将元素置为 `null`，时间复杂度为 O(1)。
   * 待清理的操作可以延迟到下一个调度器刷新时执行，从而降低了主线程的压力。
   * @param sub
   */
  removeSub(sub: DepTarget) {
    // #12696 deps with massive amount of subscribers are extremely slow to
    // clean up in Chromium
    // to workaround this, we unset the sub for now, and clear them on
    // next scheduler flush.
    // 将该订阅者index设置为null
    this.subs[this.subs.indexOf(sub)] = null
    // 如果不是等待清理状态
    if (!this._pending) {
      // 设置为等待清理状态
      this._pending = true
      // 在全局pendingCleanupDeps放入当前依赖
      pendingCleanupDeps.push(this)
    }
  }

  /**
   * 依赖dep主动获取观察者
   * 如果是vm._data的话，不需要这样，因为vm._data的每个属性的get时会做依赖收集，
   * 所以这主要用在非vm._data属性的get过程中，手动进行依赖收集
   * @param info
   */
  depend(info?: DebuggerEventExtraInfo) {
    // 如果有watcher正在进行get操作
    if (Dep.target) {
      // 给watcher添加一个依赖项，如果第一次依赖，则依赖将该watcher放入到自己的订阅列表中
      Dep.target.addDep(this)
    }
  }

  // 通知所有订阅者去更新
  notify(info?: DebuggerEventExtraInfo) {
    // stabilize the subscriber list first
    // 因为subs可能存在null项，所以需要首先获取正常的subs
    const subs = this.subs.filter(s => s) as DepTarget[]
    for (let i = 0, l = subs.length; i < l; i++) {
      const sub = subs[i]
      sub.update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 真的吗，可能会出现嵌套的情况吗，获取计算属性a,需要先获取b，获取b，需要先获取c
// 那么获取完c，Dep.target被赋值为null，那获取b,和a时还能获取到Dep.target吗？
// 这个问题问的好，我们可以使用栈来解决这个问题，每次获取时，都将Dep.target入栈,
// 获取完成时，不是直接Dep.target = null,而是将Dep.target出栈一个元素,
// 这样便可以解决多层get时Dep.target在多层次中丢失而导致之前的get无法获取对应的Dep.target的问题
Dep.target = null

// Dep.target栈
const targetStack: Array<DepTarget | null | undefined> = []

// get开始，Dep.target入栈
export function pushTarget(target?: DepTarget | null) {
  targetStack.push(target)
  Dep.target = target
}

// get结束，Dep.target出栈
export function popTarget() {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
