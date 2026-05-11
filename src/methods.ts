import assert from 'node:assert'
import type { Test } from './declarations.js'
import { describe, beforeEach, afterEach, beforeAll } from 'vitest'
import type { Application } from '@feathersjs/feathers'
import { MethodNotAllowed, NotFound } from '@feathersjs/errors'
import { withOptions } from './utils.js'

type MethodTestOptions = {
  app: Application
  test: Test
  serviceName: string
  idProp: string
}

type MethodTests = {
  find: '.find'
  get:
    | '.get'
    | '.get + $select'
    | '.get + id + query'
    | '.get + id + query id'
    | '.get + NotFound (string)'
    | '.get + NotFound (integer)'
  remove:
    | '.remove'
    | '.remove + $select'
    | '.remove + id + query'
    | '.remove + id + query id'
    | '.remove + NotFound (string)'
    | '.remove + NotFound (integer)'
    | '.remove + multi'
    | '.remove + multi empty result'
    | '.remove + multi no pagination'
  update:
    | '.update'
    | '.update + $select'
    | '.update + id + query'
    | '.update + id + query id'
    | '.update + NotFound (string)'
    | '.update + NotFound (integer)'
    | '.update + query + NotFound'
  patch:
    | '.patch'
    | '.patch + empty data'
    | '.patch + data contains id'
    | '.patch + $select'
    | '.patch + $select unchanged'
    | '.patch + id + query'
    | '.patch + id + query id'
    | '.patch multiple'
    | '.patch multiple no pagination'
    | '.patch multi query same'
    | '.patch multi query changed'
    | '.patch multi + empty data'
    | '.patch multi + empty result'
    | '.patch multi + $select'
    // | '.patch multi + $sort'
    // | '.patch multi + $skip'
    // | '.patch multi + $limit'
    | '.patch + NotFound (string)'
    | '.patch + NotFound (integer)'
  create:
    | '.create'
    | '.create + $select'
    | '.create multi'
    | '.create multi + empty array'
    | '.create ignores query'
  internal:
    | 'internal .find'
    | 'internal .get'
    | 'internal .create'
    | 'internal .update'
    | 'internal .patch'
    | 'internal .remove'
}

export type AdapterTestNameMethods = MethodTests[keyof MethodTests]

type TestName<T extends keyof MethodTests> = MethodTests[T]

type TestConfig<T extends keyof MethodTests> = Record<
  TestName<T>,
  () => void | Promise<void>
>

