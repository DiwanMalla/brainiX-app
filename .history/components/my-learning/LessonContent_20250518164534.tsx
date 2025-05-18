import { Course, Lesson, Note } from "@/types/my-learning";
import { useAuth } from "@clerk/clerk-expo";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Dispatch, SetStateAction, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHTML from "react-native-render-html";
import Toast from "react-native-toast-message";
// import AIGeneratedQuiz from "./AIGeneratedQuiz"; // Assume adapted for React Native

interface LessonContentProps {
  course: Course;
  lesson: Lesson | undefined;
  activeModule: number;
  activeLesson: number;
  setActiveModule: (value: number) => void;
  setActiveLesson: (value: number) => void;
  notes: Note[];
  setNotes: Dispatch<SetStateAction<Note[]>>;
  setVideoError: (value: string | null) => void;
  setIsVideoLoading: (value: boolean) => void;
  markLessonComplete: () => void;
}

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ||
  "https://braini-x-one.vercel.app";

export default function LessonContent({
  course,
  lesson,
  activeModule,
  activeLesson,
  setActiveModule,
  setActiveLesson,
  notes,
  setNotes,
  setVideoError,
  setIsVideoLoading,
  markLessonComplete,
}: LessonContentProps) {
  const { width } = useWindowDimensions();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState("content");

  const handleMarkComplete = async () => {
    if (!lesson) return;
    console.log("LessonContent: Marking lesson complete", {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    });
    try {
      await markLessonComplete();
    } catch (error) {
      console.error("Failed to mark lesson complete:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to mark lesson as complete.",
      });
    }
  };

  const handlePrevious = () => {
    console.log("LessonContent: Navigating to previous lesson");
    if (activeLesson > 0) {
      setActiveLesson(activeLesson - 1);
      setVideoError(null);
      setIsVideoLoading(true);
    } else if (activeModule > 0) {
      setActiveModule(activeModule - 1);
      setActiveLesson(course.modules[activeModule - 1].lessons.length - 1);
      setVideoError(null);
      setIsVideoLoading(true);
    }
  };

  const handleNext = () => {
    console.log("LessonContent: Navigating to next lesson");
    if (activeLesson < course.modules[activeModule].lessons.length - 1) {
      setActiveLesson(activeLesson + 1);
      setVideoError(null);
      setIsVideoLoading(true);
    } else if (activeModule < course.modules.length - 1) {
      setActiveModule(activeModule + 1);
      setActiveLesson(0);
      setVideoError(null);
      setIsVideoLoading(true);
    }
  };

  const handleAddNote = async (content: string = "Sample note") => {
    if (!lesson) return;
    console.log("LessonContent: Adding note", { lessonId: lesson.id, content });
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/courses/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          lessonId: lesson.id,
          content,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add note");
      }
      const newNote: Note = {
        id: crypto.randomUUID(),
        content,
        lessonId: lesson.id,
        courseId: course.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes((prevNotes) => [...prevNotes, newNote]);
      Toast.show({
        type: "success",
        text1: "Note Added",
        text2: "Your note has been saved.",
      });
    } catch (error) {
      console.error("LessonContent: Failed to add note", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error instanceof Error ? error.message : "Failed to add note.",
      });
    }
  };

  if (!lesson) {
    return (
      <View style={styles.container}>
        <Text style={styles.noLessonText}>No lesson selected.</Text>
      </View>
    );
  }

  const lessonNotes = notes.filter((note) => note.lessonId === lesson.id);

  const renderIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return (
          <Feather name="play" size={16} color="#333" style={styles.icon} />
        );
      case "TEXT":
        return (
          <Feather
            name="file-text"
            size={16}
            color="#333"
            style={styles.icon}
          />
        );
      case "QUIZ":
        return (
          <MaterialIcons
            name="quiz"
            size={16}
            color="#333"
            style={styles.icon}
          />
        );
      case "ASSIGNMENT":
        return (
          <Feather name="edit" size={16} color="#333" style={styles.icon} />
        );
      default:
        return (
          <MaterialIcons
            name="live-tv"
            size={16}
            color="#333"
            style={styles.icon}
          />
        );
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "N/A";
    const minutes = Math.floor(duration / 60);
    const seconds = (duration % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{lesson.title}</Text>
          <View style={styles.badgeContainer}>
            <View style={styles.badge}>
              {renderIcon(lesson.type)}
              <Text style={styles.badgeText}>
                {lesson.type.charAt(0) + lesson.type.slice(1).toLowerCase()}
              </Text>
            </View>
            <View style={styles.badge}>
              <Feather
                name="clock"
                size={16}
                color="#333"
                style={styles.icon}
              />
              <Text style={styles.badgeText}>
                {formatDuration(lesson.duration)}
              </Text>
            </View>
            {lesson.isPreview && (
              <View style={[styles.badge, styles.previewBadge]}>
                <Text style={styles.badgeText}>Preview</Text>
              </View>
            )}
          </View>
          {lesson.description && (
            <Text style={styles.description}>{lesson.description}</Text>
          )}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              activeLesson === 0 && activeModule === 0 && styles.buttonDisabled,
            ]}
            onPress={handlePrevious}
            disabled={activeLesson === 0 && activeModule === 0}
          >
            <Text style={styles.buttonText}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              lesson.progress[0]?.completed && styles.buttonDisabled,
            ]}
            onPress={handleMarkComplete}
            disabled={lesson.progress[0]?.completed}
          >
            <Text style={styles.buttonText}>
              {lesson.progress[0]?.completed
                ? "Already Completed"
                : "Mark as Complete"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              activeLesson ===
                course.modules[activeModule].lessons.length - 1 &&
                activeModule === course.modules.length - 1 &&
                styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={
              activeLesson ===
                course.modules[activeModule].lessons.length - 1 &&
              activeModule === course.modules.length - 1
            }
          >
            <Text style={styles.buttonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabList}>
        {["content", "resources", "transcript", "ai-quiz", "notes"].map(
          (tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1).replace("-", " ")}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      <ScrollView style={styles.tabContent}>
        {activeTab === "content" && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Lesson Overview</Text>
            {lesson.description ? (
              <RenderHTML
                contentWidth={width - 32}
                source={{ html: lesson.description }}
              />
            ) : (
              <Text style={styles.noContentText}>
                No description available.
              </Text>
            )}
            <Text style={styles.sectionTitle}>Learning Objectives</Text>
            <View style={styles.list}>
              <Text style={styles.listItem}>
                • Understand the fundamental principles of {course.title}
              </Text>
              <Text style={styles.listItem}>
                • Apply theoretical knowledge to practical scenarios
              </Text>
              <Text style={styles.listItem}>
                • Develop problem-solving skills through guided exercises
              </Text>
              <Text style={styles.listItem}>
                • Build a foundation for advanced topics in future lessons
              </Text>
            </View>
            <Text style={styles.sectionTitle}>Key Takeaways</Text>
            <Text style={styles.text}>
              By the end of this lesson, you should be able to confidently
              implement the concepts covered and understand how they fit into
              the broader context of {course.title}.
            </Text>
          </View>
        )}
        |{" "}
        {activeTab === "resources" && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Supplementary Materials</Text>
            <Text style={styles.noContentText}>
              No resources available for this lesson.
            </Text>
          </View>
        )}
        {activeTab === "transcript" && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Video Transcript</Text>
            <Text style={styles.noContentText}>
              Transcript not available for this lesson.
            </Text>
          </View>
        )}
        {/* {activeTab === "ai-quiz" && (
          <View style={styles.content}>
            <AIGeneratedQuiz courseId={course.id} lessonId={lesson.id} />
          </View>
        )} */}
        {activeTab === "notes" && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Lesson Notes</Text>
            {lessonNotes.length > 0 ? (
              <View style={styles.notesList}>
                {lessonNotes.map((note) => (
                  <Text key={note.id} style={styles.noteItem}>
                    {note.content}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.noContentText}>No notes available.</Text>
            )}
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={() => handleAddNote()}
            >
              <Text style={styles.buttonText}>Add Sample Note</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  previewBadge: {
    backgroundColor: "#e0e0e0",
  },
  badgeText: {
    fontSize: 12,
    color: "#333",
  },
  icon: {
    marginRight: 4,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 16,
    gap: 8,
  },
  button: {
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  tabList: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007bff",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
  },
  activeTabText: {
    color: "#007bff",
    fontWeight: "600",
  },
  tabContent: {
    flex: 1,
  },
  content: {
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  noContentText: {
    fontSize: 14,
    color: "#666",
  },
  list: {
    marginVertical: 8,
  },
  listItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    color: "#333",
  },
  notesList: {
    marginVertical: 8,
  },
  noteItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
  },
  addNoteButton: {
    backgroundColor: "#007bff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginTop: 8,
  },
});
