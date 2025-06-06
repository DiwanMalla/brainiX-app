import ContentDisplay from "@/components/ContentDisplay";
import ContentTabs from "@/components/ContentTabs";
import CourseHeader from "@/components/CourseHeader";
import { Course, Lesson, Module, Note } from "@/types/my-learning";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Constants from "expo-constants";
import { debounce } from "lodash";
import { useEffect, useState } from "react";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
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

  const renderItem = () => (
    <View>
      <ContentDisplay
        lesson={currentLesson}
        normalizeYouTubeUrl={normalizeYouTubeUrl}
        isValidYouTubeUrl={isValidYouTubeUrl}
        handleProgress={handleProgress}
        courseId={course.id}
        setVideoError={setVideoError}
      />
      {videoError && currentLesson?.type === "VIDEO" && (
        <Text style={styles.errorText}>Error loading video: {videoError}</Text>
      )}
      <CourseHeader course={course} />
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={[{ key: "content" }]} // Single item to render the content
        renderItem={renderItem}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={<View style={styles.headerSpacer} />}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  contentContainer: {
    paddingBottom: 20,
  },
  headerSpacer: {
    height: 200, // Space for the fixed video player
  },
  contentDisplayContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "#000",
    zIndex: 10,
  },
  headerContainer: {
    padding: 10,
    backgroundColor: "#1c1c1e",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  courseTitle: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  instructorName: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 2,
  },
  tabsContainer: {
    flex: 1,
    backgroundColor: "#1c1c1e",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "#1c1c1e",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#a500ff",
  },
  tabText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  tabContent: {
    padding: 10,
  },
  lessonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 10,
  },
  lessonItem: {
    flex: 1,
    padding: 8,
  },
  activeLesson: {
    backgroundColor: "#2c2c2e",
  },
  lessonTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  lessonStatus: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 4,
  },
  markCompleteButton: {
    padding: 8,
    backgroundColor: "#a500ff",
    borderRadius: 5,
    alignItems: "center",
  },
  completedButton: {
    backgroundColor: "#00ff88",
    opacity: 0.7,
  },
  markCompleteText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  placeholderText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#fff",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginVertical: 10,
    backgroundColor: "#1c1c1e",
    padding: 10,
  },
});
