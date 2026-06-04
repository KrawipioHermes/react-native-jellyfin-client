import { useMemo } from 'react';
import type { ChapterMarker } from '../types/player';

/**
 * Chapter names that indicate an intro/opening sequence.
 * Case-insensitive prefix match is used, so "intro", "Intro", "INTRO" etc. all match.
 */
const INTRO_CHAPTER_PREFIXES = [
  'intro',
  'introduction',
  'opening',
  'opening credits',
  'opening title',
  'opening titles',
  'vorspann',
  'créditos de inicio',
  'início',
  'avspenning',
  'start credits',
  'start sequence',
  'prologue',
  'prolog',
  'プロローグ',
  'オープニング',
  '开场',
  '片头',
  '开场白',
];

/**
 * Maximum duration of an intro chapter in seconds.
 * If a chapter with an intro-like name is longer than this, we skip detection
 * (it's likely a chapter marker for the start of the show, not a skipable intro).
 */
const MAX_INTRO_DURATION_SECONDS = 600; // 10 minutes

/**
 * Hook to detect when the current playback time is within an intro chapter.
 *
 * @param chapters - Array of chapter markers from the Jellyfin API
 * @param currentTime - Current playback time in seconds
 * @returns Object with visibility flag and skip target time
 */
export function useSkipIntro(
  chapters: ChapterMarker[],
  currentTime: number,
): { show: boolean; skipToTime: number | null } {
  return useMemo(() => {
    if (!chapters || chapters.length === 0 || currentTime < 0) {
      return { show: false, skipToTime: null };
    }

    // Find an intro chapter whose start time is <= currentTime
    // but whose end time (next chapter start or estimated) is > currentTime
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterName = (chapter.Name ?? '').toLowerCase().trim();
      const chapterStartTicks = chapter.StartPositionTicks;

      // Reject chapters with no name or no start time
      if (!chapterName || chapterStartTicks == null) {
        continue;
      }

      // Check if this chapter has an intro-like name (prefix match)
      const isIntro = INTRO_CHAPTER_PREFIXES.some((prefix) =>
        chapterName.startsWith(prefix),
      );
      if (!isIntro) {
        continue;
      }

      // Convert ticks to seconds (1 tick = 100 ns, so 10M ticks = 1 second)
      const chapterStartSec = chapterStartTicks / 10_000_000;
      if (currentTime < chapterStartSec) {
        continue; // Haven't reached this chapter yet
      }

      // Determine the end of this chapter:
      // Either the next chapter's start time, or a reasonable estimate
      const nextChapter = chapters[i + 1];
      const chapterEndSec = nextChapter?.StartPositionTicks
        ? nextChapter.StartPositionTicks / 10_000_000
        : chapterStartSec + MAX_INTRO_DURATION_SECONDS;

      // Cap at MAX_INTRO_DURATION_SECONDS to avoid skipping too much
      const actualEndSec = Math.min(
        chapterEndSec,
        chapterStartSec + MAX_INTRO_DURATION_SECONDS,
      );

      // Check if current time is within the intro chapter
      if (currentTime >= chapterStartSec && currentTime < actualEndSec) {
        return { show: true, skipToTime: actualEndSec };
      }
    }

    return { show: false, skipToTime: null };
  }, [chapters, currentTime]);
}
