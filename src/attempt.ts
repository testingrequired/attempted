/**
 * Typed error handling for calling functions
 *
 * ```typescript
 * import { Attempt } from "@testingrequired/attempted";
 *
 * let attempt: Attempt<number> = Attempt.of(fnMightThrow, ...fnArgs);
 *
 * // Returns true if function didn't throw or returned a failed attempt
 * attempt.isSuccessful();
 *
 * // Returns true if function throws or returned a failed attempt
 * attempt.isFailure();
 *
 * // You can conditionally run functions on successful or failed attempts
 * attempt.ifSuccessful((value) => {});
 * attempt.ifFailure((error) => {});
 * attempt.ifElse(
 *   (value) => {},
 *   (error) => {}
 * );
 *
 * // Map over successful attempts
 * // This will not run on a failed attempt
 * attempt = attempt.map((n) => n * 2);
 *
 * // Assert over successful attempts
 * // Failed assertions will return a failed attempt
 * // This will not run on a failed attempt
 * attempt = attempt.assert(
 *   (value) => value > 100,
 *   (value) => `Value ${value} was less than 100`
 * );
 *
 * // Returns value on successful attempts
 * // Throws on failed attempts
 * attempt.get();
 *
 * // Returns error on failed attempts
 * // Throws on successful attempts
 * attempt.getError();
 *
 * // Get value on successful attempts or a default value.
 * attempt.orElse(defaultValue);
 *
 * // Get value or throw provided error
 * attempt.orThrow(new Error("Something went wrong"));
 * attempt.orThrow("Something went wrong");
 *
 * // You can pass function to access a failed attempt's error
 * attempt.orThrow((error) => new Error(`Something went wrong: ${e}`));
 * attempt.orThrow((error) => `Something went wrong`);
 * ```
 *
 * It also works with async functions!
 *
 * ```typescript
 * import { Attempt } from "@testingrequired/attempted";
 *
 * // Await the attempt the same as you would await the function call
 * let attempt: Attempt<number> = await Attempt.of(asyncFnMightThrow, ...fnArgs);
 *
 * // You can use async functions to map as well
 * attempt = await attempt.map(async (n) => n * 2);
 *
 * // Returns the attempts value
 * attempt.get();
 * ```
 *
 * You can also wrap a function to be called later
 *
 * ```typescript
 * const attemptFnMightThrow = Attempt.wrap(fnMightThrow);
 * const attempt: Attempt<number> = attemptFnMightThrow(...fnArgs);
 * ```
 *
 * @template T The successful value type
 */
export class Attempt<T> {
  /**
   * Value when the attempt was successful
   */
  readonly #value: T | undefined;
  /**
   * Error when the attempt failed
   */
  readonly #error: unknown | undefined;

  private constructor(value: T | undefined, error: unknown | undefined) {
    this.#value = value;
    this.#error = error;
  }

  /**
   * Create an attempt from a function.
   *
   * ```typescript
   * // Attempt<ReturnType<typeof fnThatMightThrow>>
   * const attempt = Attempt.of(fnThatMightThrow, fnArg1, fnArg2, ...);
   * ```
   *
   * Async works too!
   *
   * ```typescript
   * // Promise<Attempt<ReturnType<typeof fnThatMightThrow>>>
   * const attemptPromise = Attempt.of(asyncFnThatMightThrow, fnArg1, fnArg2, ...);
   * // Attempt<ReturnType<typeof fnThatMightThrow>>
   * const attempt = await attemptPromise;
   * ```
   *
   * This also works with functions that return an `Attempt`
   *
   * ```typescript
   * const value = 123;
   * const attemptA = Attempt.ofValue(value);
   * const attemptB = Attempt.of(() => attemptA); // Attempt<number>
   *
   * attemptB.get(); // 123
   * ```
   *
   * @template Fn Function to be called
   *
   * @param fn Function to run
   * @param fnArgs Arguments to pass when calling function
   * @returns Either a successful or failing attempt
   */
  static of<Fn extends (...args: any[]) => any>(
    fn: Fn,
    ...fnArgs: Parameters<Fn>
  ): AttemptFromFn<Fn> {
    try {
      const value = fn(...fnArgs);

      if (isPromise<Awaited<ReturnType<Fn>>>(value)) {
        // @ts-ignore
        return value
          .then((v) => {
            if ((v as any) instanceof Attempt) {
              return v;
            }

            return Attempt.ofValue<ReturnType<Fn>>(v);
          })
          .catch((e) => Attempt.ofError<ReturnType<Fn>>(e));
      }

      if (value instanceof Attempt) {
        // @ts-ignore
        return value as ReturnType<Fn>;
      }

      // @ts-ignore
      return Attempt.ofValue<ReturnType<Fn>>(value);
    } catch (e) {
      // @ts-ignore
      return Attempt.ofError<ReturnType<Fn>>(e);
    }
  }

