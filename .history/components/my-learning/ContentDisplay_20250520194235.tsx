import Video from "expo-video";
import {
  Bookmark,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react-native";
import { useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Lesson = {
  id: string;
  title: string;
  type: string;
  videoUrl?: string | null;
  content?: string | null;
  duration?: number;
  isPreview?: boolean;
  progress: { completed?: boolean }[];
};

type ContentDisplayProps = {
  lesson: Lesson | undefined;
  normalizeYouTubeUrl: (url: string | null) => string | null;
  isValidYouTubeUrl: (url: string | null) => boolean;
  handleProgress: (state: { playedSeconds: number; played: number }) => void;
  courseId: string;
  setVideoError: (error: string | null) => void;
  onMinimize: () => void;
};

const ContentDisplay = ({
  lesson,
  normalizeYouTubeUrl,
  isValidYouTubeUrl,
  handleProgress,
  courseId,
  setVideoError,
  onMinimize,
}: ContentDisplayProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  console.log(lesson);
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Implement fullscreen logic using expo-video's fullScreenUpdate if needed
    // videoRef.current?.presentFullscreenPlayer();
  };

  const handleBookmark = () => {
    console.log("Bookmark clicked");
  };

  const normalizedVideoUrl =
    lesson?.type === "VIDEO"
      ? normalizeYouTubeUrl(lesson.videoUrl ?? null)
      : null;

  if (!lesson) return null;

  return (
    <View style={styles.contentDisplayContainer}>
      <TouchableOpacity style={styles.minimizeButton} onPress={onMinimize}>
        <ChevronDown color="#fff" size={20} />
      </TouchableOpacity>
      {lesson.type === "VIDEO" ? (
        <>
          {normalizedVideoUrl && (
            <>
              {isVideoLoading && !videoError && (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.loadingText}>Loading video...</Text>
                </View>
              )}
              <Video
                ref={videoRef}
                source={{ uri: normalizedVideoUrl }}
                style={styles.video}
                useNativeControls
                onPlaybackStatusUpdate={(status) => {
                  if (status.isLoaded) {
                    setIsVideoLoading(false);
                    handleProgress({
                      playedSeconds: status.positionMillis / 1000,
                      played:
                        status.positionMillis / (status.durationMillis || 1) ||
                        0,
                    });
                  } else if (status.isBuffering) {
                    setIsVideoLoading(true);
                  } else if (status.error) {
                    setIsVideoLoading(false);
                    setVideoError("Failed to load video.");
                  }
                }}
                onError={(error) => {
                  setIsVideoLoading(false);
                  setVideoError("Video playback error.");
                }}
              />
              <View style={styles.videoControls}>
                <TouchableOpacity
                  onPress={handleBookmark}
                  style={styles.controlButton}
                >
                  <Bookmark color="#fff" size={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={toggleFullscreen}
                  style={styles.controlButton}
                >
                  {isFullscreen ? (
                    <Minimize2 color="#fff" size={20} />
                  ) : (
                    <Maximize2 color="#fff" size={20} />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
          {!normalizedVideoUrl && (
            <Text style={styles.placeholderText}>No video available</Text>
          )}
        </>
      ) : lesson.type === "TEXT" ? (
        <View style={styles.scrollContainer}>
          <Text style={styles.textContent}>
            {lesson.content || "No text content available"}
          </Text>
        </View>
      ) : lesson.type === "QUIZ" ? (
        <View style={styles.scrollContainer}>
          <Text style={styles.placeholderText}>Quiz Content Placeholder</Text>
        </View>
      ) : lesson.type === "FLASHCARD" ? (
        <View style={styles.scrollContainer}>
          <Text style={styles.placeholderText}>
            Flashcard Content Placeholder
          </Text>
        </View>
      ) : lesson.type === "ARTICLE" ? (
        <View style={styles.scrollContainer}>
          <Text style={styles.textContent}>Article Content Placeholder</Text>
        </View>
      ) : (
        <Text style={styles.placeholderText}>Content not available</Text>
      )}
    </View>
  );
};

const { height } = Dimensions.get("window");

const styles = StyleSheet.create({
  contentDisplayContainer: {
    height: height * 0.3,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  minimizeButton: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: 5,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 15,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  videoControls: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    gap: 10,
  },
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 8,
    borderRadius: 5,
  },
  scrollContainer: {
    flex: 1,
    width: "100%",
    padding: 10,
    overflow: "scroll",
  },
  textContent: {
    fontSize: 16,
    color: "#fff",
  },
  placeholderText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
});

export default ContentDisplay;
