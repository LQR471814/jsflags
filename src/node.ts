import type { FlagSet } from "./flags";

export function parseNodejs<P = void>(flags: FlagSet<P>): P {
  try {
    return flags.parse(process.argv.slice(2));
  } catch (e) {
    console.log(flags.help());
    console.error((e as Error).message);
    process.exit(1);
  }
}
