import { describe, expect, test, vi } from "vitest";
import { Attempt } from "./attempt";

describe("of", () => {
  test("should return successful attempt when sync functions returns value", () => {
    expect(Attempt.of(() => 123).get()).toBe(123);
  });

  test("should return failed attempt when sync functions throws", () => {
    const expectedError = new Error("expectedError");

    expect(
      Attempt.of(() => {
        throw expectedError;
        return 123;
      }).getError()
    ).toBe(expectedError);
  });

  test("should return successful attempt when async functions returns value", async () => {
    const attemptPromise: Promise<Attempt<number>> = Attempt.of(
      async () => 123
    );
    const attempt: Attempt<number> = await attemptPromise;

    expect(attempt.get()).toBe(123);
  });

  test("should return failed attempt when sync functions throws", async () => {
    const expectedError = new Error("expectedError");
    const attempt: Attempt<number> = await Attempt.of(async () => {
      throw expectedError;
    });

    expect(attempt.getError()).toBe(expectedError);
  });

  test("should accept remaining arguments as arguments to fn", () => {
    function fn(a: string, b: number): string {
      return `${a}${b}`;
    }

    expect(Attempt.of(fn, "Hello", 5).get()).toBe("Hello5");
  });

  test("should return successful attempt if returned by fn", () => {
    function testFn(input: number) {
      return Attempt.ofValue(input);
    }

    const attempt = Attempt.of(testFn, 123);

    expect(attempt.get()).toBe(123);
  });

  test("should return failed attempt if returned by fn", () => {
    function testFn(input: number) {
      return Attempt.ofError(input);
    }

    const attempt = Attempt.of(testFn, 123);

    expect(attempt.getError()).toBe(123);
  });

  test("should return attempt if returned by async fn", async () => {
    async function testFn(input: number): Promise<Attempt<number>> {
      return Attempt.ofValue(input);
    }

    const attempt = await Attempt.of(testFn, 123);

    expect(attempt.get()).toBe(123);
  });

  test("should return failed attempt if returned by async fn", async () => {
    async function testFn(input: number) {
      return Attempt.ofError(input);
    }

    const attempt = await Attempt.of(testFn, 123);

    expect(attempt.getError()).toBe(123);
  });
});

describe("get", () => {
  test("should return value on successful attempt", () => {
    expect(Attempt.of(() => 123).get()).toBe(123);
  });

  test("should throw on failed attempt", () => {
    const expectedError = "Expected Error";

    expect(() => {
      Attempt.ofError(expectedError).get();
    }).toThrow(new Error(`Getting value on failed attempt: ${expectedError}`));
  });

  test("should return value on async successful attempt", async () => {
    const asyncAttempt = await Attempt.of(async () => 123);

    expect(asyncAttempt.get()).toBe(123);
  });
});

describe("getError", () => {
  test("should throw if called on a successful attempt", () => {
    expect(() => Attempt.of(() => 123).getError()).toThrow(
      `Getting error on success attempt: 123`
    );
  });
});

describe("orElse", () => {
  const expectedDefaultValue = 456;

  test("should return value on successful attempt", () => {
    expect(Attempt.ofValue(123).orElse(expectedDefaultValue)).toBe(123);
  });

  test("should return default value on failed attempt", () => {
    const expectedError = "Expected Error";

    expect(
      Attempt.ofError<unknown>(expectedError).orElse(expectedDefaultValue)
    ).toBe(expectedDefaultValue);
  });
});

describe("orThrow", () => {
  test("should return value on successful attempt", () => {
    const expectedThrownError = new Error("expectedThrownError");
    expect(Attempt.ofValue(123).orThrow(expectedThrownError)).toBe(123);
  });

  test("should throw error on failed attempt", () => {
    const expectedThrownError = new Error("expectedThrownError");
    const expectedErrorValue = "expectedErrorValue";

    expect(() =>
      Attempt.ofError(expectedErrorValue).orThrow(expectedThrownError)
    ).toThrow(expectedThrownError);
  });

  test("should throw error from fn on failed attempt", () => {
    const expectedErrorValue = "expectedErrorValue";

    expect(() =>
      Attempt.ofError(expectedErrorValue).orThrow(
        (error) => new Error(`expectedThrownError: ${error}`)
      )
    ).toThrow(`expectedThrownError: ${expectedErrorValue}`);
  });

  test("should throw error with string from fn on failed attempt", () => {
    const expectedErrorValue = "expectedErrorValue";

    expect(() =>
      Attempt.ofError(expectedErrorValue).orThrow(
        (error) => `expectedThrownError: ${error}`
      )
    ).toThrow(`expectedThrownError: ${expectedErrorValue}`);
  });

  test("should throw error using string message on failed attempt", () => {
    const expectedErrorValue = "expectedErrorValue";
    const expectedThrownError = "expectedThrownError";

    expect(() =>
      Attempt.ofError(expectedErrorValue).orThrow(expectedThrownError)
    ).toThrow(expectedThrownError);
  });
});

