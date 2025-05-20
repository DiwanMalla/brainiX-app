import {
  Bookmark,
  ChevronDown,
  Maximize2,
  Minimize2,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
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
  const [isFullscreenVideo, setIsFullscreenVideo] = useState(false);
  const [isFullscreenText, setIsFullscreenText] = useState(false); // New state for text fullscreen
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [playing, setPlaying] = useState(true); // Set to true for autoplay
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

  const toggleFullscreenVideo = () => {
    setIsFullscreenVideo(!isFullscreenVideo);
    // Note: react-native-youtube-iframe handles fullscreen internally via the player
  };

  const toggleFullscreenText = () => {
    setIsFullscreenText(!isFullscreenText);
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

  // Poll for progress updates every second when playing
  useEffect(() => {
    if (playing) {
      const interval = setInterval(onPlaybackProgress, 1000);
      return () => clearInterval(interval);
    }
  }, [playing, onPlaybackProgress]);

  if (!lesson) return null;

  // Markdown styles
  const markdownStyles = {
    body: {
      color: "#fff",
      fontSize: 16,
    },
    heading1: {
      fontSize: 24,
      color: "#fff",
      marginVertical: 8,
    },
    heading2: {
      fontSize: 20,
      color: "#fff",
      marginVertical: 6,
    },
    heading3: {
      fontSize: 18,
      color: "#fff",
      marginVertical: 4,
    },
    paragraph: {
      fontSize: 16,
      color: "#fff",
      marginVertical: 4,
    },
    bullet_list: {
      marginVertical: 4,
    },
    bullet_list_item: {
      color: "#fff",
      fontSize: 16,
    },
    ordered_list: {
      marginVertical: 4,
    },
    ordered_list_item: {
      color: "#fff",
      fontSize: 16,
    },
    strong: {
      fontWeight: "bold",
      color: "#fff",
    },
    em: {
      fontStyle: "italic",
      color: "#fff",
    },
    link: {
      color: "#1e90ff",
      textDecorationLine: "underline",
    },
    code_inline: {
      backgroundColor: "#333",
      color: "#fff",
      padding: 2,
      borderRadius: 3,
    },
    code_block: {
      backgroundColor: "#333",
      color: "#fff",
      padding: 10,
      borderRadius: 5,
    },
  };

  return (
    <View
      style={[
        styles.contentDisplayContainer,
        (lesson.type === "VIDEO" && isFullscreenVideo) ||
        (["TEXT", "ARTICLE"].includes(lesson.type) && isFullscreenText)
          ? styles.fullscreen
          : null,
      ]}
    >
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
                onReady={() => {
                  setIsVideoLoading(false);
                  setPlaying(true);
                }}
                onError={(error) => {
                  setIsVideoLoading(false);
                  setVideoError(`YouTube Error: ${error}`);
                }}
                onPlaybackRateChange={onPlaybackProgress}
                initialPlayerParams={{
                  controls: true,
                  modestbranding: true,
                  rel: false,
                  autoplay: true,
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
                  onPress={toggleFullscreenVideo}
                  style={styles.controlButton}
                >
                  {isFullscreenVideo ? (
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
      ) : ["TEXT", "ARTICLE"].includes(lesson.type) ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {lesson.content ? (
            <Markdown
              style={markdownStyles}
              onLinkPress={(url) => {
                Linking.openURL(url);
                return false;
              }}
            >
              {lesson.content}
            </Markdown>
          ) : (
            <Text style={styles.placeholderText}>No content available</Text>
          )}
          <View style={styles.textControls}>
            <TouchableOpacity
              onPress={handleBookmark}
              style={styles.controlButton}
            >
              <Bookmark color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleFullscreenText}
              style={styles.controlButton}
            >
              {isFullscreenText ? (
                <Minimize2 color="#fff" size={20} />
              ) : (
                <Maximize2 color="#fff" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : lesson.type === "QUIZ" ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <Text style={styles.placeholderText}>Quiz Content Placeholder</Text>
          <View style={styles.textControls}>
            <TouchableOpacity
              onPress={handleBookmark}
              style={styles.controlButton}
            >
              <Bookmark color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleFullscreenText}
              style={styles.controlButton}
            >
              {isFullscreenText ? (
                <Minimize2 color="#fff" size={20} />
              ) : (
                <Maximize2 color="#fff" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : lesson.type === "FLASHCARD" ? (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContentContainer}
        >
          <Text style={styles.placeholderText}>
            Flashcard Content Placeholder
          </Text>
          <View style={styles.textControls}>
            <TouchableOpacity
              onPress={handleBookmark}
              style={styles.controlButton}
            >
              <Bookmark color="#fff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleFullscreenText}
              style={styles.controlButton}
            >
              {isFullscreenText ? (
                <Minimize2 color="#fff" size={20} />
              ) : (
                <Maximize2 color="#fff" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  fullscreen: {
    height: "100%", // Fullscreen height
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
  } as const,
  scrollContentContainer: {
    padding: 10,
    paddingBottom: 60, // Extra padding at the bottom for controls
  } as const,
  textControls: {
    position: "absolute",
    bottom: 10,
    right: 10,
    flexDirection: "row",
    gap: 10,
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
