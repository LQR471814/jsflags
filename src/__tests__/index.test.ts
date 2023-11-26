import { FlagSet, dequote } from "..";
import {
  url,
  boolean,
  defaultValue,
  float,
  integer,
  multiple,
  optional,
  string,
} from "../validate";

test("dequote", () => {
  expect(dequote('"text content"')).toBe("text content");
  expect(dequote('"text\\\\\\n\\b content"')).toBe("text\\\n\b content");
  expect(dequote("text content")).toBe("text content");
  expect(() => dequote('"text content')).toThrow(/half-quoted string/);
});

describe("flags", () => {
  const flags = new FlagSet((values) => values);

  const portRef = flags.flag(
    integer,
    "port",
    "specify the port for the application",
  );
  const nameRef = flags.flag(
    string,
    "name",
    "specify the name for the application",
  );
  const verboseRef = flags.flag(
    defaultValue(boolean, false),
    "verbose",
    "enable verbose logging",
  );
  const thresholdRef = flags.flag(
    optional(float),
    "threshold",
    "set the threshold for something",
  );
  const pageRef = flags.flag(
    multiple(url),
    "pageUrl",
    "the page for something",
  );

  test("flag success", () => {
    expect(portRef).toEqual({ value: null });
    expect(nameRef).toEqual({ value: null });
    expect(verboseRef).toEqual({ value: null });
    expect(thresholdRef).toEqual({ value: null });
  });

  test("flag fail", () => {
    expect(() => flags.flag(string, "invalid|name", "")).toThrow(
      /Invalid character/,
    );
    expect(() => flags.flag(string, "invalid name", "")).toThrow(
      /Invalid character/,
    );
    expect(() => flags.flag(string, "name", "")).toThrow(/already exists/);
  });

  test("parse success", () => {
    flags.parse([
      "-port",
      "3123",
      '-name="this is a name"',
      "-verbose",
      "-threshold 23.2",
    ]);
    expect(portRef).toEqual({ value: 3123 });
    expect(nameRef).toEqual({ value: "this is a name" });
    expect(verboseRef).toEqual({ value: true });
    expect(thresholdRef).toEqual({ value: 23.2 });

    flags.parse([
      "--port",
      "3123",
      '--name="this is a name"',
      "--verbose",
      "--threshold 23.2",
    ]);
    expect(portRef).toEqual({ value: 3123 });
    expect(nameRef).toEqual({ value: "this is a name" });
    expect(verboseRef).toEqual({ value: true });
    expect(thresholdRef).toEqual({ value: 23.2 });

    flags.parse(["--port", "3123", '--name="this is a name"']);
    expect(portRef).toEqual({ value: 3123 });
    expect(nameRef).toEqual({ value: "this is a name" });
    expect(verboseRef).toEqual({ value: false });
    expect(thresholdRef).toEqual({ value: undefined });

    let positional = flags.parse([
      "--port",
      "3123",
      "--verbose",
      "-name",
      "a-random-name",
      "positional 1",
      "positional 2",
    ]);
    expect(portRef).toEqual({ value: 3123 });
    expect(verboseRef).toEqual({ value: true });
    expect(nameRef).toEqual({ value: "a-random-name" });
    expect(positional).toEqual(["positional 1", "positional 2"]);

    positional = flags.parse([
      "positional 1",
      "--port",
      "3123",
      "positional 2",
      "--verbose",
      "-name",
      '"--name"',
      '--pageUrl="https://google.com"',
      "--pageUrl https://wikipedia.org",
    ]);
    expect(portRef).toEqual({ value: 3123 });
    expect(verboseRef).toEqual({ value: true });
    expect(nameRef).toEqual({ value: "--name" });
    expect(positional).toEqual(["positional 1", "positional 2"]);
    expect(pageRef.value.map((v) => v.toString())).toEqual([
      "https://google.com/",
      "https://wikipedia.org/",
    ]);
  });

  test("parse fail", () => {
    expect(() =>
      flags.parse([
        "-port",
        "23.3",
        '-name="this is a name"',
        "-verbose",
        "-threshold 23",
      ]),
    ).toThrow(/is not an integer/i);

    expect(() =>
      flags.parse([
        "--port",
        "23",
        '--name="this is a name"',
        '-verbose="this should not have a type"',
        "-threshold 23",
      ]),
    ).toThrow(/should not be given a value/i);

    expect(() =>
      flags.parse([
        "-port",
        "23",
        '-name="this is a name"',
        "--verbose",
        "-verbose",
        "-threshold 23",
      ]),
    ).toThrow(/specified more than once/i);

    expect(() =>
      flags.parse(["-port", "30", "--port", "3200", '-name="this is a name"']),
    ).toThrow(/single value/);

    expect(() =>
      flags.parse([
        "-port",
        "3200",
        '-name="this is a name"',
        "--unknown-flag",
      ]),
    ).toThrow(/unknown flag/i);

    const defaultFlagSet = new FlagSet();
    defaultFlagSet.flag(integer, "port", "");
    defaultFlagSet.flag(string, "name", "");

    expect(() =>
      defaultFlagSet.parse([
        "positional argument",
        "-port",
        "3200",
        '-name "this is a name"',
      ]),
    ).toThrow(/additional positional/i);
  });
});
