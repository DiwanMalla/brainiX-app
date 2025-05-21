import { X } from "lucide-react-native";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AboutCourse from "./AboutCourse";

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

type AboutCourseScreenProps = {
  route: {
    params: {
      course: Course | null;
    };
  };
};

const AboutCourseScreen = ({ route }: About-moCourseScreenProps) => {
  const navigation = useNavigation();
  const { course } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>About this Course</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>
      <AboutCourse course={course} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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