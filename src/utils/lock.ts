// Taken from https://github.com/rocicorp/lock/blob/main/src/lock.ts
export class Lock {
  private _lockP: Promise<void> | null = null;

  async lock(): Promise<() => void> {
    const previous = this._lockP;
    const { promise, resolve } = resolver();
    this._lockP = promise;
    await previous;
    return resolve;
  }
  async withLock<R>(f: () => Promise<R>) {
    let release = await this.lock();
    try {
      return await f();
    } finally {
      release();
    }
  }
}

export function resolver() {
  let resolve!: (v: void) => void;
  let reject!: () => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
