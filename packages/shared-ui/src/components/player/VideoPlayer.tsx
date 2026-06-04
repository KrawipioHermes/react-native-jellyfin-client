import React, { useMemo } from "react";
import Video, { VideoRef } from "react-native-video";
import {
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";

interface VideoPlayerProps {
  movie: string;
  headerImage: string;
  paused: boolean;
  controls: boolean;
  onBuffer: (isBuffering: boolean) => void;
  onProgress: (currentTime: number) => void;
  onLoad: (duration: number) => void;
  onEnd: () => void;
  // Track selection props for react-native-video
  selectedTextTrack?: { type: string; value: string | number };
  selectedAudioTrack?: { type: string; value: string | number };
}

const VideoPlayer = React.memo(
  React.forwardRef<VideoRef, VideoPlayerProps>(
    (
      {
        movie,
        headerImage,
        paused,
        controls,
        onBuffer,
        onProgress,
        onLoad,
        onEnd,
        selectedTextTrack,
        selectedAudioTrack,
      },
      ref,
    ) => {
      const { width } = useWindowDimensions();

      // Memoize source object to prevent unnecessary re-renders
      const videoSource = useMemo(() => ({ uri: movie }), [movie]);

      // Memoize poster object to prevent unnecessary re-renders
      const posterConfig = useMemo(
        () =>
          Platform.OS === "web"
            ? {}
            : {
                source: { uri: headerImage },
                resizeMode: "cover" as const,
                style: { width: "100%", height: "100%" } as const,
              },
        [headerImage],
      );

      // Memoize track selection props to prevent unnecessary re-renders
      const textTrackConfig = useMemo(
        () => selectedTextTrack,
        [selectedTextTrack?.type, selectedTextTrack?.value],
      );

      const audioTrackConfig = useMemo(
        () => selectedAudioTrack,
        [selectedAudioTrack?.type, selectedAudioTrack?.value],
      );

      // Calculate video style based on current dimensions
      const videoStyle = useMemo(
        () => [
          videoPlayerStyles.video,
          { height: width * (9 / 16) },
        ],
        [width],
      );

      return (
        <Video
          ref={ref}
          source={videoSource}
          style={videoStyle}
          controls={controls}
          paused={paused}
          onBuffer={({ isBuffering }) => onBuffer(isBuffering)}
          onProgress={({ currentTime }) => onProgress(currentTime)}
          onLoad={({ duration }) => onLoad(duration)}
          onEnd={onEnd}
          poster={posterConfig}
          resizeMode="cover"
          selectedTextTrack={textTrackConfig}
          selectedAudioTrack={audioTrackConfig}
        />
      );
    },
  ),
);

const videoPlayerStyles = StyleSheet.create({
  video: {
    width: "100%",
  },
});

export default VideoPlayer;