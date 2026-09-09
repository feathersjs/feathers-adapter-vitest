import assert from 'node:assert'
import { describe, beforeEach, afterEach } from 'vitest'
import type { Application } from '@feathersjs/feathers'
import type { RecommendedOperator, Test } from './declarations.js'
import { withOptions } from './utils.js'

type SyntaxTestOptions = {
  app: Application
  test: Test
  serviceName: string
  idProp: string
}

type SyntaxTests = {
  general: '.find + equal' | '.find + equal multiple'
  filters:
    | '.find + $sort'
    | '.find + $sort + string'
    | '.find + $limit'
    | '.find + $limit 0'
    | '.find + $skip'
    | '.find + $sort + $limit + $skip'
    | '.find + $select'
  operators:
    | '.find + $or'
    | '.find + $in'
    | '.find + $in empty'
    | '.find + $in + null'
    | '.find + $nin'
    | '.find + $nin empty'
    | '.find + $nin + null'
    | '.find + $lt'
    | '.find + $lte'
    | '.find + $gt'
    | '.find + $gte'
    | '.find + $ne'
    | '.find + $gt + $lt + $sort'
    | '.find + $or nested + $sort'
    | '.find + $and'
    | '.find + $and + $or'

  'params.adapter': 'params.adapter + paginate' | 'params.adapter + multi'
  paginate:
    | '.find + paginate'
    | '.find + paginate + query'
    | '.find + paginate + $limit + $skip'
    | '.find + paginate + $limit 0'
    | '.find + paginate + params'
  recommended:
    | '.find + $not'
    | '.find + $not + nested'
    | '.find + $not + multi-key'
    | '.find + $not + operator'
    | '.find + $not + $or'
    | '.find + $regex'
    | '.find + $regex + $options'
}

export type AdapterTestNameSyntax = SyntaxTests[keyof SyntaxTests]

type TestName<T extends keyof SyntaxTests> = SyntaxTests[T]

type TestConfig<T extends keyof SyntaxTests> = Record<
  TestName<T>,
  () => void | Promise<void>
>

