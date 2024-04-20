import { BindingMetadata } from 'sfc/types'

/**
 * 编译器的配置对象结构options
 */
export type CompilerOptions = {
  warn?: Function // allow customizing warning in different environments; e.g. node
  modules?: Array<ModuleOptions> // platform specific modules; e.g. style; class
  directives?: { [key: string]: Function } // platform specific directives
  staticKeys?: string // a list of AST properties to be considered static; for optimization
  isUnaryTag?: (tag: string) => boolean | undefined // check if a tag is unary for the platform
  canBeLeftOpenTag?: (tag: string) => boolean | undefined // check if a tag can be left opened
  isReservedTag?: (tag: string) => boolean | undefined // check if a tag is a native for the platform
  preserveWhitespace?: boolean // preserve whitespace between elements? (Deprecated)
  whitespace?: 'preserve' | 'condense' // whitespace handling strategy
  optimize?: boolean // optimize static content?

  // web specific
  mustUseProp?: (tag: string, type: string | null, name: string) => boolean // check if an attribute should be bound as a property
  isPreTag?: (attr: string) => boolean | null // check if a tag needs to preserve whitespace
  getTagNamespace?: (tag: string) => string | undefined // check the namespace for a tag
  expectHTML?: boolean // only false for non-web builds
  isFromDOM?: boolean
  shouldDecodeTags?: boolean
  // 是否解码换行符
  shouldDecodeNewlines?: boolean
  // 是否解码href的新行
  shouldDecodeNewlinesForHref?: boolean

  // ???
  outputSourceRange?: boolean
  shouldKeepComment?: boolean

  // runtime user-configurable
  // 分割符,默认{{ }}
  delimiters?: [string, string] // template delimiters
  comments?: boolean // preserve comments in template,是否保留模板中的注释

  // for ssr optimization compiler
  scopeId?: string

  // SFC analyzed script bindings from `compileScript()`
  bindings?: BindingMetadata
}

export type WarningMessage = {
  msg: string
  start?: number
  end?: number
}

/**
 * template编译后的结果
 */
export type CompiledResult = {
  // 一个抽象语法树,表示编译后的模板结构
  ast: ASTElement | null
  // 编译后的渲染函数代码
  render: string
  // 一个包含静态渲染函数代码的数组，通常是JavaScript字符串，
  // 静态渲染函数用于渲染不包含动态数据绑定的部分，可以提高渲染性能。
  staticRenderFns: Array<string>
  stringRenderFns?: Array<string>
  errors?: Array<string | WarningMessage>
  tips?: Array<string | WarningMessage>
}

export type ModuleOptions = {
  // transform an AST node before any attributes are processed
  // returning an ASTElement from pre/transforms replaces the element
  preTransformNode?: (el: ASTElement) => ASTElement | null | void
  // transform an AST node after built-ins like v-if, v-for are processed
  transformNode?: (el: ASTElement) => ASTElement | null | void
  // transform an AST node after its children have been processed
  // cannot return replacement in postTransform because tree is already finalized
  postTransformNode?: (el: ASTElement) => void
  genData?: (el: ASTElement) => string // generate extra data string for an element
  transformCode?: (el: ASTElement, code: string) => string // further transform generated code for an element
  staticKeys?: Array<string> // AST properties to be considered static
}

export type ASTModifiers = { [key: string]: boolean }
export type ASTIfCondition = { exp: string | null; block: ASTElement }
export type ASTIfConditions = Array<ASTIfCondition>

/**
 * attr的描述结构
 */
export type ASTAttr = {
  // 名称
  name: string
  // 值,包含引号
  value: any
  dynamic?: boolean
  // 开始下标
  start?: number
  // 结束下标
  end?: number
}

export type ASTElementHandler = {
  value: string
  params?: Array<any>
  modifiers: ASTModifiers | null
  dynamic?: boolean
  start?: number
  end?: number
}

export type ASTElementHandlers = {
  [key: string]: ASTElementHandler | Array<ASTElementHandler>
}

export type ASTDirective = {
  name: string
  rawName: string
  value: string
  arg: string | null
  isDynamicArg: boolean
  modifiers: ASTModifiers | null
  start?: number
  end?: number
}

/**
 * ASTNode，即AST的所有形式，包括Element，Text，Expression
 */
export type ASTNode = ASTElement | ASTText | ASTExpression

/**
 * Element对应的抽象语法树的结构
 */
