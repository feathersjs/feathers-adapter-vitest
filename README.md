# Feathers Adapter Tests for vitest

> Feathers shared database adapter test suite

## About

This is a repository that contains the test suite for the common database adapter syntax. See the [API documentation](https://docs.feathersjs.com/api/databases/common.html) for more information.

## Installation

```
npm install --save-dev feathers-adapter-vitest
```

## Usage

`defineTestSuite` returns a test suite function that you run against one or more
services of your adapter:

```ts
// index.test.ts

import { defineTestSuite } from "feathers-adapter-vitest";

const testSuite = defineTestSuite({
  // skip individual tests your adapter does not support
  skip: [".events"],
  // ...or run only specific tests
  // only: [".find", ".get"],
});

testSuite({ app, serviceName: "people" });
testSuite({ app, serviceName: "people-customid", idProp: "customid" });
```

### Recommended operators

Besides the standard syntax, some operators are common but **not** part of the
absolute standard — only some adapters support them. Their tests are **opt-in**
per operator and skipped by default:

```ts
const testSuite = defineTestSuite({
  recommended: ["$not", "$regex"],
});
```

Only enable an operator if your adapter supports it. Note that some adapters (e.g.
those built on `@feathersjs/adapter-commons`) reject unknown query syntax unless it
is whitelisted. Property-level operators (`$regex`, `$options`) go in the `operators`
list, while `$not` is a **top-level** filter that negates a whole condition
(`{ $not: { age: 20 } }`), so it also needs a `filters` entry:

```ts
new MyService({
  operators: ["$regex", "$options", "$not"],
  filters: { $not: (value) => value },
});
```

## License

Licensed under the [MIT license](./LICENSE).
