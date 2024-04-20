import { noop, extend } from 'shared/util'
import { warn as baseWarn, tip } from 'core/util/debug'
import { generateCodeFrame } from './codeframe'
import type { Component } from 'types/component'
import { CompilerOptions } from 'types/compiler'

/**
 * compiledFunction的返回结果
 * render渲染函数
 * staticRenderFns数组
 */
type CompiledFunctionResult = {
  render: Function
  staticRenderFns: Array<Function>
}

function createFunction(code, errors) {
  try {
    return new Function(code)
  } catch (err: any) {
    errors.push({ err, code })
    return noop
  }
}

/**
 * 将编译器包装在函数中
 * @param compile
 */
export function createCompileToFunctionFn(compile: Function): Function {
  const cache = Object.create(null)

  /**
   * 接收3个参数
   * template字符串
   * compile编译配置对象
   * vm
   */
  return function compileToFunctions(
    template: string,
    options?: CompilerOptions,
    vm?: Component
  ): CompiledFunctionResult {
    // 编译器配置对象
    options = extend({}, options)
    // warn函数
    const warn = options.warn || baseWarn
    delete options.warn

    /* istanbul ignore if */
    if (__DEV__) {
      // detect possible CSP restriction
      try {
        new Function('return 1')
      } catch (e: any) {
        if (e.toString().match(/unsafe-eval|CSP/)) {
          warn(
            'It seems you are using the standalone build of Vue.js in an ' +
              'environment with Content Security Policy that prohibits unsafe-eval. ' +
              'The template compiler cannot work in this environment. Consider ' +
              'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
              'templates into render functions.'
          )
        }
      }
    }

    // check cache
    const key = options.delimiters
      ? String(options.delimiters) + template
      : template
    // 如果该模板已经转化过，则直接返回template对应的render函数和staticRenderFns数组
    if (cache[key]) {
      return cache[key]
    }

    // compile
    // 获取真正的编译器编译完成的结果
    const compiled = compile(template, options)

    // check compilation errors/tips
    if (__DEV__) {
      if (compiled.errors && compiled.errors.length) {
        if (options.outputSourceRange) {
          compiled.errors.forEach(e => {
            warn(
              `Error compiling template:\n\n${e.msg}\n\n` +
                generateCodeFrame(template, e.start, e.end),
              vm
            )
          })
        } else {
          warn(
            `Error compiling template:\n\n${template}\n\n` +
              compiled.errors.map(e => `- ${e}`).join('\n') +
              '\n',
            vm
          )
        }
      }
      if (compiled.tips && compiled.tips.length) {
        if (options.outputSourceRange) {
          compiled.tips.forEach(e => tip(e.msg, vm))
        } else {
          compiled.tips.forEach(msg => tip(msg, vm))
        }
      }
    }

    // turn code into functions
    // 定义res
    const res: any = {}
    const fnGenErrors: any[] = []
    // 设置res.render为compiled.render
    res.render = createFunction(compiled.render, fnGenErrors)
    // 设置res.staticRenderFns为compiled.staticRenderFns
    res.staticRenderFns = compiled.staticRenderFns.map(code => {
      return createFunction(code, fnGenErrors)
    })

    // check function generation errors.
    // this should only happen if there is a bug in the compiler itself.
    // mostly for codegen development use
    /* istanbul ignore if */
    if (__DEV__) {
      if ((!compiled.errors || !compiled.errors.length) && fnGenErrors.length) {
        warn(
          `Failed to generate render function:\n\n` +
            fnGenErrors
              .map(
                ({ err, code }) => `${(err as any).toString()} in\n\n${code}\n`
              )
              .join('\n'),
          vm
        )
      }
    }

    // 缓存res，同时返回res
    return (cache[key] = res)
  }
}
