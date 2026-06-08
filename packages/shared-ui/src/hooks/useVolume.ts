import { useState, useCallback } from 'react';

/** Default volume level (0-1 range) on first launch */
const DEFAULT_VOLUME = 0.8;

/**
 * Hook to manage volume state for the video player.
 *
 * Manages volume (0-1) and muted state independently.
 *
 * @returns [volume, muted, setVolume, toggleMute]
 */
export function useVolume(): [number, boolean, (level: number) => void, () => void] {
  const [volume, setVolumeState] = useState<number>(DEFAULT_VOLUME);
  const [muted, setMuted] = useState<boolean>(false);

  const setVolume = useCallback((level: number) => {
    const clamped = Math.max(0, Math.min(1, level));
    setVolumeState(clamped);
    // If setting volume while muted, unmute
    if (clamped > 0) {
      setMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  return [volume, muted, setVolume, toggleMute];
}
