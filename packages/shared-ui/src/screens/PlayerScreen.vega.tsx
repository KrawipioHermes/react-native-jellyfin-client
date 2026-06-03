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
import VideoOverlay from '../components/player/VideoOverlay.vega';
import ExitButton from '../components/player/ExitButton';
import VideoPlayer from '../components/player/VideoPlayer.vega';
import { RootStackParamList } from '../navigation/types';
import { VideoHandler } from '../utils/VideoHandler.kepler';
import type { ChapterMarker } from '../components/player/SeekBar';
import JellyfinClient from '../services/JellyfinClient';
import { useSelector } from 'react-redux';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Player'
>;

/** Seek acceleration levels (seconds per step) */
const SEEK_ACCELERATION = [10, 30, 60] as const;
/** Hold duration (ms) before next acceleration level kicks in */
const ACCELERATION_INTERVAL = 800;

/**
 * PlayerScreen for Vega/Kepler Platform — Enhanced with accelerated seeking + chapter markers
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
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState<boolean>(true);
  const [isVideoInitialized, setIsVideoInitialized] = useState<boolean>(false);
  const [isVideoEnded, setIsVideoEnded] = useState<boolean>(false);
  const [isVideoError, setIsVideoError] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [chapters, setChapters] = useState<ChapterMarker[]>([]);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | undefined>();
  const [seekPreviewDirection, setSeekPreviewDirection] = useState<"forward" | "backward" | undefined>();

  // Refs
  const videoRef = useRef<W3CVideoPlayer | null>(null);
  const surfaceHandleRef = useRef<string | null>(null);
  const captionViewHandleRef = useRef<string | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const videoHandlerRef = useRef<VideoHandler | null>(null);

  // Accelerated seeking state
  const seekHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekLevelRef = useRef<number>(0);
  const seekDirectionRef = useRef<1 | -1>(1);
  const seekActiveRef = useRef<boolean>(false);

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

  /**
   * Show controls with auto-hide
   */
  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  }, []);

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

  /**
   * Start accelerated seeking
   */
  const startAcceleratedSeek = useCallback((direction: 1 | -1) => {
    seekDirectionRef.current = direction;
    seekLevelRef.current = 0;
    seekActiveRef.current = true;

    const delta = SEEK_ACCELERATION[0] * direction;
    const target = currentTimeRef.current + delta;
    seek(target);
    setSeekPreviewTime(target);
    setSeekPreviewDirection(direction === 1 ? "forward" : "backward");

    if (seekHoldTimerRef.current) clearTimeout(seekHoldTimerRef.current);
    const escalate = () => {
      if (!seekActiveRef.current) return;
      seekLevelRef.current = Math.min(seekLevelRef.current + 1, SEEK_ACCELERATION.length - 1);
      const newDelta = SEEK_ACCELERATION[seekLevelRef.current] * direction;
      const newTarget = currentTimeRef.current + newDelta;
      seek(newTarget);
      setSeekPreviewTime(newTarget);
    };
    seekHoldTimerRef.current = setTimeout(escalate, ACCELERATION_INTERVAL);
  }, [seek]);

  const stopAcceleratedSeek = useCallback(() => {
    seekActiveRef.current = false;
    if (seekHoldTimerRef.current) {
      clearTimeout(seekHoldTimerRef.current);
      seekHoldTimerRef.current = null;
    }
    setTimeout(() => {
      setSeekPreviewTime(undefined);
      setSeekPreviewDirection(undefined);
    }, 500);
  }, []);

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
      setControlsVisible(true);
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

    const listener = RemoteControlManager.addKeydownListener(handleKeyDown);

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        navigateBack();
        return true;
      },
    );

    return () => {
      RemoteControlManager.removeKeydownListener(listener);
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
            <ExitButton onSelect={navigateBack} />
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