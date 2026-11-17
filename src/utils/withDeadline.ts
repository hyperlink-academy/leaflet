export class DeadlineError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} did not finish within ${ms}ms`);
    this.name = "DeadlineError";
  }
}

export function withDeadline<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
  onLate?: (value: T) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let late = false;
    const timer = setTimeout(() => {
      late = true;
      reject(new DeadlineError(label, ms));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        if (late) onLate?.(value);
        else resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        if (!late) reject(error);
      },
    );
  });
}
