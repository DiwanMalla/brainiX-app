import { useEvent } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
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
  progress: {
    completed?: boolean;
    completedAt?: string;
    createdAt?: string;
    id?: string;
    lastPosition?: number;
    updatedAt?: string;
    watchedSeconds?: number;
  }[];
};

type ContentDisplayProps = {
  lesson: Lesson | undefined;
  normalizeYouTubeUrl: (url: string | null | undefined) => string | null;
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
  const videoRef = useRef<VideoView>(null); // Adjusted for VideoView
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  console.log(lesson);
  // Initialize video player with YouTube URL
  const normalizedVideoUrl =
    lesson?.type === "VIDEO" ? normalizeYouTubeUrl(lesson.videoUrl) : null;
  const player = useVideoPlayer(normalizedVideoUrl, (player) => {
    player.play();
  });

  // Handle playing state with useEvent
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const toggleFullscreen = async () => {
    if (isFullscreen) {
      await videoRef.current?.exitFullscreen();
    } else {
      await videoRef.current?.enterFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleBookmark = () => {
    console.log("Bookmark clicked");
  };

  if (!lesson) return null;

  return (
    <View style={styles.contentDisplayContainer}>
      <TouchableOpacity style={styles.minimizeButton} onPress={onMinimize}>
        <ChevronDown color="#fff" size={20} />
      </TouchableOpacity>
      {lesson.type === "VIDEO" ? (
        <>
          {normalizedVideoUrl && isValidYouTubeUrl(normalizedVideoUrl) ? (
            <>
              {isVideoLoading && (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.loadingText}>Loading video...</Text>
                </View>
              )}
              <VideoView
                ref={videoRef}
                player={player}
                style={styles.video}
                nativeControls
                allowsFullscreen
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
          ) : (
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
  } as const, // Ensure styles are typed as ViewStyle
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  } as const,
  loadingText: {
    color: "#fff",
    fontSize: 16,
  } as const,
  videoControls: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    gap: 10,
  } as const,
  controlButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 8,
    borderRadius: 5,
  } as const,
  scrollContainer: {
    flex: 1,
    width: "100%",
    padding: 10,
    overflow: "scroll",
  } as const,
  textContent: {
    fontSize: 16,
    color: "#fff",
  } as const,
  placeholderText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  } as const,
});

export default ContentDisplay;
