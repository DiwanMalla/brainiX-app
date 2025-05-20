import CourseContentSidebar from "@/components/CourseContentSidebar"; // Assuming this is the syllabus component
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Course, Lesson, Module, Note } from "@/types/my-learning";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import Constants from "expo-constants";
import { debounce } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import Video from "react-native-video";

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
const { width, height } = Dimensions.get("window");

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
  const [activeTab, setActiveTab] = useState("content");
  const [newNote, setNewNote] = useState("");
  const videoRef = useRef(null);
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = ["50%"];

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
          {
            headers: { Authorization: `Bearer ${token}` },
          }
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

  const addNote = () => {
    if (newNote.trim()) {
      const newNoteObj: Note = {
        id: Math.random().toString(),
        content: newNote,
        lessonId: course?.modules[activeModule].lessons[activeLesson].id || "",
        courseId: course?.id || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes([...notes, newNoteObj]);
      setNewNote("");
      showToast("Note Added", "Your note has been saved!");
    }
  };

  const openMore = () => {
    bottomSheetModalRef.current?.present();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a500ff" />
          <ThemedText style={styles.loadingText}>Loading course...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (!course) return null;

  const currentLesson = course.modules[activeModule]?.lessons[activeLesson];
  const normalizedVideoUrl = normalizeYouTubeUrl(currentLesson?.videoUrl);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Video Player Section (30% height) */}
        <ThemedView style={styles.videoContainer}>
          {currentLesson?.type === "VIDEO" && currentLesson.videoUrl ? (
            <>
              {isVideoLoading && !videoError && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                  <ThemedText style={styles.loadingText}>
                    Loading video...
                  </ThemedText>
                </View>
              )}
              {videoError ? (
                <View style={styles.errorContainer}>
                  <Feather name="x-circle" size={40} color="#ff4444" />
                  <ThemedText style={styles.errorText}>{videoError}</ThemedText>
                  {isValidYouTubeUrl(currentLesson.videoUrl) && (
                    <ThemedText style={styles.errorSubText}>
                      This video may have embedding restrictions. Try opening in
                      YouTube.
                    </ThemedText>
                  )}
                  <Pressable
                    onPress={() => setVideoError(null)}
                    style={styles.retryButton}
                  >
                    <ThemedText style={styles.retryText}>Retry</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <Video
                  ref={videoRef}
                  source={{ uri: normalizedVideoUrl || currentLesson.videoUrl }}
                  style={styles.video}
                  controls
                  resizeMode="contain"
                  onProgress={handleProgress}
                  onError={(e) => {
                    setVideoError("Failed to load video.");
                    setIsVideoLoading(false);
                  }}
                  onLoadStart={() => setIsVideoLoading(true)}
                  onLoad={() => setIsVideoLoading(false)}
                />
              )}
            </>
          ) : (
            <View style={styles.placeholder}>
              <Feather name="alert-circle" size={40} color="#ccc" />
              <ThemedText style={styles.placeholderText}>
                No video available
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* Title and Instructor Section (20% height) */}
        <ThemedView style={styles.headerSection}>
          <ThemedText style={styles.lessonTitle}>
            {currentLesson?.title || "Lesson Title"}
          </ThemedText>
          <ThemedText style={styles.instructor}>
            Instructor: {course?.instructor?.name || "Unknown"}
          </ThemedText>
        </ThemedView>

        {/* Tabbed Sections */}
        <View style={styles.tabBar}>
          {["content", "ai-quiz", "notes", "more"].map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab && styles.activeTab]}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Content Section */}
        {activeTab === "content" && (
          <ThemedView style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Syllabus</ThemedText>
            <CourseContentSidebar
              course={course}
              progress={progress}
              activeModule={activeModule}
              activeLesson={activeLesson}
              setActiveModule={setActiveModule}
              setActiveLesson={setActiveLesson}
              notes={notes}
              setNotes={setNotes}
              setVideoError={setVideoError}
              setIsVideoLoading={setIsVideoLoading}
            />
          </ThemedView>
        )}

        {/* AI Quiz Section */}
        {activeTab === "ai-quiz" && (
          <ThemedView style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>AI Quiz</ThemedText>
            {currentLesson?.quiz?.length > 0 ? (
              <QuizSection lesson={currentLesson} />
            ) : (
              <ThemedText style={styles.noContentText}>
                No quiz available
              </ThemedText>
            )}
          </ThemedView>
        )}

        {/* Notes Section */}
        {activeTab === "notes" && (
          <ThemedView style={styles.contentSection}>
            <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
            <ScrollView style={styles.notesList}>
              {notes.length > 0 ? (
                notes.map((note, idx) => (
                  <ThemedView key={idx} style={styles.noteItem}>
                    <ThemedText style={styles.noteText}>
                      {note.content}
                    </ThemedText>
                  </ThemedView>
                ))
              ) : (
                <ThemedText style={styles.noContentText}>
                  No notes yet
                </ThemedText>
              )}
            </ScrollView>
            <View style={styles.noteInputContainer}>
              <TextInput
                value={newNote}
                onChangeText={setNewNote}
                placeholder="Add a note..."
                style={styles.noteInput}
                multiline
              />
              <Pressable onPress={addNote} style={styles.addNoteButton}>
                <ThemedText style={styles.addNoteText}>Add</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}

        {/* More Section (Bottom Sheet) */}
        {activeTab === "more" && (
          <BottomSheetModal
            ref={bottomSheetModalRef}
            index={0}
            snapPoints={snapPoints}
            onDismiss={() => setActiveTab("content")}
            backgroundStyle={styles.bottomSheet}
          >
            <View style={styles.bottomSheetContent}>
              <Pressable
                onPress={() => setActiveTab("about")}
                style={styles.bottomSheetItem}
              >
                <Feather name="info" size={20} color="#fff" />
                <ThemedText style={styles.bottomSheetText}>
                  About This Course
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("resources")}
                style={styles.bottomSheetItem}
              >
                <Feather name="book" size={20} color="#fff" />
                <ThemedText style={styles.bottomSheetText}>
                  Other Resources
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("discussion")}
                style={styles.bottomSheetItem}
              >
                <Feather name="message-circle" size={20} color="#fff" />
                <ThemedText style={styles.bottomSheetText}>
                  Discussion
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("certificate")}
                style={styles.bottomSheetItem}
              >
                <Feather name="award" size={20} color="#fff" />
                <ThemedText style={styles.bottomSheetText}>
                  Course Certificate
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setActiveTab("content")}
                style={styles.closeButton}
              >
                <Feather name="x" size={24} color="#ff4444" />
              </Pressable>
            </View>
          </BottomSheetModal>
        )}

        {/* About This Course Section */}
        {activeTab === "about" && (
          <ThemedView style={styles.bottomSheetContent}>
            <ThemedText style={styles.bottomSheetTitle}>
              About This Course
            </ThemedText>
            <ThemedText style={styles.bottomSheetDetail}>
              Course: {course?.title || "Sample Course"}
            </ThemedText>
            <ThemedText style={styles.bottomSheetDetail}>
              Instructor: {course?.instructor?.name || "Unknown"}
            </ThemedText>
            <ThemedText style={styles.bottomSheetDetail}>
              Duration: {course?.duration || "N/A"} mins
            </ThemedText>
            <ThemedText style={styles.bottomSheetDetail}>
              Total Lessons:{" "}
              {course?.modules.reduce(
                (sum, mod) => sum + mod.lessons.length,
                0
              )}
            </ThemedText>
            <Pressable
              onPress={() => setActiveTab("content")}
              style={styles.backButton}
            >
              <ThemedText style={styles.backText}>Back</ThemedText>
            </Pressable>
          </ThemedView>
        )}
        {/* Add similar sections for resources, discussion, certificate if needed */}
      </ScrollView>
    </SafeAreaView>
  );
}

