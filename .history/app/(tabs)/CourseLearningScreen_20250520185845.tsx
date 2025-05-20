import LessonContent from "@/components/my-learning/LessonContent";
import VideoPlayer from "@/components/my-learning/VideoPlayer";
import { Course, Lesson, Module, Note } from "@/types/my-learning";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Constants from "expo-constants";
import { debounce } from "lodash";
import { useEffect, useState } from "react";
import {
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

type RootStackParamList = {
  CourseLearning: { slug: string };
  Auth: { tab: string; redirect: string };
  Course: { slug: string };
  NotFound: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "CourseLearning">;

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ||
  "https://braini-x-one.vercel.app";

// Component 1: CourseHeader (Displays course title and instructor)
const CourseHeader = ({ course }: { course: Course | null }) => {
  if (!course) return null;
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.courseTitle}>{course.title}</Text>
      <Text style={styles.instructorName}>
        Instructor: {course.instructor?.name || "Unknown"}
      </Text>
    </View>
  );
};

// Component 2: ContentDisplay (Renders video, quiz, flashcard, or article)
const ContentDisplay = ({
  lesson,
  normalizeYouTubeUrl,
  isValidYouTubeUrl,
  handleProgress,
  courseId,
  setVideoError,
}: {
  lesson: Lesson | undefined;
  normalizeYouTubeUrl: (url: string | null) => string | null;
  isValidYouTubeUrl: (url: string | null) => boolean;
  handleProgress: (state: { playedSeconds: number; played: number }) => void;
  courseId: string;
  setVideoError: (error: string | null) => void;
}) => {
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

// Component 3: ContentTabs (Tabs for Syllabus, AI Quiz, Notes, etc.)
const ContentTabs = ({
  course,
  activeModule,
  activeLesson,
  setActiveModule,
  setActiveLesson,
  notes,
  setNotes,
  markLessonComplete,
  setIsVideoLoading,
}: {
  course: Course | null;
  activeModule: number;
  activeLesson: number;
  setActiveModule: (index: number) => void;
  setActiveLesson: (index: number) => void;
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  markLessonComplete: () => void;
  setIsVideoLoading: (loading: boolean) => void;
}) => {
  const [activeTab, setActiveTab] = useState<
    "syllabus" | "aiQuiz" | "notes" | "more"
  >("syllabus");

  const renderSyllabus = () => (
    <FlatList
      data={course?.modules}
      keyExtractor={(module) => module.id}
      renderItem={({ item: module, index: moduleIndex }) => (
        <View style={styles.moduleContainer}>
          <Text style={styles.moduleTitle}>{module.title}</Text>
          {module.lessons.map((lesson, lessonIndex) => (
            <View key={lesson.id} style={styles.lessonContainer}>
              <TouchableOpacity
                onPress={() => {
                  setActiveModule(moduleIndex);
                  setActiveLesson(lessonIndex);
                  setIsVideoLoading(lesson.type === "VIDEO");
                }}
                style={[
                  styles.lessonItem,
                  activeModule === moduleIndex && activeLesson === lessonIndex
                    ? styles.activeLesson
                    : null,
                ]}
              >
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonStatus}>
                  {lesson.progress[0]?.completed
                    ? "Completed"
                    : "Not Completed"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={markLessonComplete}
                style={styles.markCompleteButton}
                disabled={lesson.progress[0]?.completed}
              >
                <Text style={styles.markCompleteText}>
                  {lesson.progress[0]?.completed
                    ? "Completed"
                    : "Mark as Complete"}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
      style={styles.syllabusList}
    />
  );

  return (
    <View style={styles.tabsContainer}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "syllabus" && styles.activeTab]}
          onPress={() => setActiveTab("syllabus")}
        >
          <Text style={styles.tabText}>Syllabus</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "aiQuiz" && styles.activeTab]}
          onPress={() => setActiveTab("aiQuiz")}
        >
          <Text style={styles.tabText}>AI Quiz</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "notes" && styles.activeTab]}
          onPress={() => setActiveTab("notes")}
        >
          <Text style={styles.tabText}>Notes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "more" && styles.activeTab]}
          onPress={() => setActiveTab("more")}
        >
          <Text style={styles.tabText}>More</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tabContent}>
        {activeTab === "syllabus" && renderSyllabus()}
        {activeTab === "aiQuiz" && (
          <Text style={styles.placeholderText}>AI Quiz Placeholder</Text>
        )}
        {activeTab === "notes" && (
          <LessonContent
            course={course}
            lesson={course?.modules[activeModule]?.lessons[activeLesson]}
            activeModule={activeModule}
            activeLesson={activeLesson}
            setActiveModule={setActiveModule}
            setActiveLesson={setActiveLesson}
            notes={notes}
            setNotes={setNotes}
            markLessonComplete={markLessonComplete}
          />
        )}
        {activeTab === "more" && (
          <Text style={styles.placeholderText}>More Content Placeholder</Text>
        )}
      </View>
    </View>
  );
};

