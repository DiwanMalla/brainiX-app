import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { TabView, SceneMap, TabBar } from "react-native-tab-view";
import { Dimensions } from "react-native";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import { debounce } from "lodash";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Define interfaces for data structures
interface ContentItem {
  id: string;
  title: string;
  type: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "LIVE";
  duration?: number;
  url?: string;
  description?: string;
  content?: string;
  quiz?: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
  progress?: {
    completed: boolean;
    watchedSeconds?: number;
    lastPosition?: number;
  }[];
}

interface Module {
  id: string;
  title: string;
  lessons: ContentItem[];
}

interface Course {
  id: string;
  title: string;
  slug: string;
  modules: Module[];
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
  message: string;
  time: string;
  likes: number;
  isInstructor?: boolean;
}

const CourseLearningScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState(0);
const CourseLearningScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeModule, setActiveModule] = useState(0);
  const [activeLesson, setActiveLesson] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
  const { getToken } = useAuth();
  const scrollRef = useRef<ScrollView>(null);
      try {
        const token = await getToken();
        if (!token) {
          setError("Authentication token not available");
          setLoading(false);
          return;
        }

        const apiUrl = `https://braini-x-one.vercel.app/api/courses/${slug}/content`;
        const res = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setCourse(res.data);
        if (res.data.modules[0]?.lessons[0]) {
          setActiveModule(0);
          setActiveLesson(0);
        }

        const totalLessons = res.data.modules.reduce(
          (sum: number, module: Module) => sum + module.lessons.length,
          0
        );
        const completedLessons = res.data.modules.reduce(
          (sum: number, module: Module) =>
            sum +
            module.lessons.filter(
              (lesson: ContentItem) => lesson.progress?.[0]?.completed
            ).length,
          0
        );
        setProgress(
          totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0
        );
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to fetch content"
        );
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCourseContent();
    } else {
      setError("No course slug provided");
      setLoading(false);
    }
  }, [slug, getToken]);

  // Fetch notes for the current lesson
  useEffect(() => {
    if (!course || !course.modules[activeModule]?.lessons[activeLesson]) return;

    const fetchNotes = async () => {
      try {
        const token = await getToken();
        const lessonId = course.modules[activeModule].lessons[activeLesson].id;
        const res = await axios.get(
          `https://braini-x-one.vercel.app/api/courses/notes?courseId=${course.id}&lessonId=${lessonId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setNotes(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch notes");
      }
    };

    fetchNotes();
  }, [course, activeModule, activeLesson, getToken]);

  // Fetch chat messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = await getToken();
        const res = await axios.get(
          `https://braini-x-one.vercel.app/api/courses/${slug}/messages`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setMessages(
          res.data.map((msg: any) => ({
            id: msg.id,
            user: msg.sender.name,
            message: msg.content,
            time: new Intl.DateTimeFormat("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }).format(new Date(msg.createdAt)),
            likes: msg.likes,
            isInstructor: msg.sender.role === "INSTRUCTOR",
          }))
        );
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch messages");
      }
    };

    fetchMessages();
  }, [slug, getToken]);

  // Handle lesson selection
  const switchLesson = (moduleIndex: number, lessonIndex: number) => {
    if (
      course &&
      moduleIndex >= 0 &&
      moduleIndex < course.modules.length &&
      lessonIndex >= 0 &&
      lessonIndex < course.modules[moduleIndex].lessons.length
    ) {
      setActiveModule(moduleIndex);
      setActiveLesson(lessonIndex);
    }
  };

  // Mark lesson as complete
  const markLessonComplete = async () => {
    if (!course || !course.modules[activeModule]?.lessons[activeLesson]) return;

    const currentLesson = course.modules[activeModule].lessons[activeLesson];
    if (currentLesson.progress?.[0]?.completed) return;

    try {
      const token = await getToken();
      const res = await axios.post(
        "https://braini-x-one.vercel.app/api/courses/progress",
        {
          courseId: course.id,
          lessonId: currentLesson.id,
          completed: true,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCourse((prev) => {
        if (!prev) return prev;
        const newModules = [...prev.modules];
        newModules[activeModule] = {
          ...newModules[activeModule],
          lessons: newModules[activeModule].lessons.map((lesson, lIdx) =>
            lIdx === activeLesson
              ? {
                  ...lesson,
                  progress: [{ completed: true, completedAt: new Date() }],
                }
              : lesson
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
          module.lessons.filter((lesson) => lesson.progress?.[0]?.completed)
            .length,
        0
      );
      setProgress(
        totalLessons > 0 ? ((completedLessons + 1) / totalLessons) * 100 : 0
      );

      if (activeLesson < course.modules[activeModule].lessons.length - 1) {
        setActiveLesson(activeLesson + 1);
      } else if (activeModule < course.modules.length - 1) {
        setActiveModule(activeModule + 1);
        setActiveLesson(0);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to mark lesson complete");
    }
  };

  // Handle video progress
  const handleVideoProgress = debounce(
    async (state: { playedSeconds: number; played: number }) => {
      if (!course || !course.modules[activeModule]?.lessons[activeLesson])
        return;

      const currentLesson = course.modules[activeModule].lessons[activeLesson];
      const watchedSeconds = Math.floor(state.playedSeconds);
      try {
        const token = await getToken();
        await axios.post(
          "https://braini-x-one.vercel.app/api/courses/progress",
          {
            courseId: course.id,
            lessonId: currentLesson.id,
            watchedSeconds,
            lastPosition: watchedSeconds,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setCourse((prev) => {
          if (!prev) return prev;
          const newModules = [...prev.modules];
          newModules[activeModule] = {
            ...newModules[activeModule],
            lessons: newModules[activeModule].lessons.map((lesson, lIdx) =>
              lIdx === activeLesson
                ? {
                    ...lesson,
                    progress: lesson.progress?.length
                      ? [
                          {
                            ...lesson.progress[0],
                            watchedSeconds,
                            lastPosition: watchedSeconds,
                          },
                        ]
                      : [{ watchedSeconds, lastPosition: watchedSeconds }],
                  }
                : lesson
            ),
          };
          return { ...prev, modules: newModules };
        });
      } catch (err: any) {
        setError(
          err.response?.data?.message || "Failed to update video progress"
        );
      }
    },
    15000
  );

  // Send chat message
  const sendChatMessage = async () => {
    if (!chatMessage.trim()) return;

    try {
      const token = await getToken();
      const res = await axios.post(
        `https://braini-x-one.vercel.app/api/courses/${slug}/messages`,
        { content: chatMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessages((prev) => [
        ...prev,
        {
          id: res.data.id,
          user: res.data.sender.name,
          message: res.data.content,
          time: new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }).format(new Date(res.data.createdAt)),
          likes: res.data.likes,
          isInstructor: res.data.sender.role === "INSTRUCTOR",
        },
      ]);
      setChatMessage("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send message");
    }
  };

  // Add note
  const handleAddNote = async (content: string) => {
    if (
      !content.trim() ||
      !course ||
      !course.modules[activeModule]?.lessons[activeLesson]
    )
      return;

    try {
      const token = await getToken();
      const lessonId = course.modules[activeModule].lessons[activeLesson].id;
      const res = await axios.post(
        "https://braini-x-one.vercel.app/api/courses/notes",
        {
          courseId: course.id,
          lessonId,
          content,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotes([res.data, ...notes]);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add note");
    }
  };

  if (loading) {
    return (
      <ActivityIndicator style={styles.center} size="large" color="#3b82f6" />
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!course || course.modules.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          No content available for this course.
        </Text>
      </View>
    );
  }

  const currentLesson = course.modules[activeModule]?.lessons[activeLesson];
  const lessonNotes = notes.filter(
    (note) => note.lessonId === currentLesson?.id
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.header}>{course.title}</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Progress: {Math.round(progress)}%
          </Text>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowNotes(!showNotes)}
          >
            <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
            <Text style={styles.headerButtonText}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowChat(!showChat)}
          >
            <Ionicons name="chatbubbles-outline" size={20} color="#3b82f6" />
            <Text style={styles.headerButtonText}>Discussion</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {currentLesson?.type === "VIDEO" && currentLesson.url ? (
          <View style={styles.videoContainer}>
            <Text style={styles.lessonTitle}>{currentLesson.title}</Text>
            {/* Note: Video player implementation would require a library like expo-av */}
            <Text style={styles.placeholderText}>
              [Video Player Placeholder]
            </Text>
          </View>
        ) : (
          <View style={styles.contentContainer}>
            <Text style={styles.lessonTitle}>{currentLesson?.title}</Text>
            <Tabs defaultValue="content" style={styles.tabs}>
              <TabsList style={styles.tabsList}>
                <TabsTrigger
            <TabView
              navigationState={{
                index: tabIndex,
                routes: [
                  { key: "content", title: "Content" },
                  { key: "resources", title: "Resources" },
                  { key: "transcript", title: "Transcript" },
                  { key: "ai-quiz", title: "AI Quiz" },
                ],
              }}
              renderScene={SceneMap({
                content: () => (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabContentText}>
                      {currentLesson?.description || "No description available."}
                    </Text>
                  </View>
                ),
                resources: () => (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabContentText}>
                      No resources available for this lesson.
                    </Text>
                  </View>
                ),
                transcript: () => (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabContentText}>
                      Transcript not available for this lesson.
                    </Text>
                  </View>
                ),
                "ai-quiz": () => (
                  <View style={styles.tabContent}>
                    <Text style={styles.tabContentText}>
                      AI-generated quiz not available.
                    </Text>
                  </View>
                ),
              })}
              onIndexChange={setTabIndex}
              initialLayout={{ width: Dimensions.get("window").width }}
              renderTabBar={props => (
                <TabBar
                  {...props}
                  indicatorStyle={{ backgroundColor: "#3b82f6" }}
                  style={{ backgroundColor: "#f3f4f6" }}
                  labelStyle={{ color: "#1f2937" }}
                />
              )}
              style={styles.tabs}
            />
                  styles.navButton,
                  {
                    opacity: activeLesson === 0 && activeModule === 0 ? 0.5 : 1,
                  },
                ]}
                disabled={activeLesson === 0 && activeModule === 0}
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
              >
                <Text style={styles.navButtonText}>Previous</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  {
                    opacity: currentLesson?.progress?.[0]?.completed ? 0.5 : 1,
                  },
                ]}
                disabled={currentLesson?.progress?.[0]?.completed}
                onPress={markLessonComplete}
              >
                <Text style={styles.navButtonText}>
                  {currentLesson?.progress?.[0]?.completed
                    ? "Completed"
                    : "Mark as Complete"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  {
                    opacity:
                      activeLesson ===
                        course.modules[activeModule].lessons.length - 1 &&
                      activeModule === course.modules.length - 1
                        ? 0.5
                        : 1,
                  },
                ]}
                disabled={
                  activeLesson ===
                    course.modules[activeModule].lessons.length - 1 &&
                  activeModule === course.modules.length - 1
                }
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
              >
                <Text style={styles.navButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Notes Panel */}
      {showNotes && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Your Notes</Text>
            <TouchableOpacity onPress={() => setShowNotes(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.noteInput}
            placeholder="Write your note here..."
            multiline
            value={chatMessage}
            onChangeText={setChatMessage}
          />
          <TouchableOpacity
            style={styles.addNoteButton}
            onPress={() => handleAddNote(chatMessage)}
          >
            <Text style={styles.addNoteButtonText}>Add Note</Text>
          </TouchableOpacity>
          <FlatList
            data={lessonNotes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.noteCard}>
                <Text style={styles.noteContent}>{item.content}</Text>
                <Text style={styles.noteDate}>
                  Created: {new Date(item.createdAt).toLocaleString()}
                </Text>
              </View>
            )}
            style={styles.noteList}
          />
        </View>
      )}

      {/* Discussion Panel */}
      {showChat && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Course Discussion</Text>
            <TouchableOpacity onPress={() => setShowChat(false)}>
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>
          </View>
          <ScrollView ref={scrollRef} style={styles.chatContainer}>
            {messages.length === 0 ? (
              <Text style={styles.emptyText}>
                No messages yet. Start the discussion!
              </Text>
            ) : (
              messages.map((msg) => (
                <View key={msg.id} style={styles.messageCard}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageUser}>{msg.user}</Text>
                    {msg.isInstructor && (
                      <View style={styles.instructorBadge}>
                        <Text style={styles.instructorBadgeText}>
                          Instructor
                        </Text>
                      </View>
                    )}
                    <Text style={styles.messageTime}>{msg.time}</Text>
                  </View>
                  <Text style={styles.messageContent}>{msg.message}</Text>
                  <View style={styles.messageActions}>
                    <TouchableOpacity style={styles.messageActionButton}>
                      <Ionicons
                        name="thumbs-up-outline"
                        size={16}
                        color="#6b7280"
                      />
                      <Text style={styles.messageActionText}>{msg.likes}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
          <View style={styles.chatInputContainer}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type your message..."
              value={chatMessage}
              onChangeText={setChatMessage}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendChatMessage}
              disabled={!chatMessage.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={chatMessage.trim() ? "#3b82f6" : "#d1d5db"}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sidebar */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Course Content</Text>
        <Text style={styles.sidebarSubtitle}>
          {course.modules.length} modules •{" "}
          {course.modules.reduce(
            (total, module) => total + module.lessons.length,
            0
          )}{" "}
          lessons
        </Text>
        <FlatList
          data={course.modules}
          keyExtractor={(item) => item.id}
          renderItem={({ item: module, index: moduleIndex }) => (
            <View style={styles.moduleContainer}>
              <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>{module.title}</Text>
                {module.lessons.every(
                  (lesson) => lesson.progress?.[0]?.completed
                ) && (
                  <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                )}
              </View>
              <FlatList
                data={module.lessons}
                keyExtractor={(lesson) => lesson.id}
                renderItem={({ item: lesson, index: lessonIndex }) => (
                  <TouchableOpacity
                    style={[
                      styles.lessonCard,
                      moduleIndex === activeModule &&
                      lessonIndex === activeLesson
                        ? styles.activeLesson
                        : null,
                    ]}
                    onPress={() => switchLesson(moduleIndex, lessonIndex)}
                  >
                    <View style={styles.lessonIcon}>
                      {lesson.progress?.[0]?.completed ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#22c55e"
                        />
                      ) : (
                        <Ionicons
                          name={
                            lesson.type === "VIDEO"
                              ? "play-circle-outline"
                              : lesson.type === "TEXT"
                              ? "document-text-outline"
                              : lesson.type === "QUIZ"
                              ? "help-circle-outline"
                              : lesson.type === "ASSIGNMENT"
                              ? "pencil-outline"
                              : "calendar-outline"
                          }
                          size={24}
                          color="#6b7280"
                        />
                      )}
                    </View>
                    <View style={styles.lessonContent}>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      <View style={styles.lessonMeta}>
                        <Text style={styles.lessonType}>
                          {lesson.type.charAt(0) +
                            lesson.type.slice(1).toLowerCase()}
                        </Text>
                        {lesson.duration && (
                          <Text style={styles.lessonDuration}>
                            {Math.floor(lesson.duration / 60)}:
                            {(lesson.duration % 60).toString().padStart(2, "0")}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
          contentContainerStyle={styles.sidebarContent}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  header: { fontSize: 24, fontWeight: "bold", color: "#1f2937" },
  progressContainer: { marginTop: 8 },
  progressText: { fontSize: 14, color: "#6b7280" },
  progressBar: {
    height: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 4,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
  },
  headerButtonText: { marginLeft: 8, fontSize: 14, color: "#3b82f6" },
  mainContent: { padding: 16 },
  videoContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  contentContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    elevation: 2,
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  placeholderText: { fontSize: 16, color: "#6b7280", textAlign: "center" },
  tabs: { marginTop: 12 },
  tabsList: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
  },
  tabTrigger: {
    flex: 1,
    padding: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabContent: { marginTop: 12 },
  tabContentText: { fontSize: 14, color: "#4b5563" },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  navButton: {
    padding: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
  },
  navButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    margin: 16,
    elevation: 2,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  panelTitle: { fontSize: 16, fontWeight: "600", color: "#1f2937" },
  noteInput: {
    padding: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    minHeight: 100,
  },
  addNoteButton: {
    margin: 16,
    padding: 12,
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    alignItems: "center",
  },
  addNoteButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  noteList: { maxHeight: 300 },
  noteCard: {
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  noteContent: { fontSize: 14, color: "#4b5563" },
  noteDate: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  chatContainer: { maxHeight: 300, padding: 16 },
  messageCard: { marginBottom: 12 },
  messageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  messageUser: { fontSize: 14, fontWeight: "600", color: "#1f2937" },
  instructorBadge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instructorBadgeText: { color: "#ffffff", fontSize: 12 },
  messageTime: { fontSize: 12, color: "#6b7280" },
  messageContent: { fontSize: 14, color: "#4b5563", marginTop: 4 },
  messageActions: { flexDirection: "row", gap: 8, marginTop: 8 },
  messageActionButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  messageActionText: { fontSize: 12, color: "#6b7280" },
  chatInputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  chatInput: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
  },
  sendButton: { padding: 12, alignItems: "center", justifyContent: "center" },
  sidebar: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  sidebarSubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  sidebarContent: { paddingBottom: 16 },
  moduleContainer: { marginBottom: 12 },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  moduleTitle: { fontSize: 16, fontWeight: "600", color: "#1f2937" },
  lessonCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
  },
  activeLesson: { backgroundColor: "#e5e7eb" },
  lessonIcon: { marginRight: 12 },
  lessonContent: { flex: 1 },
  lessonType: { fontSize: 12, color: "#6b7280" },
  lessonDuration: { fontSize: 12, color: "#6b7280", marginLeft: 8 },
  lessonMeta: { flexDirection: "row", marginTop: 4 },
  errorText: { fontSize: 18, color: "#ef4444", textAlign: "center" },
  emptyText: { fontSize: 18, color: "#6b7280", textAlign: "center" },
});

export default CourseLearningScreen;
