import { StyleSheet, Text, View } from "react-native";
import VideoPlayer from "./VideoPlayer"; // Assuming VideoPlayer exists

type ContentDisplayProps = {
  lesson: { type: string; url?: string } | undefined;
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
  if (!lesson) return null;

  return (
    <View style={styles.contentDisplayContainer}>
      {lesson.type === "VIDEO" && (
        <VideoPlayer
          lesson={lesson}
          normalizeYouTubeUrl={normalizeYouTubeUrl}
          isValidYouTubeUrl={isValidYouTubeUrl}
          handleProgress={handleProgress}
          courseId={courseId}
          setVideoError={setVideoError}
        />
      )}
      {lesson.type === "QUIZ" && (
        <Text style={styles.placeholderText}>Quiz Content Placeholder</Text>
      )}
      {lesson.type === "FLASHCARD" && (
        <Text style={styles.placeholderText}>
          Flashcard Content Placeholder
        </Text>
      )}
      {lesson.type === "ARTICLE" && (
        <Text style={styles.placeholderText}>Article Content Placeholder</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  contentDisplayContainer: {
    height: 200,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
});

export default ContentDisplay;
