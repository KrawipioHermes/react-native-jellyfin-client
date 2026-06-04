import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  IKeplerAppStateManager,
  useKeplerAppStateManager,
} from '@amazon-devices/react-native-kepler';
import { VideoPlayer as W3CVideoPlayer } from '@amazon-devices/react-native-w3cmedia';
import RemoteControlManager from '../app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../app/remote-control/SupportedKeys';
import VideoOverlay from '../components/player/VideoOverlay';
import FocusablePressable from '../components/FocusablePressable';
import VideoPlayer from '../components/player/VideoPlayer.vega';
import { RootStackParamList } from '../navigation/types';
import { VideoHandler } from '../utils/VideoHandler.kepler';
import type { ChapterMarker } from '../types/player';
import JellyfinClient from '../services/JellyfinClient';
import { useSelector } from 'react-redux';
import { useAutoHideControls } from '../hooks/useAutoHideControls';
import { useSeekManager } from '../hooks/useSeekManager';
import { useMediaTracks } from '../hooks/useMediaTracks';
import { scaledPixels } from '../hooks/useScale';
import { safeZones } from '../theme';
import type { PlaybackSpeed } from '../components/player/SettingsPanel';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Player'
>;

/**
 * PlayerScreen for Vega/Kepler Platform — Enhanced with accelerated seeking + chapter markers + track selection
 */