export default function CourseLearningScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { slug } = route.params as { slug: string };
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  const showToast = (
    title: string,
    description: string,
    variant: "default" | "destructive" = "default"
  ) => {
    Toast.show({
      type: variant === "destructive" ? "error" : "success",
      text1: title,
      text2: description,
      visibilityTime: 5000,
    });
  };

  const normalizeYouTubeUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const youtubeRegex =
        /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(youtubeRegex);
      if (match && match[1]) return `https://www.youtube.com/embed/${match[1]}`;
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
  };

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      showToast(
        "Authentication Required",
        "Please sign in to access this course.",
        "destructive"
      );
      navigation.navigate("Auth", {
        tab: "signin",
        redirect: `/courses/${slug}/learn`,
      });
      return;
    }

    const fetchCourse = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/courses/${slug}/content`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch course");
        setCourse(data);
        if (data.modules[0]?.lessons[0]) {
          setActiveModule(0);
          setActiveLesson(0);
          setIsVideoLoading(data.modules[0].lessons[0].type === "VIDEO");
        }
        const totalLessons = data.modules.reduce(
          (sum: number, module: Module) => sum + module.lessons.length,
          0
        );
        const completedLessons = data.modules.reduce(
          (sum: number, module: Module) =>
            sum +
            module.lessons.filter(
              (lesson: Lesson) => lesson.progress[0]?.completed
            ).length,
          0
        );
        setProgress(
          totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
        );
      } catch (err) {
        console.error("Course fetch error", err);
        showToast(
          "Error",
          err instanceof Error ? err.message : "Unable to load course.",
          "destructive"
        );
        if (err instanceof Error && err.message.includes("not enrolled")) {
          navigation.navigate("Course", { slug });
        } else if (err instanceof Error && err.message.includes("not found")) {
          navigation.navigate("NotFound");
        } else if (
          err instanceof Error &&
          err.message.includes("Unauthorized")
        ) {
          navigation.navigate("Auth", {
            tab: "signin",
            redirect: `/courses/${slug}/learn`,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [isLoaded, isSignedIn, slug, navigation]);

  useEffect(() => {
    if (!course || !course.modules[activeModule]?.lessons[activeLesson]) return;
    const currentLesson = course.modules[activeModule].lessons[activeLesson];
    setIsVideoLoading(currentLesson.type === "VIDEO");

    const fetchNotes = async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `${API_BASE_URL}/api/courses/notes?courseId=${course.id}&lessonId=${currentLesson.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch notes");
        setNotes(await res.json());
      } catch (err) {
        console.error("Notes fetch error", err);
        showToast(
          "Error",
          err instanceof Error ? err.message : "Unable to load notes.",
          "destructive"
        );
      }
    };

    fetchNotes();
  }, [course, activeModule, activeLesson]);

  const markLessonComplete = async () => {
    if (!course || !course.modules[activeModule]?.lessons[activeLesson]) {
      showToast("Error", "No lesson selected.", "destructive");
      return;
    }

    const currentLesson = course.modules[activeModule].lessons[activeLesson];
    if (currentLesson.progress[0]?.completed) {
      showToast(
        "Lesson Already Completed",
        `${currentLesson.title} is already marked as complete.`
      );
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/courses/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          courseId: course.id,
          lessonId: currentLesson.id,
          completed: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to update progress");
      const updatedLesson = {
        ...currentLesson,
        progress: [{ completed: true, completedAt: new Date() }],
        completed: true,
      };
      setCourse((prev) => {
        if (!prev) return prev;
        const newModules = [...prev.modules];
        newModules[activeModule] = {
          ...newModules[activeModule],
          lessons: newModules[activeModule].lessons.map((lesson, lIdx) =>
            lIdx === activeLesson ? updatedLesson : lesson
          ),
        };
        return { ...prev, modules: newModules };
      });

      const totalLessons = course.modules.reduce(
        (sum, module) => sum + module.lessons.length,
        0
      );
      const completedLessons = course.modules.reduce(
        (sum, module) =>
          sum +
          module.lessons.filter((lesson) => lesson.progress[0]?.completed)
            .length,
        0
      );
      setProgress(
        totalLessons > 0 ? ((completedLessons + 1) / totalLessons) * 100 : 0
      );

      showToast(
        "Lesson Completed",
        `${currentLesson.title} marked as complete! Progress: ${Math.round(
          progress
        )}%`
      );

      if (activeLesson < course.modules[activeModule].lessons.length - 1) {
        setActiveLesson(activeLesson + 1);
        setIsVideoLoading(
          course.modules[activeModule].lessons[activeLesson + 1].type ===
            "VIDEO"
        );
      } else if (activeModule < course.modules.length - 1) {
        setActiveModule(activeModule + 1);
        setActiveLesson(0);
        setIsVideoLoading(
          course.modules[activeModule + 1].lessons[0].type === "VIDEO"
        );
      }
    } catch (err) {
      console.error("markLessonComplete: Error", err);
      showToast(
        "Error",
        err instanceof Error
          ? err.message
          : "Failed to mark lesson as complete.",
        "destructive"
      );
    }
  };

  const handleProgress = debounce(
    async (state: { playedSeconds: number; played: number }) => {
      if (!course || !course.modules[activeModule]?.lessons[activeLesson])
        return;
      const currentLesson = course.modules[activeModule].lessons[activeLesson];
      const watchedSeconds = Math.floor(state.playedSeconds);
      const lastPosition = watchedSeconds;

      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/courses/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            courseId: course.id,
            lessonId: currentLesson.id,
            watchedSeconds,
            lastPosition,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json();
          showToast(
            "Error",
            errorData.error || "Failed to update video progress.",
            "destructive"
          );
        } else {
          setCourse((prev) => {
            if (!prev) return prev;
            const newModules = [...prev.modules];
            newModules[activeModule] = {
              ...newModules[activeModule],
              lessons: newModules[activeModule].lessons.map((lesson, lIdx) =>
                lIdx === activeLesson
                  ? { ...lesson, progress: [{ watchedSeconds, lastPosition }] }
                  : lesson
              ),
            };
            return { ...prev, modules: newModules };
          });
        }
      } catch (err) {
        console.error("handleProgress: Error", err);
        showToast("Error", "Failed to update video progress.", "destructive");
      }
    },
    15000
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) return null;

  const currentLesson = course.modules[activeModule]?.lessons[activeLesson];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
      >
        <CourseHeader course={course} />
        <View style={styles.stickyContainer}>
          <ContentDisplay
            lesson={currentLesson}
            normalizeYouTubeUrl={normalizeYouTubeUrl}
            isValidYouTubeUrl={isValidYouTubeUrl}
            handleProgress={handleProgress}
            courseId={course.id}
            setVideoError={setVideoError}
          />
          {videoError && currentLesson?.type === "VIDEO" && (
            <Text style={styles.errorText}>
              Error loading video: {videoError}
            </Text>
          )}
          <ContentTabs
            course={course}
            activeModule={activeModule}
            activeLesson={activeLesson}
            setActiveModule={setActiveModule}
            setActiveLesson={setActiveLesson}
            notes={notes}
            setNotes={setNotes}
            markLessonComplete={markLessonComplete}
            setIsVideoLoading={setIsVideoLoading}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollView: { flex: 1 },
  stickyContainer: { backgroundColor: "#fff" },
  headerContainer: {
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  courseTitle: { fontSize: 24, fontWeight: "bold", color: "#333" },
  instructorName: { fontSize: 16, color: "#666", marginTop: 4 },
  contentDisplayContainer: {
    height: 200, // Adjust based on video player or content height
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  tabsContainer: { flex: 1, marginTop: 8 },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
    backgroundColor: "#fff",
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  tabText: { fontSize: 16, color: "#333" },
  tabContent: { padding: 16, minHeight: 300 },
  moduleContainer: { marginBottom: 16 },
  moduleTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  lessonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lessonItem: {
    flex: 1,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
  activeLesson: { backgroundColor: "#e6f0ff" },
  lessonTitle: { fontSize: 16, color: "#333" },
  lessonStatus: { fontSize: 14, color: "#666", marginTop: 4 },
  markCompleteButton: {
    marginLeft: 8,
    padding: 8,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    opacity: 0.9,
  },
  markCompleteText: { color: "#fff", fontSize: 14 },
  syllabusList: { flexGrow: 0 },
  placeholderText: { fontSize: 16, color: "#666", textAlign: "center" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 18, color: "#333" },
  errorText: { color: "red", textAlign: "center", marginVertical: 10 },
});
