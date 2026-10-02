import { useMemo } from 'react';
import { getStaggerDelay, STAGGER } from '@/animations/transitions';

/**
 * Hook to calculate consistent staggered entry delays for lists or grids of elements.
 */
export function useStagger(
  index: number,
  intervalMs: number = STAGGER.normal,
  maxDelayMs: number = 360
) {
  return useMemo(() => {
    return getStaggerDelay(index, intervalMs, maxDelayMs);
  }, [index, intervalMs, maxDelayMs]);
}
