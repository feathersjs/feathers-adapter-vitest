import type { Application } from '@feathersjs/feathers'
import type { AdapterTestNameBasic } from './basic.js'
import basicTests from './basic.js'
import type { AdapterTestNameMethods } from './methods.js'
import methodTests from './methods.js'
import type { AdapterTestNameSyntax } from './syntax.js'
import syntaxTests from './syntax.js'
import { describe, it, afterAll } from 'vitest'

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

    const skippedTests: AdapterTestName[] = []
    const allTests: AdapterTestName[] = []

    const test = (name: string, runner: any) => {
      let skip = false
      if (defineOptions?.blacklist?.includes(name as AdapterTestName)) {
        skip = true
      }
      if (
        defineOptions?.only &&
        !defineOptions.only.includes(name as AdapterTestName)
      ) {
        skip = true
      }
      const its = skip ? it.skip : it

      if (skip) {
        skippedTests.push(name as AdapterTestName)
      }

      allTests.push(name as AdapterTestName)

      its(name, runner)
    }

    describe(`Adapter tests for '${serviceName}' service with '${idProp}' id property`, () => {
      afterAll(() => {
        if (skippedTests.length) {
          console.log(
            `\nSkipped the following ${skippedTests.length} Feathers adapter test(s) out of ${allTests.length} total:`,
          )
          console.log(JSON.stringify(skippedTests, null, '  '))
        }
      })

      basicTests({ test, app, serviceName, idProp })
      methodTests({ test, app, serviceName, idProp })
      syntaxTests({ test, app, serviceName, idProp })
    })
  }
}

export * from './declarations.js'
