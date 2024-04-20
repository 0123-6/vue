import type Watcher from './watcher'
import config from '../config'
import Dep, { cleanupDeps } from './dep'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import { warn, nextTick, devtools, inBrowser, isIE } from '../util/index'
import type { Component } from 'types/component'

// 脚本作用域

// 一次最大的观察者数量,为100,????
export const MAX_UPDATE_COUNT = 100

// 待更新的观察者数组
const queue: Array<Watcher> = []
// 活跃的vm实例,用来排序watcher执行的顺序，来优化效果？
const activatedChildren: Array<Component> = []

// has对象，是否id为id的watcher存在
let has: { [key: number]: true | undefined | null } = {}
// 对象，表示为key的watcher更新次数？？？
let circular: { [key: number]: number } = {}
// 是否等待中
let waiting = false
// 是否刷新中
let flushing = false
// ???
let index = 0

/**
 * Reset the scheduler's state.
 * 重置调度程序状态
 */
function resetSchedulerState() {
  // 重置活跃的待更新的vm实例数组
  // 重置所有观察者数组
  // 重置index
  index = queue.length = activatedChildren.length = 0
  // 重置表示观察者是否存在的has对象
  has = {}
  if (__DEV__) {
    circular = {}
  }
  // 设置等待状态为false
  // 设置筛选状态为false
  waiting = flushing = false
}

// Async edge case #6566 requires saving the timestamp when event listeners are
// attached. However, calling performance.now() has a perf overhead especially
// if the page has thousands of event listeners. Instead, we take a timestamp
// every time the scheduler flushes and use that for all event listeners
// attached during that flush.
// 现在筛选用的时间
export let currentFlushTimestamp = 0

// Async edge case fix requires storing an event listener's attach timestamp.
// 获取当前时间戳
let getNow: () => number = Date.now

// Determine what event timestamp the browser is using. Annoyingly, the
// timestamp can either be hi-res (relative to page load) or low-res
// (relative to UNIX epoch), so in order to compare time we have to use the
// same timestamp type when saving the flush timestamp.
// All IE versions use low-res event timestamps, and have problematic clock
// implementations (#9632)
if (inBrowser && !isIE) {
  const performance = window.performance
  if (
    performance &&
    typeof performance.now === 'function' &&
    getNow() > document.createEvent('Event').timeStamp
  ) {
    // if the event timestamp, although evaluated AFTER the Date.now(), is
    // smaller than it, it means the event is using a hi-res timestamp,
    // and we need to use the hi-res version for event listener timestamps as
    // well.
    getNow = () => performance.now()
  }
}

/**
 * 观察者的比较函数,
 * 1. 如果2者post状态不同，则没有post的排在前面，已经post的排在后面
 * 2. 否则2者post状态相同，这时根据id从小到大排序
 * @param a
 * @param b
 */
const sortCompareFn = (a: Watcher, b: Watcher): number => {
  // 已经post的观察者放在后面
  if (a.post) {
    if (!b.post) return 1
  } else if (b.post) {
    return -1
  }
  // 正常情况下，根据id从小到大排序
  return a.id - b.id
}

/**
 * Flush both queues and run the watchers.
 * 刷新
 */
function flushSchedulerQueue() {
  // 设置当前时间戳
  currentFlushTimestamp = getNow()
  // 刷新状态为true，表示正在刷新中
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  /**
   * 在刷新之前先给观察者数组排序，这样可以确保
   * 1. vm实例，也就是组件，从父组件开始，子组件其次，因为父组件总是在子组件之前被创建
   * 2. 组件的用户定义的观察者在它的渲染观察者之前被执行，也就是用户定义的观察者在执行时DOM还未更新，
   * 这是因为vm实例化时，先初始化options.data,props,watch,computed等，最后才编译和挂载
   * 3. 如果组件在父组件的观察者执行时被销毁，则可以跳过该组件watcher的执行
   */
  queue.sort(sortCompareFn)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  // 不可以缓存queue的长度，因为在watcher执行期间，可能会往queue放入新的watcher
  for (index = 0; index < queue.length; index++) {
    // 取出一个观察者
    watcher = queue[index]
    // watcher.before的用武之地，如果watcher.before函数存在，则执行
    // 1个场景是vm更新时会触发beforeUpdate钩子
    if (watcher.before) {
      watcher.before()
    }
    // 获取watcher的id
    id = watcher.id
    // has[id]设置为null
    has[id] = null
    // 执行watcher的run函数
    watcher.run()
    // in dev build, check and stop circular updates.
    if (__DEV__ && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' +
            (watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  // 复制一份
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  // 重置调度程序状态
  resetSchedulerState()

  // call component updated and activated hooks
  // ???先不管
  callActivatedHooks(activatedQueue)

  // 调用观察者的updated钩子
  callUpdatedHooks(updatedQueue)

  /**
   * 完成所有dep的清理工作
   */
  cleanupDeps()

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

/**
 * 调用观察者对应的vm的updated钩子
 * @param queue
 */
function callUpdatedHooks(queue: Watcher[]) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm && vm._watcher === watcher && vm._isMounted && !vm._isDestroyed) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent(vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks(queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 * 将观察者放入到队列中，重复的观察者将被跳过，除非这是在刷新过程中
 */
export function queueWatcher(watcher: Watcher) {
  // 获取观察者的id
  const id = watcher.id

  if (has[id] != null) {
    return
  }

  if (watcher === Dep.target && watcher.noRecurse) {
    return
  }

  has[id] = true
  if (!flushing) {
    queue.push(watcher)
  } else {
    // if already flushing, splice the watcher based on its id
    // if already past its id, it will be run next immediately.
    let i = queue.length - 1
    while (i > index && queue[i].id > watcher.id) {
      i--
    }
    queue.splice(i + 1, 0, watcher)
  }
  // queue the flush
  if (!waiting) {
    waiting = true

    if (__DEV__ && !config.async) {
      flushSchedulerQueue()
      return
    }
    nextTick(flushSchedulerQueue)
  }
}
