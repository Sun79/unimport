import type { Addon, Import } from '../types'

const contextRE = /\b_ctx\.([$\w]+)\b/g
const CONTEXT_VAR = '_ctx'
const CONTEXT_PREFIX = `${CONTEXT_VAR}.`
const UNIMPORT_PREFIX = '__unimport_'
const UNREF_KEY = `${UNIMPORT_PREFIX}unref_`

export const VUE_TEMPLATE_NAME = 'unimport:vue-template'

export function vueTemplateAddon(): Addon {
  const self: Addon = {
    name: VUE_TEMPLATE_NAME,
    extendImports(imports) {
      return [...imports, {
        name: 'unref',
        from: 'vue',
        as: UNREF_KEY,
        dtsDisabled: true,
      }]
    },
    async transform(s) {
      if (!s.original.includes(CONTEXT_PREFIX) || s.original.includes(UNREF_KEY))
        return s

      const matches = Array.from(s.original.matchAll(contextRE))

      for (const match of matches) {
        const name = match[1]
        const hasMatching = await this.hasMatchingImport(name)

        if (!hasMatching)
          continue

        const start = match.index!
        const end = start + match[0].length

        const tempName = `${UNIMPORT_PREFIX}${name}`
        s.overwrite(start, end, `(${JSON.stringify(name)} in ${CONTEXT_VAR} ? ${CONTEXT_PREFIX}${name} : ${UNREF_KEY}(${tempName}))`)
      }

      return s
    },
    async matchImports(identifiers, matched) {
      const map = await this.getImportMap()
      const imports: Import[] = []
      const unmatchedIdentifiers = new Set<string>()
      let additionalMatched: Import[] = []

      for (const name of identifiers) {
        if (!name.startsWith(UNIMPORT_PREFIX) || name === UNREF_KEY)
          continue

        const originalName = name.slice(UNIMPORT_PREFIX.length)
        let originalNameMatchedImport = matched.find(i => i.as === originalName)

        if (!originalNameMatchedImport) {
          // The matched import for the original name has already been added to the map when calling hasMatchingImport
          originalNameMatchedImport = map.get(originalName)!
          unmatchedIdentifiers.add(originalName)
          additionalMatched.push(originalNameMatchedImport)
        }

        imports.push({
          ...originalNameMatchedImport,
          as: name,
          dtsDisabled: true,
        })
      }

      if (unmatchedIdentifiers.size) {
        // matchImports need run again if the original name has not been matched previously
        for (const addon of this.addons) {
          if (addon !== self)
            additionalMatched = await addon.matchImports?.call(this, unmatchedIdentifiers, additionalMatched) || additionalMatched
        }
        additionalMatched = additionalMatched.slice(unmatchedIdentifiers.size)
      }

      return [...matched, ...imports, ...additionalMatched]
    },
    async declaration(dts, options) {
      const imports = await this.getImports()
      const items = imports
        .map((i) => {
          if (i.type || i.dtsDisabled)
            return ''
          const from = options?.resolvePath?.(i) || i.from
          return `readonly ${i.as}: UnwrapRef<typeof import('${from}')${i.name !== '*' ? `['${i.name}']` : ''}>`
        })
        .filter(Boolean)
        .sort()

      const extendItems = items.map(i => `    ${i}`).join('\n')
      return `${dts}
// for vue template auto import
import { UnwrapRef } from 'vue'
declare module 'vue' {
  interface ComponentCustomProperties {
${extendItems}
  }
}`
    },
  }

  return self
}
