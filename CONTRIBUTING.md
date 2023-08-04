# Contributing

## Run Locally

1. Install dependencies ([node](https://nodejs.org/), [nvm](https://github.com/nvm-sh/nvm), [git](https://git-scm.com/))
1. Clone repo locally
1. Run `npm ci`
1. Run `npm run verify`

Providing all of that works you should be ready to start development!

## Verify

Run tests, lint checking, format checking and the build.

> npm run verify

## Build

Transpile the code and build the documentation.

> npm run build

### Code

To just build the code

> npm run build:code

### Docs

To just build the docs

> npm run build:docs

## Run Tests

Run all (non-type) tests.

> npm run tests

Run all (non-type) tests with code coverage enabled.

> npm run tests:coverage

### Run Type Tests

Run all [type tests](https://vitest.dev/guide/testing-types.html).

> npm run test:types

### Run Mutation Tests

Run all [mutation tests](https://stryker-mutator.io/).

> npm run test:mutants

## Lint

Check for linting errors

> npm run lint

### Fix Linting Errors

Try to fix any linting errors if possible

> npm run lint:fix

## Formatting

Check for prettier errors

> npm run format:check

### Fix Formatting Errors

Try to fix any prettier errors

> npm run format:write
