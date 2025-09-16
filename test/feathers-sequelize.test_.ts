import pg from 'pg'

import { DataTypes, Sequelize } from 'sequelize'
import { feathers } from '@feathersjs/feathers'
import { SequelizeService } from 'feathers-sequelize'
import { defineTestSuite } from '../src/index.js'
import { beforeAll } from 'vitest'

const testSuite = defineTestSuite({
  blacklist: [
    '.get + NotFound (string)',
    '.patch + NotFound (string)',
    '.remove + NotFound (string)',
    '.update + NotFound (string)',
  ],
})

// The base tests require the use of Sequelize.BIGINT to avoid 'out of range errors'
// Unfortunately BIGINT's are serialized as Strings:
// https://github.com/sequelize/sequelize/issues/1774

pg.defaults.parseInt8 = true

const sequelize = new Sequelize(
  process.env.POSTGRES_DB ?? 'feathers-sequelize',
  process.env.POSTGRES_USER ?? 'postgres',
  process.env.POSTGRES_PASSWORD ?? '',
  {
    port: process.env.POSTGRES_PORT
      ? parseInt(process.env.POSTGRES_PORT)
      : 5432,
    host: 'localhost',
    dialect: 'postgres',
  },
)

const Model = sequelize.define(
  'people',
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
    },
    created: {
      type: DataTypes.BOOLEAN,
    },
    time: {
      type: DataTypes.BIGINT,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
    },
  },
  {
    freezeTableName: true,
  },
)

const CustomId = sequelize.define(
  'people-customid',
  {
    customid: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
    },
    created: {
      type: DataTypes.BOOLEAN,
    },
    time: {
      type: DataTypes.BIGINT,
    },
  },
  {
    freezeTableName: true,
  },
)

describe('Feathers Sequelize Service', () => {
  beforeAll(async () => {
    await Model.sync({ force: true })
    await CustomId.sync({ force: true })
  })

  describe('Common Tests', () => {
    const app = feathers<{
      people: SequelizeService
      'people-customid': SequelizeService
    }>()
      .use(
        'people',
        new SequelizeService({
          Model,
          events: ['testing'],
        }),
      )
      .use(
        'people-customid',
        new SequelizeService({
          Model: CustomId,
          events: ['testing'],
        }),
      )

    testSuite({ app, serviceName: 'people', idProp: 'id' })
    testSuite({ app, serviceName: 'people-customid', idProp: 'customid' })
  })
})
