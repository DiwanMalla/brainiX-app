import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Play,
} from "lucide-react-native";
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
  const [activeTab, setActiveTab] = useState<"lectures" | "downloads" | "more">(
    "lectures"
  );
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === "lectures" && styles.activeTab]}
        onPress={() => setActiveTab("lectures")}
      >
        <Text style={styles.tabText}>Lectures</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "downloads" && styles.activeTab]}
        onPress={() => setActiveTab("downloads")}
      >
        <Text style={styles.tabText}>Downloads</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === "more" && styles.activeTab]}
        onPress={() => setActiveTab("more")}
      >
        <Text style={styles.tabText}>More</Text>
      </TouchableOpacity>
    </View>
  );

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

  const renderModule = ({ item: module }: { item: Module }) => {
    const allLessonsCompleted = module.lessons.every(
      (lesson) => lesson.progress[0]?.completed
    );
    const isExpanded = expandedModules.includes(module.id);

    return (
      <View style={styles.moduleContainer}>
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
          {isExpanded ? (
            <ChevronUp color="#ccc" size={20} />
          ) : (
            <ChevronDown color="#ccc" size={20} />
          )}
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

  return (
    <View style={styles.tabsContainer}>
      {renderTabBar()}
      <View style={styles.tabContentContainer}>
        {activeTab === "lectures" && renderLectures()}
        {activeTab === "downloads" && (
          <Text style={styles.placeholderText}>Downloads Placeholder</Text>
        )}
        {activeTab === "more" && (
          <Text style={styles.placeholderText}>More Placeholder</Text>
        )}
      </View>
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
  tabContentContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 10,
  },
  moduleContainer: {
    marginBottom: 10,
    backgroundColor: "#1c1c1e",
    borderRadius: 8,
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
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  moduleLessonCount: {
    fontSize: 12,
    color: "#ccc",
    marginRight: 10,
  },
  lessonList: {
    paddingHorizontal: 10,
  },
  lessonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "#1c1c1e",
    borderRadius: 8,
    padding: 10,
  },
  lessonItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  activeLesson: {
    backgroundColor: "#2c2c2e",
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
});

export default ContentTabs;
