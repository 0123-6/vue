import VNode from 'core/vdom/vnode'
import { namespaceMap } from 'web/util/index'

/**
 * 创建一个真实DOM
 * @param tagName
 * @param vnode
 */
export function createElement(tagName: string, vnode: VNode): Element {
  //
  const elm = document.createElement(tagName)
  if (tagName !== 'select') {
    return elm
  }
  // false or null will remove the attribute but undefined will not
  if (
    vnode.data &&
    vnode.data.attrs &&
    vnode.data.attrs.multiple !== undefined
  ) {
    elm.setAttribute('multiple', 'multiple')
  }
  return elm
}

export function createElementNS(namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}

/**
 * 创建一个文本node
 * @param text
 */
export function createTextNode(text: string): Text {
  return document.createTextNode(text)
}

/**
 * 创建一个备注node
 * @param text
 */
export function createComment(text: string): Comment {
  return document.createComment(text)
}

/**
 * 在parentNode中插入一个node，插入位置为parentNode.referenceNode之前
 * @param parentNode
 * @param newNode
 * @param referenceNode
 */
export function insertBefore(
  parentNode: Node,
  newNode: Node,
  referenceNode: Node
) {
  parentNode.insertBefore(newNode, referenceNode)
}

export function removeChild(node: Node, child: Node) {
  node.removeChild(child)
}

export function appendChild(node: Node, child: Node) {
  node.appendChild(child)
}

export function parentNode(node: Node) {
  return node.parentNode
}

export function nextSibling(node: Node) {
  return node.nextSibling
}

export function tagName(node: Element): string {
  return node.tagName
}

export function setTextContent(node: Node, text: string) {
  node.textContent = text
}

export function setStyleScope(node: Element, scopeId: string) {
  node.setAttribute(scopeId, '')
}