describe("map", () => {
  test("should map successful using mapping function", () => {
    expect(
      Attempt.ofValue(123)
        .map((v) => v * 2)
        .get()
    ).toBe(246);
  });

  test("should map successful using async mapping function", async () => {
    expect((await Attempt.ofValue(123).map(async (v) => v * 2)).get()).toBe(
      246
    );
  });

  test("should return failed attempt if mapping function throws", () => {
    const expectedError = new Error("expectedError");

    expect(
      Attempt.ofValue(123)
        .map((v) => {
          throw expectedError;
          return v;
        })
        .getError()
    ).toBe(expectedError);
  });

  test("should return last failed attempt and not call mapping function", () => {
    const expectedError = new Error("expectedError");
    const mappingFnSpy = vi.fn<string[], number>();

    const attempt: Attempt<number> = Attempt.ofValue(123)
      .map((v) => {
        throw expectedError;
        return "";
      })
      .map(mappingFnSpy);

    expect(attempt.getError()).toBe(expectedError);

    expect(mappingFnSpy).not.toBeCalled();
  });
});

describe("isSuccess", () => {
  test("should return true for successful attempt", () => {
    expect(Attempt.ofValue(123).isSuccess()).toBeTruthy();
  });

  test("should return false for failed attempt", () => {
    expect(Attempt.ofError(new Error()).isSuccess()).toBeFalsy();
  });
});

describe("isFailure", () => {
  test("should return false for failed attempt", () => {
    expect(Attempt.ofError(new Error()).isFailure()).toBeTruthy();
  });

  test("should return true for successful attempt", () => {
    expect(Attempt.ofValue(123).isFailure()).toBeFalsy();
  });
});

describe("ifSuccess", () => {
  test("should call fn on successful attempt", () => {
    const fn = vi.fn();

    Attempt.ofValue(123).ifSuccess(fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(123);
  });

  test("should not call fn on failed attempt", () => {
    const fn = vi.fn();

    Attempt.ofError(new Error("expectedError")).ifSuccess(fn);

    expect(fn).not.toBeCalled();
  });
});

describe("ifFailure", () => {
  test("should call fn on failed attempt", () => {
    const fn = vi.fn();
    const expectedError = new Error("expectedError");

    Attempt.ofError(expectedError).ifFailure(fn);

    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(expectedError);
  });

  test("should not call fn on successful attempt", () => {
    const fn = vi.fn();

    Attempt.ofValue(123).ifFailure(fn);

    expect(fn).not.toBeCalled();
  });
});

describe("ifElse", () => {
  test("should only call success fn on successful attempt", () => {
    const successFn = vi.fn();
    const failureFn = vi.fn();

    Attempt.ofValue(123).ifElse(successFn, failureFn);

    expect(successFn).toHaveBeenCalledOnce();
    expect(successFn).toHaveBeenCalledWith(123);

    expect(failureFn).not.toBeCalled();
  });

  test("should only call failure fn on failed attempt", () => {
    const successFn = vi.fn();
    const failureFn = vi.fn();

    const expectedError = new Error("expectedError");

    Attempt.ofError(expectedError).ifElse(successFn, failureFn);

    expect(failureFn).toHaveBeenCalledOnce();
    expect(failureFn).toHaveBeenCalledWith(expectedError);

    expect(successFn).not.toBeCalled();
  });
});

describe("assert", () => {
  test("should return failed attempt if assertion failed on successful attempt", () => {
    expect(
      Attempt.ofValue(123)
        .assert(
          (v) => v > 1000,
          (v) => new Error(`Value (${v}) is less than 1000`)
        )
        .getError()
    ).toStrictEqual(new Error("Value (123) is less than 1000"));
  });

  test("should return failed attempt if assertion failed on successful attempt (string error)", () => {
    expect(
      Attempt.ofValue(123)
        .assert(
          (v) => v > 1000,
          (v) => `Value (${v}) is less than 1000`
        )
        .getError()
    ).toStrictEqual(new Error("Value (123) is less than 1000"));
  });

  test("should return successful attempt if assertion passed on successful attempt", () => {
    expect(
      Attempt.ofValue(123)
        .assert(
          (v) => v < 1000,
          (v) => `Value (${v}) is less than 1000`
        )
        .get()
    ).toBe(123);
  });

  test("should return failed attempt if assertion called on failed attempt", () => {
    const expectedError = new Error("expectedError");
    const fn = vi.fn();

    expect(
      Attempt.ofError(expectedError)
        .assert(fn, (v) => new Error())
        .getError()
    ).toStrictEqual(expectedError);
  });

  test("should not run assertion fn if assertion called on failed attempt", () => {
    const expectedError = new Error("expectedError");
    const fn = vi.fn();

    Attempt.ofError(expectedError).assert(fn, (v) => new Error());

    expect(fn).not.toBeCalled();
  });

  test("should return successful attempt if assertion passed on successful attempt", () => {
    expect(
      Attempt.ofValue(123)
        .assert(
          (v) => v < 1000,
          (v) => new Error(`Value (${v}) is less than 1000`)
        )
        .get()
    ).toBe(123);
  });
});