export default function PlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, headerImage, itemId, title } = route.params;
  const isFocused = useIsFocused();

  // Kepler-specific hooks
  const keplerAppStateManager: IKeplerAppStateManager =
    useKeplerAppStateManager();
  const componentInstance = keplerAppStateManager.getComponentInstance();

  // Get auth from Redux store
  const { accessToken, userId } = useSelector((state: any) => state.jellyfin);

  // Video state
  const [paused, setPaused] = useState<boolean>(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState<boolean>(true);
  const [isVideoInitialized, setIsVideoInitialized] = useState<boolean>(false);
  const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false);
  const [isVideoError, setIsVideoError] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [chapters, setChapters] = useState<ChapterMarker[]>([]);
  const [trackSelectorOpen, setTrackSelectorOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1);

  // Refs
  const videoRef = useRef<W3CVideoPlayer | null>(null);
  const surfaceHandleRef = useRef<string | null>(null);
  const captionViewHandleRef = useRef<string | null>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const videoHandlerRef = useRef<VideoHandler | null>(null);

  const [controlsVisible, showControls] = useAutoHideControls(5000, trackSelectorOpen || settingsOpen);

  // Update refs when state changes
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Fetch chapters on mount
  useEffect(() => {
    if (itemId && accessToken && userId) {
      JellyfinClient.getChapters(accessToken, userId, itemId)
        .then((ch) => setChapters(ch ?? []))
        .catch(() => {
          // Chapters are non-critical; fail silently
        });
    }
  }, [itemId, accessToken, userId]);

  // Fetch and manage tracks
  const {
    audioTracks,
    subtitleTracks,
    selectedAudioIndex,
    selectedSubtitleIndex,
    selectAudio,
    selectSubtitle,
  } = useMediaTracks(itemId, accessToken, userId);

  // Track selector toggle — pauses auto-hide while panel is open
  const handleTrackSelectorToggle = useCallback((open: boolean) => {
    setTrackSelectorOpen(open);
  }, []);

  // Settings panel toggle — pauses auto-hide while panel is open
  const handleSettingsToggle = useCallback((open: boolean) => {
    setSettingsOpen(open);
  }, []);

  // Apply playback speed to the video player when speed changes
  useEffect(() => {
    if (videoHandlerRef.current && isVideoInitialized) {
      videoHandlerRef.current.setPlaybackRate(playbackSpeed);
    }
  }, [playbackSpeed, isVideoInitialized]);

  /**
   * Seek to a specific time
   */
  const seek = useCallback((time: number) => {
    if (videoHandlerRef.current && durationRef.current) {
      try {
        const clampedTime = Math.max(0, Math.min(time, durationRef.current));
        videoHandlerRef.current.seek(clampedTime);
        setCurrentTime(clampedTime);
        currentTimeRef.current = clampedTime;
        showControls();
      } catch (e) {
        console.warn('[PlayerScreen.kepler] Seek error:', e);
      }
    }
  }, [showControls]);

  const { seekPreviewTime, seekPreviewDirection, startAcceleratedSeek, stopAcceleratedSeek } =
    useSeekManager(currentTime, duration, seek);

  /**
   * Toggle play/pause
   */
  const togglePausePlay = useCallback(() => {
    if (videoHandlerRef.current) {
      try {
        if (videoHandlerRef.current.isPaused()) {
          videoHandlerRef.current.play();
          setPaused(false);
        } else {
          videoHandlerRef.current.pause();
          setPaused(true);
        }
        showControls();
      } catch (e) {
        console.warn('[PlayerScreen.kepler] Play/pause error:', e);
      }
    }
  }, [showControls]);

  /**
   * Navigate back with cleanup
   */
  const navigateBack = useCallback(() => {
    console.log('[PlayerScreen.kepler] - Navigating back');

    if (surfaceHandleRef.current && videoRef.current) {
      videoRef.current.clearSurfaceHandle(surfaceHandleRef.current);
    }
    if (captionViewHandleRef.current && videoRef.current) {
      videoRef.current.clearCaptionViewHandle(captionViewHandleRef.current);
    }

    videoHandlerRef.current?.destroyVideoElements();
    videoRef.current = null;

    setTimeout(() => {
      navigation.goBack();
    }, 300);
  }, [navigation]);

  /**
   * Initialize video handler and start playback
   */
  useEffect(() => {
    if (!isFocused) return;

    videoHandlerRef.current = new VideoHandler(
      videoRef,
      movie,
      headerImage,
      setIsVideoInitialized,
      setIsVideoEnded,
      setIsVideoError,
      setCurrentTime,
      setDuration,
      setIsVideoBuffering,
    );

    videoHandlerRef.current.preBufferVideo(componentInstance);

    return () => {
      if (surfaceHandleRef.current && videoRef.current) {
        videoRef.current.clearSurfaceHandle(surfaceHandleRef.current);
      }
      if (captionViewHandleRef.current && videoRef.current) {
        videoRef.current.clearCaptionViewHandle(captionViewHandleRef.current);
      }
      videoHandlerRef.current?.destroyVideoElements();
      videoRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movie, headerImage, isFocused]);

  useEffect(() => {
    if (isVideoEnded) {
      setPaused(true);
      showControls();
      navigateBack();
    }
  }, [isVideoEnded, navigateBack]);

  useEffect(() => {
    if (isVideoInitialized && duration > 0) {
      showControls();
    }
  }, [isVideoInitialized, duration, showControls]);

  /**
   * Handle remote control key presses
   */
  useEffect(() => {
    const handleKeyDown = (key: SupportedKeys) => {
      try {
        switch (key) {
          case SupportedKeys.Right:
          case SupportedKeys.FastForward:
            startAcceleratedSeek(1);
            break;
          case SupportedKeys.Left:
          case SupportedKeys.Rewind:
            startAcceleratedSeek(-1);
            break;
          case SupportedKeys.Back:
            stopAcceleratedSeek();
            navigateBack();
            break;
          case SupportedKeys.PlayPause:
            togglePausePlay();
            break;
          default:
            showControls();
            break;
        }
      } catch (e) {
        console.error('[PlayerScreen.kepler] Key handler error:', e);
      }
    };

    const handleKeyUp = (key: SupportedKeys) => {
      if (
        key === SupportedKeys.Right ||
        key === SupportedKeys.Left ||
        key === SupportedKeys.FastForward ||
        key === SupportedKeys.Rewind
      ) {
        stopAcceleratedSeek();
      }
    };

    const downListener = RemoteControlManager.addKeydownListener(handleKeyDown);
    const upListener = RemoteControlManager.addKeyupListener(handleKeyUp);
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigateBack();
        return true;
      },
    );

    return () => {
      downListener();
      upListener();
      backHandler.remove();
      stopAcceleratedSeek();
    };
  }, [seek, togglePausePlay, showControls, navigateBack, startAcceleratedSeek, stopAcceleratedSeek]);

  const onSurfaceViewCreated = useCallback((surfaceHandle: string) => {
    surfaceHandleRef.current = surfaceHandle;

    if (videoRef.current) {
      videoRef.current.setSurfaceHandle(surfaceHandle);
      videoRef.current.play();
      setPaused(false);
    }
  }, []);

  const onSurfaceViewDestroyed = useCallback((surfaceHandle: string) => {
    if (videoRef.current) {
      videoRef.current.clearSurfaceHandle(surfaceHandle);
    }
    surfaceHandleRef.current = null;
  }, []);

  const onCaptionViewCreated = useCallback((captionHandle: string) => {
    captionViewHandleRef.current = captionHandle;

    if (videoRef.current) {
      videoRef.current.setCaptionViewHandle(captionHandle);
    }
  }, []);

  const onCaptionViewDestroyed = useCallback((captionHandle: string) => {
    if (videoRef.current) {
      videoRef.current.clearCaptionViewHandle(captionHandle);
    }
    captionViewHandleRef.current = null;
  }, []);

  const styles = usePlayerStyles();

  if (isVideoError) {
    return (
      <SpatialNavigationRoot isActive={isFocused}>
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <FocusablePressable text="Exit" onSelect={navigateBack} />
          </View>
        </View>
      </SpatialNavigationRoot>
    );
  }

  return (
    <SpatialNavigationRoot isActive={isFocused}>
      <View style={styles.container}>
        <VideoPlayer
          movie={movie}
          headerImage={headerImage}
          showCaptions={false}
          onSurfaceViewCreated={onSurfaceViewCreated}
          onSurfaceViewDestroyed={onSurfaceViewDestroyed}
          onCaptionViewCreated={onCaptionViewCreated}
          onCaptionViewDestroyed={onCaptionViewDestroyed}
          isVideoInitialized={isVideoInitialized}
        />

        {!!durationRef.current && (
          <VideoOverlay
            visible={controlsVisible}
            paused={paused}
            onPlayPause={togglePausePlay}
            onExit={navigateBack}
            currentTime={currentTime}
            duration={durationRef.current}
            isBuffering={isVideoBuffering}
            title={title}
            chapters={chapters}
            seekPreviewTime={seekPreviewTime}
            seekPreviewDirection={seekPreviewDirection}
            audioTracks={audioTracks}
            subtitleTracks={subtitleTracks}
            selectedAudioIndex={selectedAudioIndex}
            selectedSubtitleIndex={selectedSubtitleIndex}
            onSelectAudio={selectAudio}
            onSelectSubtitle={selectSubtitle}
            onTrackSelectorToggle={handleTrackSelectorToggle}
            playbackSpeed={playbackSpeed}
            onPlaybackSpeedChange={setPlaybackSpeed}
            onSettingsToggle={handleSettingsToggle}
          />
        )}
      </View>
    </SpatialNavigationRoot>
  );
}

const usePlayerStyles = () => {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    errorContainer: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#000',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
    },
  });
};