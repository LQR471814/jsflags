import type { Validator } from "./validate";

export function dequote(text: string): string {
  if (text === "" || text === '"') {
    return "";
  }
  const start = text[0];
  const end = text[text.length - 1];
  if (start === '"' && end === '"') {
    /**
     * JSON.parse is used to de-escape the text.
     * `"\"what \\n in the world?\"" -> "what \n in the world?"`
     */
    return JSON.parse(text);
  }
  if (start === '"' || end === '"') {
    throw new Error(`Encountered half-quoted string "${text}".`);
  }
  return text;
}

export type Ref<T> = { value: T };

export type Flag = {
  name: string;
  help: string;
  validator: Validator<unknown>;
  ref: Ref<unknown>;
};

const enum ArgParseState {
  INITIAL = 0,
  FLAG_INITIAL = 1,
  FLAG = 2,
  VALUE = 3,
}

const flagNameCharset = /[\w-]/;
const invFlagNameCharset = /[^\w-]/;

type FlagValue = {
  flag: Flag;
  values: string[];
};

export class FlagSet<P = void> {
  private flags: Flag[];
  positionals?: Validator<P>;

  constructor(positionals?: Validator<P>, ...flags: Flag[]) {
    this.positionals = positionals;
    this.flags = flags ?? [];
  }

  flag = <T>(validator: Validator<T>, name: string, help: string): Ref<T> => {
    const ref = { value: null } as Ref<T>;

    for (const flag of this.flags) {
      if (flag.name === name) {
        throw new Error(`A flag with name "${name}" already exists.`);
      }
    }

    const char = name.match(invFlagNameCharset);
    if (char !== null) {
      throw new Error(
        `Invalid character in flag name: "${char[0]}" ("${name}").`,
      );
    }

    this.flags.push({ name, validator, help, ref });

    return ref;
  };

  /**
   * Parses and validates the given list of command line arguments
   * with their corresponding flags. Returns the remaining arguments.
   *
   * - Flag names must only contain letters, numbers, _ and -.
   * - Quoted flag values must always use double quotes.
   *
   * The following formats are accepted for arguments:
   *
   * | Args | Result |
   * | --- | --- |
   * | `-flag` | `[""]` |
   * | `-flag value` | `["value"]` |
   * | `-flag=value` | `["value"]` |
   * | `-flag=v1 -flag v2 -flag` | `["v1", "v2", ""]` |
   * | `--flag` | `[""]` |
   * | `--flag value` | `["value"]` |
   * | `--flag=value` | `["value"]` |
   * | `--flag=v1 --flag v2 --flag` | `["v1", "v2", ""]` |
   */
  parse = (args: string[]): P => {
    const remainder: string[] = [];

    const flagValues: FlagValue[] = new Array(this.flags.length);
    for (let i = 0; i < this.flags.length; i++) {
      flagValues[i] = {
        flag: this.flags[i],
        values: [],
      };
    }

    let acceptingValue: FlagValue | undefined;

    arg: for (const arg of args) {
      if (arg === "") {
        continue;
      }

      let state = ArgParseState.INITIAL;
      let flagName = "";
      let value = "";
      let idx = 0;
      while (idx < arg.length) {
        const char = arg[idx];
        switch (state) {
          case ArgParseState.INITIAL: {
            if (char === "-") {
              state = ArgParseState.FLAG_INITIAL;
              if (acceptingValue) {
                acceptingValue.values.push("");
                acceptingValue = undefined;
              }
              break;
            }
            if (acceptingValue) {
              acceptingValue.values.push(dequote(arg));
              acceptingValue = undefined;
              continue arg;
            }
            remainder.push(arg);
            continue arg;
          }
          case ArgParseState.FLAG_INITIAL:
            state = ArgParseState.FLAG;
            if (char === "-") {
              break;
            }
            flagName += char;
            break;
          case ArgParseState.FLAG:
            if (char === "=" || char === " ") {
              state = ArgParseState.VALUE;
              break;
            }
            if (!flagNameCharset.test(char)) {
              throw new Error(
                `Invalid character in flag name: "${char}" ("${arg}").`,
              );
            }
            flagName += char;
            break;
          case ArgParseState.VALUE:
            value += char;
            break;
        }
        idx++;
      }
      if (flagName === "") {
        continue;
      }
      value = dequote(value);

      let flag: FlagValue | undefined;
      for (const f of flagValues) {
        if (f.flag.name === flagName) {
          flag = f;
        }
      }
      if (!flag) {
        throw new Error(`Unknown flag "${arg}".`);
      }

      if (state === ArgParseState.FLAG) {
        acceptingValue = flag;
        continue;
      }
      flag.values.push(value);
    }

    if (acceptingValue) {
      acceptingValue.values.push("");
    }

    for (const { flag, values } of flagValues) {
      try {
        const value = flag.validator(values);
        flag.ref.value = value;
      } catch (e) {
        const err = e as Error;
        throw new Error(
          `Failed to parse flag "--${flag.name}":\n\t${err.message}`,
        );
      }
    }

    if (this.positionals) {
      try {
        return this.positionals(remainder);
      } catch (e) {
        const err = e as Error;
        throw new Error(
          `Failed to parse positional arguments:\n\t${err.message}`,
        );
      }
    }

    if (remainder.length > 0) {
      throw new Error(
        `Got additional positional arguments [${remainder
          .map((r) => JSON.stringify(r))
          .join(", ")}]`,
      );
    }

    return undefined as P;
  };

  help = (): string => {
    let text = "Usage:\n";
    if (this.positionals) {
      text += `\tPositionals:\t${this.positionals.name}\n\n`;
    }
    for (let i = 0; i < this.flags.length; i++) {
      const flag = this.flags[i];
      text += `\t-${flag.name}\t${flag.validator.name}\t${flag.help}\n`;
      if (i < this.flags.length - 1) {
        text += "\n";
      }
    }
    return text;
  };
}
