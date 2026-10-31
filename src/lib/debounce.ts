export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  waitMs: number,
): ((...args: TArgs) => void) & { flush: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: TArgs | null = null;

  const run = (...args: TArgs) => {
    latest = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      const pending = latest;
      latest = null;
      if (pending) fn(...pending);
    }, waitMs);
  };

  run.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (latest) {
      const pending = latest;
      latest = null;
      fn(...pending);
    }
  };

  run.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    latest = null;
  };

  return run;
}
