import { defineTestSuite } from '../src/index.js'
import { feathers } from '@feathersjs/feathers'

import { MemoryService } from '@feathersjs/memory'
import { describe } from 'vitest'

const testSuite = defineTestSuite({
  skip: [],
  recommended: ['$not', '$regex'],
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
      operators: ['$not', '$regex', '$options'],
      filters: { $not: (value) => value },
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
      operators: ['$not', '$regex', '$options'],
      filters: { $not: (value) => value },
    }),
  )

  testSuite({ app, serviceName: 'people' })
  testSuite({ app, serviceName: 'people-customid', idProp: 'customid' })
})
