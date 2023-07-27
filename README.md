# attempted

[![ci](https://github.com/testingrequired/attempted/actions/workflows/ci.yml/badge.svg)](https://github.com/testingrequired/attempted/actions/workflows/ci.yml)

Typed error handling for functions

## Docs

https://testingrequired.github.io/attempted

## Example

Here is an example of a calling a function that might throw an error, defaulting the value if it does and logging it.

### Using try/catch

```typescript
import { fnThatCouldThrow, ReturnFromFn } from "./fns";

const defaultData: ReturnFromFn = { id: "example-id" };
const input = 123;
let data: ReturnFromFn;

try {
  data = fnThatCouldThrow(input);
} catch (e) {
  console.log(
    `Calling 'fnThatCouldThrow' with input ${input} threw ${e} getting default value ${defaultData}`
  );
  data = defaultData;
}
```

### Using Attempt

```typescript
import { Attempt } from "attempted";
import { fnThatCouldThrow, ReturnFromFn } from "./fns";

const defaultData: ReturnFromFn = { id: "example-id" };
const input = 123;

const data: ReturnFromFn = Attempt.of(fnThatCouldThrow, input)
  .ifError((e) => {
    console.log(
      `Calling 'fnThatCouldThrow' with input ${input} threw ${e} getting default value ${defaultData}`
    );
  })
  .orElse(defaultData);
```
