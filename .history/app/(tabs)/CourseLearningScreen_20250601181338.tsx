import ContentDisplay from "@/components/my-learning/ContentDisplay";
import ContentTabs from "@/components/my-learning/ContentTab";
import CourseHeader from "@/components/my-learning/CourseHeader";
import { Course, Lesson, Module, Note } from "@/types/my-learning";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Constants from "expo-constants";
import { debounce } from "lodash";
import { ChevronUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Dimensions,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const { height } = Dimensions.get("window");

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ||
  "https://braini-x-one.vercel.app";

type RootStackParamList = {
  CourseLearning: { slug: string };
  Auth: { tab: string; redirect: string };
  Course: { slug: string };
  NotFound: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, "CourseLearning">;

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
  const [isMinimized, setIsMinimized] = useState(false);

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
        if (!res.ok) throw new Error("Failed to update progress");
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
      {!isMinimized && (
        <ContentDisplay
          lesson={currentLesson}
          normalizeYouTubeUrl={normalizeYouTubeUrl}
          isValidYouTubeUrl={isValidYouTubeUrl}
          handleProgress={handleProgress}
          courseId={course.id}
          setVideoError={setVideoError}
          onMinimize={() => setIsMinimized(true)}
        />
      )}
      {videoError && currentLesson?.type === "VIDEO" && (
        <Text style={styles.errorText}>Error loading video: {videoError}</Text>
      )}
      {isMinimized ? (
        <View style={styles.minimizedContainer}>
          <TouchableOpacity
            onPress={() => setIsMinimized(false)}
            style={styles.restoreButton}
          >
            <ChevronUp color="#fff" size={20} />
          </TouchableOpacity>
          <Text style={styles.minimizedText}>My Learning</Text>
          <Text style={styles.minimizedCourse}>{course.title}</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          <CourseHeader course={course} />
          <View style={styles.stickyTabsWrapper}>
            <ContentTabs
              course={course}
              activeModule={activeModule}
              activeLesson={activeLesson}
              setActiveModule={setActiveModule}
              setActiveLesson={setActiveLesson}
              notes={notes}
              setNotes={setNotes}
              markLessonComplete={() => {
                handleProgress;
              }}
              setIsVideoLoading={() => {}}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 50,
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContainer: {
    flex: 1,
    marginTop: height * 0.3,
  },
  scrollContent: {
    paddingBottom: 100,
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
    position: "absolute",
    top: height * 0.3,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  minimizedContainer: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: "#1c1c1e",
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    zIndex: 30,
  },
  restoreButton: {
    padding: 5,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 15,
  },
  minimizedText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  minimizedCourse: {
    fontSize: 14,
    color: "#ccc",
  },
  stickyTabsWrapper: {
    zIndex: 5,
    backgroundColor: "#1c1c1e",
    position: "relative",
    top: 0,
  },
});
