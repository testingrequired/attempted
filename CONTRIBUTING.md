# Contributing

## Run Locally

1. Install dependencies ([node](https://nodejs.org/), [nvm](https://github.com/nvm-sh/nvm), [git](https://git-scm.com/))
1. Clone repo locally
1. Run `npm ci`
1. Run `npm run verify`

Providing all of that works you should be ready to start development!

## Build

Transpile the code and build the documentation.

> npm run build

## Run Tests

Run all (non-type) tests.

> npm run tests

Run all (non-type) tests with code coverage enabled.

> npm run tests:coverage

## Run Type Tests

Run all [type tests](https://vitest.dev/guide/testing-types.html).

> npm run test:types

## Mutants

Run all [mutation tests](https://stryker-mutator.io/).

> npm run test:mutants
