
import React, { useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
// import { useToast } from "@clerk/clerk-expo"; // Removed: Clerk does not provide useToast for Expo
import Toast from "react-native-toast-message";
import { debounce } from "lodash";
import { Lesson } from "@/types/globals"; // Adjust path based on your types file

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
  // const { toast } = useToast(); // Removed: Clerk's toast hook for notifications
  const { toast } = useToast(); // Clerk's toast hook for notifications

  // Debounced progress handler
  const debouncedHandleProgress = useCallback(
    debounce(
      (state: { time: number }) => {
        const playedSeconds = Math.floor(state.time / 1000);
        handleProgress({ playedSeconds, played: playedSeconds / (lesson.duration || 1) });
      },
      15000,
      { leading: false, trailing: true }
    ),
    [handleProgress, lesson.duration]
  );

  // Normalize video URL
  const normalizedVideoUrl = normalizeYouTubeUrl(lesson.videoUrl);

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
      Toast.show({
        type: "error",
        text1: "Fullscreen Error",
        text2: "Failed to toggle fullscreen mode.",
      });
      });
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

  // Handle bookmark action (placeholder)
    Toast.show({
      type: "success",
      text1: "Bookmark Saved",
      text2: "This lesson has been bookmarked.",
    });
    });
  };

  return (
    <View style={styles.container}>
      {videoError ? (
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{videoError}</Text>
          {isValidYouTubeUrl(lesson.videoUrl) && (
            <Text style={styles.errorSubText}>
              The video may have embedding restrictions. Try opening in YouTube.
            </Text>
          )}
          <View style={styles.errorButtons}>
            <TouchableOpacity style={styles.retryButton} onPress={retryVideoLoad}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
            {isValidYouTubeUrl(lesson.videoUrl) && (
              <TouchableOpacity
                style={styles.youtubeButton}
                onPress={() => {
                  if (lesson.videoUrl) {
                    WebBrowser.openBrowserAsync(lesson.videoUrl);
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
              source={{ uri: normalizedVideoUrl || lesson.videoUrl || "" }}
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
                if (status.error) {
                  setIsVideoLoading(false);
                  setVideoError(
                    isValidYouTubeUrl(lesson.videoUrl)
                      ? "Cannot play YouTube video. Embedding may be disabled."
                  Toast.show({
                    type: "error",
                    text1: "Video Error",
                    text2: "Unable to play the video. Please try again.",
                  });
                    variant: "destructive",
                  });
                }
              }}
              onReadyForDisplay={() => {
                setIsVideoLoading(false);
                if (
                  lesson.progress?.[0]?.lastPosition &&
                  videoRef.current
                ) {
                  videoRef.current.playFromPositionAsync(
                    lesson.progress[0].lastPosition * 1000
                  );
                }
              }}
              onError={(error) => {
                setIsVideoLoading(false);
                setVideoError("Failed to load video.");
                toast({
                  title: "Video Error",
                  description: "Unable to play the video. Please try again.",
                  variant: "destructive",
                });
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
```

### Integration with CourseLearningScreen.tsx

To integrate the `VideoPlayer` component into the `CourseLearningScreen.tsx`, replace the video placeholder in the main content section with the `VideoPlayer` component. Here's how to update the relevant part of `CourseLearningScreen.tsx`:

1. **Import the VideoPlayer Component**:
   At the top of `CourseLearningScreen.tsx`, add:
   ```typescript
   import VideoPlayer from "./VideoPlayer"; // Adjust path based on your file structure
import Toast from "react-native-toast-message";
   ```

2. **Update the Main Content Section**:
   Replace the video placeholder in the `mainContent` section with the `VideoPlayer` component. Modify the `mainContent` rendering logic as follows:

```typescript
// Inside CourseLearningScreen.tsx, replace the videoContainer rendering
<View style={styles.mainContent}>
  {currentLesson?.type === "VIDEO" && currentLesson.url ? (
    <VideoPlayer
      lesson={currentLesson}
      normalizeYouTubeUrl={normalizeYouTubeUrl}
      isValidYouTubeUrl={isValidYouTubeUrl}
      handleProgress={handleVideoProgress}
      courseId={course.id}
    />
  ) : (
    <View style={styles.contentContainer}>
      <Text style={styles.lessonTitle}>{currentLesson?.title}</Text>
      <Tabs defaultValue="content" style={styles.tabs}>
        {/* ... rest of the Tabs code remains unchanged ... */}
      </Tabs>
      <View style={styles.navigationButtons}>
        {/* ... navigation buttons remain unchanged ... */}
      </View>
    </View>
  )}
</View>
```

3. **Add Utility Functions**:
   Ensure the `normalizeYouTubeUrl` and `isValidYouTubeUrl` functions are defined in `CourseLearningScreen.tsx`, as they are passed to `VideoPlayer`. Add them above the component definition:

```typescript
const normalizeYouTubeUrl = (url: string | null): string | null => {
  if (!url) return null;
  try {
    const youtubeRegex =
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
      return `https://www.youtube-nocookie.com/embed/${match[1]}`;
    }
    return url;
  } catch (err) {
    console.error("normalizeYouTubeUrl: Error", err);
    return url;
  }
};

const isValidYouTubeUrl = (url: string | null): boolean => {
  if (!url) return false;
  try {
    const regex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    return regex.test(url);
  } catch {
    return false;
  }
function useToast() {
    return {
        toast: ({ title, description, type = "info" }: { title: string; description?: string; type?: "success" | "error" | "info" }) => {
            Toast.show({
                type,
                text1: title,
                text2: description,
            });
        },
    };
}

