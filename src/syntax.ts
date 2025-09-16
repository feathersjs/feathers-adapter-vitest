import assert from 'node:assert'
import { describe, beforeEach, afterEach } from 'vitest'
import type { Application } from '@feathersjs/feathers'
import type { Test } from './declarations.js'

type SyntaxTestOptions = {
  app: Application
  test: Test
  serviceName: string
  idProp: string
}

export type AdapterTestNameSyntax =
  | '.find + equal'
  | '.find + equal multiple'
  | '.find + $sort'
  | '.find + $sort + string'
  | '.find + $limit'
  | '.find + $limit 0'
  | '.find + $skip'
  | '.find + $select'
  | '.find + $or'
  | '.find + $in'
  | '.find + $nin'
  | '.find + $lt'
  | '.find + $lte'
  | '.find + $gt'
  | '.find + $gte'
  | '.find + $ne'
  | '.find + $gt + $lt + $sort'
  | '.find + $or nested + $sort'
  | '.find + $and'
  | '.find + $and + $or'
  | 'params.adapter + paginate'
  | 'params.adapter + multi'
  | '.find + paginate'
  | '.find + paginate + query'
  | '.find + paginate + $limit + $skip'
  | '.find + paginate + $limit 0'
  | '.find + paginate + params'

type SyntaxTests = {
  general: '.find + equal' | '.find + equal multiple'
  filters:
    | '.find + $sort'
    | '.find + $sort + string'
    | '.find + $limit'
    | '.find + $limit 0'
    | '.find + $skip'
    | '.find + $select'
  operators:
    | '.find + $or'
    | '.find + $in'
    | '.find + $nin'
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
}

export type AdapterMethodsTestName = SyntaxTests[keyof SyntaxTests]

type TestName<T extends keyof SyntaxTests> = SyntaxTests[T]

type TestConfig<T extends keyof SyntaxTests> = Record<
  TestName<T>,
  () => void | Promise<void>
>

export default (options: SyntaxTestOptions) => {
  const { test, app, serviceName, idProp } = options

  describe('Query Syntax', () => {
    let bob: any
    let alice: any
    let doug: any
    let service: any

    beforeEach(async () => {
      service = app.service(serviceName)
      bob = await app.service(serviceName).create({
        name: 'Bob',
        age: 25,
      })
      doug = await app.service(serviceName).create({
        name: 'Doug',
        age: 32,
      })
      alice = await app.service(serviceName).create({
        name: 'Alice',
        age: 19,
      })

      assert.ok(
        bob[idProp] !== null,
        `simple 'create' failed (no ${idProp}). Before you start to test the adapter make sure simple create works.`,
      )
      assert.strictEqual(
        bob.name,
        'Bob',
        "simple 'create' failed (no name). Before you start to test the adapter make sure simple create works.",
      )
      assert.strictEqual(
        bob.age,
        25,
        "simple 'create' failed (no age). Before you start to test the adapter make sure simple create works.",
      )
    })

    afterEach(async () => {
      const items = await service.find({ paginate: false })
      assert.ok(
        Array.isArray(items),
        'find with paginate:false did not return an array. Before you start to test the adapter make sure params.paginate:false works.',
      )
      await Promise.all(items.map((item: any) => service.remove(item[idProp])))
      const itemsAfterRemove = await app
        .service(serviceName)
        .find({ paginate: false })
      assert.ok(
        itemsAfterRemove.length === 0,
        "'remove' does not work. Before you start to test the adapter make sure simple remove works.",
      )
    })

    const config = {
      general: {
        '.find + equal': async () => {
          const params = { query: { name: 'Alice' } }
          const data = await service.find(params)

          assert.ok(Array.isArray(data))
          assert.strictEqual(data.length, 1)
          assert.strictEqual(data[0].name, 'Alice')
        },
        '.find + equal multiple': async () => {
          const data = await service.find({
            query: { name: 'Alice', age: 20 },
          })

          assert.strictEqual(data.length, 0)
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

          assert.strictEqual(data.length, 3)
          assert.strictEqual(data[0].name, 'Doug')
          assert.strictEqual(data[1].name, 'Bob')
          assert.strictEqual(data[2].name, 'Alice')
        },
        '.find + $sort + string': async () => {
          const data = await service.find({
            query: {
              $sort: { name: '1' },
            },
          })

          assert.strictEqual(data.length, 3)
          assert.strictEqual(data[0].name, 'Alice')
          assert.strictEqual(data[1].name, 'Bob')
          assert.strictEqual(data[2].name, 'Doug')
        },
        '.find + $limit': async () => {
          const data = await service.find({
            query: {
              $limit: 2,
            },
          })

          assert.strictEqual(data.length, 2)
        },
        '.find + $limit 0': async () => {
          const data = await service.find({
            query: {
              $limit: 0,
            },
          })

          assert.strictEqual(data.length, 0)
        },
        '.find + $skip': async () => {
          const data = await service.find({
            query: {
              $sort: { name: 1 },
              $skip: 1,
            },
          })

          assert.strictEqual(data.length, 2)
          assert.strictEqual(data[0].name, 'Bob')
          assert.strictEqual(data[1].name, 'Doug')
        },
        '.find + $select': async () => {
          const data = await service.find({
            query: {
              name: 'Alice',
              $select: ['name'],
            },
          })

          assert.strictEqual(data.length, 1)
          assert.ok(idProp in data[0], 'data has id')
          assert.strictEqual(data[0].name, 'Alice')
          assert.strictEqual(data[0].age, undefined)
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

          assert.strictEqual(data.length, 2)
          assert.strictEqual(data[0].name, 'Alice')
          assert.strictEqual(data[1].name, 'Bob')
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

          assert.strictEqual(data.length, 2)
          assert.strictEqual(data[0].name, 'Alice')
          assert.strictEqual(data[1].name, 'Bob')
        },
        '.find + $nin': async () => {
          const data = await service.find({
            query: {
              name: {
                $nin: ['Alice', 'Bob'],
              },
            },
          })

          assert.strictEqual(data.length, 1)
          assert.strictEqual(data[0].name, 'Doug')
        },
        '.find + $lt': async () => {
          const data = await service.find({
            query: {
              age: {
                $lt: 30,
              },
            },
          })

          assert.strictEqual(data.length, 2)
        },
        '.find + $lte': async () => {
          const data = await service.find({
            query: {
              age: {
                $lte: 25,
              },
            },
          })

          assert.strictEqual(data.length, 2)
        },
        '.find + $gt': async () => {
          const data = await service.find({
            query: {
              age: {
                $gt: 30,
              },
            },
          })

          assert.strictEqual(data.length, 1)
        },
        '.find + $gte': async () => {
          const data = await service.find({
            query: {
              age: {
                $gte: 25,
              },
            },
          })

          assert.strictEqual(data.length, 2)
        },
        '.find + $ne': async () => {
          const data = await service.find({
            query: {
              age: {
                $ne: 25,
              },
            },
          })

          assert.strictEqual(data.length, 2, 'correct length')
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

          assert.strictEqual(data.length, 2, 'correct length')
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

          assert.strictEqual(data.length, 2, 'correct length')
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

          assert.strictEqual(data.length, 1, 'correct length')
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

          assert.strictEqual(data.length, 1, 'correct length')
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

          assert.strictEqual(users.length, 2)

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

    describe('paginate', function () {
      beforeEach(() => {
        service.options.paginate = {
          default: 1,
          max: 2,
        }
      })

      afterEach(() => {
        service.options.paginate = {}
      })

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
        test(testName, async () => (paginateConfig as any)[testName]())
      }
    })
  })
}