export default (options: MethodTestOptions) => {
  const { test, app, serviceName, idProp } = options

  describe('Methods', () => {
    let doug: any
    let service: any

    beforeAll(() => {
      service = app.service(serviceName)
    })

    beforeEach(async () => {
      doug = await service.create({
        name: 'Doug',
        age: 32,
      })
    })

    async function clean() {
      const items = await service.find({ paginate: false })
      await Promise.all(items.map((item: any) => service.remove(item[idProp])))
    }

    afterEach(clean)

    const config = {
      find: {
        '.find': async () => {
          const data = await service.find()

          assert.ok(Array.isArray(data), 'Data is an array')
          assert.strictEqual(data.length, 1, 'Got one entry')
        },
      } satisfies TestConfig<'find'>,
      get: {
        '.get': async () => {
          const data = await service.get(doug[idProp])

          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id matches`,
          )
          assert.strictEqual(data.name, 'Doug', 'data.name matches')
          assert.strictEqual(data.age, 32, 'data.age matches')
        },
        '.get + $select': async () => {
          const data = await service.get(doug[idProp], {
            query: { $select: ['name'] },
          })

          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id property matches`,
          )
          assert.strictEqual(data.name, 'Doug', 'data.name matches')
          assert.ok(!('age' in data), 'data.age is not present')
        },
        '.get + id + query': async () => {
          await assert.rejects(
            () => service.get(doug[idProp], { query: { name: 'Tester' } }),
            NotFound,
          )
        },
        '.get + id + query id': async () => {
          const alice = await service.create({
            name: 'Alice',
            age: 12,
          })

          await assert.rejects(
            () =>
              service.get(doug[idProp], {
                query: { [idProp]: alice[idProp] },
              }),
            NotFound,
          )
        },
        '.get + NotFound (string)': async () => {
          await assert.rejects(
            () => service.get('568225fbfe21222432e836ff'),
            NotFound,
          )
        },
        '.get + NotFound (integer)': async () => {
          await assert.rejects(() => service.get(123141231231), NotFound)
        },
      },
      remove: {
        '.remove': async () => {
          const data = await service.remove(doug[idProp])

          assert.strictEqual(data.name, 'Doug', 'data.name matches')

          const items = await service.find({ paginate: false })
          assert.strictEqual(items.length, 0, 'Got no entries')
        },
        '.remove + $select': async () => {
          const data = await service.remove(doug[idProp], {
            query: { $select: ['name'] },
          })

          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id property matches`,
          )
          assert.strictEqual(data.name, 'Doug', 'data.name matches')
          assert.ok(!('age' in data), 'data.age is not presents')
        },
        '.remove + id + query': async () => {
          await assert.rejects(
            () =>
              service.remove(doug[idProp], {
                query: { name: 'Tester' },
              }),
            NotFound,
          )

          const stillExists = await service.get(doug[idProp])
          assert.ok(stillExists, 'Doug still exists')
        },
        '.remove + id + query id': async () => {
          const alice = await service.create({
            name: 'Alice',
            age: 12,
          })

          await assert.rejects(
            () =>
              service.remove(doug[idProp], {
                query: { [idProp]: alice[idProp] },
              }),
            NotFound,
          )

          const stillExists = await service.get(doug[idProp])
          assert.ok(stillExists, 'Doug still exists')
        },
        '.remove + NotFound (string)': async () => {
          await assert.rejects(
            () => service.remove('568225fbfe21222432e836ff'),
            NotFound,
          )
        },
        '.remove + NotFound (integer)': async () => {
          await assert.rejects(() => service.remove(123141231231), NotFound)
        },
        '.remove + multi': async () => {
          await withOptions(service, { multi: false }, () =>
            assert.rejects(
              () => service.remove(null),
              MethodNotAllowed,
              'remove multi rejects if options.multi is false',
            ),
          )

          await withOptions(service, { multi: ['create', 'patch'] }, () =>
            assert.rejects(
              () => service.remove(null),
              MethodNotAllowed,
              "remove multi rejects if options.multi does not include 'remove'",
            ),
          )

          await withOptions(service, { multi: ['remove'] }, async () => {
            await service.create({ name: 'Dave', age: 29, created: true })
            await service.create({
              name: 'David',
              age: 3,
              created: true,
            })

            const data = await service.remove(null, {
              query: { created: true },
            })

            assert.strictEqual(data.length, 2)

            const names = data.map((person: any) => person.name)

            assert.ok(names.includes('Dave'), 'Dave removed')
            assert.ok(names.includes('David'), 'David removed')
          })
        },
        '.remove + multi empty result': async () => {
          await withOptions(service, { multi: true }, async () => {
            const data = await service.remove(null, {
              query: { name: 'NoSuchName' },
            })

            assert.ok(Array.isArray(data), 'data is an array')
            assert.strictEqual(data.length, 0, 'returned no entries')

            const dougAfter = await service.get(doug[idProp])
            assert.strictEqual(
              dougAfter.name,
              doug.name,
              'doug untouched by empty-result remove',
            )
          })
        },
        '.remove + multi no pagination': async () => {
          await clean()

          const count = 14
          const defaultPaginate = 10

          assert.ok(
            count > defaultPaginate,
            'count is bigger than default pagination',
          )

          await withOptions(
            service,
            {
              multi: true,
              paginate: { default: defaultPaginate, max: 100 },
            },
            async () => {
              const emptyItems = await service.find({ paginate: false })
              assert.strictEqual(emptyItems.length, 0, 'no items before')

              const createdItems = await service.create(
                Array.from(Array(count)).map((_, i) => ({
                  name: `name-${i}`,
                  age: 3,
                  created: true,
                })),
              )
              assert.strictEqual(
                createdItems.length,
                count,
                `created ${count} items`,
              )

              const foundItems = await service.find({ paginate: false })
              assert.strictEqual(
                foundItems.length,
                count,
                `created ${count} items`,
              )

              const foundPaginatedItems = await service.find({})
              assert.strictEqual(
                foundPaginatedItems.data.length,
                defaultPaginate,
                'found paginated items',
              )

              const allItems = await service.remove(null, {
                query: { created: true },
              })

              assert.strictEqual(
                allItems.length,
                count,
                `removed all ${count} items`,
              )
            },
          )
        },
      } satisfies TestConfig<'remove'>,
      update: {
        '.update': async () => {
          const originalData = { [idProp]: doug[idProp], name: 'Dougler' }
          const originalCopy = { ...originalData }

          const data = await service.update(doug[idProp], originalData)

          assert.deepStrictEqual(
            originalData,
            originalCopy,
            'data was not modified',
          )
          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id matches`,
          )
          assert.strictEqual(data.name, 'Dougler', 'data.name matches')
          assert.ok(data.age == null, 'data.age is nullable') // could be null or undefined, based on the adapter
        },
        '.update + $select': async () => {
          const originalData = {
            [idProp]: doug[idProp],
            name: 'Dougler',
            age: 10,
          }

          const data = await service.update(doug[idProp], originalData, {
            query: { $select: ['name'] },
          })

          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id property matches`,
          )
          assert.strictEqual(data.name, 'Dougler', 'data.name changed')
          assert.ok(!('age' in data), 'data.age is not present')

          const changed = await service.get(doug[idProp])

          assert.strictEqual(
            changed.name,
            originalData.name,
            'data.name changed',
          )
          assert.strictEqual(changed.age, originalData.age, 'data.age changed')
        },
        '.update + id + query': async () => {
          await assert.rejects(
            () =>
              service.update(
                doug[idProp],
                {
                  name: 'Dougler',
                },
                {
                  query: { name: 'Tester' },
                },
              ),
            NotFound,
          )

          const unchanged = await service.get(doug[idProp])
          assert.strictEqual(unchanged.name, doug.name, 'name is still Doug')
        },
        '.update + id + query id': async () => {
          const alice = await service.create({
            name: 'Alice',
            age: 12,
          })

          await assert.rejects(
            () =>
              service.update(
                doug[idProp],
                {
                  name: 'Dougler',
                  age: 33,
                },
                {
                  query: { [idProp]: alice[idProp] },
                },
              ),
            NotFound,
          )

          const unchanged = await service.get(doug[idProp])
          assert.equal(unchanged.name, doug.name, 'name stayed the same')
          assert.equal(unchanged.age, doug.age, 'age stayed the same')
        },
        '.update + NotFound (string)': async () => {
          await assert.rejects(
            () =>
              service.update('568225fbfe21222432e836ff', {
                name: 'NotFound',
              }),
            NotFound,
          )
        },
        '.update + NotFound (integer)': async () => {
          await assert.rejects(
            () =>
              service.update(123141231231, {
                name: 'NotFound',
              }),
            NotFound,
          )
        },
        '.update + query + NotFound': async () => {
          const dave = await service.create({ name: 'Dave' })

          await assert.rejects(
            () =>
              service.update(
                dave[idProp],
                { name: 'UpdatedDave' },
                { query: { name: 'NotDave' } },
              ),
            NotFound,
          )
        },
      } satisfies TestConfig<'update'>,
      patch: {
        '.patch': async () => {
          const originalData = { [idProp]: doug[idProp], name: 'PatchDoug' }
          const originalCopy = Object.assign({}, originalData)

          const data = await service.patch(doug[idProp], originalData)

          assert.deepStrictEqual(
            originalData,
            originalCopy,
            'original data was not modified',
          )
          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id matches`,
          )
          assert.strictEqual(data.name, 'PatchDoug', 'data.name matches')
          assert.strictEqual(data.age, 32, 'data.age matches')
        },
        '.patch + empty data': async () => {
          const data = await service.patch(doug[idProp], {})

          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id matches`,
          )
          assert.strictEqual(data.name, doug.name, 'data.name unchanged')
          assert.strictEqual(data.age, doug.age, 'data.age unchanged')

          const fetched = await service.get(doug[idProp])
          assert.strictEqual(
            fetched.name,
            doug.name,
            'persisted name unchanged',
          )
          assert.strictEqual(fetched.age, doug.age, 'persisted age unchanged')
        },
        '.patch + data contains id': async () => {
          const alice = await service.create({ name: 'Alice', age: 12 })

          const matching = await service.patch(doug[idProp], {
            [idProp]: doug[idProp],
            name: 'PatchDoug',
          })
          assert.strictEqual(
            matching[idProp].toString(),
            doug[idProp].toString(),
            'matching id in data: returned id matches',
          )
          assert.strictEqual(
            matching.name,
            'PatchDoug',
            'matching id in data: name patched',
          )

          const differing = await service.patch(doug[idProp], {
            [idProp]: alice[idProp],
            name: 'PatchDougAgain',
          })
          assert.strictEqual(
            differing[idProp].toString(),
            doug[idProp].toString(),
            'differing id in data: url id takes precedence',
          )
          assert.strictEqual(
            differing.name,
            'PatchDougAgain',
            'differing id in data: doug was patched',
          )

          const aliceAfter = await service.get(alice[idProp])
          assert.strictEqual(
            aliceAfter.name,
            'Alice',
            'differing id in data: alice unchanged',
          )
          assert.strictEqual(
            aliceAfter.age,
            12,
            'differing id in data: alice age unchanged',
          )
        },
        '.patch + $select': async () => {
          const originalData = {
            [idProp]: doug[idProp],
            name: 'PatchDoug',
            age: 10,
          }

          const data = await service.patch(doug[idProp], originalData, {
            query: { $select: ['name'] },
          })

          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id property matches`,
          )
          assert.strictEqual(data.name, 'PatchDoug', 'data.name matches')
          assert.ok(!('age' in data), 'data.age is not present')

          const changed = await service.get(doug[idProp])
          assert.strictEqual(changed.age, originalData.age, 'data.age changed')
        },

        '.patch + $select unchanged': async () => {
          const originalData = {
            [idProp]: doug[idProp],
            name: 'PatchDoug',
          }

          const data = await service.patch(doug[idProp], originalData, {
            query: { $select: ['name'] },
          })

          assert.strictEqual(
            data[idProp].toString(),
            doug[idProp].toString(),
            `${idProp} id property matches`,
          )
          assert.strictEqual(data.name, 'PatchDoug', 'data.name matches')
          assert.ok(!('age' in data), 'data.age is not present')

          const changed = await service.get(doug[idProp])
          assert.strictEqual(changed.age, doug.age, 'data.age unchanged')
        },
        '.patch + id + query': async () => {
          await assert.rejects(
            () =>
              service.patch(
                doug[idProp],
                {
                  name: 'id patched doug',
                },
                {
                  query: { name: 'Tester' },
                },
              ),
            NotFound,
          )

          const unchanged = await service.get(doug[idProp])
          assert.strictEqual(unchanged.name, doug.name, 'name is still Doug')
        },
        '.patch + id + query id': async () => {
          const alice = await service.create({
            name: 'Alice',
            age: 12,
          })

          await assert.rejects(
            () =>
              service.patch(
                doug[idProp],
                {
                  age: 33,
                },
                {
                  query: { [idProp]: alice[idProp] },
                },
              ),
            NotFound,
          )

          const dougAfter = await service.get(doug[idProp])

          assert.equal(dougAfter.age, doug.age, 'age stayed the same')
        },
        '.patch multiple': async () => {
          await withOptions(service, { multi: false }, () =>
            assert.rejects(
              () => service.patch(null, {}),
              MethodNotAllowed,
              'patch multi rejects if options.multi is false',
            ),
          )

          await withOptions(service, { multi: ['create', 'remove'] }, () =>
            assert.rejects(
              () => service.patch(null, {}),
              MethodNotAllowed,
              "patch multi rejects if options.multi does not include 'patch'",
            ),
          )

          const dave = await service.create({
            name: 'Dave',
            age: 29,
            created: true,
          })
          const david = await service.create({
            name: 'David',
            age: 3,
            created: true,
          })

          await withOptions(service, { multi: ['patch'] }, async () => {
            const data = await service.patch(
              null,
              {
                age: 2,
              },
              {
                query: { created: true },
              },
            )

            assert.strictEqual(data.length, 2, 'returned two entries')
            assert.strictEqual(data[0].age, 2, 'First entry age was updated')
            assert.strictEqual(data[1].age, 2, 'Second entry age was updated')
          })
        },
        '.patch multiple no pagination': async () => {
          await clean()

          const count = 14
          const defaultPaginate = 10

          assert.ok(
            count > defaultPaginate,
            'count is bigger than default pagination',
          )

          await withOptions(
            service,
            {
              multi: true,
              paginate: { default: defaultPaginate, max: 100 },
            },
            async () => {
              const emptyItems = await service.find({ paginate: false })
              assert.strictEqual(emptyItems.length, 0, 'no items before')

              const createdItems = await service.create(
                Array.from(Array(count)).map((_, i) => ({
                  name: `name-${i}`,
                  age: 3,
                  created: true,
                })),
              )
              assert.strictEqual(
                createdItems.length,
                count,
                `created ${count} items`,
              )

              const foundItems = await service.find({ paginate: false })
              assert.strictEqual(
                foundItems.length,
                count,
                `created ${count} items`,
              )

              const foundPaginatedItems = await service.find({})
              assert.strictEqual(
                foundPaginatedItems.data.length,
                defaultPaginate,
                'found paginated data',
              )

              const allItems = await service.patch(
                null,
                { age: 4 },
                { query: { created: true } },
              )

              assert.strictEqual(
                allItems.length,
                count,
                `patched all ${count} items`,
              )
            },
          )
        },
        '.patch multi query same': async () => {
          await withOptions(service, { multi: true }, async () => {
            const dave = await service.create({
              name: 'Dave',
              age: 8,
              created: true,
            })
            const david = await service.create({
              name: 'David',
              age: 4,
              created: true,
            })

            const data = await service.patch(
              null,
              {
                age: 2,
              },
              {
                query: { age: { $lt: 10 } },
              },
            )

            assert.strictEqual(data.length, 2, 'returned two entries')
            assert.strictEqual(data[0].age, 2, 'First entry age was updated')
            assert.strictEqual(data[1].age, 2, 'Second entry age was updated')
          })
        },
        '.patch multi query changed': async () => {
          await withOptions(service, { multi: true }, async () => {
            const dave = await service.create({
              name: 'Dave',
              age: 10,
              created: true,
            })
            const david = await service.create({
              name: 'David',
              age: 10,
              created: true,
            })

            const data = await service.patch(
              null,
              {
                age: 2,
              },
              {
                query: { age: 10 },
              },
            )

            assert.strictEqual(data.length, 2, 'returned two entries')
            assert.strictEqual(data[0].age, 2, 'First entry age was updated')
            assert.strictEqual(data[1].age, 2, 'Second entry age was updated')
          })
        },
        '.patch multi + empty data': async () => {
          await withOptions(service, { multi: true }, async () => {
            const dave = await service.create({
              name: 'Dave',
              age: 29,
              created: true,
            })
            const david = await service.create({
              name: 'David',
              age: 3,
              created: true,
            })

            const data = await service.patch(
              null,
              {},
              { query: { created: true } },
            )

            assert.strictEqual(data.length, 2, 'returned two entries')
            const byId = new Map<string, any>(
              data.map((item: any) => [item[idProp].toString(), item]),
            )
            const daveAfter = byId.get(dave[idProp].toString())
            const davidAfter = byId.get(david[idProp].toString())
            assert.ok(daveAfter, 'dave is included')
            assert.ok(davidAfter, 'david is included')
            assert.strictEqual(daveAfter.name, 'Dave', 'dave name unchanged')
            assert.strictEqual(daveAfter.age, 29, 'dave age unchanged')
            assert.strictEqual(davidAfter.name, 'David', 'david name unchanged')
            assert.strictEqual(davidAfter.age, 3, 'david age unchanged')
          })
        },
        '.patch multi + empty result': async () => {
          await withOptions(service, { multi: true }, async () => {
            const data = await service.patch(
              null,
              { age: 99 },
              { query: { name: 'NoSuchName' } },
            )

            assert.ok(Array.isArray(data), 'data is an array')
            assert.strictEqual(data.length, 0, 'returned no entries')

            const dougAfter = await service.get(doug[idProp])
            assert.strictEqual(
              dougAfter.age,
              doug.age,
              'doug age untouched by empty-result patch',
            )
          })
        },
        '.patch multi + $select': async () => {
          await withOptions(service, { multi: true }, async () => {
            const dave = await service.create({
              name: 'Dave',
              age: 29,
              created: true,
            })
            const david = await service.create({
              name: 'David',
              age: 3,
              created: true,
            })

            const data = await service.patch(
              null,
              { age: 2 },
              {
                query: { created: true, $select: ['name'] },
              },
            )

            assert.strictEqual(data.length, 2, 'returned two entries')
            for (const item of data) {
              assert.ok(idProp in item, 'id is present')
              assert.ok('name' in item, 'name is present')
              assert.ok(!('age' in item), 'age is not present')
              assert.ok(!('created' in item), 'created is not present')
            }

            const daveAfter = await service.get(dave[idProp])
            const davidAfter = await service.get(david[idProp])
            assert.strictEqual(daveAfter.age, 2, 'dave age was patched')
            assert.strictEqual(davidAfter.age, 2, 'david age was patched')
          })
        },
        // '.patch multi + $sort': async () => {
        //   const users = await Promise.all(
        //     ['A', 'B', 'C'].map((name) =>
        //       service.create({ name, age: 20, sortTest: true }),
        //     ),
        //   )

        //   const patched = await service.patch(
        //     null,
        //     { age: 30 },
        //     {
        //       query: {
        //         [idProp]: { $in: users.map((user) => user[idProp]) },
        //         $sort: { name: -1 },
        //       },
        //     },
        //   )

        //   assert.strictEqual(patched.length, 3, 'patched three entries')
        //   assert.strictEqual(patched[0].name, 'C', 'first entry is C')
        //   assert.strictEqual(patched[1].name, 'B', 'second entry is B')
        //   assert.strictEqual(patched[2].name, 'A', 'third entry is A')

        //   await Promise.all(users.map((user) => service.remove(user[idProp])))
        // },
        // '.patch multi + $skip': async () => {
        //   const users = await Promise.all(
        //     ['A', 'B', 'C'].map((name) => service.create({ name, age: 20 })),
        //   )

        //   const patched = await service.patch(
        //     null,
        //     { age: 30 },
        //     {
        //       query: {
        //         [idProp]: { $in: users.map((user) => user[idProp]) },
        //         $skip: 1,
        //       },
        //     },
        //   )

        //   assert.strictEqual(patched.length, 2, 'patched two entries')
        //   const names = patched.map((p: any) => p.name)
        //   ;['B', 'C'].forEach((name) => {
        //     assert.ok(names.includes(name), `patched entry is ${name}`)
        //   })
        // },
        // '.patch multi + $limit': async () => {
        //   const users = await Promise.all(
        //     ['A', 'B', 'C'].map((name) => service.create({ name, age: 20 })),
        //   )

        //   const patched = await service.patch(
        //     null,
        //     { age: 30 },
        //     {
        //       query: {
        //         [idProp]: { $in: users.map((user) => user[idProp]) },
        //         $limit: 2,
        //       },
        //     },
        //   )

        //   assert.strictEqual(patched.length, 2, 'patched two entries')
        //   const names = patched.map((p: any) => p.name)
        //   ;['A', 'B', 'C'].forEach((name) => {
        //     if (names.includes(name)) {
        //       assert.ok(true, `patched entry is ${name}`)
        //     }
        //   })
        // },
        '.patch + NotFound (string)': async () => {
          await assert.rejects(
            () =>
              service.patch('568225fbfe21222432e836ff', {
                name: 'PatchDoug',
              }),
            NotFound,
          )
        },
        '.patch + NotFound (integer)': async () => {
          await assert.rejects(
            () =>
              service.patch(123141231231, {
                name: 'PatchDoug',
              }),
            NotFound,
          )
        },
      } satisfies TestConfig<'patch'>,
      create: {
        '.create': async () => {
          const originalData = {
            name: 'Bill',
            age: 40,
          }
          const originalCopy = Object.assign({}, originalData)

          const data = await service.create(originalData)

          assert.deepStrictEqual(
            originalData,
            originalCopy,
            'original data was not modified',
          )
          assert.ok(data instanceof Object, 'data is an object')
          assert.strictEqual(data.name, 'Bill', 'data.name matches')
        },
        '.create ignores query': async () => {
          const originalData = {
            name: 'Billy',
            age: 42,
          }
          const data = await service.create(originalData, {
            query: {
              name: 'Dave',
            },
          })

          assert.strictEqual(data.name, 'Billy', 'data.name matches')
        },
        '.create + $select': async () => {
          const originalData = {
            name: 'William',
            age: 23,
          }

          const data = await service.create(originalData, {
            query: { $select: ['name'] },
          })

          assert.ok(idProp in data, 'data has id')
          assert.strictEqual(data.name, 'William', 'data.name matches')
          assert.ok(!('age' in data), 'data.age is not present')

          const created = await service.get(data[idProp])

          assert.strictEqual(created.age, 23, 'data.age created')

          await service.remove(data[idProp])
        },
        '.create multi': async () => {
          await withOptions(service, { multi: false }, () =>
            assert.rejects(
              () => service.create([]),
              MethodNotAllowed,
              'create multi rejects if options.multi is false',
            ),
          )

          await withOptions(service, { multi: ['patch', 'remove'] }, () =>
            assert.rejects(
              () => service.create([]),
              MethodNotAllowed,
              "create multi rejects if options.multi does not include 'create'",
            ),
          )

          await withOptions(
            service,
            {
              multi: ['create'],
            },
            async () => {
              const data = await service.create([
                {
                  name: 'Gerald',
                  age: 18,
                },
                {
                  name: 'Herald',
                  age: 18,
                },
              ])

              assert.ok(Array.isArray(data), 'data is an array')
              assert.ok(typeof data[0][idProp] !== 'undefined', 'id is set')
              assert.strictEqual(data[0].name, 'Gerald', 'first name matches')
              assert.ok(typeof data[1][idProp] !== 'undefined', 'id is set')
              assert.strictEqual(data[1].name, 'Herald', 'second name macthes')
            },
          )
        },
        '.create multi + empty array': async () => {
          await withOptions(service, { multi: ['create'] }, async () => {
            const before = await service.find({ paginate: false })

            const data = await service.create([])

            assert.ok(Array.isArray(data), 'data is an array')
            assert.strictEqual(data.length, 0, 'returned no entries')

            const after = await service.find({ paginate: false })
            assert.strictEqual(
              after.length,
              before.length,
              'no records were created',
            )
          })
        },
      } satisfies TestConfig<'create'>,
    }

    for (const key in config) {
      const group = (config as any)[key] as TestConfig<any>
      describe(key, () => {
        for (const testName in group) {
          test(testName, () => group[testName]())
        }
      })
    }

    describe("doesn't call public methods internally", () => {
      let throwing: any

      beforeAll(() => {
        throwing = Object.assign(Object.create(app.service(serviceName)), {
          get store() {
            // @ts-expect-error just ignore it for now
            return app.service(serviceName).store
          },

          find() {
            throw new Error('find method called')
          },
          get() {
            throw new Error('get method called')
          },
          create() {
            throw new Error('create method called')
          },
          update() {
            throw new Error('update method called')
          },
          patch() {
            throw new Error('patch method called')
          },
          remove() {
            throw new Error('remove method called')
          },
        })
      })

      const internal = {
        'internal .find': () =>
          (app as any).service(serviceName).find.call(throwing),
        'internal .get': () => service.get.call(throwing, doug[idProp]),
        'internal .create': async () => {
          const bob = await service.create.call(throwing, {
            name: 'Bob',
            age: 25,
          })

          await service.remove(bob[idProp])
        },
        'internal .update': () =>
          service.update.call(throwing, doug[idProp], {
            name: 'Dougler',
          }),
        'internal .patch': () =>
          service.patch.call(throwing, doug[idProp], {
            name: 'PatchDoug',
          }),
        'internal .remove': () => service.remove.call(throwing, doug[idProp]),
      } satisfies TestConfig<'internal'>

      for (const testName in internal) {
        test(testName, () => (internal as any)[testName]())
      }
    })
  })
}
