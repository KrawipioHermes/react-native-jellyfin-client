import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import TopBar from './TopBar';
import CenterControls from './CenterControls';
import BottomBar from './BottomBar';
import TrackSelectorPanel from './TrackSelectorPanel';
import LoadingIndicator from '../LoadingIndicator';
import type { ChapterMarker, MediaTrack } from '../../types/player';

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
  // Track selector props
  audioTracks?: MediaTrack[];
  subtitleTracks?: MediaTrack[];
  selectedAudioIndex?: number | null;
  selectedSubtitleIndex?: number | null;
  onSelectAudio?: (index: number | null) => void;
  onSelectSubtitle?: (index: number | null) => void;
  onTrackSelectorToggle?: (open: boolean) => void;
}

/**
 * TV-friendly overlay with:
 * - TopBar: Exit button + title + time remaining + tracks button
 * - CenterControls: Large play/pause button
 * - BottomBar: Seek bar + time display + seek preview
 * - TrackSelectorPanel: Full-screen audio/subtitle selector (replaces overlay)
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
  audioTracks,
  subtitleTracks,
  selectedAudioIndex,
  selectedSubtitleIndex,
  onSelectAudio,
  onSelectSubtitle,
  onTrackSelectorToggle,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const [trackSelectorOpen, setTrackSelectorOpen] = useState(false);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  const handleOpenTracks = () => {
    setTrackSelectorOpen(true);
    onTrackSelectorToggle?.(true);
  };

  const handleCloseTracks = () => {
    setTrackSelectorOpen(false);
    onTrackSelectorToggle?.(false);
  };

  // When the overlay hides or controls timer expires, close track selector too
  useEffect(() => {
    if (!visible && trackSelectorOpen) {
      setTrackSelectorOpen(false);
      onTrackSelectorToggle?.(false);
    }
  }, [visible, trackSelectorOpen, onTrackSelectorToggle]);

  // Track selector panel replaces the regular overlay when open
  const showTrackSelector = trackSelectorOpen && visible;
  const hasTracks =
    (audioTracks && audioTracks.length > 0) ||
    (subtitleTracks && subtitleTracks.length > 0);

  if (!visible && !trackSelectorOpen) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: visible ? opacity : new Animated.Value(0) }]}>
      {/* Track selector panel takes over the full screen */}
      <TrackSelectorPanel
        visible={showTrackSelector}
        audioTracks={audioTracks ?? []}
        subtitleTracks={subtitleTracks ?? []}
        selectedAudioIndex={selectedAudioIndex ?? null}
        selectedSubtitleIndex={selectedSubtitleIndex ?? null}
        onSelectAudio={(idx) => onSelectAudio?.(idx)}
        onSelectSubtitle={(idx) => onSelectSubtitle?.(idx)}
        onClose={handleCloseTracks}
      />

      {/* Regular overlay — hidden when track selector is open */}
      {!showTrackSelector && (
        <>
          {isBuffering && <LoadingIndicator />}

          <TopBar
            title={title}
            currentTime={currentTime}
            duration={duration}
            onExit={onExit}
            onTracks={handleOpenTracks}
            hasTracks={hasTracks}
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
        </>
      )}
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