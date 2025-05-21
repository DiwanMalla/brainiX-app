import { BookOpen } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

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

type AboutCourseProps = {
  course: Course | null;
};

const AboutCourse = ({ course }: AboutCourseProps) => {
  const [aiDescription, setAiDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!course?.id) {
      setAiDescription("No course information available.");
      return;
    }

    const fetchAiDescription = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyAV4romIxzcy_XJjizhQ2XKtaosCk1sZTE",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Generate a professional, engaging course description (150-200 words) for "${
                        course.title || "this course"
                      }". Highlight value, target audience, key takeaways, and instructor expertise. Data: Description: ${
                        course.description || "Not provided"
                      }, Instructor: ${
                        course.instructor?.name || "Expert Instructor"
                      }, Bio: ${
                        course.instructor?.bio || "Experienced professional"
                      }, Objectives: ${
                        course.learningObjectives?.join(", ") ||
                        "Learn key skills"
                      }, Level: ${course.level || "All levels"}, Duration: ${
                        course.duration
                          ? `${Math.round(course.duration / 60)} hours`
                          : "Not specified"
                      }, Rating: ${course.rating || "Not rated"}, Students: ${
                        course.totalStudents || "Many"
                      }, Audience: ${
                        course.targetAudience?.join(", ") ||
                        "Professionals and beginners"
                      }, Requirements: ${
                        course.requirements?.join(", ") || "None"
                      }, Companies: ${
                        course.topCompanies?.join(", ") || "Leading companies"
                      }, Certificate: ${
                        course.certificateAvailable
                          ? "Available"
                          : "Not available"
                      }.`,
                    },
                  ],
                },
              ],
            }),
          }
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Gemini AI API error: ${response.status} - ${errorText}`
          );
        }
        const data = await response.json();
        const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!generatedText) {
          throw new Error("Invalid response from Gemini AI API");
        }
        setAiDescription(generatedText);
      } catch (err) {
        console.error("Gemini AI error:", err);
        setAiDescription(course?.description || "No description available.");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to generate course description",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAiDescription();
  }, [course?.id]); // Re-run when course ID changes

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <BookOpen color="#a500ff" size={24} style={styles.icon} />
        <Text style={styles.headerText}>About this Course</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>{course?.title || "Course Title"}</Text>
        {isLoading ? (
          <Text style={styles.description}>Generating description...</Text>
        ) : (
          <Text style={styles.description}>{aiDescription}</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Instructor</Text>
        {course?.instructor?.image && (
          <Image
            source={{ uri: course.instructor.image }}
            style={styles.instructorImage}
          />
        )}
        <Text style={styles.instructorName}>
          {course?.instructor?.name || "Unknown"}
        </Text>
        <Text style={styles.instructorBio}>
          {course?.instructor?.bio || "No bio available."}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Key Details</Text>
        <Text style={styles.detailText}>
          <Text style={styles.detailLabel}>Level: </Text>
          {course?.level || "Not specified"}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.detailLabel}>Duration: </Text>
          {course?.duration
            ? `${Math.round(course.duration / 60)} hours`
            : "Not specified"}
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.detailLabel}>Rating: </Text>
          {course?.rating || "Not rated"} ({course?.totalStudents || 0}{" "}
          students)
        </Text>
        <Text style={styles.detailText}>
          <Text style={styles.detailLabel}>Certificate: </Text>
          {course?.certificateAvailable ? "Available" : "Not available"}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Learning Objectives</Text>
        {course?.learningObjectives?.length ? (
          course.learningObjectives.map((objective, index) => (
            <Text key={index} style={styles.listItem}>
              • {objective}
            </Text>
          ))
        ) : (
          <Text style={styles.listItem}>No objectives listed.</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Target Audience</Text>
        {course?.targetAudience?.length ? (
          course.targetAudience.map((audience, index) => (
            <Text key={index} style={styles.listItem}>
              • {audience}
            </Text>
          ))
        ) : (
          <Text style={styles.listItem}>No target audience specified.</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Requirements</Text>
        {course?.requirements?.length ? (
          course.requirements.map((req, index) => (
            <Text key={index} style={styles.listItem}>
              • {req}
            </Text>
          ))
        ) : (
          <Text style={styles.listItem}>No requirements listed.</Text>
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Trusted by Companies</Text>
        {course?.topCompanies?.length ? (
          course.topCompanies.map((company, index) => (
            <Text key={index} style={styles.listItem}>
              • {company}
            </Text>
          ))
        ) : (
          <Text style={styles.listItem}>No companies listed.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#000",
    padding: 10,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
  },
  icon: {
    marginRight: 5,
  },
  card: {
    backgroundColor: "#1c1c1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#ccc",
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  instructorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  instructorName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#ccc",
    marginBottom: 5,
  },
  instructorBio: {
    fontSize: 13,
    color: "#aaa",
  },
  detailText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 5,
  },
  detailLabel: {
    fontWeight: "600",
    color: "#fff",
  },
  listItem: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 5,
  },
});

export default AboutCourse;
