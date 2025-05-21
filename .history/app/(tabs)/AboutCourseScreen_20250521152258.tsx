import AboutCourse from "@/components/my-learning/AboutCourse";
import { router, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Course = {
  id?: string;
  title?: string;
  description?: string;
  shortDescription?: string;
  instructor?: { name?: string; bio?: string; image?: string };
  learningObjectives?: string[];
  level?: string;
  duration?: number;
  rating?: number;
  totalStudents?: number;
  targetAudience?: string[];
  requirements?: string[];
  topCompanies?: string[];
  certificateAvailable?: boolean;
};

const AboutCourseScreen = () => {
  const params = useLocalSearchParams();
  const course = params.course ? JSON.parse(params.course as string) : null;

  const handleClose = () => {
    console.log("Navigating back from AboutCourseScreen, params:", params);
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to course learning screen if no back route
      router.replace("/(tabs)/course-learning");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>About this Course</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>
      <AboutCourse course={course} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  closeButton: {
    padding: 5,
  },
});

export default AboutCourseScreen;
