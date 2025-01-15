import type { Import } from '../src'
import { describe, expect, it } from 'vitest'
import { compileTemplate } from 'vue/compiler-sfc'
import { createUnimport, vueTemplateAddon } from '../src'
import { functionWrapAddon, resolverAddon } from './share'

const result = compileTemplate({
  id: 'template.vue',
  filename: 'template.vue',
  source: `
    <div>{{ foo }}</div>
    <div>{{ foo + 1 }}</div>
    <div v-if="foo"></div>
    <div v-if="foo === 1"></div>
    <div @click="foo"></div>
  `,
  compilerOptions: {
    hoistStatic: false,
  },
})

describe('vue-template', () => {
  const ctx = createUnimport({
    imports: [
      { name: 'foo', from: 'foo', as: 'foo' },
    ],
    addons: {
      vueTemplate: true,
    },
  })

  it('inject', async () => {
    expect(result.code).toMatchInlineSnapshot(`
      "import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, Fragment as _Fragment } from "vue"

      export function render(_ctx, _cache) {
        return (_openBlock(), _createElementBlock(_Fragment, null, [
          _createElementVNode("div", null, _toDisplayString(_ctx.foo), 1 /* TEXT */),
          _createElementVNode("div", null, _toDisplayString(_ctx.foo + 1), 1 /* TEXT */),
          (_ctx.foo)
            ? (_openBlock(), _createElementBlock("div", { key: 0 }))
            : _createCommentVNode("v-if", true),
          (_ctx.foo === 1)
            ? (_openBlock(), _createElementBlock("div", { key: 1 }))
            : _createCommentVNode("v-if", true),
          _createElementVNode("div", {
            onClick: _cache[0] || (_cache[0] = (...args) => (_ctx.foo && _ctx.foo(...args)))
          })
        ], 64 /* STABLE_FRAGMENT */))
      }"
    `)
    expect((await ctx.injectImports(result.code, 'a.vue')).code.toString()).toMatchInlineSnapshot(`
      "import { unref as __unimport_unref_ } from 'vue';
      import { foo as __unimport_foo } from 'foo';
      import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, Fragment as _Fragment } from "vue"

      export function render(_ctx, _cache) {
        return (_openBlock(), _createElementBlock(_Fragment, null, [
          _createElementVNode("div", null, _toDisplayString(("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo))), 1 /* TEXT */),
          _createElementVNode("div", null, _toDisplayString(("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo)) + 1), 1 /* TEXT */),
          (("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo)))
            ? (_openBlock(), _createElementBlock("div", { key: 0 }))
            : _createCommentVNode("v-if", true),
          (("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo)) === 1)
            ? (_openBlock(), _createElementBlock("div", { key: 1 }))
            : _createCommentVNode("v-if", true),
          _createElementVNode("div", {
            onClick: _cache[0] || (_cache[0] = (...args) => (("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo)) && ("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo))(...args)))
          })
        ], 64 /* STABLE_FRAGMENT */))
      }"
    `)
  })

  it('dts', async () => {
    expect(await ctx.generateTypeDeclarations()).toMatchInlineSnapshot(`
      "export {}
      declare global {
        const foo: typeof import('foo')['foo']
      }
      // for vue template auto import
      import { UnwrapRef } from 'vue'
      declare module 'vue' {
        interface ComponentCustomProperties {
          readonly foo: UnwrapRef<typeof import('foo')['foo']>
        }
      }"
    `)
  })

  it('skip non-targets', async () => {
    const input = 'ctx.multiplier'
    expect((await ctx.injectImports(input, 'a.vue')).code.toString())
      .toEqual(input)
  })

  it('without addon hooks', async () => {
    const ctx = createUnimport({
      imports: [
        { name: 'foo', from: 'vue', as: 'foo' },
      ],
      addons: [
        vueTemplateAddon(),
        functionWrapAddon(),
      ],
    })

    expect((await ctx.injectImports(result.code, 'a.vue')).code.toString()).toMatchInlineSnapshot(`
      "import { unref as _$___unimport_unref_, foo as _$___unimport_foo } from 'vue';
      import { __helper } from "helper"
      const __unimport_unref_ = __helper(_$___unimport_unref_)
      const __unimport_foo = __helper(_$___unimport_foo)

      import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, openBlock as _openBlock, createElementBlock as _createElementBlock, createCommentVNode as _createCommentVNode, Fragment as _Fragment } from "vue"

      export function render(_ctx, _cache) {
        return (_openBlock(), _createElementBlock(_Fragment, null, [
          _createElementVNode("div", null, _toDisplayString(("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo))), 1 /* TEXT */),
          _createElementVNode("div", null, _toDisplayString(("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo)) + 1), 1 /* TEXT */),
          (("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo)))
            ? (_openBlock(), _createElementBlock("div", { key: 0 }))
            : _createCommentVNode("v-if", true),
          (("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo)) === 1)
            ? (_openBlock(), _createElementBlock("div", { key: 1 }))
            : _createCommentVNode("v-if", true),
          _createElementVNode("div", {
            onClick: _cache[0] || (_cache[0] = (...args) => (("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo)) && ("foo" in _ctx ? _ctx.foo : __unimport_unref_(__unimport_foo))(...args)))
          })
        ], 64 /* STABLE_FRAGMENT */))
      }"
    `)
  })

  it('matchImports', async () => {
    const result = compileTemplate({
      id: 'template.vue',
      filename: 'template.vue',
      source: `
        <template>
          <ElInput />
          <component :is="ElInput" />
          <component :is="ElSelect" />
          <component :is="UndefinedComponent" />
          {{ bar }}
        </template
      `,
      compilerOptions: {
        hoistStatic: false,
      },
    })

    const ctx = createUnimport({
      presets: ['vue'],
      addons: {
        addons: [
          resolverAddon(),
        ],
        vueTemplate: true,
      },
    })

    expect((await ctx.injectImports(result.code, 'a.vue')).code.toString()).toMatchInlineSnapshot(`
      "import { unref as __unimport_unref_ } from 'vue';
      import { ElInput as __unimport_ElInput, ElSelect as __unimport_ElSelect } from 'element-plus/es';
      import 'element-plus/es/components/input/style/index';
      import 'element-plus/es/components/select/style/index';
      import { resolveComponent as _resolveComponent, createVNode as _createVNode, resolveDynamicComponent as _resolveDynamicComponent, openBlock as _openBlock, createBlock as _createBlock, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, createElementBlock as _createElementBlock } from "vue"

      export function render(_ctx, _cache) {
        const _component_ElInput = _resolveComponent("ElInput")

        return (_openBlock(), _createElementBlock("template", null, [
          _createVNode(_component_ElInput),
          (_openBlock(), _createBlock(_resolveDynamicComponent(("ElInput" in _ctx ? _ctx.ElInput : __unimport_unref_(__unimport_ElInput))))),
          (_openBlock(), _createBlock(_resolveDynamicComponent(("ElSelect" in _ctx ? _ctx.ElSelect : __unimport_unref_(__unimport_ElSelect))))),
          (_openBlock(), _createBlock(_resolveDynamicComponent(_ctx.UndefinedComponent))),
          _createTextVNode(" " + _toDisplayString(_ctx.bar), 1 /* TEXT */)
        ]))
      }"
    `)
  })
})