const QuizSection = ({ lesson }: { lesson: Lesson }) => {
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const handleQuizSubmit = () => {
    if (lesson.quiz) {
      let score = 0;
      lesson.quiz.forEach((q) => {
        if (quizAnswers[q.id] === q.correctAnswer) score++;
      });
      setQuizScore(score);
      setQuizSubmitted(true);
      Toast.show({
        type: "success",
        text1: "Quiz Submitted",
        text2: `Score: ${score} / ${lesson.quiz.length}`,
      });
    }
  };

  return (
    <>
      {lesson.quiz.map((q) => (
        <View key={q.id} style={styles.quizItem}>
          <ThemedText style={styles.quizQuestion}>{q.question}</ThemedText>
          <RadioButton.Group
            onValueChange={(value) =>
              setQuizAnswers({ ...quizAnswers, [q.id]: value })
            }
            value={quizAnswers[q.id] || ""}
          >
            {q.options.map((option, idx) => (
              <View key={idx} style={styles.radioOption}>
                <RadioButton value={option} disabled={quizSubmitted} />
                <ThemedText style={styles.radioText}>{option}</ThemedText>
              </View>
            ))}
          </RadioButton.Group>
          {quizSubmitted && (
            <ThemedText
              style={[
                styles.quizResult,
                quizAnswers[q.id] === q.correctAnswer
                  ? styles.correct
                  : styles.incorrect,
              ]}
            >
              {quizAnswers[q.id] === q.correctAnswer
                ? "Correct!"
                : `Incorrect. Correct: ${q.correctAnswer}`}
            </ThemedText>
          )}
        </View>
      ))}
      {!quizSubmitted ? (
        <Pressable onPress={handleQuizSubmit} style={styles.submitButton}>
          <ThemedText style={styles.submitText}>Submit Quiz</ThemedText>
        </Pressable>
      ) : (
        <ThemedText style={styles.quizScore}>
          Score: {quizScore} / {lesson.quiz.length}
        </ThemedText>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  scrollContent: { paddingBottom: 20 },
  videoContainer: {
    height: height * 0.3,
    width: "100%",
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    marginHorizontal: 10,
    overflow: "hidden",
  },
  video: { width: "100%", height: "100%" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  loadingText: { color: "#fff", fontSize: 16, marginTop: 10 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  errorText: { color: "#ff4444", fontSize: 16, marginVertical: 10 },
  errorSubText: {
    color: "#ccc",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
  },
  retryButton: { backgroundColor: "#a500ff", padding: 10, borderRadius: 5 },
  retryText: { color: "#fff", fontSize: 14 },
  placeholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  placeholderText: { color: "#ccc", fontSize: 16 },
  headerSection: { height: height * 0.2, padding: 15, marginHorizontal: 10 },
  lessonTitle: { fontSize: 24, color: "#fff", fontWeight: "bold" },
  instructor: { fontSize: 16, color: "#ccc", marginTop: 5 },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
    marginHorizontal: 10,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#fff",
  },
  activeTab: { backgroundColor: "#a500ff", borderColor: "#a500ff" },
  tabText: { color: "#fff", fontSize: 16 },
  activeTabText: { color: "#fff", fontWeight: "600" },
  contentSection: { marginHorizontal: 10, marginTop: 10 },
  sectionTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 10,
  },
  quizItem: { marginBottom: 15 },
  quizQuestion: { fontSize: 16, color: "#fff", marginBottom: 10 },
  radioOption: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  radioText: { color: "#fff", fontSize: 14 },
  quizResult: { fontSize: 14, marginTop: 5 },
  correct: { color: "#00ff88" },
  incorrect: { color: "#ff4444" },
  submitButton: {
    backgroundColor: "#a500ff",
    padding: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  quizScore: { fontSize: 16, color: "#fff", fontWeight: "bold", marginTop: 10 },
  notesList: { maxHeight: 200 },
  noteItem: {
    padding: 10,
    backgroundColor: "#1c1c1e",
    borderRadius: 5,
    marginBottom: 5,
  },
  noteText: { color: "#fff", fontSize: 14 },
  noteInputContainer: {
    flexDirection: "row",
    marginTop: 10,
    alignItems: "center",
  },
  noteInput: {
    flex: 1,
    backgroundColor: "#1c1c1e",
    color: "#fff",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  addNoteButton: { backgroundColor: "#a500ff", padding: 10, borderRadius: 5 },
  addNoteText: { color: "#fff", fontSize: 14 },
  noContentText: { color: "#ccc", fontSize: 16, textAlign: "center" },
  bottomSheet: { backgroundColor: "#1c1c1e" },
  bottomSheetContent: { padding: 20 },
  bottomSheetItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  bottomSheetText: { color: "#fff", fontSize: 16, marginLeft: 10 },
  bottomSheetTitle: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 10,
  },
  bottomSheetDetail: { fontSize: 16, color: "#ccc", marginBottom: 5 },
  closeButton: { position: "absolute", top: 10, left: 10 },
  backButton: {
    backgroundColor: "#a500ff",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  backText: { color: "#fff", fontSize: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
});
