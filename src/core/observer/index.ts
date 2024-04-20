import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  isArray,
  hasProto,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering,
  hasChanged,
  noop
} from '../util/index'
import { isReadonly, isRef, TriggerOpTypes } from '../../v3'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

const NO_INITIAL_VALUE = {}

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving(value: boolean) {
  shouldObserve = value
}

// ssr mock dep
const mockDep = {
  notify: noop,
  depend: noop,
  addSub: noop,
  removeSub: noop
} as Dep

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 * Observer类尝试去使对象可观察化
 */
export class Observer {
  // 定义一个依赖数组
  dep: Dep
  // 以value作为$data的vm的数量
  vmCount: number // number of vms that have this object as root $data

  // 构造函数
  constructor(public value: any, public shallow = false, public mock = false) {
    // this.value = value
    // 设置this.dep
    this.dep = mock ? mockDep : new Dep()
    // 设置this.vmCount
    this.vmCount = 0
    // 设置value.__ob__
    def(value, '__ob__', this)
    // 如果value为数组
    if (isArray(value)) {
      if (!mock) {
        if (hasProto) {
          /* eslint-disable no-proto */
          ;(value as any).__proto__ = arrayMethods
          /* eslint-enable no-proto */
        } else {
          for (let i = 0, l = arrayKeys.length; i < l; i++) {
            const key = arrayKeys[i]
            def(value, key, arrayMethods[key])
          }
        }
      }
      if (!shallow) {
        this.observeArray(value)
      }
    } else {
      /**
       * Walk through all properties and convert them into
       * getter/setters. This method should only be called when
       * value type is Object.
       * value是对象的话,遍历value的每一个属性，将他们转换为getter/setter
       */
      const keys = Object.keys(value)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        defineReactive(value, key, NO_INITIAL_VALUE, undefined, shallow, mock)
      }
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray(value: any[]) {
    for (let i = 0, l = value.length; i < l; i++) {
      observe(value[i], false, this.mock)
    }
  }
}

// helpers

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * observe是Observer类的工厂函数，
 * 不直接调用new Observer(),而是先检查，
 * 如果value已经存在对应的Observer对象，则直接返回
 * 如果value在限制条件中，则不进行任何操作
 * 否则指向new Observer(value, shallow, false);将参数传递给Observer。
 */
export function observe(
  value: any,
  shallow?: boolean,
  ssrMockReactivity?: boolean
): Observer | void {
  // 如果value已经存在对应的Observer对象，则直接返回
  if (value && hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    return value.__ob__
  }
  if (
    shouldObserve &&
    (ssrMockReactivity || !isServerRendering()) &&
    (isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value.__v_skip /* ReactiveFlags.SKIP */ &&
    !isRef(value) &&
    !(value instanceof VNode)
  ) {
    return new Observer(value, shallow, ssrMockReactivity)
  }
}

/**
 * Define a reactive property on an Object.
 * Vue2.x 使数据响应式的关键，
 * 这是一个函数，名字为defineReactive
 * 参数为obj,key,value
 */
export function defineReactive(
  obj: object,// 设置的对象,一般为vm._data
  key: string,// 属性key
  val?: any,// 值val
  customSetter?: Function | null, // set时自定义方法
  shallow?: boolean,// 是否只设置浅层，默认为false
  mock?: boolean,// 不用管
  observeEvenIfShallow = false// 不用管
) {
  // 定义一个Dep依赖对象
  const dep = new Dep()

  // 获取obj.key的配置
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 如果属性不可以被配置,则直接返回
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 获取obj.key已经存在的原始的getter和setter
  const getter = property && property.get
  const setter = property && property.set
  // 特殊情况获取val值
  if (
    (!getter || setter) &&
    (val === NO_INITIAL_VALUE || arguments.length === 2)
  ) {
    val = obj[key]
  }
  // 定义子可观察化对象,如果不是浅层响应式化，则将val传递给observe函数，来将val响应式化
  let childOb = shallow ? val && val.__ob__ : observe(val, false, mock)
  // 使用Object.defineProperty来改造obj.key
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter() {
      // 获取当前值
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        // 调用dep依赖对象的depend方法
        dep.depend()
        // 如果childOb存在
        if (childOb) {
          // ???什么意思？
          childOb.dep.depend()
          if (isArray(value)) {
            // ???
            dependArray(value)
          }
        }
      }
      // 如果value是Ref而且不是浅层观察，则返回value.value，否则返回value
      return isRef(value) && !shallow ? value.value : value
    },
    set: function reactiveSetter(newVal) {
      // 获取oldvalue
      const value = getter ? getter.call(obj) : val
      // 如果值相等的话，直接返回Object.is
      if (!hasChanged(value, newVal)) {
        return
      }
      if (__DEV__ && customSetter) {
        customSetter()
      }
      // 分4种情况
      // 1. setter存在
      // 2. getter存在
      // 3. 不是浅层管理而且value是一个Ref对象而且newVal不是Ref对象
      // 4. 其它

      // 1. setter存在
      if (setter) {
        // 调用setter
        setter.call(obj, newVal)
      } else if (getter) {
        // 啥也不做
        // #7981: for accessor properties without setter
        return
      } else if (!shallow && isRef(value) && !isRef(newVal)) {
        // 3， 将value赋值给value.value
        value.value = newVal
        return
      } else {
        // 4. 默认情况
        val = newVal
      }
      // 和执行defineReactive一样，重新设置childOb
      childOb = shallow ? newVal && newVal.__ob__ : observe(newVal, false, mock)
      if (__DEV__) {
        dep.notify({
          type: TriggerOpTypes.SET,
          target: obj,
          key,
          newValue: newVal,
          oldValue: value
        })
      } else {
        // 调用dep.notify()
        dep.notify()
      }
    }
  })

  return dep
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 * Vue.prototype添加$set方法,该方法为Vue.set方法的别名,
 * Vue.set(target, propertyName/index, value)
 * 其中target为对象或数组,一般为vm.$data
 * propertyName/index为字符串/数字
 * value为任意值
 * 返回value
 * 该方法用于向响应式对象中添加一个属性，并设置该属性同样为响应式的，且触发视图更新，
 * vm已经new出来之后，如果需要动态添加属性，则必须使用该方法，直接添加则该属性就不是响应式的
 *
 * 请回答:Vue.set方法是如何实现的？
 */
