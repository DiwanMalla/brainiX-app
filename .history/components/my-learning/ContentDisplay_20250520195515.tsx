import {
  Bookmark,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";

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
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<YoutubePlayer>(null);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string | null): string | null => {
    if (!url) return null;
    const regex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const videoId =
    lesson?.type === "VIDEO" ? getYouTubeVideoId(lesson.videoUrl) : null;

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Note: react-native-youtube-iframe handles fullscreen internally via the player
  };

  const handleBookmark = () => {
    console.log("Bookmark clicked");
  };

  const onStateChange = useCallback((state: string) => {
    if (state === "playing") {
      setPlaying(true);
      setIsVideoLoading(false);
    } else if (state === "paused" || state === "ended") {
      setPlaying(false);
      setIsVideoLoading(false);
    } else if (state === "buffering") {
      setIsVideoLoading(true);
    } else if (state === "unstarted") {
      setIsVideoLoading(true);
    }
  }, []);

  const onPlaybackProgress = useCallback(async () => {
    const currentTime = await playerRef.current?.getCurrentTime();
    const duration = await playerRef.current?.getDuration();
    if (currentTime !== undefined && duration !== undefined) {
      handleProgress({
        playedSeconds: currentTime,
        played: duration > 0 ? currentTime / duration : 0,
      });
    }
  }, [handleProgress]);

  if (!lesson) return null;

  return (
    <View style={styles.contentDisplayContainer}>
      <TouchableOpacity style={styles.minimizeButton} onPress={onMinimize}>
        <ChevronDown color="#fff" size={20} />
      </TouchableOpacity>
      {lesson.type === "VIDEO" ? (
        <>
          {videoId && isValidYouTubeUrl(lesson.videoUrl) ? (
            <>
              {isVideoLoading && (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.loadingText}>Loading video...</Text>
                </View>
              )}
              <YoutubePlayer
                ref={playerRef}
                height={height * 0.3}
                width="100%"
                videoId={videoId}
                play={playing}
                onChangeState={onStateChange}
                onReady={() => setIsVideoLoading(false)}
                onError={(error) => {
                  setIsVideoLoading(false);
                  setVideoError(`YouTube Error: ${error}`);
                }}
                onPlaybackRateChange={onPlaybackProgress}
                initialPlayerParams={{
                  controls: true,
                  modestbranding: true,
                  rel: false,
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
  } as const,
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
