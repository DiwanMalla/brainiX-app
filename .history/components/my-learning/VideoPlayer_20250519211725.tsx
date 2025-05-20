import { Lesson } from "@/types/globals"; // Adjust path based on your types file
import { Ionicons } from "@expo/vector-icons";
import { ResizeMode, Video } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import * as WebBrowser from "expo-web-browser";
import { debounce } from "lodash";
import React, { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface VideoPlayerProps {
  lesson: Lesson;
  normalizeYouTubeUrl: (url: string | null) => string | null;
  isValidYouTubeUrl: (url: string | null) => boolean;
  handleProgress: (state: { playedSeconds: number; played: number }) => void;
  courseId?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  lesson,
  normalizeYouTubeUrl,
  isValidYouTubeUrl,
  handleProgress,
  courseId,
}) => {
  const videoRef = useRef<Video>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Debounced progress handler
  const debouncedHandleProgress = useCallback(
    debounce(
      (state: { time: number }) => {
        const playedSeconds = Math.floor(state.time / 1000);
        handleProgress({
          playedSeconds,
          played: playedSeconds / (lesson.duration || 1),
        });
      },
      15000,
      { leading: false, trailing: true }
    ),
    [handleProgress, lesson.duration]
  );

  // Normalize video URL
  const normalizedVideoUrl = normalizeYouTubeUrl(lesson.url);

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    try {
      if (!isFullscreen) {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
        setIsFullscreen(true);
      } else {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT
        );
        setIsFullscreen(false);
      }
    } catch (err) {
      Alert.alert("Fullscreen Error", "Failed to toggle fullscreen mode.", [
        { text: "OK" },
      ]);
    }
  };

  // Retry video load
  const retryVideoLoad = () => {
    setVideoError(null);
    setIsVideoLoading(true);
    if (videoRef.current) {
      videoRef.current.playFromPositionAsync(0);
    }
  };

  // Handle bookmark action
  const handleBookmark = () => {
    Alert.alert("Bookmark Saved", "This lesson has been bookmarked.", [
      { text: "OK" },
    ]);
  };

  return (
    <View style={styles.container}>
      {videoError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{videoError}</Text>
          {isValidYouTubeUrl(lesson.url) && (
            <Text style={styles.errorSubText}>
              The video may have embedding restrictions. Try opening in YouTube.
            </Text>
          )}
          <View style={styles.errorButtons}>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retryVideoLoad}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            {isValidYouTubeUrl(lesson.url) && (
              <TouchableOpacity
                style={styles.youtubeButton}
                onPress={() => {
                  if (lesson.url) {
                    WebBrowser.openBrowserAsync(lesson.url);
                  }
                }}
              >
                <Text style={styles.youtubeButtonText}>Open in YouTube</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <>
          {isVideoLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}
          <View style={styles.videoWrapper}>
            <Video
              ref={videoRef}
              style={styles.video}
              source={{ uri: normalizedVideoUrl || lesson.url || "" }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              onPlaybackStatusUpdate={(status) => {
                if (status.isLoaded) {
                  setIsVideoLoading(false);
                  if (status.didJustFinish) {
                    handleProgress({
                      playedSeconds: status.durationMillis
                        ? status.durationMillis / 1000
                        : 0,
                      played: 1,
                    });
                  } else if (status.positionMillis) {
                    debouncedHandleProgress({ time: status.positionMillis });
                  }
                }
                if (!status.isLoaded) {
                  setIsVideoLoading(false);
                  setVideoError(
                    isValidYouTubeUrl(lesson.url)
                      ? "Cannot play YouTube video. Embedding may be disabled."
                      : "Failed to load video."
                  );
                  Alert.alert(
                    "Video Error",
                    "Unable to play the video. Please try again.",
                    [{ text: "OK" }]
                  );
                }
              }}
              onReadyForDisplay={() => {
                setIsVideoLoading(false);
                if (lesson.progress?.[0]?.lastPosition && videoRef.current) {
                  videoRef.current.playFromPositionAsync(
                    lesson.progress[0].lastPosition * 1000
                  );
                }
              }}
              onError={(error) => {
                setIsVideoLoading(false);
                setVideoError("Failed to load video.");
                Alert.alert(
                  "Video Error",
                  "Unable to play the video. Please try again.",
                  [{ text: "OK" }]
                );
              }}
              shouldPlay
            />
            <View style={styles.videoControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleBookmark}
              >
                <Ionicons name="bookmark-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleFullscreen}
              >
                <Ionicons
                  name={isFullscreen ? "contract-outline" : "expand-outline"}
                  size={20}
                  color="#ffffff"
                />
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#000000",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 2,
    marginBottom: 16,
  },
  videoWrapper: {
    position: "relative",
    paddingTop: "56.25%", // 16:9 Aspect Ratio
  },
  video: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  loadingText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "500",
    marginTop: 8,
    textAlign: "center",
  },
  errorSubText: {
    color: "#9ca3af",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  errorButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  retryButton: {
    padding: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  youtubeButton: {
    padding: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  youtubeButtonText: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "600",
  },
  videoControls: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    gap: 8,
  },
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 8,
    borderRadius: 8,
  },
});

export default VideoPlayer;
