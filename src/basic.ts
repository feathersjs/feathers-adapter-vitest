import assert from 'node:assert'
import { describe, beforeEach } from 'vitest'
import type { Test } from './declarations.js'
import type { Application } from '@feathersjs/feathers'

type BasicTestOptions = {
  app: Application
  test: Test
  serviceName: string
  idProp: string
}

export type AdapterTestNameBasic =
  | '.id'
  | '.options'
  | '.events'
  | '._get'
  | '._find'
  | '._create'
  | '._update'
  | '._patch'
  | '._remove'

type TestConfigBasic = Record<AdapterTestNameBasic, () => void | Promise<void>>

export default (options: BasicTestOptions) => {
  const { test, app, serviceName, idProp } = options

  describe('Basic Functionality', () => {
    let service: any

    beforeEach(() => {
      service = app.service(serviceName)
    })

    const config: TestConfigBasic = {
      '.id': () => {
        assert.strictEqual(
          service.id,
          idProp,
          'id property is set to expected name',
        )
      },
      '.options': () => {
        assert.ok(service.options, 'Options are available in service.options')
      },
      '.events': () => {
        assert.ok(
          service.events.includes('testing'),
          'service.events is set and includes "testing"',
        )
      },
      '._get': () => {
        assert.strictEqual(typeof service._get, 'function')
      },
      '._find': () => {
        assert.strictEqual(typeof service._find, 'function')
      },
      '._create': () => {
        assert.strictEqual(typeof service._create, 'function')
      },
      '._update': () => {
        assert.strictEqual(typeof service._update, 'function')
      },
      '._patch': () => {
        assert.strictEqual(typeof service._patch, 'function')
      },
      '._remove': () => {
        assert.strictEqual(typeof service._remove, 'function')
      },
    }

    for (const testName in config) {
      test(testName, async () => (config as any)[testName]())
    }
  })
}
