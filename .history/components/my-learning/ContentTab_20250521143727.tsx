import {
  BookOpen,
  Certificate,
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
} from "react-native";
import Lecture from "./Lecture";
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
  instructor?: { name?: string };
  modules: Module[];
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

  const tabs = [
    { id: "lectures", title: "Lectures" },
    { id: "quiz", title: "Quiz" },
    { id: "notes", title: "Notes" },
    { id: "more", title: "More" },
  ];

  const moreTabOptions = [
    { title: "About this Course", icon: BookOpen },
    { title: "Course Certification", icon: Certificate },
    { title: "Share this Course", icon: Share },
    { title: "Notes", icon: FileText },
    { title: "Resources", icon: FileText },
    { title: "Discussion", icon: MessageSquare },
  ];

  // API functions
  const generateQuiz = async () => {
    try {
      const response = await fetch(
        "https://braini-x-one.vercel.app/api/quiz/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ courseId: course?.id }),
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error generating quiz:", error);
      return null;
    }
  };

  const submitQuiz = async (quizId: string, answers: any) => {
    try {
      const response = await fetch(
        "https://braini-x-one.vercel.app/api/quiz/submit",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quizId, answers }),
        }
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error submitting quiz:", error);
      return null;
    }
  };

  const renderNotes = () => (
    <View style={styles.tabContent}>
      <Text style={styles.placeholderText}>
        Notes Content (To be implemented)
      </Text>
    </View>
  );

  const renderMore = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={moreTabOptions}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.moreOptionItem}>
            <item.icon color="#ccc" size={20} style={styles.moreOptionIcon} />
            <Text style={styles.moreOptionText}>{item.title}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.title}
        style={styles.moreOptionsList}
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
          />
        );
      case "notes":
        return renderNotes();
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
    <View style={styles.tabsContainer}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[styles.tabButton, activeTab === tab.id && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
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
    backgroundColor: "#1c1c1e",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    paddingHorizontal: 10,
    paddingVertical: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1c1c1e",
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
    color: "#ccc",
    fontSize: 14,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#fff",
    fontWeight: "600",
  },
  contentContainer: {
    flex: 1,
    marginTop: 50, // Space for sticky tab bar
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  placeholderText: {
    color: "#ccc",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  moreOptionsList: {
    paddingVertical: 5,
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
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ContentTabs;
