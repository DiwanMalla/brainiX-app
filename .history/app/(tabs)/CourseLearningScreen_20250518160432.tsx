import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { debounce } from "lodash";
import Pusher from "pusher-js";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { PanGestureHandler } from "react-native-gesture-handler";
import Markdown from "react-native-markdown-display";
import * as Progress from "react-native-progress";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Video from "react-native-video";

const BASE_URL = "https://braini-x-one.vercel.app";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface Course {
  id: string;
  slug: string;
  title: string;
  modules: Module[];
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  type: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "LIVE";
  videoUrl?: string;
  content?: string;
  description?: string;
  duration?: number;
  isPreview?: boolean;
  progress: {
    completed?: boolean;
    watchedSeconds?: number;
    lastPosition?: number;
  }[];
}

interface Note {
  id: string;
  content: string;
  lessonId: string;
  courseId: string;
  createdAt: string;
  updatedAt: string;
}

interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  message: string;
  time: string;
  likes: number;
  isInstructor?: boolean;
}

export default function CourseLearningScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { getToken, isSignedIn } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const translateX = useSharedValue(0);
  const headerHeight = useSharedValue(80);

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

  useEffect(() => {
    if (!isSignedIn || !slug) {
      router.push(`/auth?tab=signin&redirect=/courses/${slug}/learn`);
      return;
    }

    const fetchCourse = async () => {
      setIsLoading(true);
      try {
        const cached = await AsyncStorage.getItem(`course_${slug}`);
        const cachedTimestamp = await AsyncStorage.getItem(
          `course_${slug}_timestamp`
        );
        const now = Date.now();

        if (
          cached &&
          cachedTimestamp &&
          now - parseInt(cachedTimestamp) < CACHE_TTL
        ) {
          console.log("Loaded course from cache");
          const cachedCourse = JSON.parse(cached);
          setCourse(cachedCourse);
          calculateProgress(cachedCourse);
          setIsLoading(false);
          return;
        }

        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/courses/${slug}/content`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch course");
        }
        setCourse(data);
        calculateProgress(data);

        await AsyncStorage.setItem(`course_${slug}`, JSON.stringify(data));
        await AsyncStorage.setItem(`course_${slug}_timestamp`, now.toString());
      } catch (err) {
        console.error("Error fetching course:", err);
        setVideoError("Failed to load course");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourse();
  }, [isSignedIn, slug]);

  useEffect(() => {
    if (!course || !course.modules[activeModule]?.lessons[activeLesson]) return;

    const fetchNotes = async () => {
      try {
        const lessonId = course.modules[activeModule].lessons[activeLesson].id;
        const token = await getToken();
        const res = await fetch(
          `${BASE_URL}/api/courses/notes?courseId=${course.id}&lessonId=${lessonId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        setNotes(data);
      } catch (err) {
        console.error("Error fetching notes:", err);
      }
    };

    fetchNotes();
  }, [course, activeModule, activeLesson]);

  useEffect(() => {
    const pusher = new Pusher("YOUR_PUSHER_KEY", {
      cluster: "YOUR_PUSHER_CLUSTER",
    });
    const channel = pusher.subscribe(`course-${slug}`);
    channel.bind("new-message", (data: ChatMessage) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [slug]);

  const calculateProgress = (courseData: Course) => {
    const totalLessons = courseData.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0
    );
    const completedLessons = courseData.modules.reduce(
      (sum, module) =>
        sum +
        module.lessons.filter((lesson) => lesson.progress[0]?.completed).length,
      0
    );
    const newProgress =
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    setProgress(newProgress);
  };

  const markLessonComplete = async () => {
    if (!course || !course.modules[activeModule]?.lessons[activeLesson]) return;
    const currentLesson = course.modules[activeModule].lessons[activeLesson];
    if (currentLesson.progress[0]?.completed) return;

    try {
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/courses/progress`, {
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

      setCourse((prev) => {
        if (!prev) return prev;
        const newModules = [...prev.modules];
        newModules[activeModule].lessons[activeLesson].progress = [
          { completed: true, completedAt: new Date().toISOString() },
        ];
        return { ...prev, modules: newModules };
      });
      calculateProgress({ ...course, modules: course.modules });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (activeLesson < course.modules[activeModule].lessons.length - 1) {
        setActiveLesson(activeLesson + 1);
      } else if (activeModule < course.modules.length - 1) {
        setActiveModule(activeModule + 1);
        setActiveLesson(0);
      }
    } catch (err) {
      console.error("Error marking lesson complete:", err);
    }
  };

  const handleProgress = debounce(
    async ({ currentTime }: { currentTime: number }) => {
      if (!course || !course.modules[activeModule]?.lessons[activeLesson])
        return;
      const currentLesson = course.modules[activeModule].lessons[activeLesson];
      const watchedSeconds = Math.floor(currentTime);

      try {
        const token = await getToken();
        const res = await fetch(`${BASE_URL}/api/courses/progress`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            courseId: course.id,
            lessonId: currentLesson.id,
            watchedSeconds,
            lastPosition: watchedSeconds,
          }),
        });
        if (!res.ok) throw new Error("Failed to update video progress");
      } catch (err) {
        console.error("Error updating video progress:", err);
      }
    },
    15000
  );

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;
    try {
      const token = await getToken();
      const response = await fetch(`${BASE_URL}/api/courses/${slug}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: chatMessage }),
      });
      if (!response.ok) throw new Error("Failed to send message");
      setChatMessage("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleGesture = ({ nativeEvent }: any) => {
    translateX.value = nativeEvent.translationX;
    if (nativeEvent.state === 5) {
      if (
        nativeEvent.translationX < -50 &&
        activeLesson < course!.modules[activeModule].lessons.length - 1
      ) {
        setActiveLesson(activeLesson + 1);
      } else if (nativeEvent.translationX > 50 && activeLesson > 0) {
        setActiveLesson(activeLesson - 1);
      }
      translateX.value = withTiming(0);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    height: headerHeight.value,
    paddingVertical: headerHeight.value > 60 ? 15 : 10,
  }));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  if (!course) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText style={styles.errorText}>Course not found</ThemedText>
      </SafeAreaView>
    );
  }

  const currentLesson = course.modules[activeModule]?.lessons[activeLesson];

  return (
    <SafeAreaView style={styles.container}>
      <PanGestureHandler onGestureEvent={handleGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          <Animated.View style={[styles.header, headerStyle]}>
            <Pressable onPress={() => router.push("/my-learning")}>
              <Ionicons name="chevron-back" size={24} color="#a500ff" />
            </Pressable>
            <ThemedText style={styles.headerTitle} numberOfLines={1}>
              {course.title}
            </ThemedText>
            <View style={styles.headerIcons}>
              <Pressable onPress={() => setShowNotes(!showNotes)}>
                <Ionicons name="pencil" size={24} color="#a500ff" />
              </Pressable>
              <Pressable onPress={() => setShowDiscussion(!showDiscussion)}>
                <Ionicons name="chatbubbles" size={24} color="#a500ff" />
              </Pressable>
              <Pressable onPress={() => bottomSheetRef.current?.expand()}>
                <Ionicons name="menu" size={24} color="#a500ff" />
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.progressContainer}>
            <Progress.Circle
              size={60}
              progress={progress / 100}
              color="#00ff88"
              unfilledColor="#333"
              borderWidth={0}
              thickness={6}
              showsText
              textStyle={styles.progressText}
              formatText={() => `${Math.round(progress)}%`}
            />
          </View>

          {currentLesson?.type === "VIDEO" && currentLesson.videoUrl ? (
            <View style={styles.videoContainer}>
              {isVideoLoading && (
                <ActivityIndicator
                  size="large"
                  color="#ffffff"
                  style={styles.videoLoading}
                />
              )}
              {videoError ? (
                <View style={styles.videoError}>
                  <ThemedText style={styles.errorText}>{videoError}</ThemedText>
                  <Pressable
                    style={styles.retryButton}
                    onPress={() => setVideoError(null)}
                  >
                    <ThemedText style={styles.retryButtonText}>
                      Retry
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <Video
                  source={{
                    uri:
                      normalizeYouTubeUrl(currentLesson.videoUrl) ||
                      currentLesson.videoUrl,
                  }}
                  style={styles.video}
                  controls
                  resizeMode="contain"
                  onLoad={() => setIsVideoLoading(false)}
                  onError={() => {
                    setIsVideoLoading(false);
                    setVideoError("Failed to load video");
                  }}
                  onProgress={handleProgress}
                />
              )}
            </View>
          ) : (
            <View style={styles.lessonContent}>
              <ThemedText style={styles.lessonTitle}>
                {currentLesson?.title}
              </ThemedText>
              <Markdown style={markdownStyles}>
                {currentLesson?.description || "No content available."}
              </Markdown>
            </View>
          )}

          <View style={styles.controls}>
            <Pressable
              style={styles.controlButton}
              onPress={() => {
                if (activeLesson > 0) {
                  setActiveLesson(activeLesson - 1);
                } else if (activeModule > 0) {
                  setActiveModule(activeModule - 1);
                  setActiveLesson(
                    course.modules[activeModule - 1].lessons.length - 1
                  );
                }
              }}
              disabled={activeLesson === 0 && activeModule === 0}
            >
              <ThemedText style={styles.controlButtonText}>Previous</ThemedText>
            </Pressable>
            <Pressable
              style={[
                styles.controlButton,
                {
                  backgroundColor: currentLesson?.progress[0]?.completed
                    ? "#333"
                    : "#a500ff",
                },
              ]}
              onPress={markLessonComplete}
              disabled={currentLesson?.progress[0]?.completed}
            >
              <ThemedText style={styles.controlButtonText}>
                {currentLesson?.progress[0]?.completed
                  ? "Completed"
                  : "Mark Complete"}
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.controlButton}
              onPress={() => {
                if (
                  activeLesson <
                  course.modules[activeModule].lessons.length - 1
                ) {
                  setActiveLesson(activeLesson + 1);
                } else if (activeModule < course.modules.length - 1) {
                  setActiveModule(activeModule + 1);
                  setActiveLesson(0);
                }
              }}
              disabled={
                activeLesson ===
                  course.modules[activeModule].lessons.length - 1 &&
                activeModule === course.modules.length - 1
              }
            >
              <ThemedText style={styles.controlButtonText}>Next</ThemedText>
            </Pressable>
          </View>

          {showNotes && (
            <View style={styles.notesContainer}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
                <Pressable onPress={() => setShowNotes(false)}>
                  <Ionicons name="close" size={24} color="#a500ff" />
                </Pressable>
              </View>
              <TextInput
                style={styles.noteInput}
                placeholder="Add a note..."
                placeholderTextColor="#aaa"
                value={newNoteContent}
                onChangeText={setNewNoteContent}
              />
              <Pressable
                style={styles.addNoteButton}
                onPress={async () => {
                  if (!newNoteContent.trim()) return;
                  try {
                    const token = await getToken();
                    const res = await fetch(`${BASE_URL}/api/courses/notes`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        courseId: course.id,
                        lessonId: currentLesson?.id,
                        content: newNoteContent,
                      }),
                    });
                    const newNote = await res.json();
                    setNotes([newNote, ...notes]);
                    setNewNoteContent("");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  } catch (err) {
                    console.error("Error adding note:", err);
                  }
                }}
              >
                <ThemedText style={styles.addNoteButtonText}>
                  Add Note
                </ThemedText>
              </Pressable>
              {notes
                .filter((note) => note.lessonId === currentLesson?.id)
                .map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <ThemedText style={styles.noteContent}>
                      {note.content}
                    </ThemedText>
                    <Pressable
                      onPress={async () => {
                        try {
                          const token = await getToken();
                          await fetch(`${BASE_URL}/api/courses/notes`, {
                            method: "DELETE",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ noteId: note.id }),
                          });
                          setNotes(notes.filter((n) => n.id !== note.id));
                        } catch (err) {
                          console.error("Error deleting note:", err);
                        }
                      }}
                    >
                      <Ionicons name="trash" size={20} color="#ff5252" />
                    </Pressable>
                  </View>
                ))}
            </View>
          )}

          {showDiscussion && (
            <View style={styles.discussionContainer}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Discussion</ThemedText>
                <Pressable onPress={() => setShowDiscussion(false)}>
                  <Ionicons name="close" size={24} color="#a500ff" />
                </Pressable>
              </View>
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Type your message..."
                  placeholderTextColor="#aaa"
                  value={chatMessage}
                  onChangeText={setChatMessage}
                />
                <Pressable onPress={sendChatMessage} style={styles.sendButton}>
                  <Ionicons name="send" size={20} color="#a500ff" />
                </Pressable>
              </View>
              {messages.map((msg) => (
                <View key={msg.id} style={styles.messageItem}>
                  <ThemedText style={styles.messageUser}>{msg.user}</ThemedText>
                  <ThemedText style={styles.messageContent}>
                    {msg.message}
                  </ThemedText>
                  <ThemedText style={styles.messageTime}>{msg.time}</ThemedText>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </PanGestureHandler>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={["50%", "90%"]}
        backgroundStyle={{ backgroundColor: "#1c1c1e" }}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sidebarContent}>
          <ThemedText style={styles.sidebarTitle}>Course Content</ThemedText>
          <View style={styles.sidebarProgress}>
            <ThemedText style={styles.sidebarProgressText}>
              {course.modules.length} modules •{" "}
              {course.modules.reduce((sum, m) => sum + m.lessons.length, 0)}{" "}
              lessons
            </ThemedText>
            <ThemedText style={styles.sidebarProgressText}>
              {Math.round(progress)}% complete
            </ThemedText>
          </View>
          {course.modules.map((module, moduleIndex) => (
            <View key={module.id} style={styles.moduleItem}>
              <ThemedText style={styles.moduleTitle}>{module.title}</ThemedText>
              {module.lessons.map((lesson, lessonIndex) => (
                <Pressable
                  key={lesson.id}
                  style={[
                    styles.lessonItem,
                    moduleIndex === activeModule &&
                      lessonIndex === activeLesson &&
                      styles.activeLesson,
                  ]}
                  onPress={() => {
                    setActiveModule(moduleIndex);
                    setActiveLesson(lessonIndex);
                    bottomSheetRef.current?.close();
                  }}
                >
                  <ThemedText style={styles.lessonTitle}>
                    {lesson.title}
                  </ThemedText>
                  <ThemedText style={styles.lessonMeta}>
                    {lesson.type} •{" "}
                    {lesson.duration
                      ? `${Math.floor(lesson.duration / 60)}:${(
                          lesson.duration % 60
                        )
                          .toString()
                          .padStart(2, "0")}`
                      : "N/A"}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ))}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    backgroundColor: "#000",
    borderBottomWidth: 1,
    borderBottomColor: "#1c1c1e",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    flex: 1,
    marginHorizontal: 10,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 15,
  },
  progressContainer: {
    alignItems: "center",
    padding: 15,
  },
  progressText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  videoContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#000",
  },
  video: {
    flex: 1,
  },
  videoLoading: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  videoError: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  lessonContent: {
    padding: 15,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
  },
  controlButton: {
    backgroundColor: "#1c1c1e",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: "center",
  },
  controlButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  notesContainer: {
    backgroundColor: "#1c1c1e",
    padding: 15,
    borderRadius: 10,
    margin: 15,
  },
  discussionContainer: {
    backgroundColor: "#1c1c1e",
    padding: 15,
    borderRadius: 10,
    margin: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  noteInput: {
    backgroundColor: "#333",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  addNoteButton: {
    backgroundColor: "#a500ff",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  addNoteButtonText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  noteItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    marginBottom: 5,
  },
  noteContent: {
    fontSize: 14,
    color: "#fff",
    flex: 1,
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  chatInput: {
    flex: 1,
    backgroundColor: "#333",
    color: "#fff",
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#1c1c1e",
    padding: 10,
    borderRadius: 8,
  },
  messageItem: {
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    marginBottom: 5,
  },
  messageUser: {
    fontSize: 14,
    fontWeight: "600",
    color: "#a500ff",
  },
  messageContent: {
    fontSize: 14,
    color: "#fff",
  },
  messageTime: {
    fontSize: 12,
    color: "#aaa",
  },
  sidebarContent: {
    padding: 15,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  sidebarProgress: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sidebarProgressText: {
    fontSize: 14,
    color: "#ccc",
  },
  moduleItem: {
    marginBottom: 15,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  lessonItem: {
    padding: 10,
    backgroundColor: "#222",
    borderRadius: 8,
    marginBottom: 5,
  },
  activeLesson: {
    backgroundColor: "#a500ff",
  },
  lessonMeta: {
    fontSize: 12,
    color: "#ccc",
  },
  errorText: {
    fontSize: 16,
    color: "#ff5252",
    textAlign: "center",
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: "#a500ff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});

const markdownStyles = {
  body: {
    color: "#fff",
    fontSize: 14,
  },
  heading1: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  heading2: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
};
