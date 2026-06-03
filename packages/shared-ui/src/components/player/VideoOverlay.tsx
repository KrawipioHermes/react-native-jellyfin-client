import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Text } from "react-native";
import { DefaultFocus } from "react-tv-space-navigation";
import FocusablePressable from "../FocusablePressable";
import SeekBar from "./SeekBar";
import LoadingIndicator from "../LoadingIndicator";
import { scaledPixels } from "../../hooks/useScale";
import { safeZones } from "../../theme";
import { colors } from "../../theme/colors";

interface VideoOverlayProps {
  visible: boolean;
  paused: boolean;
  onPlayPause: () => void;
  onExit: () => void;
  currentTime: number;
  duration: number;
  isBuffering?: boolean;
  title?: string;
}

/**
 * Formats seconds into HH:MM:SS or MM:SS display
 */
function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Shared VideoOverlay — Enhanced
 *
 * Improved TV-friendly overlay with:
 * - Top bar: Exit button + title + time remaining
 * - Center: Large play/pause button
 * - Bottom bar: Seek bar + time display
 * - Proper DPad navigation with focus management
 */
const VideoOverlay: React.FC<VideoOverlayProps> = React.memo(({
  visible,
  paused,
  onPlayPause,
  onExit,
  currentTime,
  duration,
  isBuffering = false,
  title,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity]);

  const timeRemaining = duration > 0 ? duration - currentTime : 0;

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {isBuffering && <LoadingIndicator />}

      {/* Top bar: Exit + Title + Time remaining */}
      <View style={styles.topBar}>
        <FocusablePressable
          text="Exit"
          onSelect={onExit}
          style={styles.exitButton}
        />
        {title && (
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
        )}
        <Text style={styles.timeRemainingText}>
          -{formatTime(timeRemaining)}
        </Text>
      </View>

      {/* Center: Play/Pause */}
      <View style={styles.centerControls}>
        <DefaultFocus>
          <FocusablePressable
            text={paused ? "▶ Play" : "⏸ Pause"}
            onSelect={onPlayPause}
            style={styles.playPauseButton}
          />
        </DefaultFocus>
      </View>

      {/* Bottom bar: Seek bar + time display */}
      <View style={styles.bottomBar}>
        <Text style={styles.currentTimeText}>
          {formatTime(currentTime)}
        </Text>
        <View style={styles.seekBarContainer}>
          <SeekBar currentTime={currentTime} duration={duration} />
        </View>
        <Text style={styles.durationText}>
          {formatTime(duration)}
        </Text>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 10,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingTop: scaledPixels(safeZones.actionSafe.vertical),
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  exitButton: {
    marginEnd: scaledPixels(20),
  },
  titleText: {
    flex: 1,
    color: colors.text,
    fontSize: scaledPixels(28),
    fontWeight: "600",
  },
  timeRemainingText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(22),
    marginStart: scaledPixels(20),
  },
  centerControls: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  playPauseButton: {
    minWidth: scaledPixels(200),
    minHeight: scaledPixels(80),
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: scaledPixels(safeZones.actionSafe.vertical),
    paddingHorizontal: scaledPixels(safeZones.actionSafe.horizontal),
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  currentTimeText: {
    color: colors.text,
    fontSize: scaledPixels(20),
    minWidth: scaledPixels(80),
    textAlign: "center",
  },
  seekBarContainer: {
    flex: 1,
    marginHorizontal: scaledPixels(16),
  },
  durationText: {
    color: colors.textSecondary,
    fontSize: scaledPixels(20),
    minWidth: scaledPixels(80),
    textAlign: "center",
  },
});

export default VideoOverlay;
