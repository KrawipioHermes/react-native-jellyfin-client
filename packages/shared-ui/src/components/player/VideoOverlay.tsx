import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import TopBar from './TopBar';
import CenterControls from './CenterControls';
import BottomBar from './BottomBar';
import TrackSelectorPanel from './TrackSelectorPanel';
import SettingsPanel from './SettingsPanel';
import LoadingIndicator from '../LoadingIndicator';
import type { ChapterMarker, MediaTrack } from '../../types/player';
import type { PlaybackSpeed } from './SettingsPanel';

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
  // Settings panel props
  playbackSpeed: PlaybackSpeed;
  onPlaybackSpeedChange: (speed: PlaybackSpeed) => void;
  onSettingsToggle?: (open: boolean) => void;
}

/**
 * TV-friendly overlay with:
 * - TopBar: Exit button + title + time remaining + tracks button + settings button
 * - CenterControls: Large play/pause button
 * - BottomBar: Seek bar + time display + seek preview
 * - TrackSelectorPanel: Full-screen audio/subtitle selector (replaces overlay)
 * - SettingsPanel: Full-screen playback speed selector (replaces overlay)
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
  playbackSpeed,
  onPlaybackSpeedChange,
  onSettingsToggle,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const [trackSelectorOpen, setTrackSelectorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  const handleOpenSettings = () => {
    setSettingsOpen(true);
    onSettingsToggle?.(true);
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
    onSettingsToggle?.(false);
  };

  // When the overlay hides or controls timer expires, close all panels
  useEffect(() => {
    if (!visible) {
      if (trackSelectorOpen) {
        setTrackSelectorOpen(false);
        onTrackSelectorToggle?.(false);
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        onSettingsToggle?.(false);
      }
    }
  }, [visible, trackSelectorOpen, settingsOpen, onTrackSelectorToggle, onSettingsToggle]);

  // Panels replace the regular overlay when open
  const showTrackSelector = trackSelectorOpen && visible;
  const showSettings = settingsOpen && visible;
  const hasTracks =
    (audioTracks && audioTracks.length > 0) ||
    (subtitleTracks && subtitleTracks.length > 0);

  if (!visible && !trackSelectorOpen && !settingsOpen) {
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

      {/* Settings panel takes over the full screen */}
      <SettingsPanel
        visible={showSettings}
        playbackSpeed={playbackSpeed}
        onSelectSpeed={onPlaybackSpeedChange}
        onClose={handleCloseSettings}
      />

      {/* Regular overlay — hidden when a panel is open */}
      {!showTrackSelector && !showSettings && (
        <>
          {isBuffering && <LoadingIndicator />}

          <TopBar
            title={title}
            currentTime={currentTime}
            duration={duration}
            onExit={onExit}
            onTracks={handleOpenTracks}
            hasTracks={hasTracks}
            onSettings={handleOpenSettings}
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