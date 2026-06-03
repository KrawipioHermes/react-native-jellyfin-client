import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import TopBar from './TopBar';
import CenterControls from './CenterControls';
import BottomBar from './BottomBar';
import LoadingIndicator from '../LoadingIndicator';
import type { ChapterMarker } from '../../types/player';

interface VideoOverlayProps {
  visible: boolean;
  paused: boolean;
  onPlayPause: () => void;
  onExit: () => void;
  currentTime: number;
  duration: number;
  isBuffering?: boolean;
  title?: string;
  chapters?: ChapterMarker[];
  seekPreviewTime?: number;
  seekPreviewDirection?: 'forward' | 'backward';
}

/**
 * TV-friendly overlay with:
 * - TopBar: Exit button + title + time remaining
 * - CenterControls: Large play/pause button
 * - BottomBar: Seek bar + time display + seek preview
 * - Loading indicator during buffering
 * - Smooth fade animations
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
  chapters,
  seekPreviewTime,
  seekPreviewDirection,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      {isBuffering && <LoadingIndicator />}

      <TopBar
        title={title}
        currentTime={currentTime}
        duration={duration}
        onExit={onExit}
      />

      <CenterControls
        paused={paused}
        onPlayPause={onPlayPause}
      />

      <BottomBar
        currentTime={currentTime}
        duration={duration}
        chapters={chapters}
        seekPreviewTime={seekPreviewTime}
        seekPreviewDirection={seekPreviewDirection}
      />
    </Animated.View>
  );
});

VideoOverlay.displayName = 'VideoOverlay';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 10,
  },
});

export default VideoOverlay;