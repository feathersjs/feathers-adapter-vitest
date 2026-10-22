import type { Application } from '@feathersjs/feathers'
import type { AdapterTestNameBasic } from './basic.js'
import basicTests from './basic.js'
import type { AdapterTestNameMethods } from './methods.js'
import methodTests from './methods.js'
import type { AdapterTestNameSyntax } from './syntax.js'
import syntaxTests from './syntax.js'
import type { AdapterTestNameRecommended } from './recommended.js'
import recommendedTests from './recommended.js'
import type { RecommendedOperator } from './declarations.js'
import { describe, it, beforeAll, expect } from 'vitest'

export type TestSuiteOptions = {
  app: Application
  serviceName: string
  /**
   * @default 'id'
   */
  idProp?: string
}

export type AdapterTestName =
  | AdapterTestNameBasic
  | AdapterTestNameMethods
  | AdapterTestNameSyntax
  | AdapterTestNameRecommended

export type AdapterTestMap = Record<AdapterTestName, boolean>

export type DefineTestSuiteOptions = {
  /**
   * @deprecated use skip
   */
  blacklist?: AdapterTestName[]
  skip?: AdapterTestName[]
  only?: AdapterTestName[]
  /**
   * Opt in to recommended (non-standard) operator tests per operator.
   * These tests are skipped by default. The adapter under test must support
   * the operator (and, if applicable, whitelist it via its `operators` option).
   *
   * @example ['$not', '$regex']
   */
  recommended?: RecommendedOperator[]
}

export const defineTestSuite = (defineOptions?: DefineTestSuiteOptions) => {
  return (options: TestSuiteOptions) => {
    const { app, serviceName, idProp = 'id' } = options

    const test = (
      name: string,
      runner: any,
      testOptions?: { recommended?: RecommendedOperator },
    ) => {
      let skip = false
      const skipNames = defineOptions?.skip || defineOptions?.blacklist || []
      if (skipNames.includes(name as AdapterTestName)) {
        skip = true
      }
      if (
        defineOptions?.only?.length &&
        !defineOptions.only.includes(name as AdapterTestName)
      ) {
        skip = true
      }
      // recommended operator tests are opt-in: skipped unless the operator is
      // explicitly enabled via `recommended: ['$not', ...]`
      if (
        testOptions?.recommended &&
        !defineOptions?.recommended?.includes(testOptions.recommended)
      ) {
        skip = true
      }
      const maybeSkip = skip ? it.skip : it

      maybeSkip(name, runner)
    }

    describe(`app.service('${serviceName}') with options.id: '${idProp}'`, () => {
      beforeAll(async () => {
        const service = app.service(serviceName)

        let items = await service.find({ paginate: false })
        expect(
          Array.isArray(items),
          'find with paginate:false did not return an array. Before you start to test the adapter make sure simple find works.',
        ).toBeTruthy()

        await Promise.all(
          items.map((item: any) => service.remove(item[idProp])),
        )

        // test create
        const doug = await service.create({
          name: 'Doug',
          age: 32,
        })

        expect(
          doug[idProp] !== null,
          `simple 'create' failed (no ${idProp}). Before you start to test the adapter make sure simple create works.`,
        ).toBeTruthy()
        expect(
          doug.name,
          "simple 'create' failed (no name). Before you start to test the adapter make sure simple create works.",
        ).toBe('Doug')
        expect(
          doug.age,
          "simple 'create' failed (no age). Before you start to test the adapter make sure simple create works.",
        ).toBe(32)

        // test delete

        items = await service.find({ paginate: false })
        expect(
          Array.isArray(items),
          'find with paginate:false did not return an array. Before you start to test the adapter make sure simple find works.',
        ).toBeTruthy()
        expect(
          items.length,
          'find should return an item. Before you start to test the adapter make sure simple find works.',
        ).toBe(1)
        expect(
          idProp in items[0],
          `'find' should return an item with ${idProp}. Before you start to test the adapter make sure simple find works.`,
        ).toBeTruthy()
        await Promise.all(
          items.map((item: any) => service.remove(item[idProp])),
        )
        const itemsAfterRemove = await service.find({ paginate: false })
        expect(
          itemsAfterRemove.length === 0,
          "'remove' does not work. Before you start to test the adapter make sure simple remove works.",
        ).toBeTruthy()
      })

      basicTests({ test, app, serviceName, idProp })
      methodTests({ test, app, serviceName, idProp })
      syntaxTests({ test, app, serviceName, idProp })
      recommendedTests({ test, app, serviceName, idProp })
    })
  }
}

export { withOptions } from './utils.js'

export * from './declarations.js'
