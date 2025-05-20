import { StyleSheet, Text, View } from "react-native";

type CourseHeaderProps = {
  course: { title: string; instructor?: { name?: string } } | null;
};

const CourseHeader = ({ course }: CourseHeaderProps) => {
  if (!course) return null;
  return (
    <View style={styles.headerContainer}>
      <Text style={styles.courseTitle}>{course.title}</Text>
      <Text style={styles.instructorName}>
        Instructor: {course.instructor?.name || "Unknown"}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: "20%", // 20% of the screen height
    padding: 10,
    backgroundColor: "#1c1c1e",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  courseTitle: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  instructorName: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 2,
  },
});

export default CourseHeader;
