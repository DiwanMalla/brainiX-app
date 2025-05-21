import { Course } from "@/types/my-learning";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";

interface CertificateProps {
  course: Course;
  progress: number;
}

async function VerifyCertificate(courseId: string) {
  const { getToken } = useAuth();
  try {
    const token = await getToken(); // Assume getToken is defined
    const response = await fetch(
      `https://braini-x-one.vercel.app/api/certificate/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId }),
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
    return data.isUnlocked || false;
  } catch (error: any) {
    console.error("Error verifying certificate:", error.message);
    return false;
  }
}

export default function Certificate({ course, progress }: CertificateProps) {
  const { user } = useUser();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const colorScheme = useColorScheme();
  const totalLessons = course.totalLessons || 80;
  const completedLessons = Math.floor((progress / 100) * totalLessons);

  useEffect(() => {
    const checkCertificate = async () => {
      setIsLoading(true);
      const isServerUnlocked = await VerifyCertificate(course.id);
      setIsUnlocked(isServerUnlocked || completedLessons >= 30);
      setIsLoading(false);
    };
    checkCertificate();
  }, [course.id, completedLessons]);

  if (isLoading) {
    return <Text style={styles.loadingText}>Loading certificate...</Text>;
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
          {course.title}
        </Text>
        <Text
          style={[
            styles.meta,
            { color: colorScheme === "dark" ? "#ccc" : "#666" },
          ]}
        >
          Duration: {Math.floor(course.duration / 60)} minutes | {totalLessons}{" "}
          Lessons
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
  loadingText: { fontSize: 16, textAlign: "center", margin: 16 },
});
