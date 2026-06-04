import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
import type { ChapterMarker } from '../types/player';
import JellyfinClient from '../services/JellyfinClient';
import { useAutoHideControls } from '../hooks/useAutoHideControls';
import { useSeekManager } from '../hooks/useSeekManager';
import { useMediaTracks } from '../hooks/useMediaTracks';

const SHOW_NATIVE_CONTROLS = Platform.OS === 'ios';

type PlayerScreenRouteProp = RouteProp<RootStackParamList, 'Player'>;
type PlayerScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Player'>;

export default function PlayerScreen() {
  const route = useRoute<PlayerScreenRouteProp>();
  const navigation = useNavigation<PlayerScreenNavigationProp>();
  const { movie, headerImage, title, itemId, accessToken, userId } = route.params;
  const isFocused = useIsFocused();

  const [paused, setPaused] = useState<boolean>(false);
  const [isVideoBuffering, setIsVideoBuffering] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [chapters, setChapters] = useState<ChapterMarker[]>([]);
  const [trackSelectorOpen, setTrackSelectorOpen] = useState(false);

  const videoRef = useRef<VideoRef>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const [controlsVisible, showControls] = useAutoHideControls(5000, trackSelectorOpen);

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

  // Map selected track indices to react-native-video props
  const selectedTextTrack = useMemo(() => {
    if (selectedSubtitleIndex === null || selectedSubtitleIndex === undefined) return undefined;
    return { type: 'index' as const, value: selectedSubtitleIndex };
  }, [selectedSubtitleIndex]);

  const selectedAudioTrack = useMemo(() => {
    if (selectedAudioIndex === null || selectedAudioIndex === undefined) return undefined;
    return { type: 'index' as const, value: selectedAudioIndex };
  }, [selectedAudioIndex]);

  const seek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(time, durationRef.current));
    videoRef.current?.seek(clamped);
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    showControls();
  }, [showControls]);

  const togglePausePlay = useCallback(() => {
    setPaused((prev) => !prev);
    showControls();
  }, [showControls]);

  const handleTrackSelectorToggle = useCallback((open: boolean) => {
    setTrackSelectorOpen(open);
  }, []);

  const { seekPreviewTime, seekPreviewDirection, startAcceleratedSeek, stopAcceleratedSeek } =
    useSeekManager(currentTime, duration, seek);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

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
          onProgress={(t) => {
            setCurrentTime(t);
            currentTimeRef.current = t;
          }}
          onLoad={(d) => {
            durationRef.current = d;
            setDuration(d);
            if (!SHOW_NATIVE_CONTROLS) showControls();
          }}
          onEnd={() => {
            setPaused(true);
            navigation.goBack();
          }}
          selectedTextTrack={selectedTextTrack}
          selectedAudioTrack={selectedAudioTrack}
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
            audioTracks={audioTracks}
            subtitleTracks={subtitleTracks}
            selectedAudioIndex={selectedAudioIndex}
            selectedSubtitleIndex={selectedSubtitleIndex}
            onSelectAudio={selectAudio}
            onSelectSubtitle={selectSubtitle}
            onTrackSelectorToggle={handleTrackSelectorToggle}
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