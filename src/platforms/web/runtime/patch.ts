/**
 * 这段代码的主要作用是创建一个用于将虚拟 DOM 变化应用到真实 DOM 上的 patch 函数，
 * 并将其导出供其他模块使用
 */

// nodeOps 模块提供了一组操作 DOM 元素的方法
import * as nodeOps from 'web/runtime/node-ops'
// createPatchFunction 函数用于创建一个用于将虚拟 DOM 变化应用到真实 DOM 上的 patch 函数。
import { createPatchFunction } from 'core/vdom/patch'
// baseModules 包含了一组基础的虚拟 DOM 模块
import baseModules from 'core/vdom/modules/index'
// platformModules 包含了与特定平台相关的虚拟 DOM 模块，这里是针对 Web 平台的
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
// 将 platformModules 和 baseModules 合并成一个数组 modules，这里将平台相关的模块放在前面，基础模块放在后面
const modules = platformModules.concat(baseModules)

// 调用 createPatchFunction 函数，传入一个对象作为参数，该对象包含了 nodeOps 和 modules
export const patch: Function = createPatchFunction({ nodeOps, modules })
