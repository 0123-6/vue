/**
 * 该shared/constants.ts文件定义了一些公共静态属性
 */

// SSR_ATTR
export const SSR_ATTR = 'data-server-rendered'

// ASSET_TYPES
export const ASSET_TYPES = ['component', 'directive', 'filter'] as const

// 生命周期钩子数组
export const LIFECYCLE_HOOKS = [
  // vm创建前
  'beforeCreate',
  // vm已创建
  'created',
  // vm挂载前
  'beforeMount',
  // vm已挂载
  'mounted',
  // vm更新前
  'beforeUpdate',
  // vm已更新
  'updated',
  // vm销毁前
  'beforeDestroy',
  // vm已销毁
  'destroyed',
  // vm被keep-alive包裹时激活状态
  'activated',
  // vm被keep-alive包裹时非激活状态
  'deactivated',
  // 组件发生错误时调用的钩子
  'errorCaptured',

  'serverPrefetch',
  'renderTracked',
  'renderTriggered'
] as const
