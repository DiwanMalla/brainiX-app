import { Course } from "@/types/my-learning";
import { useUser } from "@clerk/clerk-expo";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface CertificateProps {
  course: Course;
  progress: number;
}

export default function Certificate({ course, progress }: CertificateProps) {
  const { user } = useUser();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const totalLessons = course?.totalLessons || 80; // From API: 80 lessons
  const completedLessons = Math.floor((progress / 100) * totalLessons);
  console.log(course);
  useEffect(() => {
    // Unlock after completing 30 lessons
    setIsUnlocked(completedLessons >= 30);
  }, [progress, completedLessons]);

  return (
    <View style={[styles.container, !isUnlocked && styles.blurred]}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Certificate of Completion</Text>
        <Text style={styles.subHeaderText}>Awarded by BrainiX</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.content}>
        <Text style={styles.text}>This certifies that</Text>
        <Text style={styles.name}>{user?.fullName || "Your Name"}</Text>
        <Text style={styles.text}>has successfully completed the course</Text>
        <Text style={styles.courseTitle}>{course.title}</Text>
        <Text style={styles.meta}>
          Duration: {Math.floor(course.duration / 60)} minutes |{" "}
          {course.totalLessons} Lessons
        </Text>
        <Text style={styles.meta}>
          Issued on: {new Date().toLocaleDateString()}
        </Text>
      </View>
      {!isUnlocked && (
        <View style={styles.lockOverlay}>
          <View style={styles.lockBadge}>
            <Text style={styles.lockText}>Locked</Text>
          </View>
          <Text style={styles.lockMessage}>
            Complete {30 - completedLessons}/{totalLessons} lessons to unlock.
          </Text>
          <Text style={styles.progressText}>
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
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 16,
  },
  blurred: { opacity: 0.5 },
  header: { alignItems: "center" },
  headerText: { fontSize: 24, fontWeight: "bold", color: "#333" },
  subHeaderText: { fontSize: 14, color: "#666", marginTop: 4 },
  divider: { borderTopWidth: 1, borderTopColor: "#e0e0e0", marginVertical: 16 },
  content: { alignItems: "center" },
  text: { fontSize: 16, color: "#333", marginBottom: 8 },
  name: { fontSize: 28, fontWeight: "600", color: "#333", marginBottom: 8 },
  courseTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  meta: { fontSize: 14, color: "#666", marginBottom: 4 },
  lockOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  lockBadge: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  lockText: { fontSize: 14, color: "#fff", fontWeight: "600" },
  lockMessage: { fontSize: 14, color: "#ff4444", marginTop: 8 },
  progressText: { fontSize: 14, color: "#ff4444", marginTop: 4 },
});
