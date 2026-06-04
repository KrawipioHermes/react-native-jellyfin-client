import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Platform, StyleSheet, Pressable } from 'react-native';
import { SpatialNavigationRoot } from 'react-tv-space-navigation';
import { useIsFocused } from '@react-navigation/native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import RemoteControlManager from '../app/remote-control/RemoteControlManager';
import { SupportedKeys } from '../app/remote-control/SupportedKeys';
import VideoOverlay from '../components/player/VideoOverlay';
import SkipIntroButton from '../components/player/SkipIntroButton';
import NextEpisodeButton from '../components/player/NextEpisodeButton';
import { VideoRef } from 'react-native-video';
import VideoPlayer from '../components/player/VideoPlayer';
import { RootStackParamList } from '../navigation/types';
import type { ChapterMarker } from '../types/player';
import JellyfinClient from '../services/JellyfinClient';
import { useAutoHideControls } from '../hooks/useAutoHideControls';
import { useSeekManager } from '../hooks/useSeekManager';
import { useSkipIntro } from '../hooks/useSkipIntro';
import { useNextEpisode } from '../hooks/useNextEpisode';

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

  const videoRef = useRef<VideoRef>(null);
  const currentTimeRef = useRef<number>(0);
  const durationRef = useRef<number>(0);

  const [controlsVisible, showControls] = useAutoHideControls();

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

  const { seekPreviewTime, seekPreviewDirection, startAcceleratedSeek, stopAcceleratedSeek } =
    useSeekManager(currentTime, duration, seek);

  // Skip intro detection
  const { show: showSkipIntro, skipToTime } = useSkipIntro(chapters, currentTime);

  // Next episode detection
  const { show: showNextEpisode, nextEpisode, loading: loadingNextEpisode } = useNextEpisode({
    itemId,
    accessToken,
    userId,
    currentTime,
    duration,
    paused,
  });

  const handleSkipIntro = useCallback(() => {
    if (skipToTime != null) {
      seek(skipToTime);
    }
  }, [skipToTime, seek]);

  const handlePlayNextEpisode = useCallback(() => {
    if (!nextEpisode) return;

    const nextItemId = nextEpisode.Id;
    const nextMovieUrl = nextEpisode.Id
      ? `${JellyfinClient.SERVER_URL}/Videos/${nextEpisode.Id}/stream?static=true`
      : movie;

    navigation.replace('Player', {
      movie: nextMovieUrl,
      headerImage: JellyfinClient.getItemImageUrl(nextItemId ?? ''),
      itemId: nextItemId ?? undefined,
      title: nextEpisode.Name ?? 'Next Episode',
      accessToken,
      userId,
    });
  }, [nextEpisode, movie, navigation, accessToken, userId]);

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

        {/* Skip Intro button — renders independently of VideoOverlay visibility */}
        {!SHOW_NATIVE_CONTROLS && (
          <SkipIntroButton
            visible={showSkipIntro}
            onSkip={handleSkipIntro}
          />
        )}

        {/* Next Episode button — renders independently of VideoOverlay visibility */}
        {!SHOW_NATIVE_CONTROLS && (
          <NextEpisodeButton
            visible={showNextEpisode}
            episodeTitle={nextEpisode?.Name}
            episodeNumber={nextEpisode?.IndexNumber}
            seasonNumber={nextEpisode?.ParentIndexNumber}
            loading={loadingNextEpisode}
            onPlay={handlePlayNextEpisode}
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