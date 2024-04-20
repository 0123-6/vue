import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index'
import {
  shouldDecodeNewlines,
  shouldDecodeNewlinesForHref
} from './util/compat'
import type { Component } from 'types/component'
import type { GlobalAPI } from 'types/global-api'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 保存默认Vue.prototype.$mount
const mount = Vue.prototype.$mount
// 重新定义Vue.prototype.$mount
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 获取el元素
  el = el && query(el)

  // 元素不能为<html>或<body>
  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    __DEV__ &&
      warn(
        `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
      )
    return this
  }
  // 获取vm.$options
  const options = this.$options
  // resolve template/el and convert to render function
  // 如果options.render不存在,解析template/el，将它转化为render渲染函数
  if (!options.render) {
    // 获取options.template
    let template = options.template
    // 如果template存在
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (__DEV__ && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (__DEV__) {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      // 如果template不存在，但是el存在,设置template为el.outerHTML
      // @ts-expect-error
      template = getOuterHTML(el)
    }
    // 如果template存在
    if (template) {
      // 执行compileToFunctions函数，获取template模板对应的render渲染函数和staticRenderFns渲染函数数组
      const { render, staticRenderFns } = compileToFunctions(
        template,
        // 编译配置对象
        {
          // 输出源范围
          outputSourceRange: __DEV__,
          // 是否解码换行符
          shouldDecodeNewlines,
          // 是否解码href的新行
          shouldDecodeNewlinesForHref,
          // 分割符
          delimiters: options.delimiters,
          // 是否保留注释
          comments: options.comments
        },
        this
      )
      // 将render设置到options.render上
      options.render = render
      // 将staticRenderFns设置到options.staticRenderFns上
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (__DEV__ && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  // 编译完成后，再调用原始的Vue.prototype.$mount
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 * 获取el.outerElement
 */
function getOuterHTML(el: Element): string {
  // 如果el.outerHTML存在，返回el.outerHTML
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue as GlobalAPI
