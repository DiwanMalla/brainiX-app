import { Course } from "@/types/my-learning";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import * as Progress from "react-native-progress";

interface CertificateProps {
  course?: Course;
  progress: number;
}

export default function Certificate({ course, progress }: CertificateProps) {
  const { user } = useUser();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const colorScheme = useColorScheme();
  const totalLessons = course?.totalLessons || 80;
  const completedLessons = Math.floor((progress / 100) * totalLessons);
  const [fadeAnim] = useState(new Animated.Value(0)); // Animation for lock overlay

  useEffect(() => {
    setIsUnlocked(completedLessons >= 30);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [progress, completedLessons, fadeAnim]);

  if (!course) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colorScheme === "dark" ? "#2c2c2e" : "#fff" },
        ]}
      >
        <Text
          style={[
            styles.errorText,
            { color: colorScheme === "dark" ? "#ff4444" : "#ff0000" },
          ]}
        >
          Error: Course information is unavailable.
        </Text>
      </View>
    );
  }

  const isDark = colorScheme === "dark";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#2c2c2e" : "#fff",
          shadowColor: isDark ? "#000" : "#a500ff",
        },
      ]}
      accessibilityLabel={
        isUnlocked ? "Certificate of Completion" : "Locked Certificate"
      }
    >
      <View
        style={[
          styles.certificateCard,
          { backgroundColor: isDark ? "#1c1c1e" : "#f5f5ff" },
        ]}
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
              style={[
                styles.headerText,
                { color: isDark ? "#fff" : "#a500ff" },
              ]}
            >
              Certificate of Completion
            </Text>
          </View>
          <Text
            style={[styles.subHeaderText, { color: isDark ? "#ccc" : "#666" }]}
          >
            Awarded by BrainiX
          </Text>
        </View>

        {/* Decorative Divider */}
        <View
          style={[
            styles.divider,
            { backgroundColor: isDark ? "#a500ff" : "#7b00cc" },
          ]}
        />

        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.text, { color: isDark ? "#fff" : "#333" }]}>
            This certifies that
          </Text>
          <Text style={[styles.name, { color: isDark ? "#fff" : "#a500ff" }]}>
            {user?.fullName || "Your Name"}
          </Text>
          <Text style={[styles.text, { color: isDark ? "#fff" : "#333" }]}>
            has successfully completed the course
          </Text>
          <Text
            style={[styles.courseTitle, { color: isDark ? "#fff" : "#333" }]}
          >
            {course.title || "Unknown Course"}
          </Text>
          <Text style={[styles.meta, { color: isDark ? "#ccc" : "#666" }]}>
            Duration: {Math.floor((course.duration || 0) / 60)} minutes |{" "}
            {totalLessons} Lessons
          </Text>
          <Text style={[styles.meta, { color: isDark ? "#ccc" : "#666" }]}>
            Issued on: {new Date().toLocaleDateString()}
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Text
            style={[styles.progressLabel, { color: isDark ? "#ccc" : "#666" }]}
          >
            Progress: {Math.round(progress)}%
          </Text>
          <Progress.Bar
            progress={progress / 100}
            width={null}
            height={8}
            color="#a500ff"
            unfilledColor={isDark ? "#444" : "#e0e0e0"}
            borderWidth={0}
            borderRadius={4}
            style={styles.progressBar}
          />
        </View>

        {/* Download Button */}
        {isUnlocked && (
          <TouchableOpacity
            style={[
              styles.downloadButton,
              { backgroundColor: isDark ? "#a500ff" : "#7b00cc" },
            ]}
            onPress={() => console.log("Download certificate")}
            accessibilityLabel="Download certificate"
          >
            <Text style={styles.downloadButtonText}>Download Certificate</Text>
            <MaterialCommunityIcons
              name="download"
              size={20}
              color="#fff"
              style={styles.downloadIcon}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Lock Overlay */}
      {!isUnlocked && (
        <Animated.View style={[styles.lockOverlay, { opacity: fadeAnim }]}>
          <MaterialCommunityIcons
            name="lock"
            size={32}
            color="#ff4444"
            style={styles.lockIcon}
          />
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>Locked</Text>
          </View>
          <Text
            style={[styles.lockMessage, { color: "#ff4444" }]}
            accessibilityLabel={`Complete ${
              30 - completedLessons
            } more lessons to unlock certificate`}
          >
            Complete {30 - completedLessons}/{totalLessons} lessons to unlock
          </Text>
          <Text
            style={[styles.progressText, { color: "#ff4444" }]}
            accessibilityLabel={`Progress: ${Math.round(
              progress
            )} percent, ${completedLessons} out of ${totalLessons} lessons completed`}
          >
            ({completedLessons}/{totalLessons} lessons)
          </Text>
        </Animated.View>
      )}
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
  certificateCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#a500ff",
    position: "relative", // For absolute positioning of back button
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
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
  name: {
    fontSize: 32,
    fontWeight: "700",
    marginVertical: 12,
    textTransform: "uppercase",
  },
  courseTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  meta: {
    fontSize: 14,
    marginBottom: 6,
  },
  progressContainer: {
    marginVertical: 16,
    width: "100%",
  },
  progressLabel: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: "center",
  },
  progressBar: {
    alignSelf: "center",
    width: "90%",
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  downloadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  downloadIcon: {
    marginLeft: 4,
  },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
  },
  lockIcon: {
    marginBottom: 12,
  },
  lockBadge: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  lockText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  lockMessage: {
    fontSize: 16,
    marginTop: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  progressText: {
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    margin: 16,
  },
});
