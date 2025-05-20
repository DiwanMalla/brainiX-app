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
  progress: { completed?: boolean }[];
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
  notes: any[]; // Adjust type based on Note definition
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
  }) => (
    <View style={styles.lessonContainer}>
      <TouchableOpacity
        onPress={() => {
          setActiveModule(Math.floor(lessonIndex / 3)); // Assuming 3 lessons per module for simplicity
          setActiveLesson(lessonIndex % 3);
          setIsVideoLoading(lesson.type === "VIDEO");
        }}
        style={[
          styles.lessonItem,
          activeModule * 3 + activeLesson === lessonIndex
            ? styles.activeLesson
            : null,
        ]}
      >
        <Text style={styles.lessonTitle}>{lesson.title}</Text>
        <Text style={styles.lessonStatus}>
          {lesson.progress[0]?.completed ? "Completed" : "Not Completed"}
        </Text>
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

  const renderLectures = () => {
    const allLessons =
      course?.modules.flatMap((module) => module.lessons) || [];
    return (
      <FlatList
        data={allLessons}
        renderItem={renderLessonItem}
        keyExtractor={(item) => item.id}
        style={styles.tabContent}
      />
    );
  };

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
});

export default ContentTabs;
