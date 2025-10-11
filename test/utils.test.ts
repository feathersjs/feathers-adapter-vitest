import { MemoryService } from '@feathersjs/memory'
import { withOptions } from '../src/utils.js'
import { describe, expect, it } from 'vitest'

describe('utils', () => {
  describe('witOptions', () => {
    it('works', async () => {
      const service = new MemoryService({ multi: true, id: 'customId' })

      let checked = false

      await withOptions(service, { multi: false, id: '_id' }, async () => {
        expect(service.options.multi).toEqual(false)
        expect(service.id).toEqual('_id')
        checked = true
      })

      expect(checked).toBe(true)
      expect(service.options.multi).toEqual(true)
      expect(service.options.id).toEqual('customId')
    })
  })
})
