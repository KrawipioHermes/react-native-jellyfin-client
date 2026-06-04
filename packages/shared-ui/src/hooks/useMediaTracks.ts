import { useState, useEffect, useCallback, useRef } from 'react';
import type { MediaTrack } from '../types/player';
import JellyfinClient from '../services/JellyfinClient';

export interface TrackSelectionState {
  audioTracks: MediaTrack[];
  subtitleTracks: MediaTrack[];
  selectedAudioIndex: number | null;
  selectedSubtitleIndex: number | null;
  selectAudio: (index: number | null) => void;
  selectSubtitle: (index: number | null) => void;
  isDefaultLoaded: boolean;
}

/**
 * Hook to fetch and manage subtitle/audio track selection state.
 *
 * Fetches track info from Jellyfin's PlaybackInfo endpoint.
 * Initializes default selection from IsDefault flags.
 * Returns selection state and setter functions.
 *
 * @param itemId - Jellyfin item ID to fetch tracks for
 * @param accessToken - Jellyfin access token
 * @param userId - Jellyfin user ID
 * @param enabled - Whether to fetch tracks (default: true)
 */
export function useMediaTracks(
  itemId?: string,
  accessToken?: string,
  userId?: string,
  enabled: boolean = true,
): TrackSelectionState {
  const [audioTracks, setAudioTracks] = useState<MediaTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<MediaTrack[]>([]);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | null>(null);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(null);
  const [isDefaultLoaded, setIsDefaultLoaded] = useState(false);
  const fetchedRef = useRef(false);

  // Fetch tracks on mount
  useEffect(() => {
    if (!itemId || !accessToken || !userId || !enabled || fetchedRef.current) return;
    fetchedRef.current = true;

    JellyfinClient.getMediaTracks(accessToken, userId, itemId)
      .then(({ audioTracks: audio, subtitleTracks: subs }) => {
        setAudioTracks(audio);
        setSubtitleTracks(subs);

        // Initialize default selections
        const defaultAudio = audio.find((t) => t.IsDefault);
        setSelectedAudioIndex(defaultAudio?.Index ?? (audio.length > 0 ? audio[0].Index : null));

        const defaultSub = subs.find((t) => t.IsDefault || t.IsForced);
        setSelectedSubtitleIndex(defaultSub?.Index ?? null); // null = subtitles off by default

        setIsDefaultLoaded(true);
      })
      .catch(() => {
        // Tracks are non-critical; fail silently
        setIsDefaultLoaded(true);
      });
  }, [itemId, accessToken, userId, enabled]);

  const selectAudio = useCallback((index: number | null) => {
    setSelectedAudioIndex(index);
  }, []);

  const selectSubtitle = useCallback((index: number | null) => {
    setSelectedSubtitleIndex(index);
  }, []);

  return {
    audioTracks,
    subtitleTracks,
    selectedAudioIndex,
    selectedSubtitleIndex,
    selectAudio,
    selectSubtitle,
    isDefaultLoaded,
  };
}
