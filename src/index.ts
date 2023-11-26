import { FlagSet, Ref } from "./flags";

const flags = new FlagSet();
const flag = flags.flag;
const parseFlags = flags.parse;

export type { Ref };
export * from "./validate";
export { flag, parseFlags };
