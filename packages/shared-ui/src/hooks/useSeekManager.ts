import { useRef, useCallback, useEffect, useState } from 'react';

/** Seek acceleration levels (seconds per step) */
const SEEK_ACCELERATION = [10, 30, 60] as const;
/** Hold duration (ms) before next acceleration level kicks in */
const ACCELERATION_INTERVAL = 800;

export interface UseSeekManagerReturn {
  seekPreviewTime: number | undefined;
  seekPreviewDirection: 'forward' | 'backward' | undefined;
  startAcceleratedSeek: (direction: 1 | -1) => void;
  stopAcceleratedSeek: () => void;
}

/**
 * Hook that manages accelerated seeking state.
 *
 * Designed to be shared across mobile (VideoRef) and Vega (W3C/HLS) players.
 * The platform-specific seek mechanism is injected via `seekFn`.
 *
 * @param currentTime - Current playback time (from player onProgress)
 * @param duration - Total duration of the media
 * @param seekFn - Platform-specific function to seek to a given time
 */
export function useSeekManager(
  currentTime: number,
  duration: number,
  seekFn: (time: number) => void,
): UseSeekManagerReturn {
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | undefined>();
  const [seekPreviewDirection, setSeekPreviewDirection] = useState<'forward' | 'backward' | undefined>();

  // Keep refs in sync with state for use inside callbacks
  const currentTimeRef = useRef<number>(currentTime);
  const durationRef = useRef<number>(duration);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Accelerated seeking state
  const seekHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekLevelRef = useRef<number>(0);
  const seekDirectionRef = useRef<1 | -1>(1);
  const seekActiveRef = useRef<boolean>(false);

  const startAcceleratedSeek = useCallback((direction: 1 | -1) => {
    seekDirectionRef.current = direction;
    seekLevelRef.current = 0;
    seekActiveRef.current = true;

    // First seek: 10s
    const delta = SEEK_ACCELERATION[0] * direction;
    const target = currentTimeRef.current + delta;
    seekFn(target);
    setSeekPreviewTime(target);
    setSeekPreviewDirection(direction === 1 ? 'forward' : 'backward');

    // Accelerate after hold
    if (seekHoldTimerRef.current) clearTimeout(seekHoldTimerRef.current);
    const escalate = () => {
      if (!seekActiveRef.current) return;
      seekLevelRef.current = Math.min(seekLevelRef.current + 1, SEEK_ACCELERATION.length - 1);
      const newDelta = SEEK_ACCELERATION[seekLevelRef.current] * direction;
      const newTarget = currentTimeRef.current + newDelta;
      seekFn(newTarget);
      setSeekPreviewTime(newTarget);
    };
    seekHoldTimerRef.current = setTimeout(escalate, ACCELERATION_INTERVAL);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekFn]);

  const stopAcceleratedSeek = useCallback(() => {
    seekActiveRef.current = false;
    if (seekHoldTimerRef.current) {
      clearTimeout(seekHoldTimerRef.current);
      seekHoldTimerRef.current = null;
    }
    setTimeout(() => {
      setSeekPreviewTime(undefined);
      setSeekPreviewDirection(undefined);
    }, 500);
  }, []);

  return {
    seekPreviewTime,
    seekPreviewDirection,
    startAcceleratedSeek,
    stopAcceleratedSeek,
  };
}