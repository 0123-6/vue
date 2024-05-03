// 导入一些工具函数
import { isRegExp, isArray, remove } from 'shared/util'
// 获取第一个组件子节点
import { getFirstComponentChild } from 'core/vdom/helpers/index'
// VNode 类型
import type VNode from 'core/vdom/vnode'
// VNode 组件选项类型
import type { VNodeComponentOptions } from 'types/vnode'
// 组件类型
import type { Component } from 'types/component'
// 获取组件名称的工具函数
import { getComponentName } from '../vdom/create-component'

// 缓存条目类型定义
type CacheEntry = {
  // 组件名称
  name?: string
  // 组件标签
  tag?: string
  // 组件实例
  componentInstance?: Component
}

// 缓存字典
type CacheEntryMap = Record<string, CacheEntry | null>

// 获取组件名称
function _getComponentName(opts?: VNodeComponentOptions): string | null {
  return opts && (getComponentName(opts.Ctor.options as any) || opts.tag)
}

// 判断组件名称是否匹配某个模式
function matches(
  pattern: string | RegExp | Array<string>,
  name: string
): boolean {
  // 如果是数组
  if (isArray(pattern)) {
    // 检查是否在数组中
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    // 如果是字符串
    // 检查是否在逗号分隔的字符串中
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    // 如果是正则表达式
    // 使用正则表达式进行匹配
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

// 清理缓存
function pruneCache(
  keepAliveInstance: {
    cache: CacheEntryMap
    keys: string[]
    _vnode: VNode
    $vnode: VNode
  },
  filter: Function
) {
  const { cache, keys, _vnode, $vnode } = keepAliveInstance
  // 遍历缓存字典
  for (const key in cache) {
    // 获取缓存条目
    const entry = cache[key]
    if (entry) {
      // 获取组件名称
      const name = entry.name
      // 如果名称存在且不符合过滤条件
      if (name && !filter(name)) {
        // 移除该缓存条目
        pruneCacheEntry(cache, key, keys, _vnode)
      }
    }
  }
  // 清除子节点
  $vnode.componentOptions!.children = undefined
}

// 清理单个缓存条目
function pruneCacheEntry(
  cache: CacheEntryMap,
  key: string,
  keys: Array<string>,
  current?: VNode
) {
  // 获取缓存条目
  const entry = cache[key]
  // 如果缓存存在，且不是当前 VNode
  if (entry && (!current || entry.tag !== current.tag)) {
    // @ts-expect-error can be undefined
    // 销毁组件实例
    entry.componentInstance.$destroy()
  }
  // 将缓存置为空
  cache[key] = null
  // 从键数组中移除键
  remove(keys, key)
}

// // 模式类型定义
const patternTypes: Array<Function> = [String, RegExp, Array]

/**
 * keep-alive的工作原理
 * ????
 */
// TODO defineComponent
export default {
  // 组件名称
  name: 'keep-alive',
  // 抽象组件，表示不直接渲染到 DOM
  abstract: true,

  props: {
    // 包含的模式
    include: patternTypes,
    // 排除的模式
    exclude: patternTypes,
    // 最大缓存数量
    max: [String, Number]
  },

  methods: {
    // 缓存 VNode
    cacheVNode() {
      const { cache, keys, vnodeToCache, keyToCache } = this
      // 如果有待缓存的 VNode
      if (vnodeToCache) {
        const { tag, componentInstance, componentOptions } = vnodeToCache
        // 将 VNode 缓存到字典中
        cache[keyToCache] = {
          name: _getComponentName(componentOptions),
          tag,
          componentInstance
        }
        // 将键加入键数组
        keys.push(keyToCache)
        // prune oldest entry
        // 如果缓存超过最大值，移除最旧的缓存,LRU算法，最近最久未被访问的被移除
        if (this.max && keys.length > parseInt(this.max)) {
          pruneCacheEntry(cache, keys[0], keys, this._vnode)
        }
        // 清除待缓存的 VNode
        this.vnodeToCache = null
      }
    }
  },

  created() {
    // 初始化缓存字典,cache不是响应式的
    this.cache = Object.create(null)
    // 初始化键数组,keys也不是响应式的
    this.keys = []
  },

  destroyed() {
    // 遍历缓存字典
    for (const key in this.cache) {
      // 移除缓存
      pruneCacheEntry(this.cache, key, this.keys)
    }
  },

  mounted() {
    // 缓存当前 VNode
    this.cacheVNode()
    this.$watch('include', val => {
      pruneCache(this, name => matches(val, name))
    })
    this.$watch('exclude', val => {
      pruneCache(this, name => !matches(val, name))
    })
  },

  updated() {
    // 更新缓存
    this.cacheVNode()
  },

  // 渲染函数,关键
  render() {
    // 获取默认插槽
    const slot = this.$slots.default
    // 获取第一个组件子节点
    const vnode = getFirstComponentChild(slot)
    // 获取组件选项
    const componentOptions = vnode && vnode.componentOptions
    // 如果组件选项存在
    if (componentOptions) {
      // check pattern
      // 检查是否应该缓存
      const name = _getComponentName(componentOptions)
      const { include, exclude } = this
      if (
        // not included如果不在 `include` 中
        (include && (!name || !matches(include, name))) ||
        // excluded 或者在 `exclude` 中
        (exclude && name && matches(exclude, name))
      ) {
        // 返回 VNode，不进行缓存
        return vnode
      }

      // 获取缓存字典和键数组,cache和keys都不是响应式的
      const { cache, keys } = this
      const key =
        vnode.key == null
          ? // same constructor may get registered as different local components
            // so cid alone is not enough (#3269)
            componentOptions.Ctor.cid +
            (componentOptions.tag ? `::${componentOptions.tag}` : '')
          : vnode.key
      // 如果缓存中已有该键
      if (cache[key]) {
        // 使用缓存的组件实例
        vnode.componentInstance = cache[key].componentInstance
        // make current key freshest
        // 使当前键为最新，LRU算法，访问过的放到数组尾部
        // 这样数组头部便是最久未被访问的实例
        // 从键数组中移除
        remove(keys, key)
        // 添加到数组末尾
        keys.push(key)
      } else {
        // 如果没有缓存
        // delay setting the cache until update
        // 延迟缓存到更新阶段,为什么？？？
        // 保存待缓存的 VNode
        this.vnodeToCache = vnode
        // 保存键
        this.keyToCache = key
      }

      // @ts-expect-error can vnode.data can be undefined
      // 标记 VNode 为 `keepAlive`
      vnode.data.keepAlive = true
    }
    // 返回 VNode 或第一个插槽子节点
    return vnode || (slot && slot[0])
  }
}
