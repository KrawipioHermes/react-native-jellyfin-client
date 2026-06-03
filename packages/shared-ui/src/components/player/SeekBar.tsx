import React from "react";
import { View, StyleSheet, I18nManager } from "react-native";
import { scaledPixels } from "../../hooks/useScale";
import { colors } from "../../theme/colors";
import type { ChapterMarker } from "../../types/player";

interface SeekBarProps {
  currentTime: number;
  duration: number;
  chapters?: ChapterMarker[];
}

/**
 * Converts ticks (Jellyfin's time unit, 10,000,000 ticks = 1 second) to seconds.
 */
function ticksToSeconds(ticks?: number): number {
  if (!ticks) return 0;
  return ticks / 10_000_000;
}

const SeekBar = React.memo(({ currentTime, duration, chapters }: SeekBarProps) => {
  const percentage = React.useMemo(() => {
    if (!duration) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const thumbPosition = I18nManager.isRTL
    ? { right: `${percentage}%` }
    : { left: `${percentage}%` };

  const progressWidth = I18nManager.isRTL
    ? { right: "0%", width: `${percentage}%` }
    : { left: "0%", width: `${percentage}%` };

  // Compute chapter marker positions as percentages
  const chapterTicks = React.useMemo(() => {
    if (!chapters || !duration) return [];
    return chapters
      .filter((ch) => {
        const sec = ticksToSeconds(ch.StartPositionTicks);
        return sec > 0 && sec < duration;
      })
      .map((ch) => ({
        left: `${(ticksToSeconds(ch.StartPositionTicks) / duration) * 100}%`,
        name: ch.Name,
      }));
  }, [chapters, duration]);

  // Handle zero duration gracefully
  if (!duration) {
    return <View style={seekBarStyles.seekbarContainer} />;
  }

  return (
    <View style={seekBarStyles.seekbarContainer}>
      {/* Track background */}
      <View style={seekBarStyles.seekbarTrack}>
        {/* Progress fill */}
        <View style={[seekBarStyles.seekbarProgress, progressWidth]} />
        {/* Chapter marker ticks */}
        {chapterTicks.map((marker, index) => (
          <View
            key={`ch-${index}`}
            style={[
              seekBarStyles.chapterMarker,
              { left: marker.left },
            ]}
          />
        ))}
      </View>
      {/* Thumb indicator */}
      <View style={[seekBarStyles.seekbarThumb, thumbPosition]} />
    </View>
  );
});

const SEEK_BAR_HEIGHT = scaledPixels(40);
const TRACK_HEIGHT = scaledPixels(5);
const THUMB_SIZE = scaledPixels(20);
const CHAPTER_MARKER_WIDTH = scaledPixels(3);
const CHAPTER_MARKER_HEIGHT = scaledPixels(12);

const seekBarStyles = StyleSheet.create({
  seekbarContainer: {
    flex: 1,
    height: SEEK_BAR_HEIGHT,
    justifyContent: "center",
    marginEnd: scaledPixels(80),
  },
  seekbarTrack: {
    width: "100%",
    height: TRACK_HEIGHT,
    backgroundColor: "#555",
    borderRadius: scaledPixels(2.5),
    overflow: "visible",
    position: "relative",
  },
  seekbarProgress: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: colors.primary,
    borderRadius: scaledPixels(2.5),
  },
  seekbarThumb: {
    position: "absolute",
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: scaledPixels(10),
    backgroundColor: "#fff",
    borderWidth: scaledPixels(2),
    borderColor: colors.primary,
  },
  chapterMarker: {
    position: "absolute",
    top: -((CHAPTER_MARKER_HEIGHT - TRACK_HEIGHT) / 2),
    width: CHAPTER_MARKER_WIDTH,
    height: CHAPTER_MARKER_HEIGHT,
    backgroundColor: colors.warning,
    borderRadius: scaledPixels(1.5),
    zIndex: 2,
  },
});

export default SeekBar;