export default (options: SyntaxTestOptions) => {
  const { test, app, serviceName, idProp } = options

  describe('Syntax', () => {
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
      general: {
        '.find + equal': async () => {
          const params = { query: { name: 'Alice' } }
          const data = await service.find(params)

          assert.ok(Array.isArray(data), 'data is an array')
          assert.strictEqual(data.length, 1, 'data has one entry')
          assert.strictEqual(data[0].name, 'Alice', 'correct name')
        },
        '.find + equal multiple': async () => {
          const data = await service.find({
            query: { name: 'Alice', age: 20 },
          })

          assert.strictEqual(data.length, 0, 'no results')
        },
      } satisfies TestConfig<'general'>,
      filters: {
        '.find + $sort': async () => {
          let data = await service.find({
            query: {
              $sort: { name: 1 },
            },
          })

          assert.strictEqual(data.length, 3)
          assert.strictEqual(data[0].name, 'Alice')
          assert.strictEqual(data[1].name, 'Bob')
          assert.strictEqual(data[2].name, 'Doug')

          data = await service.find({
            query: {
              $sort: { name: -1 },
            },
          })

          assert.strictEqual(data.length, 3, 'correct data.length')
          assert.strictEqual(data[0].name, 'Doug', 'first item')
          assert.strictEqual(data[1].name, 'Bob', 'second item')
          assert.strictEqual(data[2].name, 'Alice', 'third item')
        },
        '.find + $sort + string': async () => {
          let data = await service.find({
            query: {
              $sort: { name: '1' },
            },
          })

          assert.strictEqual(data.length, 3, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Bob', 'second item')
          assert.strictEqual(data[2].name, 'Doug', 'third item')

          data = await service.find({
            query: {
              $sort: { name: '-1' },
            },
          })

          assert.strictEqual(data.length, 3, 'correct data.length')
          assert.strictEqual(data[0].name, 'Doug', 'first item')
          assert.strictEqual(data[1].name, 'Bob', 'second item')
          assert.strictEqual(data[2].name, 'Alice', 'third item')
        },
        '.find + $limit': async () => {
          const data = await service.find({
            query: {
              $limit: 2,
            },
          })

          assert.strictEqual(data.length, 2, 'correct data.length')
        },
        '.find + $limit 0': async () => {
          const data = await service.find({
            query: {
              $limit: 0,
            },
          })

          assert.strictEqual(data.length, 0, 'data array is empty')
        },
        '.find + $skip': async () => {
          const data = await service.find({
            query: {
              $sort: { name: 1 },
              $skip: 1,
            },
          })

          assert.strictEqual(data.length, 2, 'correct data.length')
          assert.strictEqual(data[0].name, 'Bob', 'first user')
          assert.strictEqual(data[1].name, 'Doug', 'second user')
        },
        '.find + $sort + $limit + $skip': async () => {
          const data = await service.find({
            query: {
              $sort: { name: 1 },
              $skip: 1,
              $limit: 1,
            },
          })

          // sorted asc: Alice, Bob, Doug → skip 1 → Bob, Doug → limit 1 → Bob
          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(
            data[0].name,
            'Bob',
            'correct order: sort → skip → limit',
          )
        },
        '.find + $select': async () => {
          const data = await service.find({
            query: {
              name: 'Alice',
              $select: ['name'],
            },
          })

          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.ok(idProp in data[0], 'data has id')
          assert.strictEqual(data[0].name, 'Alice', 'correct name')
          assert.strictEqual(data[0].age, undefined, 'age was not selected')
        },
      } satisfies TestConfig<'filters'>,
      operators: {
        '.find + $or': async () => {
          const data = await service.find({
            query: {
              $or: [{ name: 'Alice' }, { name: 'Bob' }],
              $sort: { name: 1 },
            },
          })

          assert.strictEqual(data.length, 2, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Bob', 'second item')
        },
        '.find + $in': async () => {
          const data = await service.find({
            query: {
              name: {
                $in: ['Alice', 'Bob'],
              },
              $sort: { name: 1 },
            },
          })

          assert.strictEqual(data.length, 2, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Bob', 'second item')
        },
        '.find + $in empty': async () => {
          const data = await service.find({
            query: {
              name: { $in: [] },
            },
          })

          assert.ok(Array.isArray(data), 'data is an array')
          assert.strictEqual(data.length, 0, 'no items match $in: []')
        },
        '.find + $in + null': async () => {
          await service.create({ name: 'Nully', age: null })

          let data = await service.find({
            query: {
              age: { $in: [null] },
            },
          })

          assert.strictEqual(
            data.length,
            1,
            'correct data.length for $in: [null]',
          )
          assert.strictEqual(data[0].name, 'Nully', 'correct item')

          data = await service.find({
            query: {
              age: { $in: [null, 25] },
              $sort: { name: 1 },
            },
          })

          assert.strictEqual(
            data.length,
            2,
            'correct data.length for $in: [null, 25]',
          )
          assert.strictEqual(data[0].name, 'Bob', 'first item')
          assert.strictEqual(data[1].name, 'Nully', 'second item')
        },
        '.find + $nin': async () => {
          const data = await service.find({
            query: {
              name: {
                $nin: ['Alice', 'Bob'],
              },
            },
          })

          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(data[0].name, 'Doug', 'correct item')
        },
        '.find + $nin empty': async () => {
          const data = await service.find({
            query: {
              name: { $nin: [] },
              $sort: { name: 1 },
            },
          })

          assert.strictEqual(data.length, 3, 'all items match $nin: []')
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Bob', 'second item')
          assert.strictEqual(data[2].name, 'Doug', 'third item')
        },
        '.find + $nin + null': async () => {
          await service.create({ name: 'Nully', age: null })

          let data = await service.find({
            query: {
              age: { $nin: [null] },
              $sort: { name: 1 },
            },
          })

          assert.strictEqual(
            data.length,
            3,
            'correct data.length for $nin: [null]',
          )
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Bob', 'second item')
          assert.strictEqual(data[2].name, 'Doug', 'third item')

          data = await service.find({
            query: {
              age: { $nin: [null, 25] },
              $sort: { name: 1 },
            },
          })

          assert.strictEqual(
            data.length,
            2,
            'correct data.length for $nin: [null, 25]',
          )
          assert.strictEqual(data[0].name, 'Alice', 'first item')
          assert.strictEqual(data[1].name, 'Doug', 'second item')
        },
        '.find + $lt': async () => {
          const data = await service.find({
            query: {
              age: {
                $lt: 30,
              },
            },
          })

          assert.strictEqual(data.length, 2, 'correct data.length')
        },
        '.find + $lte': async () => {
          const data = await service.find({
            query: {
              age: {
                $lte: 25,
              },
            },
          })

          assert.strictEqual(data.length, 2, 'correct data.length')
        },
        '.find + $gt': async () => {
          const data = await service.find({
            query: {
              age: {
                $gt: 30,
              },
            },
          })

          assert.strictEqual(data.length, 1, 'correct data.length')
        },
        '.find + $gte': async () => {
          const data = await service.find({
            query: {
              age: {
                $gte: 25,
              },
            },
          })

          assert.strictEqual(data.length, 2, 'correct data.length')
        },
        '.find + $ne': async () => {
          const data = await service.find({
            query: {
              age: {
                $ne: 25,
              },
            },
          })

          assert.strictEqual(data.length, 2, 'correct data.length')
        },
        '.find + $gt + $lt + $sort': async () => {
          const params = {
            query: {
              age: {
                $gt: 18,
                $lt: 30,
              },
              $sort: { name: 1 },
            },
          }

          const data = await service.find(params)

          assert.strictEqual(data.length, 2, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first user')
          assert.strictEqual(data[1].name, 'Bob', 'second user')
        },
        '.find + $or nested + $sort': async () => {
          const params = {
            query: {
              $or: [
                { name: 'Doug' },
                {
                  age: {
                    $gte: 18,
                    $lt: 25,
                  },
                },
              ],
              $sort: { name: 1 },
            },
          }

          const data = await service.find(params)

          assert.strictEqual(data.length, 2, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'first user')
          assert.strictEqual(data[1].name, 'Doug', 'second user')
        },
        '.find + $and': async () => {
          const params = {
            query: {
              $and: [{ age: 19 }],
              $sort: { name: 1 },
            },
          }

          const data = await service.find(params)

          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'correct user')
        },
        '.find + $and + $or': async () => {
          const params = {
            query: {
              $and: [{ $or: [{ name: 'Alice' }] }],
              $sort: { name: 1 },
            },
          }

          const data = await service.find(params)

          assert.strictEqual(data.length, 1, 'correct data.length')
          assert.strictEqual(data[0].name, 'Alice', 'correct user')
        },
      } satisfies TestConfig<'operators'>,
      'params.adapter': {
        'params.adapter + paginate': async () => {
          const page = await service.find({
            adapter: {
              paginate: { default: 3 },
            },
          })

          assert.strictEqual(page.limit, 3, 'correct limit')
          assert.strictEqual(page.skip, 0, 'correct skip')
        },
        'params.adapter + multi': async () => {
          const items = [
            {
              name: 'Garald',
              age: 200,
            },
            {
              name: 'Harald',
              age: 24,
            },
          ]
          const multiParams = {
            adapter: {
              multi: ['create'],
            },
          }
          const users = await service.create(items, multiParams)

          assert.strictEqual(users.length, 2, 'created two items')

          await service.remove(users[0][idProp])
          await service.remove(users[1][idProp])
          await assert.rejects(
            () => service.patch(null, { age: 2 }, multiParams),
            {
              message: 'Can not patch multiple entries',
            },
          )
        },
      } satisfies TestConfig<'params.adapter'>,
    }

    for (const describeName in config) {
      describe(describeName, () => {
        for (const testName in (config as any)[describeName]) {
          test(testName, async () => (config as any)[describeName][testName]())
        }
      })
    }

    // Opt-in tests for common (but non-standard) operators, skipped by default
    // and enabled per operator via `defineTestSuite({ recommended: [...] })`.
    const recommendedConfig = {
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
    } satisfies Record<RecommendedOperator, Partial<TestConfig<'recommended'>>>

    describe('recommended', () => {
      for (const operator in recommendedConfig) {
        for (const testName in (recommendedConfig as any)[operator]) {
          test(
            testName,
            async () => (recommendedConfig as any)[operator][testName](),
            { recommended: operator as RecommendedOperator },
          )
        }
      }
    })

    describe('paginate', function () {
      const paginateConfig: TestConfig<'paginate'> = {
        '.find + paginate': async () => {
          const page = await service.find({
            query: { $sort: { name: -1 } },
          })

          assert.strictEqual(page.total, 3, 'correct total')
          assert.strictEqual(page.limit, 1, 'correct limit')
          assert.strictEqual(page.skip, 0, 'correct skip')
          assert.strictEqual(page.data[0].name, 'Doug', 'correct user')
        },
        '.find + paginate + query': async () => {
          const page = await service.find({
            query: {
              $sort: { name: -1 },
              name: 'Doug',
            },
          })

          assert.strictEqual(page.total, 1, 'correct total')
          assert.strictEqual(page.limit, 1, 'correct limit')
          assert.strictEqual(page.skip, 0, 'correct skip')
          assert.strictEqual(page.data[0].name, 'Doug', 'correct user')
        },
        '.find + paginate + $limit + $skip': async () => {
          const params = {
            query: {
              $skip: 1,
              $limit: 4,
              $sort: { name: -1 },
            },
          }

          const page = await service.find(params)

          assert.strictEqual(page.total, 3, 'correct total')
          assert.strictEqual(page.limit, 2, 'correct limit')
          assert.strictEqual(page.skip, 1, 'correct skip')
          assert.strictEqual(page.data[0].name, 'Bob')
          assert.strictEqual(page.data[1].name, 'Alice')
        },
        '.find + paginate + $limit 0': async () => {
          const page = await service.find({
            query: { $limit: 0 },
          })

          assert.strictEqual(page.total, 3, 'correct total')
          assert.strictEqual(page.data.length, 0, 'data array is empty')
        },
        '.find + paginate + params': async () => {
          const page = await service.find({ paginate: { default: 3 } })

          assert.strictEqual(page.limit, 3, 'correct limit')
          assert.strictEqual(page.skip, 0, 'correct skip')

          const results = await service.find({ paginate: false })

          assert.ok(Array.isArray(results), 'results is an array')
          assert.strictEqual(results.length, 3, 'correct results length')
        },
      }

      for (const testName in paginateConfig) {
        test(testName, async () =>
          withOptions(service, { paginate: { default: 1, max: 2 } }, () =>
            (paginateConfig as any)[testName](),
          ),
        )
      }
    })
  })
}
