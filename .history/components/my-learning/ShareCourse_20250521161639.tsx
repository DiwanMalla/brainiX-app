```typescript
import { Course } from "@/types/my-learning";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

interface ShareCourseProps {
  course?: Course;
  progress: number;
}

export default function ShareCourse({ course, progress }: ShareCourseProps) {
  const colorScheme = useColorScheme();
  const [shareError, setShareError] = useState<string | null>(null);

  const isDark = colorScheme === "dark";

  const handleShare = async () => {
    if (!course) {
      setShareError("Course information is unavailable.");
      return;
    }
    if (!course.slug) {
      setShareError("Course slug is unavailable, cannot share.");
      return;
    }

    try {
      const shareMessage = `Check out "${course.title}" on BrainiX! Learn at your own pace with ${course.totalLessons || 80} lessons. Join me: https://braini-x-one.vercel.app/courses/${course.slug}`;
      const result = await Share.share({
        message: shareMessage,
        url: `https://braini-x-one.vercel.app/courses/${course.slug}`,
        title: `Share ${course.title}`,
      });

      if (result.action === Share.sharedAction) {
        console.log("Course shared successfully");
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error: any) {
      console.error("Error sharing course:", error);
      setShareError("Failed to share course. Please try again.");
    }
  };

  if (!course) {
    return (
      <View
        style={[styles.container, { backgroundColor: isDark ? "#2c2c2e" : "#fff" }]}
      >
        <Text
          style={[styles.errorText, { color: isDark ? "#ff4444" : "#ff0000" }]}
        >
          Error: Course information is unavailable.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#2c2c2e" : "#fff",
          shadowColor: isDark ? "#000" : "#a500ff",
        },
      ]}
      accessibilityLabel="Share Course"
    >
      <View
        style={[styles.card, { backgroundColor: isDark ? "#1c1c1e" : "#f5f5ff" }]}
      >
        {/* Back Icon */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityLabel="Go back"
        >
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={isDark ? "#fff" : "#a500ff"}
          />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text
              style={[styles.headerText, { color: isDark ? "#fff" : "#a500ff" }]}
            >
              Share This Course
            </Text>
          </View>
          <Text
            style={[styles.subHeaderText, { color: isDark ? "#ccc" : "#666" }]}
          >
            Invite friends to join BrainiX
          </Text>
        </View>

        {/* Decorative Divider */}
        <View
          style={[styles.divider, { backgroundColor: isDark ? "#a500ff" : "#7b00cc" }]}
        />

        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.courseTitle, { color: isDark ? "#fff" : "#333" }]}
          >
            {course.title || "Unknown Course"}
          </Text>
          <Text
            style={[styles.description, { color: isDark ? "#ccc" : "#666" }]}
          >
            {course.shortDescription || "Learn new skills with this amazing course!"}
          </Text>
          <Text
            style={[styles.url, { color: isDark ? "#a500ff" : "#7b00cc" }]}
            numberOfLines={1}
          >
            {course.slug
              ? `https://braini-x-one.vercel.app/courses/${course.slug}`
              : "Course URL unavailable"}
          </Text>
          <Text
            style={[styles.meta, { color: isDark ? "#ccc" : "#666" }]}
          >
            {course.totalLessons || 80} Lessons | {Math.round(progress)}% Complete
          </Text>
        </View>

        {/* Share Button */}
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: isDark ? "#a500ff" : "#7b00cc" }]}
          onPress={handleShare}
          accessibilityLabel="Share course"
          disabled={!course.slug} // Disable if slug is missing
        >
          <Text style={styles.shareButtonText}>Share Course</Text>
          <MaterialCommunityIcons
            name="share-variant"
            size={20}
            color="#fff"
            style={styles.shareIcon}
          />
        </TouchableOpacity>

        {/* Error Message */}
        {shareError && (
          <Text
            style={[styles.errorText, { color: isDark ? "#ff4444" : "#ff0000" }]}
          >
            {shareError}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginTop: 80,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#a500ff",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: 8,
    zIndex: 10,
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  headerBadge: {
    backgroundColor: "transparent",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#a500ff",
  },
  headerText: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  subHeaderText: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: "italic",
  },
  divider: {
    height: 3,
    width: "60%",
    alignSelf: "center",
    borderRadius: 2,
    marginVertical: 16,
  },
  content: {
    alignItems: "center",
    marginBottom: 16,
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  url: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: "500",
  },
  meta: {
    fontSize: 14,
    marginBottom: 6,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
    opacity: 1, // Default opacity
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  shareIcon: {
    marginLeft: 4,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 16,
  },
});
```