  /**
   * Wrap the underlying function to be called as an attempt
   *
   * ```typescript
   * function sum(...args: number[]): number {
   *   return args.reduce((acc, curr) => acc + curr, 0);
   * }
   *
   * const attemptToSum = Attempt.wrap(sum);
   *
   * const sumValue = attemptToSum(1, 2, 3)
   *   .orThrow(e => `Unable to sum: {e}`); // 6
   * ```
   *
   * @param fn Function to wrap
   * @returns A function that calls the underlying function
   */
  static wrap<Fn extends (...args: any[]) => any>(
    fn: Fn
  ): (...args: Parameters<Fn>) => AttemptFromFn<Fn> {
    return (...fnArgs: Parameters<Fn>): AttemptFromFn<Fn> =>
      Attempt.of(fn, ...fnArgs);
  }

  /**
   * Create a successful attempt from a value
   *
   * ```typescript
   * // Attempt<number>
   * const attempt = Attempt.ofValue(123);
   * ```
   *
   * @template T Value for the successful attempt
   *
   * @param value Value of successful attempt
   * @returns Attempt with a success value
   */
  static ofValue<T>(value: T): T extends Attempt<any> ? T : Attempt<T> {
    if (value instanceof Attempt) {
      if (value.isFailure()) {
        throw new Error(
          `Can not pass a failed attempt as the value: ${value.getError()}`
        );
      }

      // @ts-ignore
      return value;
    }

    // @ts-ignore
    return new Attempt<T>(value, undefined);
  }

  /**
   * Create a failed attempt result from an error
   *
   * ```typescript
   * // Attempt<unknown>
   * const failedAttemptWithError = Attempt.ofError(new Error("Something went wrong"));
   *
   * // Attempt<unknown>
   * const failedAttemptWithString = Attempt.ofError("Something went wrong");
   * ```
   *
   * @template T Value type if attempt had succeeded
   *
   * @param error Error for the failed attempt
   * @returns Attempt with failure error
   */
  static ofError<T = unknown, E = unknown>(
    error: E
  ): E extends Attempt<infer U> ? Attempt<U> : Attempt<T> {
    if (error instanceof Attempt) {
      if (error.isSuccess()) {
        throw new Error(
          `Can not pass a successful attempt as the error: ${error.get()}`
        );
      }

      // @ts-ignore
      return error;
    }

    // @ts-ignore
    return new Attempt<T>(undefined, error);
  }

  /**
   * Get value from successful attempt. Throws if failed attempt.
   *
   * ```typescript
   * Attempt.ofValue(123).get() // 123
   * Attempt.ofError("...").get() // Throws
   * ```
   *
   * @returns Value from a success attempt
   */
  get(): T {
    if (typeof this.#value === "undefined") {
      throw new Error(`Getting value on failed attempt: ${this.#error}`);
    }

    return this.#value;
  }

