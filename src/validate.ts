export type Validator<T> = (values: string[]) => T;

export function single(values: string[]): string {
  if (values.length !== 1) {
    throw new Error("Expected a single value for the given argument.");
  }
  return values[0];
}

export function multiple<T>(map: Validator<T>): Validator<T[]> {
  const container = new Array<string>(1);
  const result: Validator<T[]> = (values) => {
    const results = new Array<T>(values.length);
    for (let i = 0; i < values.length; i++) {
      container[0] = values[i];
      results[i] = map(container);
    }
    return results;
  };
  Object.defineProperty(result, "name", {
    writable: false,
    value: `${map.name}[]`,
  });
  return result;
}

export function enumerable<T extends readonly string[]>(
  possible: T,
): Validator<T[number]> {
  if (possible.length === 0) {
    throw new Error("Enum must have at least 1 possible value.");
  }
  const result: Validator<T[number]> = (values) => {
    const value = single(values);
    if (possible.includes(value)) {
      return value;
    }
    throw new Error(
      `Value "${value}" is not a part of enum (${possible
        .map((v) => JSON.stringify(v))
        .join(" | ")})`,
    );
  };
  Object.defineProperty(result, "name", {
    writable: false,
    value: `(${possible.map((v) => JSON.stringify(v)).join(" | ")})`,
  });
  return result;
}

export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
  const result: Validator<T | undefined> = (values) => {
    if (values.length === 0) {
      return;
    }
    return validator(values);
  };
  Object.defineProperty(result, "name", {
    writable: false,
    value: `${validator.name} (optional)`,
  });
  return result;
}

export function defaultValue<T>(
  validator: Validator<T>,
  defaultValue: T,
): Validator<T> {
  const result: Validator<T> = (values) => {
    if (values.length === 0) {
      return defaultValue;
    }
    return validator(values);
  };
  Object.defineProperty(result, "name", {
    writable: false,
    value: `${validator.name} (default: ${defaultValue})`,
  });
  return result;
}

/**
 * Alias for `single()`.
 */
const string = single.bind(undefined);
Object.defineProperty(string, "name", {
  writable: false,
  value: "string",
});

export { string };

export function boolean(values: string[]): boolean {
  if (values.length > 1) {
    throw new Error("A boolean flag cannot be specified more than once.");
  }
  if (values.length === 0) {
    return false;
  }
  if (values[0] !== "") {
    throw new Error("A boolean flag should not be given a value.");
  }
  return true;
}

const nonNumber = /[^0-9]/;
const nonFloat = /[^0-9\.]/;

export function integer(values: string[]): number {
  const text = single(values);
  if (text.match(nonNumber)) {
    throw new Error(`${JSON.stringify(text)} is not an integer.`);
  }
  return parseInt(text);
}

export function float(values: string[]): number {
  const text = single(values);
  if (text.match(nonFloat)) {
    throw new Error(`${JSON.stringify(text)} is not a float.`);
  }
  return parseFloat(text);
}

export function url(values: string[]): URL {
  return new URL(single(values));
}
