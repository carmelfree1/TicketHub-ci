import { useCallback, useEffect, useState } from 'react';

export type AsyncValue<T> =
  | { status: 'loading' }
  | { status: 'ready'; value: T }
  | { status: 'missing' }
  | { status: 'error'; error: unknown };

/**
 * Runs `load` whenever `key` changes and ignores answers that arrive after a newer request or an unmount.
 * `load` returning undefined means the lookup succeeded but nothing matched (a 404-like outcome).
 */
export function useAsyncValue<T>(load: () => Promise<T | undefined>, key: string): AsyncValue<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncValue<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    load().then(
      (value) => { if (active) setState(value === undefined ? { status: 'missing' } : { status: 'ready', value }); },
      (error: unknown) => { if (active) setState({ status: 'error', error }); },
    );
    return () => { active = false; };
    // `load` is intentionally keyed by `key`; callers pass a closure that changes only with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  return { ...state, retry };
}
