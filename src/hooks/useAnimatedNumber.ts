import { useState, useEffect, useRef } from 'react';
import { isReduceMotion } from '@/animations/transitions';

interface UseAnimatedNumberOptions {
  duration?: number;
  decimals?: number;
  formatter?: (val: number) => string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Hook to smoothly interpolate numerical changes (e.g. balance, expenses, savings)
 * Returns the current interpolated value and formatted string.
 */
export function useAnimatedNumber(
  targetValue: number,
  options: UseAnimatedNumberOptions = {}
) {
  const { duration = 500, decimals = 2, formatter } = options;
  const [displayValue, setDisplayValue] = useState<number>(targetValue);
  const prevValueRef = useRef<number>(targetValue);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = targetValue;

    if (startValue === endValue) {
      setDisplayValue(endValue);
      return;
    }

    if (isReduceMotion()) {
      setDisplayValue(endValue);
      prevValueRef.current = endValue;
      return;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const startTime = Date.now();

    const updateFrame = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easedProgress = easeOutCubic(progress);

      const current = startValue + (endValue - startValue) * easedProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(updateFrame);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
      }
    };

    animFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [targetValue, duration]);

  const formattedText = formatter
    ? formatter(displayValue)
    : displayValue.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return {
    value: displayValue,
    formatted: formattedText,
  };
}
