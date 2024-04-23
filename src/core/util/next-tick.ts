/* globals MutationObserver */
/**
 * 使用方法，实现了next-tick函数
 */
import { isIE, isNative } from './env'

// 是否使用微任务,默认不使用
export let isUsingMicroTask = false

// 回调函数数组
const callbacks: Array<Function> = []
// 待办
let pending = false

// 刷新回调函数数组
function flushCallbacks() {
  // 开始执行，所以状态改为不是待办
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  // 遍历执行每一个回调函数
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
// 延迟函数包装器，分情况赋值
// 1. 如果支持Promise，则使用Promise.resolve().then(flushCallbacks)将刷新方法添加到微任务队列中
// 2. 如果支持MutationObserver，则自己创建一个MutationObserver,处理函数为flushCallbacks,
// 自己创建一个文本节点，调用时改变该文本节点，从而将flushCallbacks添加到微任务队列中
// 3. 如果支持setImmediate,使用setImmediate添加到任务队列
// 4. 使用setTimeout(flushCallbacks, 0)添加到任务队列
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
  }
  isUsingMicroTask = true
} else if (
  !isIE &&
  typeof MutationObserver !== 'undefined' &&
  (isNative(MutationObserver) ||
    // PhantomJS and iOS 7.x
    MutationObserver.toString() === '[object MutationObserverConstructor]')
) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

// @ts-ignore
export function nextTick(): Promise<void>
export function nextTick<T>(this: T, cb: (this: T, ...args: any[]) => any): void
export function nextTick<T>(cb: (this: T, ...args: any[]) => any, ctx: T): void
/**
 * nextTick方法，将回调函数延迟执行
 * @internal
 */
export function nextTick(cb?: (...args: any[]) => any, ctx?: object) {
  // 将cb放入callbacks数组中
  // @ts-ignore
  callbacks.push(cb.bind(ctx))
  // 如果不是待办
  if (!pending) {
    // 设置为待办
    pending = true
    // 将callbacks放入到延迟任务
    timerFunc()
  }
}
