# Feathers Adapter Tests for vitest

> Feathers shared database adapter test suite

## About

This is a repository that contains the test suite for the common database adapter syntax. See the [API documentation](https://docs.feathersjs.com/api/databases/common.html) for more information.

## Installation

```
npm install --save-dev feathers-adapter-vitest
```

## Usage

```ts
// index.test.ts

import { defineTestSuite } from "feathers-adapter-vitest";

const testSuite = defineTestSuite([
  ".events",
  // ... and so on
]);
```

## License

Licensed under the [MIT license](./LICENSE).
