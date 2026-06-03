import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Platform, StyleSheet, Pressable } from 'react-native';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RemoteControlManager from '../app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../app/remote-control/SupportedKeys';
import VideoOverlay from '../components/player/VideoOverlay';
import { VideoRef } from 'react-native-video';
import VideoPlayer from '../components/player/VideoPlayer';
import { RootStackParamList } from '../navigation/types';
import type { ChapterMarker } from '../components/player/SeekBar';
import JellyfinClient from '../services/JellyfinClient';

const SHOW_NATIVE_CONTROLS = Platform.OS === 'ios';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

/** Seek acceleration levels (seconds per step) */
const SEEK_ACCELERATION = [10, 30, 60] as const;
/** Hold duration (ms) before next acceleration level kicks in */
const ACCELERATION_INTERVAL = 800;

export default function PlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, headerImage, title, itemId, accessToken, userId } = route.params;
  const isFocused = useIsFocused();

  const [paused, setPaused] = useState<boolean>(false);
  const [controlsVisible, setControlsVisible] = useState<boolean>(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [chapters, setChapters] = useState<ChapterMarker[]>([]);
  const [seekPreviewTime, setSeekPreviewTime] = useState<number | undefined>();
  const [seekPreviewDirection, setSeekPreviewDirection] = useState<"forward" | "backward" | undefined>();

  const videoRef = useRef<VideoRef>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  // Accelerated seeking state
  const seekHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const seekLevelRef = useRef<number>(0); // 0=10s, 1=30s, 2=60s
  const seekDirectionRef = useRef<1 | -1>(1);
  const seekActiveRef = useRef<boolean>(false);

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

  const showControls = useCallback(() => {
    setControlsVisible(true);

    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  }, []);

  const seek = useCallback((time: number) => {
    if (time < 0) {
      time = 0;
    } else if (time > durationRef.current) {
      time = durationRef.current;
    }
    videoRef.current?.seek(time);
    currentTimeRef.current = time;
    setCurrentTime(time);
    showControls();
  }, [showControls]);

  const togglePausePlay = useCallback(() => {
    setPaused((prev) => !prev);
    showControls();
  }, [showControls]);

  /**
   * Handle accelerated seeking — accumulates steps and accelerates
   * on held DPad presses.
   */
  const startAcceleratedSeek = useCallback((direction: 1 | -1) => {
    seekDirectionRef.current = direction;
    seekLevelRef.current = 0;
    seekActiveRef.current = true;

    // First seek: 10s
    const delta = SEEK_ACCELERATION[0] * direction;
    const target = currentTimeRef.current + delta;
    seek(target);
    setSeekPreviewTime(target);
    setSeekPreviewDirection(direction === 1 ? "forward" : "backward");

    // Accelerate after hold
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
    // Clear seek preview after a brief delay so user can see the final position
    setTimeout(() => {
      setSeekPreviewTime(undefined);
      setSeekPreviewDirection(undefined);
    }, 500);
  }, []);

  useEffect(() => {
    if (SHOW_NATIVE_CONTROLS) return;

    const handleKeyDown = (key: SupportedKeys) => {
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
          navigation.goBack();
          break;
        case SupportedKeys.PlayPause:
          togglePausePlay();
          break;
        default:
          showControls();
          break;
      }
    };

    const handleKeyUp = (key: SupportedKeys) => {
      if (key === SupportedKeys.Right || key === SupportedKeys.Left ||
          key === SupportedKeys.FastForward || key === SupportedKeys.Rewind) {
        stopAcceleratedSeek();
      }
    };

    const listener = RemoteControlManager.addKeydownListener(handleKeyDown);
    // Note: RemoteControlManager may not support keyUp — add if available
    return () => {
      RemoteControlManager.removeKeydownListener(listener);
      stopAcceleratedSeek();
    };
  }, [seek, togglePausePlay, showControls, navigation, startAcceleratedSeek, stopAcceleratedSeek]);

  return (
    <SpatialNavigationRoot isActive={isFocused && Platform.OS === 'android'}>
      <Pressable style={playerStyles.container} onPress={showControls}>
        <VideoPlayer
          ref={videoRef}
          movie={movie}
          headerImage={headerImage}
          paused={paused}
          controls={SHOW_NATIVE_CONTROLS}
          onBuffer={setIsVideoBuffering}
          onProgress={setCurrentTime}
          onLoad={(d) => {
            durationRef.current = d;
            setDuration(d);
            if (!SHOW_NATIVE_CONTROLS) showControls();
          }}
          onEnd={() => {
            setPaused(true);
            navigation.goBack();
          }}
        />

        {!SHOW_NATIVE_CONTROLS && !!duration && (
          <VideoOverlay
            visible={controlsVisible}
            paused={paused}
            onPlayPause={togglePausePlay}
            onExit={() => navigation.goBack()}
            currentTime={currentTime}
            duration={duration}
            isBuffering={isVideoBuffering}
            title={title}
            chapters={chapters}
            seekPreviewTime={seekPreviewTime}
            seekPreviewDirection={seekPreviewDirection}
          />
        )}
      </Pressable>
    </SpatialNavigationRoot>
  );
}

const playerStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
  });