  /**
   * Get error from failed attempt. Throws if successful attempt.
   *
   * ```typescript
   * Attempt.ofError("...").getError() // "..."
   * Attempt.ofError("...").getError() // Throws
   * ```
   *
   * @returns Error from a failed attempt
   */
  getError(): unknown {
    if (typeof this.#error === "undefined") {
      throw new Error(`Getting error on success attempt: ${this.#value}`);
    }

    return this.#error;
  }

  /**
   * Get value from successful attempt or a default value on a failed attempt
   *
   * ```typescript
   * Attempt.ofValue(123).orElse(456) // 123
   * Attempt<number>.ofError("...").orElse(456) // 456
   * ```
   *
   * @returns Successful attempt value or default value
   */
  orElse(defaultValue: T): T {
    if (typeof this.#value === "undefined") {
      return defaultValue;
    }

    return this.#value;
  }

  /**
   * Get value from successful attempt or a throw error
   *
   * ```typescript
   * Attempt.ofValue(123).orThrow(456) // 123
   * Attempt<number>.ofError("...").orThrow("Something went wrong") // Error("Something went wrong")
   * ```
   *
   * You can also get the error from a failed attempt
   *
   * ```typescript
   * Attempt<number>.ofError("...").orThrow((e) => "Something went wrong: ${e}") // Error("Something went wrong: ...")
   * ```
   *
   * @returns Successful attempt value
   */
  orThrow<ErrorToThrow extends Error = Error>(
    errorToThrow:
      | ErrorToThrow
      | string
      | ((error: unknown) => ErrorToThrow | string)
  ): T {
    if (typeof this.#value === "undefined") {
      if (typeof errorToThrow === "string") {
        throw new Error(errorToThrow);
      } else if (typeof errorToThrow === "function") {
        const e = errorToThrow(this.#error);

        if (typeof e === "string") {
          throw new Error(e);
        } else {
          throw e;
        }
      }

      throw errorToThrow;
    }

    return this.#value;
  }

  /**
   * Map a success attempt or return the current failed attempt
   *
   * ```typescript
   * Attempt.ofValue(123).map(value => value * 2).get() // 456
   *
   * Attempt.ofValue(123)
   *   .map(value => {
   *    throw new Error("Something went wrong");
   *    return value;
   *   })
   *   .map(value => value * 2)
   *   .getError() // Error("Something went wrong")
   * ```
   *
   * @template Fn Mapping function
   * @param fn Function to map over attempt
   * @returns Either mapped success attempt or the current failed attempt
   */
  map<Fn extends (value: T) => any>(fn: Fn): AttemptFromFn<Fn> {
    if (typeof this.#error !== "undefined") {
      // @ts-ignore
      return Attempt.ofError<N>(this.#error) as Attempt<N>;
    }

    const newLocal = Attempt.of(() => {
      const v = fn(this.#value as T);

      return v;
    });

    return newLocal;
  }

  /**
   * Get if attempt was successful
   *
   * ```typescript
   * Attempt.ofValue(123).isSuccess() // true
   * Attempt.ofError("...").isSuccess() // false
   * ```
   *
   * @returns Boolean if attempt was successful
   */
  isSuccess(): boolean {
    if (typeof this.#value === "undefined") {
      return false;
    }

    return true;
  }

  /**
   * Get if attempt failed
   *
   * ```typescript
   * Attempt.ofError("...").isFailure() // true
   * Attempt.ofValue(123).isFailure() // false
   * ```
   *
   * @returns Boolean if attempt failed
   */
  isFailure(): boolean {
    if (typeof this.#error === "undefined") {
      return false;
    }

    return true;
  }

  /**
   * Run function if attempt was successful
   *
   * ```typescript
   * Attempt.ofValue(123).ifSuccess(value => {}) // Runs
   * Attempt.ofError("...").ifSuccess(value => {}) // Doesn't run
   * ```
   *
   * @param fn Function to run
   */
  ifSuccess(fn: (value: T) => any): void {
    if (this.isSuccess()) {
      fn(this.#value as T);
    }
  }

  /**
   * Run success or failure function based on attempt
   *
   * ```typescript
   * Attempt.ofValue(123)
   *   .ifElse(
   *     value => console.log(`It worked! ${value}`),
   *     error => console.log(`It failed! ${error}`)
   *   )
   * ```
   *
   * @param successFn Function to run on successful attempt
   * @param failureFn Function to run on failed attempt
   */
  ifElse(
    successFn: (value: T) => any,
    failureFn: (error: unknown) => any
  ): void {
    this.ifSuccess(successFn);
    this.ifFailure(failureFn);
  }

  /**
   * Run function is attempt failed
   *
   * ```typescript
   * Attempt.ofError("...").ifFailure(error => {}) // Runs
   * Attempt.ofValue(123).ifFailure(error => {}) // Doesn't run
   * ```
   *
   * @param fn Fucntion to run
   */
  ifFailure(fn: (error: unknown) => any): void {
    if (this.isFailure()) {
      fn(this.#error);
    }
  }

  /**
   * Assert against a successful attempt's value
   *
   * ```typescript
   * Attempt.ofValue(123)
   *   .assert(value => value > 100, (value) => new Error("Number isn't greater than 100"))
   *   .get() // 123
   *
   * Attempt.ofValue(123)
   *   .assert(value => value < 100, (value) =>  new Error(`Number $(value) isn't less than 100`))
   *   .getError() // Error("Number 123 isn't less than 100")
   *
   * Attempt.ofError<number>("Something went wrong")
   *   .assert(value => value > 100, (value) => new Error("Number isn't greater than 100"))
   *   .getError() // Error("Something went wrong")
   * ```
   *
   * @param assertionFn Assertion function to run
   * @param errorFn Function that returns an error if the assertion fails
   * @returns Either success/failed attempt from the assertion or the failed attempt it was called on
   */
  assert(
    assertionFn: (value: T) => boolean,
    errorFn: (value: T) => unknown
  ): Attempt<T> {
    if (this.isFailure()) {
      return Attempt.ofError<T>(this.#error);
    }

    if (assertionFn(this.#value as T)) {
      return this;
    } else {
      const error = errorFn(this.#value as T);

      if (typeof error === "string") {
        return Attempt.ofError<T>(new Error(error));
      }

      return Attempt.ofError<T>(error);
    }
  }
}

/**
 * Utility type for conditional types
 *
 * @template T Target type
 * @template E Predicate type
 * @template A Conditional type if T extends E
 * @template A Conditional type if T does not extend E
 */
type IfExtends<T, E, A, B> = T extends E ? A : B;

/**
 * Utility conditional type for promises
 *
 * @template T Target type
 * @template A Conditional type if T extends Promise
 * @template A Conditional type if T does not extend Promise
 */
type IfExtendsPromise<T, A, B> = IfExtends<T, Promise<any>, A, B>;

/**
 * Utility conditional type for attempts
 *
 * @template T Target type and conditional type if T extends Attempt
 * @template A Conditional type if T does not extends Attempt
 */
type IfExtendsAttempt<T, A> = IfExtends<T, Attempt<any>, T, A>;

/**
 * Utility type to map function calls to Attempt results
 *
 * @template Fn Function to be called
 */
export type AttemptFromFn<Fn extends (...args: any[]) => any> =
  IfExtendsPromise<
    ReturnType<Fn>,
    IfExtendsAttempt<
      Awaited<ReturnType<Fn>>,
      Promise<Attempt<Awaited<ReturnType<Fn>>>>
    >,
    IfExtendsAttempt<ReturnType<Fn>, Attempt<ReturnType<Fn>>>
  >;

function isPromise<T>(value: unknown): value is Promise<T> {
  if (value instanceof Promise) {
    return true;
  }

  return false;
}
