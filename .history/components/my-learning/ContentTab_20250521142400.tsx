import { CheckCircle, FileText, Play } from "lucide-react-native";
import { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const tabs = [
    { id: "lectures", title: "Lectures" },
    { id: "quiz", title: "Quiz" },
    { id: "notes", title: "Notes" },
    { id: "more", title: "More" },
  ];

  const moreTabOptions = [
    "About this Course",
    "Course Certification",
    "Share this Course",
    "Notes",
    "Resources",
    "Discussion",
  ];

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const renderLessonItem = ({
    item: lesson,
    index: lessonIndex,
  }: {
    item: Lesson;
    index: number;
  }) => {
    const moduleIndex =
      course?.modules.findIndex((module) =>
        module.lessons.some((l) => l.id === lesson.id)
      ) || 0;
    const lessonIndexInModule =
      course?.modules[moduleIndex]?.lessons.findIndex(
        (l) => l.id === lesson.id
      ) || 0;

    return (
      <View style={styles.lessonContainer}>
        <TouchableOpacity
          onPress={() => {
            setActiveModule(moduleIndex);
            setActiveLesson(lessonIndexInModule);
            setIsVideoLoading(lesson.type === "VIDEO");
          }}
          style={[
            styles.lessonItem,
            activeModule === moduleIndex && activeLesson === lessonIndexInModule
              ? styles.activeLesson
              : null,
          ]}
        >
          <View style={styles.lessonIcon}>
            {lesson.progress[0]?.completed ? (
              <CheckCircle color="#00ff88" size={16} />
            ) : lesson.type === "VIDEO" ? (
              <Play color="#ccc" size={16} />
            ) : (
              <FileText color="#ccc" size={16} />
            )}
          </View>
          <View style={styles.lessonDetails}>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <View style={styles.lessonMeta}>
              <Text style={styles.lessonType}>
                {lesson.type === "VIDEO" ? "Video" : "Article"} •{" "}
                {lesson.duration
                  ? `${Math.floor(lesson.duration / 60)}:${(
                      lesson.duration % 60
                    )
                      .toString()
                      .padStart(2, "0")}`
                  : "N/A"}
              </Text>
              {lesson.isPreview && (
                <Text style={styles.previewBadge}>Preview</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={markLessonComplete}
          style={[
            styles.markCompleteButton,
            lesson.progress[0]?.completed && styles.completedButton,
          ]}
          disabled={lesson.progress[0]?.completed}
        >
          <Text style={styles.markCompleteText}>
            {lesson.progress[0]?.completed ? "Completed" : "Mark as Complete"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderModule = ({
    item: module,
    index,
  }: {
    item: Module;
    index: number;
  }) => {
    const allLessonsCompleted = module.lessons.every(
      (lesson) => lesson.progress[0]?.completed
    );
    const isExpanded = expandedModules.includes(module.id);

    return (
      <View style={[styles.moduleContainer, index > 0 && styles.moduleGap]}>
        <TouchableOpacity
          onPress={() => toggleModule(module.id)}
          style={styles.moduleHeader}
        >
          <View style={styles.moduleTitleContainer}>
            <Text style={styles.moduleTitle}>{module.title}</Text>
            {allLessonsCompleted && <CheckCircle color="#00ff88" size={16} />}
          </View>
          <Text style={styles.moduleLessonCount}>
            {module.lessons.length} lessons
          </Text>
        </TouchableOpacity>
        {isExpanded && (
          <FlatList
            data={module.lessons}
            renderItem={renderLessonItem}
            keyExtractor={(item) => item.id}
            style={styles.lessonList}
          />
        )}
      </View>
    );
  };

  const renderLectures = () => (
    <FlatList
      data={course?.modules || []}
      renderItem={renderModule}
      keyExtractor={(item) => item.id}
      style={styles.tabContent}
    />
  );

  const renderQuiz = () => (
    <View style={styles.tabContent}>
      <Text style={styles.placeholderText}>
        AI Quiz Content (To be implemented)
      </Text>
    </View>
  );

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
            <Text style={styles.moreOptionText}>{item}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item}
        style={styles.moreOptionsList}
      />
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "lectures":
        return renderLectures();
      case "quiz":
        return renderQuiz();
      case "notes":
        return renderNotes();
      case "more":
        return renderMore();
      default:
        return renderLectures();
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
      {renderTabContent()}
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
    paddingTop: 10,
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
  tabContent: {
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  moduleContainer: {
    backgroundColor: "#1c1c1e",
    borderRadius: 8,
    marginBottom: 15,
  },
  moduleGap: {
    marginTop: 15,
  },
  moduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  moduleTitleContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  moduleTitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  moduleLessonCount: {
    fontSize: 12,
    color: "#ccc",
  },
  lessonList: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  lessonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#2c2c2e",
    borderRadius: 6,
  },
  lessonItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  activeLesson: {
    backgroundColor: "#3c3c3e",
  },
  lessonIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  lessonDetails: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "500",
  },
  lessonMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  lessonType: {
    fontSize: 12,
    color: "#ccc",
  },
  previewBadge: {
    fontSize: 12,
    color: "#a500ff",
    backgroundColor: "#2c2c2e",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  markCompleteButton: {
    padding: 6,
    backgroundColor: "#a500ff",
    borderRadius: 4,
    alignItems: "center",
  },
  completedButton: {
    backgroundColor: "#00ff88",
    opacity: 0.7,
  },
  markCompleteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
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
    padding: 15,
    backgroundColor: "#2c2c2e",
    borderRadius: 6,
    marginBottom: 10,
  },
  moreOptionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default ContentTabs;
