import { defineTestSuite } from '../src/index.js'
import { feathers } from '@feathersjs/feathers'

import { MemoryService } from '@feathersjs/memory'
import { describe } from 'vitest'
import sift, { createEqualsOperation } from 'sift'
import type { Options } from 'sift'

// sift has no `$between`/`$notBetween`, so extend it with both. They take a
// `[min, max]` tuple and are inclusive on both bounds, like SQL `BETWEEN`.
const between =
  (negate: boolean) => (params: any, ownerQuery: any, options: Options) =>
    createEqualsOperation(
      (value: any) => {
        const [min, max] = params
        const inRange = value >= min && value <= max
        return negate ? !inRange : inRange
      },
      ownerQuery,
      options,
    )

const matcher = (query: any) =>
  sift(query, {
    operations: {
      $between: between(false),
      $notBetween: between(true),
    },
  })

const testSuite = defineTestSuite({
  skip: [],
  recommended: ['$not', '$regex', '$between', '$notBetween'],
})

describe('@feathersjs/memory', () => {
  type Person = {
    id: number
    name: string
    age: number
  }

  type Animal = {
    type: string
    age: number
  }

  const events = ['testing']
  const app = feathers<{
    people: MemoryService<Person>
    'people-paginate': MemoryService<Person>
    'people-customid': MemoryService<Person>
    animals: MemoryService<Animal>
    matcher: MemoryService
  }>()

  app.use(
    'people',
    new MemoryService<Person>({
      events,
      operators: ['$not', '$regex', '$options', '$between', '$notBetween'],
      filters: { $not: (value) => value },
      matcher,
    }),
  )

  app.use(
    'people-paginate',
    new MemoryService<Person>({
      events,
      multi: true,
      paginate: {
        default: 10,
        max: 100,
      },
    }),
  )

  app.use(
    'people-customid',
    new MemoryService<Person>({
      id: 'customid',
      events,
      operators: ['$not', '$regex', '$options', '$between', '$notBetween'],
      filters: { $not: (value) => value },
      matcher,
    }),
  )

  testSuite({ app, serviceName: 'people' })
  testSuite({ app, serviceName: 'people-customid', idProp: 'customid' })
})
