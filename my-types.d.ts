type SafeArray<T> = Omit<Array<T>, number> & {
  readonly [index: number]: T | undefined;
};

declare module "redlock" {
  export * from "redlock/dist/index";
  export { default } from "redlock/dist/index";
}
