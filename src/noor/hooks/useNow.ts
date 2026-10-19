import { useCallback, useEffect, useState } from 'react';

/**
 * Re-renders every `intervalMs` and returns the current timestamp,
 * plus a `refresh` function to update immediately.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  const refresh = useCallback(() => setNow(Date.now()), []);
  return [now, refresh] as const;
}
