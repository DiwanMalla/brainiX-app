import LessonContent from "@/components/my-learning/LessonContent";
import VideoPlayer from "@/components/my-learning/VideoPlayer"; // Uncomment if reintegrating
import { Course, Lesson, Module, Note } from "@/types/my-learning";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Constants from "expo-constants";
import { debounce } from "lodash";
import { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
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
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
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
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
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
    if (!isLoaded) {
      console.log("useEffect: Waiting for auth to load");
      return;
    }

    if (!isSignedIn || !user) {
      console.log("useEffect: User not signed in, redirecting to Auth");
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
      console.log("useEffect: Fetching course", { slug });
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/courses/${slug}/content`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        console.log("fetchCourse: API response", data);
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch course");
        }
        setCourse(data);

        if (data.modules[0]?.lessons[0]) {
          setActiveModule(0);
          setActiveLesson(0);
          // Reset video loading state when fetching a new course
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
        const newProgress =
          totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        setProgress(newProgress);
        console.log("useEffect: Course fetched", {
          courseId: data.id,
          progress: newProgress,
        });
      } catch (err: unknown) {
        console.error("useEffect: Course fetch error", {
          message: err instanceof Error ? err.message : "Unknown error",
          slug,
        });
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
    if (!course || !course.modules[activeModule]?.lessons[activeLesson]) {
      console.log("useEffect: No course or lesson for notes fetch", {
        course,
        activeModule,
        activeLesson,
      });
      return;
    }

    // Reset video loading state when switching lessons
    const currentLesson = course.modules[activeModule].lessons[activeLesson];
    setIsVideoLoading(currentLesson.type === "VIDEO");

    const fetchNotes = async () => {
      try {
        const lessonId = currentLesson.id;
        console.log("useEffect: Fetching notes", {
          courseId: course.id,
          lessonId,
        });
        const token = await getToken();
        const res = await fetch(
          `${API_BASE_URL}/api/courses/notes?courseId=${course.id}&lessonId=${lessonId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to fetch notes");
        }
        const data = await res.json();
        setNotes(data);
        console.log("useEffect: Notes fetched", { notesCount: data.length });
      } catch (err: unknown) {
        console.error("useEffect: Notes fetch error", {
          message: err instanceof Error ? err.message : "Unknown error",
          courseId: course?.id,
          lessonId: course?.modules[activeModule]?.lessons[activeLesson]?.id,
        });
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
      console.log("markLessonComplete: Invalid course or lesson", {
        course,
        activeModule,
        activeLesson,
      });
      showToast("Error", "No lesson selected.", "destructive");
      return;
    }

    const currentLesson = course.modules[activeModule].lessons[activeLesson];
    console.log("markLessonComplete: Starting", {
      courseId: course.id,
      lessonId: currentLesson.id,
      activeModule,
      activeLesson,
      isCompleted: currentLesson.progress[0]?.completed || false,
    });

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

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update progress");
      }

      const updatedLesson = {
        ...currentLesson,
        progress: currentLesson.progress.length
          ? [
              {
                ...currentLesson.progress[0],
                completed: true,
                completedAt: new Date(),
              },
            ]
          : [{ completed: true, completedAt: new Date() }],
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
      const newProgress =
        totalLessons > 0 ? ((completedLessons + 1) / totalLessons) * 100 : 0;
      setProgress(newProgress);

      showToast(
        "Lesson Completed",
        `${currentLesson.title} marked as complete! Progress: ${Math.round(
          newProgress
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
    } catch (err: unknown) {
      console.error("markLessonComplete: Error", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
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
      if (!course || !course.modules[activeModule]?.lessons[activeLesson]) {
        console.log("handleProgress: No course or lesson available");
        return;
      }

      const currentLesson = course.modules[activeModule].lessons[activeLesson];
      const watchedSeconds = Math.floor(state.playedSeconds);
      const lastPosition = watchedSeconds;

      console.log("handleProgress: Updating", {
        courseId: course.id,
        lessonId: currentLesson.id,
        watchedSeconds,
      });

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
          console.error("handleProgress: Failed", errorData);
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
                  ? {
                      ...lesson,
                      progress: lesson.progress.length
                        ? [
                            {
                              ...lesson.progress[0],
                              watchedSeconds,
                              lastPosition,
                            },
                          ]
                        : [{ watchedSeconds, lastPosition }],
                    }
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

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) {
      console.log("sendChatMessage: Empty message, aborting");
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/courses/${slug}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: chatMessage }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      showToast(
        "Message Sent",
        "Your message has been sent to the discussion."
      );
      setChatMessage("");
    } catch (err: unknown) {
      console.error("sendChatMessage: Error", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      showToast(
        "Error",
        err instanceof Error ? err.message : "Unable to send message.",
        "destructive"
      );
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading course...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) {
    return null;
  }

  const currentLesson = course.modules[activeModule]?.lessons[activeLesson];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mainContent}>
        {videoError && currentLesson?.type === "VIDEO" && (
          <Text style={styles.errorText}>
            Error loading video: {videoError}
          </Text>
        )}
        {currentLesson?.type === "VIDEO" && (
          <VideoPlayer
            lesson={currentLesson}
            normalizeYouTubeUrl={normalizeYouTubeUrl}
            isValidYouTubeUrl={isValidYouTubeUrl}
            handleProgress={handleProgress}
            courseId={course.id}
          />
        )}
        <LessonContent
          course={course}
          lesson={currentLesson}
          activeModule={activeModule}
          activeLesson={activeLesson}
          setActiveModule={setActiveModule}
          setActiveLesson={setActiveLesson}
          notes={notes}
          setNotes={setNotes}
          setVideoError={setVideoError}
          setIsVideoLoading={setIsVideoLoading}
          markLessonComplete={markLessonComplete}
        />
        {showSidebar && (
          <View style={styles.sidebar}>
            {/* <CourseContentSidebar ... /> */}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#333",
  },
  errorText: {
    color: "red",
    textAlign: "center",
    marginBottom: 10,
  },
  sidebar: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
  },
});
