import { Course } from "@/types/my-learning";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

interface CertificateProps {
  course?: Course; // Make course optional
  progress: number;
}

export default function Certificate({ course, progress }: CertificateProps) {
  const { user } = useUser();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const colorScheme = useColorScheme();
  const totalLessons = course?.totalLessons || 80; // Fallback to 80
  const completedLessons = Math.floor((progress / 100) * totalLessons);

  useEffect(() => {
    setIsUnlocked(completedLessons >= 30);
  }, [progress, completedLessons]);

  if (!course) {
    return (
      <View style={styles.container}>
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

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#2c2c2e" : "#fff" },
        !isUnlocked && styles.blurred,
      ]}
      accessibilityLabel={
        isUnlocked ? "Certificate of Completion" : "Locked Certificate"
      }
    >
      <View style={styles.header}>
        <Text
          style={[
            styles.headerText,
            { color: colorScheme === "dark" ? "#fff" : "#333" },
          ]}
        >
          Certificate of Completion
        </Text>
        <Text
          style={[
            styles.subHeaderText,
            { color: colorScheme === "dark" ? "#ccc" : "#666" },
          ]}
        >
          Awarded by BrainiX
        </Text>
      </View>
      <View
        style={[
          styles.divider,
          { borderTopColor: colorScheme === "dark" ? "#444" : "#e0e0e0" },
        ]}
      />
      <View style={styles.content}>
        <Text
          style={[
            styles.text,
            { color: colorScheme === "dark" ? "#fff" : "#333" },
          ]}
        >
          This certifies that
        </Text>
        <Text
          style={[
            styles.name,
            { color: colorScheme === "dark" ? "#fff" : "#333" },
          ]}
        >
          {user?.fullName || "Your Name"}
        </Text>
        <Text
          style={[
            styles.text,
            { color: colorScheme === "dark" ? "#fff" : "#333" },
          ]}
        >
          has successfully completed the course
        </Text>
        <Text
          style={[
            styles.courseTitle,
            { color: colorScheme === "dark" ? "#fff" : "#333" },
          ]}
        >
          {course.title || "Unknown Course"}
        </Text>
        <Text
          style={[
            styles.meta,
            { color: colorScheme === "dark" ? "#ccc" : "#666" },
          ]}
        >
          Duration: {Math.floor((course.duration || 0) / 60)} minutes |{" "}
          {totalLessons} Lessons
        </Text>
        <Text
          style={[
            styles.meta,
            { color: colorScheme === "dark" ? "#ccc" : "#666" },
          ]}
        >
          Issued on: {new Date().toLocaleDateString()}
        </Text>
      </View>
      {!isUnlocked && (
        <View style={styles.lockOverlay}>
          <MaterialCommunityIcons
            name="lock"
            size={24}
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
            Complete {30 - completedLessons}/{totalLessons} lessons to unlock.
          </Text>
          <Text
            style={[styles.progressText, { color: "#ff4444" }]}
            accessibilityLabel={`Progress: ${Math.round(
              progress
            )} percent, ${completedLessons} out of ${totalLessons} lessons completed`}
          >
            Progress: {Math.round(progress)}% ({completedLessons}/{totalLessons}
            )
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 16,
  },
  blurred: { opacity: 0.5 },
  header: { alignItems: "center" },
  headerText: { fontSize: 24, fontWeight: "bold" },
  subHeaderText: { fontSize: 14, marginTop: 4 },
  divider: { borderTopWidth: 1, marginVertical: 16 },
  content: { alignItems: "center" },
  text: { fontSize: 16, marginBottom: 8 },
  name: { fontSize: 28, fontWeight: "600", marginBottom: 8 },
  courseTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  meta: { fontSize: 14, marginBottom: 4 },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  lockIcon: { marginBottom: 8 },
  lockBadge: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lockText: { fontSize: 14, color: "#fff", fontWeight: "600" },
  lockMessage: { fontSize: 14, marginTop: 8 },
  progressText: { fontSize: 14, marginTop: 4 },
  errorText: { fontSize: 16, textAlign: "center", margin: 16 },
});
