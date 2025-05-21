import { router } from "expo-router";
import {
  Award,
  BookOpen,
  FileText,
  MessageSquare,
  Share,
} from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import Lecture from "./Lecture";
import Note from "./Note";
import Quiz from "./Quiz";

type Lesson = {
  id: string;
  title: string;
  type: string;
  duration?: number;
  progress: { completed?: boolean }[];
  isPreview?: boolean;
};

type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  slug?: string;
  instructor?: { name?: string };
  modules: Module[];
  description?: string;
  shortDescription?: string;
  learningObjectives?: string[];
  level?: string;
  duration?: number;
  rating?: number;
  totalStudents?: number;
  targetAudience?: string[];
  requirements?: string[];
  topCompanies?: string[];
  certificateAvailable?: boolean;
};

type ContentTabsProps = {
  course: Course | null;
  activeModule: number;
  activeLesson: number;
  setActiveModule: (index: number) => void;
  setActiveLesson: (index: number) => void;
  notes: any[];
  setNotes: (notes: any[]) => void;
  markLessonComplete: () => void;
  setIsVideoLoading: (loading: boolean) => void;
};

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
}: ContentTabsProps) => {
  const [activeTab, setActiveTab] = useState<string>("lectures");
  const colorScheme = useColorScheme(); // Detect light/dark mode

  // Calculate total and completed lessons
  const calculateProgress = () => {
    if (!course?.modules)
      return { totalLessons: 0, completedLessons: 0, progress: 0 };

    const totalLessons = course.modules.reduce(
      (sum, module) => sum + module.lessons.length,
      0
    );
    const completedLessons = course.modules.reduce(
      (sum, module) =>
        sum +
        module.lessons.filter((lesson) =>
          lesson.progress.some((p) => p.completed)
        ).length,
      0
    );
    const progress =
      totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
    return { totalLessons, completedLessons, progress };
  };

  const { totalLessons, completedLessons, progress } = calculateProgress();

  const tabs = [
    { id: "lectures", title: "Lectures" },
    { id: "quiz", title: "Quiz" },
    { id: "notes", title: "Notes" },
    { id: "more", title: "More" },
  ];

  const moreTabOptions = [
    {
      id: "about",
      title: "About this Course",
      icon: BookOpen,
      screen: "/(tabs)/AboutCourseScreen",
    },
    {
      id: "certification",
      title: "Course Certification",
      icon: Award,
      screen: "/(tabs)/certification",
    },
    {
      id: "share",
      title: "Share this Course",
      icon: Share,
      screen: "/(tabs)/share",
    },
    {
      id: "resources",
      title: "Resources",
      icon: FileText,
      screen: "/(tabs)/resources",
    },
    {
      id: "discussion",
      title: "Discussion",
      icon: MessageSquare,
      screen: "/(tabs)/discussion",
    },
  ];

  const lessonId =
    course?.modules[activeModule]?.lessons[activeLesson]?.id || "";

  const generateQuiz = async () => {
    if (!course?.id) throw new Error("Missing courseId");
    if (!lessonId) throw new Error("Missing lessonId");
    try {
      const token = await getToken();
      const response = await fetch(
        "https://braini-x-one.vercel.app/api/quiz/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ courseId: course.id, lessonId }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response error:", response.status, errorText);
        throw new Error(
          `HTTP error! Status: ${response.status}, Response: ${errorText}`
        );
      }
      const data = await response.json();
      if (!data.quizId || !data.questions) {
        throw new Error("Invalid quiz data format");
      }
      return data;
    } catch (error: any) {
      console.error("Detailed error generating quiz:", error.message);
      throw error;
    }
  };

  const submitQuiz = async (quizId: string, answers: any) => {
    if (!course?.id) throw new Error("Missing courseId");
    try {
      const token = await getToken();
      const response = await fetch(
        "https://braini-x-one.vercel.app/api/quiz/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ quizId, answers, courseId: course.id }),
        }
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response error:", response.status, errorText);
        throw new Error(
          `HTTP error! Status: ${response.status}, Response: ${errorText}`
        );
      }
      const data = await response.json();
      if (!data.results) {
        throw new Error("Invalid quiz submission response");
      }
      return data;
    } catch (error: any) {
      console.error("Detailed error submitting quiz:", error.message);
      throw error;
    }
  };

  const renderMore = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={moreTabOptions}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.moreOptionItem}
            onPress={() => {
              if (!course) {
                console.warn(
                  "Cannot navigate to",
                  item.screen,
                  ": Course is undefined"
                );
                return;
              }
              router.push({
                pathname: item.screen as any,
                params: {
                  course: JSON.stringify({
                    id: course.id,
                    slug: course.slug,
                    title: course.title,
                    duration: course.duration || 0,
                    totalLessons: course.modules.reduce(
                      (sum, module) => sum + module.lessons.length,
                      0
                    ),
                  }),
                  progress: progress.toString(),
                },
              });
            }}
            accessibilityLabel={item.title}
          >
            <item.icon
              color={colorScheme === "dark" ? "#ccc" : "#666"}
              size={20}
              style={styles.moreOptionIcon}
            />
            <Text
              style={[
                styles.moreOptionText,
                {
                  color: colorScheme === "dark" ? "#fff" : "#333",
                },
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.moreOptionsContainer}
      />
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "lectures":
        return (
          <Lecture
            course={course}
            activeModule={activeModule}
            activeLesson={activeLesson}
            setActiveModule={setActiveModule}
            setActiveLesson={setActiveLesson}
            markLessonComplete={markLessonComplete}
            setIsVideoLoading={setIsVideoLoading}
          />
        );
      case "quiz":
        return (
          <Quiz
            generateQuiz={generateQuiz}
            submitQuiz={submitQuiz}
            courseId={course?.id || ""}
            lessonId={lessonId}
          />
        );
      case "notes":
        return (
          <Note
            courseId={course?.id || ""}
            lessonId={lessonId}
            notes={notes}
            setNotes={setNotes}
          />
        );
      case "more":
        return renderMore();
      default:
        return (
          <Lecture
            course={course}
            activeModule={activeModule}
            activeLesson={activeLesson}
            setActiveModule={setActiveModule}
            setActiveLesson={setActiveLesson}
            markLessonComplete={markLessonComplete}
            setIsVideoLoading={setIsVideoLoading}
          />
        );
    }
  };

  return (
    <View
      style={[
        styles.tabsContainer,
        {
          backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#fff",
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#fff",
            borderBottomColor: colorScheme === "dark" ? "#333" : "#e0e0e0",
          },
        ]}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tabButton, activeTab === tab.id && styles.activeTab]}
            accessibilityLabel={tab.title}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
                {
                  color: colorScheme === "dark" ? "#ccc" : "#666",
                },
                activeTab === tab.id && {
                  color: colorScheme === "dark" ? "#fff" : "#000",
                },
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.contentContainer}>{renderTabContent()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#a500ff",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    marginTop: 50,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  moreOptionsContainer: {
    paddingVertical: 10,
  },
  moreOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#2c2c2e",
    borderRadius: 6,
    marginBottom: 10,
  },
  moreOptionIcon: {
    marginRight: 10,
  },
  moreOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ContentTabs;
