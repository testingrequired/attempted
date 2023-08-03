# attempted

[![ci](https://github.com/testingrequired/attempted/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/attempted/actions/workflows/ci.yml)

Typed error handling for calling functions

## Docs

https://testingrequired.github.io/attempted

## Example

```typescript
import { Attempt } from "@testingrequired/attempted";

let attempt: Attempt<number> = Attempt.of(fnMightThrow, ...fnArgs);

// Returns true if function didn't throw or returned a failed attempt
attempt.isSuccessful();

// Returns true if function throws or returned a failed attempt
attempt.isFailure();

// You can conditionally run functions on successful or failed attempts
attempt.ifSuccessful((value) => {});
attempt.ifFailure((error) => {});
attempt.ifElse(
  (value) => {},
  (error) => {}
);

// Map over successful attempts
// This will not run on a failed attempt
attempt = attempt.map((n) => n * 2);

// Assert over successful attempts
// Failed assertions will return a failed attempt
// This will not run on a failed attempt
attempt = attempt.assert(
  (value) => value > 100,
  (value) => `Value ${value} was less than 100`
);

// Returns value on successful attempts
// Throws on failed attempts
attempt.get();

// Returns error on failed attempts
// Throws on successful attempts
attempt.getError();

// Get value on successful attempts or a default value.
attempt.orElse(defaultValue);

// Get value or throw provided error
attempt.orThrow(new Error("Something went wrong"));
attempt.orThrow("Something went wrong");

// You can pass function to access a failed attempt's error
attempt.orThrow((error) => new Error(`Something went wrong: ${e}`));
attempt.orThrow((error) => `Something went wrong`);
```

It also works with async functions!

```typescript
import { Attempt } from "@testingrequired/attempted";

// Await the attempt the same as you would await the function call
let attempt: Attempt<number> = await Attempt.of(asyncFnMightThrow, ...fnArgs);

// You can use async functions to map as well
attempt = await attempt.map(async (n) => n * 2);

// Returns the attempts value
attempt.get();
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
