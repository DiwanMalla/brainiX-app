import Certificate from "@/components/my-learning/Certificate";
import CourseDiscussion from "@/components/my-learning/CourseDiscussion";
import CourseNotes from "@/components/my-learning/CourseNotes";
import AIGeneratedQuiz from "@/components/quiz/AIGeneratedQuiz";
import { Course, Lesson, Note } from "@/types/my-learning";
import { useAuth } from "@clerk/clerk-expo";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import RenderHTML from "react-native-render-html";
import Toast from "react-native-toast-message";

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
  progress: number;
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
  progress,
}: LessonContentProps) {
  const { width } = useWindowDimensions();
  const { getToken } = useAuth();
  const [activeTab, setActiveTab] = useState("content");
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState("");

  useEffect(() => {
    if (lesson?.type !== "VIDEO" || activeTab !== "content") {
      setIsVideoLoading(false);
      setVideoError(null);
    }
  }, [activeTab, lesson, setIsVideoLoading, setVideoError]);

  const handleMarkComplete = async () => {
    if (!lesson) return;
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
    if (activeLesson > 0) {
      setActiveLesson(activeLesson - 1);
      setVideoError(null);
      setIsVideoLoading(
        course.modules[activeModule].lessons[activeLesson - 1].type === "VIDEO"
      );
    } else if (activeModule > 0) {
      setActiveModule(activeModule - 1);
      setActiveLesson(course.modules[activeModule - 1].lessons.length - 1);
      setVideoError(null);
      setIsVideoLoading(
        course.modules[activeModule - 1].lessons[
          course.modules[activeModule - 1].lessons.length - 1
        ].type === "VIDEO"
      );
    }
  };

  const handleNext = () => {
    if (activeLesson < course.modules[activeModule].lessons.length - 1) {
      setActiveLesson(activeLesson + 1);
      setVideoError(null);
      setIsVideoLoading(
        course.modules[activeModule].lessons[activeLesson + 1].type === "VIDEO"
      );
    } else if (activeModule < course.modules.length - 1) {
      setActiveModule(activeModule + 1);
      setActiveLesson(0);
      setVideoError(null);
      setIsVideoLoading(
        course.modules[activeModule + 1].lessons[0].type === "VIDEO"
      );
    }
  };

  const handleAddNote = async (content: string = "Sample note") => {
    if (!lesson) return;
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
      if (!response.ok) throw new Error("Failed to add note");
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

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/courses/${course.slug}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: chatMessage }),
        }
      );
      if (!response.ok) throw new Error("Failed to send message");
      Toast.show({
        type: "success",
        text1: "Message Sent",
        text2: "Your message has been sent to the discussion.",
      });
      setChatMessage("");
    } catch (err) {
      console.error("sendChatMessage: Error", err);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err instanceof Error ? err.message : "Unable to send message.",
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

  const handleMoreClick = () => {
    setIsMoreMenuOpen(!isMoreMenuOpen);
    if (
      isMoreMenuOpen &&
      ["about", "resources", "discussion", "certificate"].includes(activeTab)
    ) {
      setActiveTab("content");
    }
  };

  const handleSubmenuClick = (tab: string) => {
    setActiveTab(tab);
    setIsMoreMenuOpen(false);
    if (tab === "notes") setShowNotesModal(true);
    if (tab === "discussion") setShowChatModal(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.courseTitle}>{course.title}</Text>
          <Text style={styles.instructor}>
            Instructor: {course.instructor.name}
          </Text>
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
        {["content", "ai-quiz", "notes", "more"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              (activeTab === tab ||
                (tab === "more" &&
                  ["about", "resources", "discussion", "certificate"].includes(
                    activeTab
                  ))) &&
                styles.activeTab,
            ]}
            onPress={() => {
              if (tab === "more") {
                handleMoreClick();
              } else if (tab === "notes") {
                setShowNotesModal(true);
                setActiveTab(tab);
                setIsMoreMenuOpen(false);
              } else {
                setActiveTab(tab);
                setIsMoreMenuOpen(false);
              }
            }}
          >
            <Text
              style={[
                styles.tabText,
                (activeTab === tab ||
                  (tab === "more" &&
                    [
                      "about",
                      "resources",
                      "discussion",
                      "certificate",
                    ].includes(activeTab))) &&
                  styles.activeTabText,
              ]}
            >
              {tab === "ai-quiz"
                ? "AI Quiz"
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isMoreMenuOpen && (
        <View style={styles.submenu}>
          <TouchableOpacity
            style={styles.submenuItem}
            onPress={() => handleSubmenuClick("about")}
          >
            <Text
              style={[
                styles.submenuText,
                activeTab === "about" && styles.activeSubmenuText,
              ]}
            >
              About this course content
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submenuItem}
            onPress={() => handleSubmenuClick("resources")}
          >
            <Text
              style={[
                styles.submenuText,
                activeTab === "resources" && styles.activeSubmenuText,
              ]}
            >
              Other resources
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submenuItem}
            onPress={() => handleSubmenuClick("discussion")}
          >
            <Text
              style={[
                styles.submenuText,
                activeTab === "discussion" && styles.activeSubmenuText,
              ]}
            >
              Discussion
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.submenuItem}
            onPress={() => handleSubmenuClick("certificate")}
          >
            <Text
              style={[
                styles.submenuText,
                activeTab === "certificate" && styles.activeSubmenuText,
              ]}
            >
              Course Certificate
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
        {activeTab === "ai-quiz" && (
          <View style={styles.content}>
            <AIGeneratedQuiz courseId={course.id} lessonId={lesson.id} />
          </View>
        )}
        {activeTab === "about" && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>About This Course Content</Text>
            <Text style={styles.text}>{course.description}</Text>
            <Text style={styles.text}>
              Instructor: {course.instructor.name}
            </Text>
            <Text style={styles.text}>
              Duration: {Math.floor(course.duration / 60)} minutes
            </Text>
            <Text style={styles.text}>
              Total Lessons: {course.totalLessons}
            </Text>
          </View>
        )}
        {activeTab === "resources" && (
          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Other Resources</Text>
            <Text style={styles.noContentText}>
              No resources available for this lesson.
            </Text>
          </View>
        )}
        {activeTab === "certificate" && (
          <Certificate course={course} progress={progress} />
        )}
      </ScrollView>

      <Modal visible={showNotesModal} animationType="slide">
        <CourseNotes
          course={course}
          lessonId={lesson?.id || ""}
          notes={notes}
          setNotes={setNotes}
          setShowNotes={() => setShowNotesModal(false)}
        />
      </Modal>

      <Modal visible={showChatModal} animationType="slide">
        <CourseDiscussion
          slug={course.slug}
          setShowChat={() => setShowChatModal(false)}
          chatMessage={chatMessage}
          setChatMessage={setChatMessage}
          sendChatMessage={sendChatMessage}
        />
      </Modal>
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
  header: { marginBottom: 16 },
  courseTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  instructor: { fontSize: 16, color: "#666", marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "bold", color: "#333" },
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
  previewBadge: { backgroundColor: "#e0e0e0" },
  badgeText: { fontSize: 12, color: "#333" },
  icon: { marginRight: 4 },
  description: { fontSize: 14, color: "#666", marginTop: 8 },
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
  buttonDisabled: { backgroundColor: "#ccc" },
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
  tab: { flex: 1, paddingVertical: 8, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#007bff" },
  tabText: { fontSize: 14, color: "#666" },
  activeTabText: { color: "#007bff", fontWeight: "600" },
  submenu: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 16,
    padding: 8,
  },
  submenuItem: { paddingVertical: 8, paddingHorizontal: 16 },
  submenuText: { fontSize: 14, color: "#666" },
  activeSubmenuText: { color: "#007bff", fontWeight: "600" },
  tabContent: { flex: 1 },
  content: { padding: 16, backgroundColor: "#f9f9f9", borderRadius: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  noContentText: { fontSize: 14, color: "#666" },
  list: { marginVertical: 8 },
  listItem: { fontSize: 14, color: "#333", marginBottom: 4 },
  text: { fontSize: 14, color: "#333", marginBottom: 4 },
});
