/**
 * The result of an attempt to run a function
 *
 * ```typescript
 * function willThrow(shouldThrow: boolean) {
 *   if (shouldThrow) {
 *     throw new Error("Whoops");
 *   }
 *
 *   return 123;
 * }
 *
 * // <Attempt<number>>
 * const successfulAttempt = Attempt
 *   .of(willThrow, false)
 *   .map(value => value * 2);
 *
 * successfulAttempt.get(); // 246
 * successfulAttempt.getError(); // Throws since a successful attempt has no error
 *
 * // <Attempt<number>>
 * const failedAttempt = Attempt
 *   .of(willThrow, true)
 *   .map(value => value * 2);
 *
 * failedAttempt.getError(); // Error("Whoops")
 * failedAttempt.get(); // Throws since a failed attempt has no value
 * ```
 *
 * @template T The successful value type
 * @template E The failure error type
 */
export class Attempt<T, E = unknown> {
  /**
   * Value when the attempt was successful
   */
  #value: T | undefined;
  /**
   * Error when the attempt failed
   */
  #error: E | undefined;

  private constructor(value: T | undefined, error: E | undefined) {
    this.#value = value;
    this.#error = error;
  }

  /**
   * Create an attempt from a function
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
   * @template F Function to be called
   * @template E Expected error type function throws
   *
   * @param fn Function to run
   * @param fnArgs Arguments to pass to function when called
   * @returns Result of the attempted function call
   */
  static of<F extends (...args: any[]) => any, E = unknown>(
    fn: F,
    ...fnArgs: Parameters<F>
  ): ReturnType<F> extends Promise<any>
    ? Awaited<ReturnType<F>> extends Attempt<any>
      ? Awaited<ReturnType<F>>
      : Promise<Attempt<Awaited<ReturnType<F>>, E>>
    : ReturnType<F> extends Attempt<any>
    ? ReturnType<F>
    : Attempt<ReturnType<F>, E> {
    try {
      const value = fn(...fnArgs);

      if (isPromise<Awaited<ReturnType<F>>>(value)) {
        // @ts-ignore
        return value
          .then((v) => {
            if ((v as any) instanceof Attempt) {
              return v;
            }

            return Attempt.ofValue<ReturnType<F>, E>(v);
          })
          .catch((e) => Attempt.ofError<ReturnType<F>, E>(e));
      }

      if (value instanceof Attempt) {
        // @ts-ignore
        return value as ReturnType<F>;
      }

      // @ts-ignore
      return Attempt.ofValue<ReturnType<F>, E>(value);
    } catch (e) {
      // @ts-ignore
      return Attempt.ofError<ReturnType<F>, E>(e);
    }
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
   * @template E Optional error type if attempt had failed
   *
   * @param value Value of successful attempt
   * @returns Attempt with a success value
   */
  static ofValue<T, E = unknown>(value: T): Attempt<T, E> {
    return new Attempt<T, E>(value, undefined);
  }

  /**
   * Create a failed attempt result from an error
   *
   * ```typescript
   * // Attempt<unknown, Error>
   * const failedAttemptWithError = Attempt.ofError(new Error("Something went wrong"));
   *
   * // Attempt<unknown, string>
   * const failedAttemptWithString = Attempt.ofError("Something went wrong");
   * ```
   *
   * @template T Value type if attempt had succeeded
   * @template E Error type for the failed attempt
   *
   * @param error Error for the failed attempt
   * @returns Attempt with failure error
   */
  static ofError<T = unknown, E = unknown>(error: E): Attempt<T, E> {
    return new Attempt<T, E>(undefined, error);
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
  getError(): E {
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
   * @returns Successful attempt value
   */
  orThrow<ErrorToThrow extends Error = Error>(error: ErrorToThrow | string): T {
    if (typeof this.#value === "undefined") {
      if (typeof error === "string") {
        throw new Error(error);
      }

      throw error;
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
   * @template F Mapping function
   * @param fn Function to map over attempt
   * @returns Either mapped success attempt or the current failed attempt
   */
  map<F extends (value: T) => any>(
    fn: F
  ): ReturnType<F> extends Promise<any>
    ? Promise<Attempt<Awaited<ReturnType<F>>, E>>
    : ReturnType<F> extends Attempt<any>
    ? ReturnType<F>
    : Attempt<ReturnType<F>, E> {
    if (typeof this.#error !== "undefined") {
      // @ts-ignore
      return Attempt.ofError<N, E>(this.#error) as Attempt<N, E>;
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
   * Run function is attempt failed
   *
   * ```typescript
   * Attempt.ofError("...").ifFailure(error => {}) // Runs
   * Attempt.ofValue(123).ifFailure(error => {}) // Doesn't run
   * ```
   *
   * @param fn Fucntion to run
   */
  ifFailure(fn: (error: E) => any): void {
    if (this.isFailure()) {
      fn(this.#error as E);
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
   * @param errorFn Error provider function
   * @returns Either success/failed attempt from the assertion or the failed attempt it was called on
   */
  assert(
    assertionFn: (value: T) => boolean,
    errorFn: (value: T) => E | string
  ): Attempt<T, E> {
    if (this.isFailure()) {
      return Attempt.ofError<T, E>(this.#error as E);
    }

    if (assertionFn(this.#value as T)) {
      return this;
    } else {
      const error = errorFn(this.#value as T);

      if (typeof error === "string") {
        return Attempt.ofError<T, E>(new Error(error) as E);
      }

      return Attempt.ofError<T, E>(error);
    }
  }
}

function isPromise<T>(value: unknown): value is Promise<T> {
  if (value instanceof Promise) {
    return true;
  }

  return false;
}
