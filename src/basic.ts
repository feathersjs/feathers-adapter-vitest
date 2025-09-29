import { describe, beforeEach, expect } from 'vitest'
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

  describe('Basic', () => {
    let service: any

    beforeEach(() => {
      service = app.service(serviceName)
    })

    const config: TestConfigBasic = {
      '.id': () => {
        expect(service.id, 'id property is set to expected name').toBe(idProp)
      },
      '.options': () => {
        expect(service, 'service.options is defined').toHaveProperty('options')

        expect(
          service.options,
          'Options are available in service.options',
        ).toBeTypeOf('object')
      },
      '.events': () => {
        expect(service, 'service has events').toHaveProperty('events')
        expect(service.events, 'service.events is an array').toBeInstanceOf(
          Array,
        )
        expect(
          service.events.includes('testing'),
          'service.events includes "testing"',
        ).toBe(true)
      },
      '._get': () => {
        expect(typeof service._get).toBe('function')
      },
      '._find': () => {
        expect(typeof service._find).toBe('function')
      },
      '._create': () => {
        expect(typeof service._create).toBe('function')
      },
      '._update': () => {
        expect(typeof service._update).toBe('function')
      },
      '._patch': () => {
        expect(typeof service._patch).toBe('function')
      },
      '._remove': () => {
        expect(typeof service._remove).toBe('function')
      },
    }

    for (const testName in config) {
      test(testName, async () => (config as any)[testName]())
    }
  })
}
