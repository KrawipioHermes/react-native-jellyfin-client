import { useState, useEffect, useRef } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import JellyfinClient from '../services/JellyfinClient';

interface UseNextEpisodeInput {
  itemId?: string;
  accessToken?: string;
  userId?: string;
  currentTime: number;
  duration: number;
  paused: boolean;
}

interface UseNextEpisodeOutput {
  show: boolean;
  nextEpisode: BaseItemDto | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to determine if a "Next Episode" button should be shown.
 *
 * On mount, fetches the current item's metadata to determine if it's a TV episode.
 * If so, notes the SeriesId. When the user is near the end of playback
 * (within the last 60 seconds), fetches the next unwatched episode.
 *
 * @returns Object with visibility flag, next episode data, loading state, and error
 */
export function useNextEpisode({
  itemId,
  accessToken,
  userId,
  currentTime,
  duration,
  paused,
}: UseNextEpisodeInput): UseNextEpisodeOutput {
  const [show, setShow] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<BaseItemDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store resolved series info so we don't re-fetch
  const seriesIdRef = useRef<string | null>(null);
  const isEpisodeRef = useRef(false);
  const alreadyFetchedRef = useRef(false);

  // Step 1: On mount (or when itemId changes), determine if this is an episode
  useEffect(() => {
    if (!itemId || !accessToken) {
      return;
    }

    let cancelled = false;
    alreadyFetchedRef.current = false;

    const fetchItemMetadata = async () => {
      try {
        const item = await JellyfinClient.getItem(accessToken, itemId);
        if (cancelled || !item) return;

        const isEpisode = item.Type === 'Episode';
        isEpisodeRef.current = isEpisode;

        if (isEpisode && item.SeriesId) {
          seriesIdRef.current = item.SeriesId;
        } else {
          seriesIdRef.current = null;
        }
      } catch {
        // Non-critical; fail silently
        isEpisodeRef.current = false;
        seriesIdRef.current = null;
      }
    };

    fetchItemMetadata();

    return () => {
      cancelled = true;
    };
  }, [itemId, accessToken]);

  // Step 2: When near end of playback and it's an episode, fetch next up
  useEffect(() => {
    const NEAR_END_THRESHOLD = 60; // seconds from end
    const isNearEnd = duration > 0 && currentTime >= duration - NEAR_END_THRESHOLD;

    if (
      !isNearEnd ||
      !seriesIdRef.current ||
      !userId ||
      !accessToken ||
      alreadyFetchedRef.current ||
      paused // Don't fetch if paused — user might be at end intentionally
    ) {
      // When no longer near end, hide the button
      if (!isNearEnd) {
        setShow(false);
      }
      return;
    }

    let cancelled = false;

    const fetchNextUp = async () => {
      setLoading(true);
      setError(null);
      alreadyFetchedRef.current = true;

      try {
        const next = await JellyfinClient.getNextUp(
          accessToken,
          userId,
          seriesIdRef.current!,
        );

        if (cancelled) return;

        if (next) {
          setNextEpisode(next);
          setShow(true);
        } else {
          setShow(false);
          setNextEpisode(null);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load next episode');
          setShow(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchNextUp();

    return () => {
      cancelled = true;
    };
  }, [currentTime, duration, userId, accessToken, paused]);

  return { show, nextEpisode, loading, error };
}