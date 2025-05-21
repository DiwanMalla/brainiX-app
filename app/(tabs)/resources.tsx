import { router, useLocalSearchParams } from "expo-router";
import { FileText, X } from "lucide-react-native";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

type Course = {
  id?: string;
  slug?: string;
  title?: string;
  duration?: number;
  totalLessons?: number;
};

const ResourcesScreen = () => {
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const course: Course | null = params.course
    ? JSON.parse(params.course as string)
    : null;
  const progress = params.progress ? parseFloat(params.progress as string) : 0;

  const handleClose = () => {
    console.log("Navigating back from ResourcesScreen, params:", params);
    if (router.canGoBack()) {
      router.replace("/(tabs)/CourseLearningScreen");
    } else {
      router.replace("/(tabs)/CourseLearningScreen");
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000" : "#fff" },
      ]}
    >
      <View
        style={[
          styles.header,
          { borderBottomColor: colorScheme === "dark" ? "#333" : "#e0e0e0" },
        ]}
      >
        <Text
          style={[
            styles.headerText,
            { color: colorScheme === "dark" ? "#fff" : "#000" },
          ]}
        >
          Resources
        </Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          accessibilityLabel="Close Resources"
        >
          <X color={colorScheme === "dark" ? "#fff" : "#000"} size={24} />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#f5f5f5",
              borderColor: colorScheme === "dark" ? "#333" : "#e0e0e0",
            },
          ]}
        >
          <FileText
            color={colorScheme === "dark" ? "#a500ff" : "#6200ee"}
            size={40}
            style={styles.icon}
          />
          <Text
            style={[
              styles.title,
              { color: colorScheme === "dark" ? "#fff" : "#000" },
            ]}
          >
            Resources Under Development
          </Text>
          <Text
            style={[
              styles.message,
              { color: colorScheme === "dark" ? "#ccc" : "#666" },
            ]}
          >
            We're working on adding resources for this course. Check back soon
            for downloadable materials, links, and more to enhance your learning
            experience!
          </Text>
        </View>
        {course && (
          <View
            style={[
              styles.courseCard,
              {
                backgroundColor: colorScheme === "dark" ? "#2c2c2e" : "#e8e8e8",
                borderColor: colorScheme === "dark" ? "#333" : "#e0e0e0",
              },
            ]}
          >
            <Text
              style={[
                styles.courseTitle,
                { color: colorScheme === "dark" ? "#fff" : "#000" },
              ]}
            >
              {course.title || "Course Title"}
            </Text>
            <Text
              style={[
                styles.courseDetail,
                { color: colorScheme === "dark" ? "#ccc" : "#666" },
              ]}
            >
              Progress: {Math.round(progress)}% ({course.totalLessons || 0}{" "}
              lessons)
            </Text>
            <Text
              style={[
                styles.courseDetail,
                { color: colorScheme === "dark" ? "#ccc" : "#666" },
              ]}
            >
              Duration:{" "}
              {course.duration
                ? `${Math.round(course.duration / 60)} hours`
                : "N/A"}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 5,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: "center",
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  icon: {
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  courseCard: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    width: "100%",
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  courseDetail: {
    fontSize: 14,
    marginBottom: 5,
  },
});

export default ResourcesScreen;
