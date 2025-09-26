import type { Application } from '@feathersjs/feathers'
import type { AdapterTestNameBasic } from './basic.js'
import basicTests from './basic.js'
import type { AdapterTestNameMethods } from './methods.js'
import methodTests from './methods.js'
import type { AdapterTestNameSyntax } from './syntax.js'
import syntaxTests from './syntax.js'
import { describe, it } from 'vitest'

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

export type AdapterTestMap = Record<AdapterTestName, boolean>

export type DefineTestSuiteOptions = {
  blacklist?: AdapterTestName[]
  only?: AdapterTestName[]
}

export const defineTestSuite = (defineOptions?: DefineTestSuiteOptions) => {
  return (options: TestSuiteOptions) => {
    const { app, serviceName, idProp = 'id' } = options

    const test = (name: string, runner: any) => {
      let skip = false
      if (defineOptions?.blacklist?.includes(name as AdapterTestName)) {
        skip = true
      }
      if (
        defineOptions?.only?.length &&
        !defineOptions.only.includes(name as AdapterTestName)
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
        assert.ok(
          Array.isArray(items),
          'find with paginate:false did not return an array. Before you start to test the adapter make sure simple find works.',
        )

        await Promise.all(
          items.map((item: any) => service.remove(item[idProp])),
        )

        // test create
        const doug = await service.create({
          name: 'Doug',
          age: 32,
        })

        assert.ok(
          doug[idProp] !== null,
          `simple 'create' failed (no ${idProp}). Before you start to test the adapter make sure simple create works.`,
        )
        assert.strictEqual(
          doug.name,
          'Doug',
          "simple 'create' failed (no name). Before you start to test the adapter make sure simple create works.",
        )
        assert.strictEqual(
          doug.age,
          32,
          "simple 'create' failed (no age). Before you start to test the adapter make sure simple create works.",
        )

        // test delete

        items = await service.find({ paginate: false })
        assert.ok(
          Array.isArray(items),
          'find with paginate:false did not return an array. Before you start to test the adapter make sure simple find works.',
        )
        assert.strictEqual(
          items.length,
          1,
          'find should return an item. Before you start to test the adapter make sure simple find works.',
        )
        assert.ok(
          idProp in items[0],
          `'find' should return an item with ${idProp}. Before you start to test the adapter make sure simple find works.`,
        )
        await Promise.all(
          items.map((item: any) => service.remove(item[idProp])),
        )
        const itemsAfterRemove = await service.find({ paginate: false })
        assert.ok(
          itemsAfterRemove.length === 0,
          "'remove' does not work. Before you start to test the adapter make sure simple remove works.",
        )
      })

      basicTests({ test, app, serviceName, idProp })
      methodTests({ test, app, serviceName, idProp })
      syntaxTests({ test, app, serviceName, idProp })
    })
  }
}

export { withOptions } from './utils.js'

export * from './declarations.js'
