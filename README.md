## jsflags

> An extremely simple yet flexible JavaScript library for parsing command-line flags, inspired by the golang "flags" library.

### Features

- No dependencies.
- Easy and flexible validation API.
- TypeScript and JavaScript support.
- CJS and ESM support.

### Basic Usage

```typescript
import FlagSet, { integer, boolean, defaultValue } from "jsflags"

const flags = new FlagSet()

const portRef = flags.flag(defaultValue(integer, 3000), "port", "Specify what port to host on.")
const verboseRef = flags.flag(boolean, "verbose", "Enable verbose logging.")
flags.parse(process.argv.slice(2))

console.log(portRef.value, verboseRef.value)
```

### Full Usage

```typescript
import FlagSet, { integer, string, boolean, defaultValue, single } from "jsflags"

const { flag, parse } = new FlagSet((values) => {
  return single(values)
})

const portRef = flag(integer, "port", "Specify the port to host on.")
const nameRef = flag(string, "name", "Specify the name of the application.")
const verboseRef = flag(boolean, "verbose", "Enable verbose logging. (default: false)")
const multipleRef = flag(multiple)

const [positional] = parse(process.argv.slice(2))

console.log(portRef.value, nameRef.value, verboseRef.value, positional)
// $ application --port 200 --name "some fancy name" positional
// 200 "some fancy name" false "positional"
// 
// $ application --port 4200 --name "some fancy name" --verbose arg
// 4200 "some fancy name" true "arg"

console.log(help())
// Usage:
//   	Positionals:	single
//
//   	-port	integer	Specify the port to host on.
//
//   	-name	string	Specify the name of the application.
//
//   	-verbose	boolean (default: false)	Enable verbose logging. (default: false)
```

- Each flag returns a "reference", an object `{ value: ... }` whose property `value` is set to the value of the flag.
- A reference's "value" is set to `null` before `parseFlags(...)` is called.
- Flag names must only contain letters, numbers, _ and -. (Regex: `[\w-]`)
- Quoted flag values must always use double quotes.

The following formats are accepted for arguments:

| Args | Result |
| --- | --- |
| `-flag` | `[""]` |
| `-flag value` | `["value"]` |
| `-flag=value` | `["value"]` |
| `-flag=v1 -flag v2 -flag` | `["v1", "v2", ""]` |
| `--flag` | `[""]` |
| `--flag value` | `["value"]` |
| `--flag=value` | `["value"]` |
| `--flag=v1 --flag v2 --flag` | `["v1", "v2", ""]` |

### Custom validation and array values

All flags possess a "validator" to verify and transform the raw string values of the flag into the final value in the reference.

```typescript
// T is the type in the reference.
export type Validator<T> = (values: string[]) => T;
```

A validator that does nothing (like `flag((values) => values, ...)`) allows for multiple (or zero) values for a given flag. This is often undesired, so the `single` validator is used by default on most of the built-in validators.

The `single` validator throws an error if there is not exactly one value passed in. (Do note that the `string` validator is just an alias for `single` as the two do the exact same thing.)

This means you can pass in your own validators to validate a custom type.

```typescript
const jsonRef = flag((values) => JSON.parse(single(values)), "json", "")
parseFlags(process.argv.slice(2)) // $ application --json {"json": [1, "oh no", 3]}
console.log(jsonRef.value) // {json: [1, "oh no", 3]}
```

If you want a list of typed values. `multiple(validator)` returns a validator that maps a given validator over each element in the `values` passed in, it then returns an array of the values returned.

```typescript
const portRef = flag(multiple(integer), "port", "")
parseFlags(process.argv.slice(2)) // $ application --port 323 --port=424
console.log(portRef.value) // [323, 424]
```
