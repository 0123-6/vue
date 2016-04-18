import { callHook } from './lifecycle'
import { observerState } from '../observer/index'
import {
  createElement,
  patch,
  updateListeners,
  flatten
} from '../vdom/index'
import {
  bind,
  extend,
  resolveAsset,
  isArray,
  isObject,
  getPropValue
} from '../util/index'

export const renderState = {
  activeInstance: null
}

export function initRender (vm) {
  vm._vnode = null
  vm._mounted = false
  vm.$slots = {}
  // bind the public createElement fn to this instance
  // so that we get proper render context inside it.
  vm.$createElement = bind(vm.__h__, vm)
  if (vm.$options.el) {
    vm.$mount(vm.$options.el)
  }
}

export function renderMixin (Vue) {
  // shorthands used in render functions
  Vue.prototype.__h__ = createElement

  // resolve directive
  Vue.prototype.__resolveDirective__ = function (id) {
    return resolveAsset(this.$options, 'directives', id, true)
  }

  // toString for mustaches
  Vue.prototype.__toString__ = function (val) {
    return val == null
      ? ''
      : typeof val === 'object'
        ? JSON.stringify(val, null, 2)
        : val
  }

  // render v-for
  Vue.prototype.__renderList__ = function (val, render) {
    let ret, i, l, keys, key
    if (isArray(val)) {
      ret = new Array(val.length)
      for (i = 0, l = val.length; i < l; i++) {
        ret[i] = render(val[i], i, i)
      }
    } else if (typeof val === 'number') {
      ret = new Array(val)
      for (i = 0; i < val; i++) {
        ret[i] = render(i + 1, i, i)
      }
    } else if (isObject(val)) {
      keys = Object.keys(val)
      ret = new Array(keys.length)
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i]
        ret[i] = render(val[key], i, key)
      }
    }
    return ret
  }

  // register ref
  Vue.prototype.__registerRef__ = function (key, ref, vFor, remove) {
    const refs = this.$refs
    if (remove) {
      if (vFor) {
        refs[key].$remove(ref)
      } else {
        refs[key] = undefined
      }
    } else {
      if (vFor) {
        if (refs[key]) {
          refs[key].push(ref)
        } else {
          refs[key] = [ref]
        }
      } else {
        refs[key] = ref
      }
    }
  }

  Vue.prototype._update = function (vnode) {
    if (this._mounted) {
      callHook(this, 'beforeUpdate')
    }
    if (!this._vnode) {
      this.$el = patch(this.$el, vnode)
    } else {
      this.$el = patch(this._vnode, vnode)
    }
    this._vnode = vnode
    if (this._mounted) {
      callHook(this, 'updated')
    }
  }

  Vue.prototype._updateFromParent = function (parentData, children, key) {
    const oldParentData = this.$options._renderData
    this.$options._renderData = parentData
    this.$options._renderChildren = children
    // update props and listeners
    if (parentData) {
      updateEvents(this, parentData, oldParentData)
      // if any prop has changed it would trigger and queue an update,
      // but if no props changed, nothing happens
      const propsChanged = updateProps(this, parentData)
      // diff parent data (attrs on the placeholder) and queue update
      // if anything changed. only do this if props didn't change, because
      // if props changed then an update has already been queued.
      if (!propsChanged && parentDataChanged(parentData, oldParentData)) {
        this.$forceUpdate()
      }
    }
  }

  Vue.prototype._render = function () {
    const prev = renderState.activeInstance
    renderState.activeInstance = this
    const { render, _renderData, _renderChildren } = this.$options
    // resolve slots. becaues slots are rendered in parent scope,
    // we set the activeInstance to parent.
    if (_renderChildren) {
      resolveSlots(this, _renderChildren)
    }
    // render self
    const vnode = render.call(this)
    // update parent data
    if (_renderData) {
      mergeParentData(this, vnode.data, _renderData)
    }
    // restore render state
    renderState.activeInstance = prev
    return vnode
  }

  Vue.prototype.$forceUpdate = function () {
    this._watcher.update()
  }
}

function resolveSlots (vm, children) {
  if (children) {
    children = flatten(isArray(children) ? children : children())
    const slots = { default: children }
    let i = children.length
    let name, child
    while (i--) {
      child = children[i]
      if ((name = child.data && child.data.slot)) {
        let slot = (slots[name] || (slots[name] = []))
        if (child.tag === 'template') {
          slot.push.apply(slot, child.children)
        } else {
          slot.push(child)
        }
        children.splice(i, 1)
      }
    }
    vm.$slots = slots
  }
}

const keysToDiff = ['class', 'style', 'attrs', 'props', 'directives']
function parentDataChanged (data, oldData) {
  let key, old, cur, i, l, j, k
  for (i = 0, l = keysToDiff.length; i < l; i++) {
    key = keysToDiff[i]
    cur = data[key]
    old = oldData[key]
    if (!old) {
      if (!cur) {
        continue
      } else {
        return true
      }
    }
    if (isArray(old)) {
      if (!isArray(cur)) return true
      if (cur.length !== old.length) return true
      for (j = 0, k = old.length; j < k; j++) {
        if (isObject(old[i])) {
          if (!isObject(cur[i])) return true
          if (diffObject(cur, old)) return true
        } else if (old[i] !== cur[i]) {
          return true
        }
      }
    } else if (diffObject(cur, old)) {
      return true
    }
  }
  return false
}

function diffObject (cur, old) {
  for (let key in old) {
    if (cur[key] !== old[key]) return true
  }
}

function mergeParentData (vm, data, parentData) {
  const props = vm.$options.props
  if (parentData.attrs) {
    const attrs = data.attrs || (data.attrs = {})
    for (let key in parentData.attrs) {
      if (!props || !props[key]) {
        attrs[key] = parentData.attrs[key]
      }
    }
  }
  if (parentData.props) {
    const props = data.props || (data.props = {})
    for (let key in parentData.props) {
      if (!props || !props[key]) {
        props[key] = parentData.props[key]
      }
    }
  }
  if (parentData.staticClass) {
    data.staticClass = data.staticClass
      ? data.staticClass + ' ' + parentData.staticClass
      : parentData.staticClass
  }
  if (parentData.class) {
    if (!data.class) {
      data.class = parentData.class
    } else {
      data.class = (isArray(data.class) ? data.class : []).concat(parentData.class)
    }
  }
  if (parentData.style) {
    if (!data.style) {
      data.style = parentData.style
    } else {
      extend(data.style, parentData.style)
    }
  }
  if (parentData.directives) {
    data.directives = parentData.directives.conact(data.directives || [])
  }
}

function updateProps (vm, data) {
  let changed = false
  if (data.attrs || data.props) {
    let keys = vm.$options.propKeys
    if (keys) {
      observerState.shouldConvert = false
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        let oldVal = vm[key]
        let newVal = getPropValue(data, key, vm)
        if (oldVal !== newVal) {
          vm[key] = newVal
          changed = true
        }
      }
      observerState.shouldConvert = true
    }
  }
  return changed
}

function updateEvents (vm, data, oldData) {
  if (data.on) {
    updateListeners(data.on, oldData.on || {}, (event, handler) => {
      vm.$on(event, handler)
    })
  }
}