export function set<T>(array: T[], key: number, value: T): T
export function set<T>(object: object, key: string | number, value: T): T
export function set(
  target: any[] | Record<string, any>,
  key: any,
  val: any
): any {
  if (__DEV__ && (isUndef(target) || isPrimitive(target))) {
    warn(
      `Cannot set reactive property on undefined, null, or primitive value: ${target}`
    )
  }
  // 判断target是否为只读，如果是的话，直接返回
  if (isReadonly(target)) {
    __DEV__ && warn(`Set operation on key "${key}" failed: target is readonly.`)
    return
  }
  // 获取target.__ob__,被new Observer(value,false) 过的对象会有这个属性,
  // 比如vm._data
  const ob = (target as any).__ob__
  // 如果target是数组的话
  if (isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    // when mocking for SSR, array methods are not hijacked
    if (ob && !ob.shallow && ob.mock) {
      observe(val, false, true)
    }
    return val
  }
  // 如果target已经存在key属性,直接更新，然后直接返回
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  // 如果target不存在key,
  // 但是target为Vue实例，或者ob.vmCount不为0,vm._data
  // 直接返回
  if ((target as any)._isVue || (ob && ob.vmCount)) {
    __DEV__ &&
      warn(
        'Avoid adding reactive properties to a Vue instance or its root $data ' +
          'at runtime - declare it upfront in the data option.'
      )
    return val
  }
  // 如果target.__ob__不存在，即target不是Vue的响应式对象，自然也不需要为val设置响应式，直接赋值直接返回
  if (!ob) {
    target[key] = val
    return val
  }
  // 调用new Observer()时遍历vm._data时使用的函数defineReactive函数将ob.value添加key属性，值为val
  // ob.value存在吗？不是被注释了吗？
  defineReactive(ob.value, key, val, undefined, ob.shallow, ob.mock)
  if (__DEV__) {
    ob.dep.notify({
      type: TriggerOpTypes.ADD,
      target: target,
      key,
      newValue: val,
      oldValue: undefined
    })
  } else {
    // 通知所有依赖了该对象的观察者
    ob.dep.notify()
  }
  return val
}

/**
 * Delete a property and trigger change if necessary.
 * 从target中删除一个响应式属性
 */
export function del<T>(array: T[], key: number): void
export function del(object: object, key: string | number): void
export function del(target: any[] | object, key: any) {
  if (__DEV__ && (isUndef(target) || isPrimitive(target))) {
    warn(
      `Cannot delete reactive property on undefined, null, or primitive value: ${target}`
    )
  }
  // 如果是数组
  if (isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  // 获取target.__ob__
  const ob = (target as any).__ob__
  // 如果target为vm,或者为vm._data，则直接返回
  if ((target as any)._isVue || (ob && ob.vmCount)) {
    __DEV__ &&
      warn(
        'Avoid deleting properties on a Vue instance or its root $data ' +
          '- just set it to null.'
      )
    return
  }
  // 如果target为只读，直接返回
  if (isReadonly(target)) {
    __DEV__ &&
      warn(`Delete operation on key "${key}" failed: target is readonly.`)
    return
  }
  // 如果target没有key属性，直接返回
  if (!hasOwn(target, key)) {
    return
  }
  // 删除key属性
  delete target[key]
  // 如果target不是响应式对象，则返回
  if (!ob) {
    return
  }
  if (__DEV__) {
    ob.dep.notify({
      type: TriggerOpTypes.DELETE,
      target: target,
      key
    })
  } else {
    // 通知所有依赖了target的观察者
    ob.dep.notify()
  }
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray(value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    if (e && e.__ob__) {
      e.__ob__.dep.depend()
    }
    if (isArray(e)) {
      dependArray(e)
    }
  }
}
