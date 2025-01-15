import type { Addon, Import } from '../src'
import { kebabCase } from 'scule'

export function functionWrapAddon(): Addon {
  return {
    injectImportsResolved(imports) {
      return imports
        .map((i) => {
          if (i.from === 'vue') {
            return {
              ...i,
              meta: {
                originalAs: (i.as || i.name),
              },
              as: `_$_${i.as || i.name}`,
            }
          }
          return i
        })
    },
    injectImportsStringified(str, imports) {
      const injected = imports.filter(i => i.meta?.originalAs)
      if (injected.length) {
        return [
          str,
          'import { __helper } from "helper"',
          injected.map(i => `const ${i.meta!.originalAs} = __helper(${i.as})`).join('\n'),
          '',
        ].join('\n')
      }
    },
  }
}

export function resolverAddon(): Addon {
  return {
    name: 'resolver',
    matchImports(names, matched) {
      const dynamic: Import[] = []
      const sideEffects: Import[] = []

      for (const name of names) {
        const prevMatchedImport = matched.find(i => i.as === name)
        if (prevMatchedImport) {
          if ('sideEffects' in prevMatchedImport)
            sideEffects.push(...(Array.isArray(prevMatchedImport.sideEffects) ? prevMatchedImport.sideEffects : [prevMatchedImport.sideEffects]))
          continue
        }

        if (!name.match(/^El[A-Z]/))
          continue
        const matchedImport = {
          name,
          from: `element-plus/es`,
          sideEffects: [{
            name: 'default',
            as: '',
            from: `element-plus/es/components/${kebabCase(name.slice(2))}/style/index`,
          }],
        }
        dynamic.push(matchedImport)
        sideEffects.push(...matchedImport.sideEffects)
      }

      if (dynamic.length) {
        this.dynamicImports.push(...dynamic)
        this.invalidate()
      }

      return [...matched, ...dynamic, ...sideEffects]
    },
  }
}
