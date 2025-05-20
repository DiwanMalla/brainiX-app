import { Bookmark, Maximize2, Minimize2 } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import VideoPlayer from "./VideoPlayer"; // Assuming VideoPlayer exists

type ContentDisplayProps = {
  lesson:
    | {
        type: string;
        url?: string;
        videoUrl?: string;
        content?: string;
        quiz?: any[];
        assignment?: any;
      }
    | undefined;
  normalizeYouTubeUrl: (url: string | null) => string | null;
  isValidYouTubeUrl: (url: string | null) => boolean;
  handleProgress: (state: { playedSeconds: number; played: number }) => void;
  courseId: string;
  setVideoError: (error: string | null) => void;
};

const ContentDisplay = ({
  lesson,
  normalizeYouTubeUrl,
  isValidYouTubeUrl,
  handleProgress,
  courseId,
  setVideoError,
}: ContentDisplayProps) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Fullscreen logic for mobile can be implemented using libraries like react-native-fullscreen
  };

  const handleBookmark = () => {
    // Implement bookmark functionality if needed
    console.log("Bookmark clicked");
  };

  if (!lesson) return null;

  return (
    <View style={styles.contentDisplayContainer}>
      {lesson.type === "VIDEO" ? (
        <>
          <VideoPlayer
            lesson={lesson}
            normalizeYouTubeUrl={normalizeYouTubeUrl}
            isValidYouTubeUrl={isValidYouTubeUrl}
            handleProgress={handleProgress}
            courseId={courseId}
            setVideoError={setVideoError}
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

const styles = StyleSheet.create({
  contentDisplayContainer: {
    height: "30%", // 30% of the screen height
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
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
