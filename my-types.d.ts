type SafeArray<T> = Omit<Array<T>, number> & {
  readonly [index: number]: T | undefined;
};
