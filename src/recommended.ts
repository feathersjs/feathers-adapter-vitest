import assert from 'node:assert'
import { describe, beforeEach, afterEach } from 'vitest'
import type { Application } from '@feathersjs/feathers'
import type { RecommendedOperator, Test } from './declarations.js'

type RecommendedTestOptions = {
  app: Application
  test: Test
  serviceName: string
  idProp: string
}

type RecommendedTests = {
  $not:
    | '.find + $not'
    | '.find + $not + nested'
    | '.find + $not + multi-key'
    | '.find + $not + operator'
    | '.find + $not + $and'
    | '.find + $not + $or'
    | '.find + $not + $or + operator'
    | '.find + $not + $not'
  $regex: '.find + $regex' | '.find + $regex + $options'
}

export type AdapterTestNameRecommended =
  RecommendedTests[keyof RecommendedTests]

type TestConfig = {
  [O in RecommendedOperator]: Record<
    RecommendedTests[O],
    () => void | Promise<void>
  >
}

export default (options: RecommendedTestOptions) => {
  const { test, app, serviceName, idProp } = options

  // Opt-in tests for common (but non-standard) operators, skipped by default
  // and enabled per operator via `defineTestSuite({ recommended: [...] })`.
  describe('recommended', () => {
    let service: any

    beforeEach(async () => {
      service = app.service(serviceName)
      await service.create({
        name: 'Bob',
        age: 25,
      })
      await service.create({
        name: 'Doug',
        age: 32,
      })
      await service.create({
        name: 'Alice',
        age: 19,
      })
    })

    afterEach(async () => {
      const items = await service.find({ paginate: false })

      await Promise.all(items.map((item: any) => service.remove(item[idProp])))
    })

    const config = {
      // `$not` negates a whole condition at the top level (not a per-property
      // inversion). Adapters that support it may need to register it as a top
      // level filter (e.g. `filters: { $not: (v) => v }`) in addition to the
      // `operators` list.
      $not: {
        '.find + $not': async () => {
          const data = await service.find({
            query: {
              $not: { name: 'Bob' },
              $sort: { name: 1 },
            },
          })

          // NOT (name = 'Bob') → Alice, Doug
          assert.strictEqual(data.length, 2, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Doug', 'second item')
        },
        '.find + $not + nested': async () => {
          const data = await service.find({
            query: {
              $and: [{ $not: { name: 'Bob' } }],
              $sort: { name: 1 },
            },
          })

          // $not nested inside $and → Alice, Doug
          assert.strictEqual(data.length, 2, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Doug', 'second item')
        },
        '.find + $not + multi-key': async () => {
          // Carol shares Bob's age but has a different name
          await service.create({ name: 'Carol', age: 25 })

          const data = await service.find({
            query: {
              $not: { age: 25, name: 'Bob' },
              $sort: { name: 1 },
            },
          })

          // NOT (age = 25 AND name = 'Bob') removes only Bob; Carol (age 25 but
          // name != 'Bob') is kept. A per-property inversion would wrongly drop it.
          assert.strictEqual(data.length, 3, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Carol', 'second item')
          assert.strictEqual(data[2].name, 'Doug', 'third item')
        },
        '.find + $not + operator': async () => {
          const data = await service.find({
            query: {
              $not: { age: { $gt: 25 } },
              $sort: { name: 1 },
            },
          })

          // NOT (age > 25) → Alice (19), Bob (25); Doug (32) excluded
          assert.strictEqual(data.length, 2, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Bob', 'second item')
        },
        '.find + $not + $and': async () => {
          // Carol shares Bob's age but has a different name
          await service.create({ name: 'Carol', age: 25 })

          const data = await service.find({
            query: {
              $not: { $and: [{ name: 'Bob' }, { age: 25 }] },
              $sort: { name: 1 },
            },
          })

          // De Morgan: NOT (name = 'Bob' AND age = 25) → name != 'Bob' OR age != 25,
          // so only Bob is removed and Carol (age 25) is kept.
          assert.strictEqual(data.length, 3, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Carol', 'second item')
          assert.strictEqual(data[2].name, 'Doug', 'third item')
        },
        '.find + $not + $or': async () => {
          const data = await service.find({
            query: {
              $not: { $or: [{ name: 'Bob' }, { name: 'Alice' }] },
              $sort: { name: 1 },
            },
          })

          // De Morgan: NOT (name = 'Bob' OR name = 'Alice') → Doug
          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(data[0].name, 'Doug', 'correct item')
        },
        '.find + $not + $or + operator': async () => {
          const data = await service.find({
            query: {
              $not: { $or: [{ name: 'Bob' }, { age: { $lt: 20 } }] },
              $sort: { name: 1 },
            },
          })

          // De Morgan across both laws: NOT (name = 'Bob' OR age < 20) →
          // name != 'Bob' AND age >= 20 → Doug (Bob and Alice (19) excluded)
          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(data[0].name, 'Doug', 'correct item')
        },
        '.find + $not + $not': async () => {
          const data = await service.find({
            query: {
              $not: { $not: { age: { $gt: 25 } } },
              $sort: { name: 1 },
            },
          })

          // double negation is an involution: NOT NOT (age > 25) → age > 25 → Doug
          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(data[0].name, 'Doug', 'correct item')
        },
      },
      $regex: {
        '.find + $regex': async () => {
          const data = await service.find({
            query: {
              name: { $regex: 'li' },
            },
          })

          // only 'Alice' contains 'li'
          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'correct name')
        },
        '.find + $regex + $options': async () => {
          const data = await service.find({
            query: {
              name: { $regex: 'alice', $options: 'i' },
            },
          })

          // case-insensitive → 'Alice'
          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'correct name')
        },
      },
    } satisfies TestConfig

    for (const operator in config) {
      for (const testName in (config as any)[operator]) {
        test(testName, async () => (config as any)[operator][testName](), {
          recommended: operator as RecommendedOperator,
        })
      }
    }
  })
}