export type ASTElement = {
  // 元素类型，固定为1
  type: 1
  // 元素标签名
  tag: string
  // 属性列表,值没有引号
  attrsList: Array<ASTAttr>
  // 属性映射，键为属性名，值为属性值
  attrsMap: { [key: string]: any }
  // 原始属性映射，键为属性名，值为 ASTAttr 对象
  rawAttrsMap: { [key: string]: ASTAttr }
  // 父级元素节点，如果没有父级，则为 void
  parent: ASTElement | void
  // 子节点数组，可能包含元素节点和文本节点和表达式节点
  children: Array<ASTNode>

  // 元素起始位置
  start?: number
  // 元素结束位置
  end?: number

  // 是否已经处理过的标志
  processed?: true

  // 是否静态节点
  static?: boolean
  // 是否根静态节点
  staticRoot?: boolean
  // 是否在 v-for 指令中的静态节点
  staticInFor?: boolean
  // 是否已处理静态节点
  staticProcessed?: boolean
  // 是否包含绑定
  hasBindings?: boolean

  // 文本内容
  text?: string
  // 普通属性列表
  attrs?: Array<ASTAttr>
  // 动态属性列表
  dynamicAttrs?: Array<ASTAttr>
  // props 属性列表
  props?: Array<ASTAttr>
  // 是否是纯文本
  plain?: boolean
  // 是否是 pre 标签
  pre?: true
  // 命名空间
  ns?: string

  // 组件名
  component?: string
  // 是否是内联模板
  inlineTemplate?: true
  // 过渡模式
  transitionMode?: string | null
  // 插槽名
  slotName?: string | null
  // 插槽目标
  slotTarget?: string | null
  // 是否动态插槽目标
  slotTargetDynamic?: boolean
  // 插槽作用域
  slotScope?: string | null
  // 作用域插槽列表
  scopedSlots?: { [name: string]: ASTElement }

  // 引用名
  ref?: string
  // 是否在 v-for 指令中的引用
  refInFor?: boolean

  // 条件表达式
  if?: string
  // 是否已处理条件表达式
  ifProcessed?: boolean
  // else-if 表达式
  elseif?: string
  // 是否是 else 节点
  else?: true
  // 条件节点列表
  ifConditions?: ASTIfConditions

  // for 循环表达式
  for?: string
  // 是否已处理 for 循环表达式
  forProcessed?: boolean
  // key 属性
  key?: string
  // 别名
  alias?: string
  // 迭代器1
  iterator1?: string
  // 迭代器2
  iterator2?: string

  // 静态 class
  staticClass?: string
  // class 绑定
  classBinding?: string
  // 静态 style
  staticStyle?: string
  // style 绑定
  styleBinding?: string
  // 事件列表
  events?: ASTElementHandlers
  // 原生事件列表
  nativeEvents?: ASTElementHandlers

  // 过渡动画
  transition?: string | true
  transitionOnAppear?: boolean

  // 模型绑定
  model?: {
    value: string
    callback: string
    expression: string
  }

  // 指令列表
  directives?: Array<ASTDirective>

  // 是否被禁止
  forbidden?: true
  // 是否只执行一次
  once?: true
  // 是否已处理过一次
  onceProcessed?: boolean
  // 数据包装函数
  wrapData?: (code: string) => string
  // 事件监听器包装函数
  wrapListeners?: (code: string) => string

  // 2.4 ssr optimization
  ssrOptimizability?: number
}

/**
 * 表达式对应的抽象语法树的结构
 *
 */
export type ASTExpression = {
  // type=2,代表表达式
  type: 2
  // 表达式的字符串形式,比如_s(age)
  expression: string
  // 表达式的字符串形式 {{age}}
  text: string
  // ???
  tokens: Array<string | Object>
  // 是否是静态的
  static?: boolean
  // 2.4 ssr optimization
  ssrOptimizability?: number
  // 从第几个开始
  start?: number
  // 到第几个结束
  end?: number
}

/**
 * 文本对应的抽象语法树的结构
 */
export type ASTText = {
  // type=3,代表是文本
  type: 3
  // 文本内容
  text: string
  // 是否是固定文本
  static?: boolean
  // 是否是注释
  isComment?: boolean
  // 2.4 ssr optimization
  ssrOptimizability?: number
  // 从第几个开始
  start?: number
  // 到第几个结束
  end?: number
}
