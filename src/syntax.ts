import { describe, beforeEach, afterEach, expect } from 'vitest'
import type { Application } from '@feathersjs/feathers'
import type { Test } from './declarations.js'
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
    | '.find + $nin matches null'
    | '.find + $lt'
    | '.find + $lte'
    | '.find + $gt'
    | '.find + $gte'
    | '.find + $ne'
    | '.find + $ne matches null'
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

          expect(Array.isArray(data), 'data is an array').toBeTruthy()
          expect(data.length, 'data has one entry').toBe(1)
          expect(data[0].name, 'correct name').toBe('Alice')
        },
        '.find + equal multiple': async () => {
          const data = await service.find({
            query: { name: 'Alice', age: 20 },
          })

          expect(data.length, 'no results').toBe(0)
        },
      } satisfies TestConfig<'general'>,
      filters: {
        '.find + $sort': async () => {
          let data = await service.find({
            query: {
              $sort: { name: 1 },
            },
          })

          expect(data.length).toBe(3)
          expect(data[0].name).toBe('Alice')
          expect(data[1].name).toBe('Bob')
          expect(data[2].name).toBe('Doug')

          data = await service.find({
            query: {
              $sort: { name: -1 },
            },
          })

          expect(data.length, 'correct data.length').toBe(3)
          expect(data[0].name, 'first item').toBe('Doug')
          expect(data[1].name, 'second item').toBe('Bob')
          expect(data[2].name, 'third item').toBe('Alice')
        },
        '.find + $sort + string': async () => {
          let data = await service.find({
            query: {
              $sort: { name: '1' },
            },
          })

          expect(data.length, 'correct data.length').toBe(3)
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Bob')
          expect(data[2].name, 'third item').toBe('Doug')

          data = await service.find({
            query: {
              $sort: { name: '-1' },
            },
          })

          expect(data.length, 'correct data.length').toBe(3)
          expect(data[0].name, 'first item').toBe('Doug')
          expect(data[1].name, 'second item').toBe('Bob')
          expect(data[2].name, 'third item').toBe('Alice')
        },
        '.find + $limit': async () => {
          const data = await service.find({
            query: {
              $limit: 2,
            },
          })

          expect(data.length, 'correct data.length').toBe(2)
        },
        '.find + $limit 0': async () => {
          const data = await service.find({
            query: {
              $limit: 0,
            },
          })

          expect(data.length, 'data array is empty').toBe(0)
        },
        '.find + $skip': async () => {
          const data = await service.find({
            query: {
              $sort: { name: 1 },
              $skip: 1,
            },
          })

          expect(data.length, 'correct data.length').toBe(2)
          expect(data[0].name, 'first user').toBe('Bob')
          expect(data[1].name, 'second user').toBe('Doug')
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
          expect(data.length, 'correct data.length').toBe(1)
          expect(data[0].name, 'correct order: sort → skip → limit').toBe('Bob')
        },
        '.find + $select': async () => {
          const data = await service.find({
            query: {
              name: 'Alice',
              $select: ['name'],
            },
          })

          expect(data.length, 'correct data.length').toBe(1)
          expect(idProp in data[0], 'data has id').toBeTruthy()
          expect(data[0].name, 'correct name').toBe('Alice')
          expect(data[0].age, 'age was not selected').toBe(undefined)
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

          expect(data.length, 'correct data.length').toBe(2)
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Bob')
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

          expect(data.length, 'correct data.length').toBe(2)
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Bob')
        },
        '.find + $in empty': async () => {
          const data = await service.find({
            query: {
              name: { $in: [] },
            },
          })

          expect(Array.isArray(data), 'data is an array').toBeTruthy()
          expect(data.length, 'no items match $in: []').toBe(0)
        },
        '.find + $in + null': async () => {
          await service.create({ name: 'Nully', age: null })

          let data = await service.find({
            query: {
              age: { $in: [null] },
            },
          })

          expect(data.length, 'correct data.length for $in: [null]').toBe(1)
          expect(data[0].name, 'correct item').toBe('Nully')

          data = await service.find({
            query: {
              age: { $in: [null, 25] },
              $sort: { name: 1 },
            },
          })

          expect(data.length, 'correct data.length for $in: [null, 25]').toBe(2)
          expect(data[0].name, 'first item').toBe('Bob')
          expect(data[1].name, 'second item').toBe('Nully')
        },
        '.find + $nin': async () => {
          const data = await service.find({
            query: {
              name: {
                $nin: ['Alice', 'Bob'],
              },
            },
          })

          expect(data.length, 'correct data.length').toBe(1)
          expect(data[0].name, 'correct item').toBe('Doug')
        },
        '.find + $nin empty': async () => {
          const data = await service.find({
            query: {
              name: { $nin: [] },
              $sort: { name: 1 },
            },
          })

          expect(data.length, 'all items match $nin: []').toBe(3)
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Bob')
          expect(data[2].name, 'third item').toBe('Doug')
        },
        '.find + $nin + null': async () => {
          await service.create({ name: 'Nully', age: null })

          let data = await service.find({
            query: {
              age: { $nin: [null] },
              $sort: { name: 1 },
            },
          })

          expect(data.length, 'correct data.length for $nin: [null]').toBe(3)
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Bob')
          expect(data[2].name, 'third item').toBe('Doug')

          data = await service.find({
            query: {
              age: { $nin: [null, 25] },
              $sort: { name: 1 },
            },
          })

          expect(data.length, 'correct data.length for $nin: [null, 25]').toBe(
            2,
          )
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Doug')
        },
        '.find + $nin matches null': async () => {
          // `null` is not in the list, so the item without an age matches, as in MongoDB
          await service.create({ name: 'Nully', age: null })

          const data = await service.find({
            query: {
              age: { $nin: [25] },
              $sort: { name: 1 },
            },
          })

          expect(data.length, 'correct data.length').toBe(3)
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Doug')
          expect(data[2].name, 'third item').toBe('Nully')
        },
        '.find + $lt': async () => {
          const data = await service.find({
            query: {
              age: {
                $lt: 30,
              },
            },
          })

          expect(data.length, 'correct data.length').toBe(2)
        },
        '.find + $lte': async () => {
          const data = await service.find({
            query: {
              age: {
                $lte: 25,
              },
            },
          })

          expect(data.length, 'correct data.length').toBe(2)
        },
        '.find + $gt': async () => {
          const data = await service.find({
            query: {
              age: {
                $gt: 30,
              },
            },
          })

          expect(data.length, 'correct data.length').toBe(1)
        },
        '.find + $gte': async () => {
          const data = await service.find({
            query: {
              age: {
                $gte: 25,
              },
            },
          })

          expect(data.length, 'correct data.length').toBe(2)
        },
        '.find + $ne': async () => {
          const data = await service.find({
            query: {
              age: {
                $ne: 25,
              },
            },
          })

          expect(data.length, 'correct data.length').toBe(2)
        },
        '.find + $ne matches null': async () => {
          // `null` is not 25, so the item without an age matches, as in MongoDB
          await service.create({ name: 'Nully', age: null })

          let data = await service.find({
            query: {
              age: { $ne: 25 },
              $sort: { name: 1 },
            },
          })

          expect(data.length, 'correct data.length for $ne: 25').toBe(3)
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Doug')
          expect(data[2].name, 'third item').toBe('Nully')

          data = await service.find({
            query: {
              age: { $ne: null },
              $sort: { name: 1 },
            },
          })

          expect(data.length, 'correct data.length for $ne: null').toBe(3)
          expect(data[0].name, 'first item').toBe('Alice')
          expect(data[1].name, 'second item').toBe('Bob')
          expect(data[2].name, 'third item').toBe('Doug')
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

          expect(data.length, 'correct data.length').toBe(2)
          expect(data[0].name, 'first user').toBe('Alice')
          expect(data[1].name, 'second user').toBe('Bob')
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

          expect(data.length, 'correct data.length').toBe(2)
          expect(data[0].name, 'first user').toBe('Alice')
          expect(data[1].name, 'second user').toBe('Doug')
        },
        '.find + $and': async () => {
          const params = {
            query: {
              $and: [{ age: 19 }],
              $sort: { name: 1 },
            },
          }

          const data = await service.find(params)

          expect(data.length, 'correct data.length').toBe(1)
          expect(data[0].name, 'correct user').toBe('Alice')
        },
        '.find + $and + $or': async () => {
          const params = {
            query: {
              $and: [{ $or: [{ name: 'Alice' }] }],
              $sort: { name: 1 },
            },
          }

          const data = await service.find(params)

          expect(data.length, 'correct data.length').toBe(1)
          expect(data[0].name, 'correct user').toBe('Alice')
        },
      } satisfies TestConfig<'operators'>,
      'params.adapter': {
        'params.adapter + paginate': async () => {
          const page = await service.find({
            adapter: {
              paginate: { default: 3 },
            },
          })

          expect(page.limit, 'correct limit').toBe(3)
          expect(page.skip, 'correct skip').toBe(0)
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

          expect(users.length, 'created two items').toBe(2)

          await service.remove(users[0][idProp])
          await service.remove(users[1][idProp])
          await expect(
            service.patch(null, { age: 2 }, multiParams),
          ).rejects.toMatchObject({
            message: 'Can not patch multiple entries',
          })
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
      const paginateConfig: TestConfig<'paginate'> = {
        '.find + paginate': async () => {
          const page = await service.find({
            query: { $sort: { name: -1 } },
          })

          expect(page.total, 'correct total').toBe(3)
          expect(page.limit, 'correct limit').toBe(1)
          expect(page.skip, 'correct skip').toBe(0)
          expect(page.data[0].name, 'correct user').toBe('Doug')
        },
        '.find + paginate + query': async () => {
          const page = await service.find({
            query: {
              $sort: { name: -1 },
              name: 'Doug',
            },
          })

          expect(page.total, 'correct total').toBe(1)
          expect(page.limit, 'correct limit').toBe(1)
          expect(page.skip, 'correct skip').toBe(0)
          expect(page.data[0].name, 'correct user').toBe('Doug')
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

          expect(page.total, 'correct total').toBe(3)
          expect(page.limit, 'correct limit').toBe(2)
          expect(page.skip, 'correct skip').toBe(1)
          expect(page.data[0].name).toBe('Bob')
          expect(page.data[1].name).toBe('Alice')
        },
        '.find + paginate + $limit 0': async () => {
          const page = await service.find({
            query: { $limit: 0 },
          })

          expect(page.total, 'correct total').toBe(3)
          expect(page.data.length, 'data array is empty').toBe(0)
        },
        '.find + paginate + params': async () => {
          const page = await service.find({ paginate: { default: 3 } })

          expect(page.limit, 'correct limit').toBe(3)
          expect(page.skip, 'correct skip').toBe(0)

          const results = await service.find({ paginate: false })

          expect(Array.isArray(results), 'results is an array').toBeTruthy()
          expect(results.length, 'correct results length').toBe(3)
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
