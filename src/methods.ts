import type { Test } from './declarations.js'
import { describe, beforeEach, afterEach, beforeAll, expect } from 'vitest'
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

          expect(Array.isArray(data), 'Data is an array').toBeTruthy()
          expect(data.length, 'Got one entry').toBe(1)
        },
      } satisfies TestConfig<'find'>,
      get: {
        '.get': async () => {
          const data = await service.get(doug[idProp])

          expect(data[idProp].toString(), `${idProp} id matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name matches').toBe('Doug')
          expect(data.age, 'data.age matches').toBe(32)
        },
        '.get + $select': async () => {
          const data = await service.get(doug[idProp], {
            query: { $select: ['name'] },
          })

          expect(data[idProp].toString(), `${idProp} id property matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name matches').toBe('Doug')
          expect('age' in data, 'data.age is not present').toBeFalsy()
        },
        '.get + id + query': async () => {
          await expect(
            service.get(doug[idProp], { query: { name: 'Tester' } }),
          ).rejects.toThrow(NotFound)
        },
        '.get + id + query id': async () => {
          const alice = await service.create({
            name: 'Alice',
            age: 12,
          })

          await expect(
            service.get(doug[idProp], {
              query: { [idProp]: alice[idProp] },
            }),
          ).rejects.toThrow(NotFound)
        },
        '.get + NotFound (string)': async () => {
          await expect(service.get('568225fbfe21222432e836ff')).rejects.toThrow(
            NotFound,
          )
        },
        '.get + NotFound (integer)': async () => {
          await expect(service.get(123141231231)).rejects.toThrow(NotFound)
        },
      },
      remove: {
        '.remove': async () => {
          const data = await service.remove(doug[idProp])

          expect(data.name, 'data.name matches').toBe('Doug')

          const items = await service.find({ paginate: false })
          expect(items.length, 'Got no entries').toBe(0)
        },
        '.remove + $select': async () => {
          const data = await service.remove(doug[idProp], {
            query: { $select: ['name'] },
          })

          expect(data[idProp].toString(), `${idProp} id property matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name matches').toBe('Doug')
          expect('age' in data, 'data.age is not presents').toBeFalsy()
        },
        '.remove + id + query': async () => {
          await expect(
            service.remove(doug[idProp], {
              query: { name: 'Tester' },
            }),
          ).rejects.toThrow(NotFound)

          const stillExists = await service.get(doug[idProp])
          expect(stillExists, 'Doug still exists').toBeTruthy()
        },
        '.remove + id + query id': async () => {
          const alice = await service.create({
            name: 'Alice',
            age: 12,
          })

          await expect(
            service.remove(doug[idProp], {
              query: { [idProp]: alice[idProp] },
            }),
          ).rejects.toThrow(NotFound)

          const stillExists = await service.get(doug[idProp])
          expect(stillExists, 'Doug still exists').toBeTruthy()
        },
        '.remove + NotFound (string)': async () => {
          await expect(
            service.remove('568225fbfe21222432e836ff'),
          ).rejects.toThrow(NotFound)
        },
        '.remove + NotFound (integer)': async () => {
          await expect(service.remove(123141231231)).rejects.toThrow(NotFound)
        },
        '.remove + multi': async () => {
          await withOptions(service, { multi: false }, () =>
            expect(
              service.remove(null),
              'remove multi rejects if options.multi is false',
            ).rejects.toThrow(MethodNotAllowed),
          )

          await withOptions(service, { multi: ['create', 'patch'] }, () =>
            expect(
              service.remove(null),
              "remove multi rejects if options.multi does not include 'remove'",
            ).rejects.toThrow(MethodNotAllowed),
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

            expect(data.length).toBe(2)

            const names = data.map((person: any) => person.name)

            expect(names.includes('Dave'), 'Dave removed').toBeTruthy()
            expect(names.includes('David'), 'David removed').toBeTruthy()
          })
        },
        '.remove + multi empty result': async () => {
          await withOptions(service, { multi: true }, async () => {
            const data = await service.remove(null, {
              query: { name: 'NoSuchName' },
            })

            expect(Array.isArray(data), 'data is an array').toBeTruthy()
            expect(data.length, 'returned no entries').toBe(0)

            const dougAfter = await service.get(doug[idProp])
            expect(
              dougAfter.name,
              'doug untouched by empty-result remove',
            ).toBe(doug.name)
          })
        },
        '.remove + multi no pagination': async () => {
          await clean()

          const count = 14
          const defaultPaginate = 10

          expect(
            count > defaultPaginate,
            'count is bigger than default pagination',
          ).toBeTruthy()

          await withOptions(
            service,
            {
              multi: true,
              paginate: { default: defaultPaginate, max: 100 },
            },
            async () => {
              const emptyItems = await service.find({ paginate: false })
              expect(emptyItems.length, 'no items before').toBe(0)

              const createdItems = await service.create(
                Array.from(Array(count)).map((_, i) => ({
                  name: `name-${i}`,
                  age: 3,
                  created: true,
                })),
              )
              expect(createdItems.length, `created ${count} items`).toBe(count)

              const foundItems = await service.find({ paginate: false })
              expect(foundItems.length, `created ${count} items`).toBe(count)

              const foundPaginatedItems = await service.find({})
              expect(
                foundPaginatedItems.data.length,
                'found paginated items',
              ).toBe(defaultPaginate)

              const allItems = await service.remove(null, {
                query: { created: true },
              })

              expect(allItems.length, `removed all ${count} items`).toBe(count)
            },
          )
        },
      } satisfies TestConfig<'remove'>,
      update: {
        '.update': async () => {
          const originalData = { [idProp]: doug[idProp], name: 'Dougler' }
          const originalCopy = { ...originalData }

          const data = await service.update(doug[idProp], originalData)

          expect(originalData, 'data was not modified').toStrictEqual(
            originalCopy,
          )
          expect(data[idProp].toString(), `${idProp} id matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name matches').toBe('Dougler')
          expect(data.age == null, 'data.age is nullable').toBeTruthy() // could be null or undefined, based on the adapter
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

          expect(data[idProp].toString(), `${idProp} id property matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name changed').toBe('Dougler')
          expect('age' in data, 'data.age is not present').toBeFalsy()

          const changed = await service.get(doug[idProp])

          expect(changed.name, 'data.name changed').toBe(originalData.name)
          expect(changed.age, 'data.age changed').toBe(originalData.age)
        },
        '.update + id + query': async () => {
          await expect(
            service.update(
              doug[idProp],
              {
                name: 'Dougler',
              },
              {
                query: { name: 'Tester' },
              },
            ),
          ).rejects.toThrow(NotFound)

          const unchanged = await service.get(doug[idProp])
          expect(unchanged.name, 'name is still Doug').toBe(doug.name)
        },
        '.update + id + query id': async () => {
          const alice = await service.create({
            name: 'Alice',
            age: 12,
          })

          await expect(
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
          ).rejects.toThrow(NotFound)

          const unchanged = await service.get(doug[idProp])
          expect(unchanged.name, 'name stayed the same').toBe(doug.name)
          expect(unchanged.age, 'age stayed the same').toBe(doug.age)
        },
        '.update + NotFound (string)': async () => {
          await expect(
            service.update('568225fbfe21222432e836ff', {
              name: 'NotFound',
            }),
          ).rejects.toThrow(NotFound)
        },
        '.update + NotFound (integer)': async () => {
          await expect(
            service.update(123141231231, {
              name: 'NotFound',
            }),
          ).rejects.toThrow(NotFound)
        },
        '.update + query + NotFound': async () => {
          const dave = await service.create({ name: 'Dave' })

          await expect(
            service.update(
              dave[idProp],
              { name: 'UpdatedDave' },
              { query: { name: 'NotDave' } },
            ),
          ).rejects.toThrow(NotFound)
        },
      } satisfies TestConfig<'update'>,
      patch: {
        '.patch': async () => {
          const originalData = { [idProp]: doug[idProp], name: 'PatchDoug' }
          const originalCopy = Object.assign({}, originalData)

          const data = await service.patch(doug[idProp], originalData)

          expect(originalData, 'original data was not modified').toStrictEqual(
            originalCopy,
          )
          expect(data[idProp].toString(), `${idProp} id matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name matches').toBe('PatchDoug')
          expect(data.age, 'data.age matches').toBe(32)
        },
        '.patch + empty data': async () => {
          const data = await service.patch(doug[idProp], {})

          expect(data[idProp].toString(), `${idProp} id matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name unchanged').toBe(doug.name)
          expect(data.age, 'data.age unchanged').toBe(doug.age)

          const fetched = await service.get(doug[idProp])
          expect(fetched.name, 'persisted name unchanged').toBe(doug.name)
          expect(fetched.age, 'persisted age unchanged').toBe(doug.age)
        },
        '.patch + data contains id': async () => {
          const alice = await service.create({ name: 'Alice', age: 12 })

          const matching = await service.patch(doug[idProp], {
            [idProp]: doug[idProp],
            name: 'PatchDoug',
          })
          expect(
            matching[idProp].toString(),
            'matching id in data: returned id matches',
          ).toBe(doug[idProp].toString())
          expect(matching.name, 'matching id in data: name patched').toBe(
            'PatchDoug',
          )

          const differing = await service.patch(doug[idProp], {
            [idProp]: alice[idProp],
            name: 'PatchDougAgain',
          })
          expect(
            differing[idProp].toString(),
            'differing id in data: url id takes precedence',
          ).toBe(doug[idProp].toString())
          expect(differing.name, 'differing id in data: doug was patched').toBe(
            'PatchDougAgain',
          )

          const aliceAfter = await service.get(alice[idProp])
          expect(aliceAfter.name, 'differing id in data: alice unchanged').toBe(
            'Alice',
          )
          expect(
            aliceAfter.age,
            'differing id in data: alice age unchanged',
          ).toBe(12)
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

          expect(data[idProp].toString(), `${idProp} id property matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name matches').toBe('PatchDoug')
          expect('age' in data, 'data.age is not present').toBeFalsy()

          const changed = await service.get(doug[idProp])
          expect(changed.age, 'data.age changed').toBe(originalData.age)
        },

        '.patch + $select unchanged': async () => {
          const originalData = {
            [idProp]: doug[idProp],
            name: 'PatchDoug',
          }

          const data = await service.patch(doug[idProp], originalData, {
            query: { $select: ['name'] },
          })

          expect(data[idProp].toString(), `${idProp} id property matches`).toBe(
            doug[idProp].toString(),
          )
          expect(data.name, 'data.name matches').toBe('PatchDoug')
          expect('age' in data, 'data.age is not present').toBeFalsy()

          const changed = await service.get(doug[idProp])
          expect(changed.age, 'data.age unchanged').toBe(doug.age)
        },
        '.patch + id + query': async () => {
          await expect(
            service.patch(
              doug[idProp],
              {
                name: 'id patched doug',
              },
              {
                query: { name: 'Tester' },
              },
            ),
          ).rejects.toThrow(NotFound)

          const unchanged = await service.get(doug[idProp])
          expect(unchanged.name, 'name is still Doug').toBe(doug.name)
        },
        '.patch + id + query id': async () => {
          const alice = await service.create({
            name: 'Alice',
            age: 12,
          })

          await expect(
            service.patch(
              doug[idProp],
              {
                age: 33,
              },
              {
                query: { [idProp]: alice[idProp] },
              },
            ),
          ).rejects.toThrow(NotFound)

          const dougAfter = await service.get(doug[idProp])

          expect(dougAfter.age, 'age stayed the same').toBe(doug.age)
        },
        '.patch multiple': async () => {
          await withOptions(service, { multi: false }, () =>
            expect(
              service.patch(null, {}),
              'patch multi rejects if options.multi is false',
            ).rejects.toThrow(MethodNotAllowed),
          )

          await withOptions(service, { multi: ['create', 'remove'] }, () =>
            expect(
              service.patch(null, {}),
              "patch multi rejects if options.multi does not include 'patch'",
            ).rejects.toThrow(MethodNotAllowed),
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

            expect(data.length, 'returned two entries').toBe(2)
            expect(data[0].age, 'First entry age was updated').toBe(2)
            expect(data[1].age, 'Second entry age was updated').toBe(2)
          })
        },
        '.patch multiple no pagination': async () => {
          await clean()

          const count = 14
          const defaultPaginate = 10

          expect(
            count > defaultPaginate,
            'count is bigger than default pagination',
          ).toBeTruthy()

          await withOptions(
            service,
            {
              multi: true,
              paginate: { default: defaultPaginate, max: 100 },
            },
            async () => {
              const emptyItems = await service.find({ paginate: false })
              expect(emptyItems.length, 'no items before').toBe(0)

              const createdItems = await service.create(
                Array.from(Array(count)).map((_, i) => ({
                  name: `name-${i}`,
                  age: 3,
                  created: true,
                })),
              )
              expect(createdItems.length, `created ${count} items`).toBe(count)

              const foundItems = await service.find({ paginate: false })
              expect(foundItems.length, `created ${count} items`).toBe(count)

              const foundPaginatedItems = await service.find({})
              expect(
                foundPaginatedItems.data.length,
                'found paginated data',
              ).toBe(defaultPaginate)

              const allItems = await service.patch(
                null,
                { age: 4 },
                { query: { created: true } },
              )

              expect(allItems.length, `patched all ${count} items`).toBe(count)
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

            expect(data.length, 'returned two entries').toBe(2)
            expect(data[0].age, 'First entry age was updated').toBe(2)
            expect(data[1].age, 'Second entry age was updated').toBe(2)
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

            expect(data.length, 'returned two entries').toBe(2)
            expect(data[0].age, 'First entry age was updated').toBe(2)
            expect(data[1].age, 'Second entry age was updated').toBe(2)
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

            expect(data.length, 'returned two entries').toBe(2)
            const byId = new Map<string, any>(
              data.map((item: any) => [item[idProp].toString(), item]),
            )
            const daveAfter = byId.get(dave[idProp].toString())
            const davidAfter = byId.get(david[idProp].toString())
            expect(daveAfter, 'dave is included').toBeTruthy()
            expect(davidAfter, 'david is included').toBeTruthy()
            expect(daveAfter.name, 'dave name unchanged').toBe('Dave')
            expect(daveAfter.age, 'dave age unchanged').toBe(29)
            expect(davidAfter.name, 'david name unchanged').toBe('David')
            expect(davidAfter.age, 'david age unchanged').toBe(3)
          })
        },
        '.patch multi + empty result': async () => {
          await withOptions(service, { multi: true }, async () => {
            const data = await service.patch(
              null,
              { age: 99 },
              { query: { name: 'NoSuchName' } },
            )

            expect(Array.isArray(data), 'data is an array').toBeTruthy()
            expect(data.length, 'returned no entries').toBe(0)

            const dougAfter = await service.get(doug[idProp])
            expect(
              dougAfter.age,
              'doug age untouched by empty-result patch',
            ).toBe(doug.age)
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

            expect(data.length, 'returned two entries').toBe(2)
            for (const item of data) {
              expect(idProp in item, 'id is present').toBeTruthy()
              expect('name' in item, 'name is present').toBeTruthy()
              expect('age' in item, 'age is not present').toBeFalsy()
              expect('created' in item, 'created is not present').toBeFalsy()
            }

            const daveAfter = await service.get(dave[idProp])
            const davidAfter = await service.get(david[idProp])
            expect(daveAfter.age, 'dave age was patched').toBe(2)
            expect(davidAfter.age, 'david age was patched').toBe(2)
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

        //   expect(patched.length, 'patched three entries').toBe(3)
        //   expect(patched[0].name, 'first entry is C').toBe('C')
        //   expect(patched[1].name, 'second entry is B').toBe('B')
        //   expect(patched[2].name, 'third entry is A').toBe('A')

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

        //   expect(patched.length, 'patched two entries').toBe(2)
        //   const names = patched.map((p: any) => p.name)
        //   ;['B', 'C'].forEach((name) => {
        //     expect(names.includes(name), `patched entry is ${name}`).toBeTruthy()
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

        //   expect(patched.length, 'patched two entries').toBe(2)
        //   const names = patched.map((p: any) => p.name)
        //   ;['A', 'B', 'C'].forEach((name) => {
        //     if (names.includes(name)) {
        //       expect(true, `patched entry is ${name}`).toBeTruthy()
        //     }
        //   })
        // },
        '.patch + NotFound (string)': async () => {
          await expect(
            service.patch('568225fbfe21222432e836ff', {
              name: 'PatchDoug',
            }),
          ).rejects.toThrow(NotFound)
        },
        '.patch + NotFound (integer)': async () => {
          await expect(
            service.patch(123141231231, {
              name: 'PatchDoug',
            }),
          ).rejects.toThrow(NotFound)
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

          expect(originalData, 'original data was not modified').toStrictEqual(
            originalCopy,
          )
          expect(data instanceof Object, 'data is an object').toBeTruthy()
          expect(data.name, 'data.name matches').toBe('Bill')
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

          expect(data.name, 'data.name matches').toBe('Billy')
        },
        '.create + $select': async () => {
          const originalData = {
            name: 'William',
            age: 23,
          }

          const data = await service.create(originalData, {
            query: { $select: ['name'] },
          })

          expect(idProp in data, 'data has id').toBeTruthy()
          expect(data.name, 'data.name matches').toBe('William')
          expect('age' in data, 'data.age is not present').toBeFalsy()

          const created = await service.get(data[idProp])

          expect(created.age, 'data.age created').toBe(23)

          await service.remove(data[idProp])
        },
        '.create multi': async () => {
          await withOptions(service, { multi: false }, () =>
            expect(
              service.create([]),
              'create multi rejects if options.multi is false',
            ).rejects.toThrow(MethodNotAllowed),
          )

          await withOptions(service, { multi: ['patch', 'remove'] }, () =>
            expect(
              service.create([]),
              "create multi rejects if options.multi does not include 'create'",
            ).rejects.toThrow(MethodNotAllowed),
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

              expect(Array.isArray(data), 'data is an array').toBeTruthy()
              expect(
                typeof data[0][idProp] !== 'undefined',
                'id is set',
              ).toBeTruthy()
              expect(data[0].name, 'first name matches').toBe('Gerald')
              expect(
                typeof data[1][idProp] !== 'undefined',
                'id is set',
              ).toBeTruthy()
              expect(data[1].name, 'second name macthes').toBe('Herald')
            },
          )
        },
        '.create multi + empty array': async () => {
          await withOptions(service, { multi: ['create'] }, async () => {
            const before = await service.find({ paginate: false })

            const data = await service.create([])

            expect(Array.isArray(data), 'data is an array').toBeTruthy()
            expect(data.length, 'returned no entries').toBe(0)

            const after = await service.find({ paginate: false })
            expect(after.length, 'no records were created').toBe(before.length)
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
