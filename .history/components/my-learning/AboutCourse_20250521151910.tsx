import axios from "axios";
import Constants from "expo-constants";
import { BookOpen } from "lucide-react-native";
import { useEffect, useState } from "react";
import { FlatList, Image, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

const GROQ_API_KEY =
  Constants.expoConfig?.extra?.GROQ_API_KEY ||
  "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";
const GROQ_API_URL = "https://api.groq.com/v1/chat/completions";

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

type Section = {
  id: string;
  type:
    | "header"
    | "description"
    | "instructor"
    | "details"
    | "objectives"
    | "audience"
    | "requirements"
    | "companies";
  data: any;
};

const AboutCourse = ({ course }: AboutCourseProps) => {
  const [aiDescription, setAiDescription] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!course?.id) {
      setAiDescription("No course information available.");
      return;
    }

    const fetchAiDescription = async (
      retries = 3,
      delay = 1000
    ): Promise<void> => {
      setIsLoading(true);
      try {
        const prompt = `Generate a professional, engaging course description (150-200 words) for "${
          course.title || "this course"
        }". Highlight value, target audience, key takeaways, and instructor expertise. Data: Description: ${
          course.description || "Not provided"
        }, Instructor: ${
          course.instructor?.name || "Expert Instructor"
        }, Bio: ${
          course.instructor?.bio || "Experienced professional"
        }, Objectives: ${
          course.learningObjectives?.join(", ") || "Learn key skills"
        }, Level: ${course.level || "All levels"}, Duration: ${
          course.duration
            ? `${Math.round(course.duration / 60)} hours`
            : "Not specified"
        }, Rating: ${course.rating || "Not rated"}, Students: ${
          course.totalStudents || "Many"
        }, Audience: ${
          course.targetAudience?.join(", ") || "Professionals and beginners"
        }, Requirements: ${
          course.requirements?.join(", ") || "None"
        }, Companies: ${
          course.topCompanies?.join(", ") || "Leading companies"
        }, Certificate: ${
          course.certificateAvailable ? "Available" : "Not available"
        }.`;

        const response = await axios.post(
          GROQ_API_URL,
          {
            model: "llama3-8b-8192",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.7,
          },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GROQ_API_KEY}`,
            },
          }
        );

        console.log("Groq API response:", response.data);
        const generatedText = response.data.choices?.[0]?.message?.content;
        if (!generatedText) {
          throw new Error("Invalid response from Groq API");
        }
        setAiDescription(generatedText);
      } catch (err: any) {
        console.error("Groq API error:", err.message, err.response?.data);
        if (retries > 0) {
          console.log(`Retrying... (${retries} attempts left)`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          return fetchAiDescription(retries - 1, delay * 2);
        }
        setAiDescription(course?.description || "No description available.");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: err.message || "Failed to generate course description",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (GROQ_API_KEY) {
      fetchAiDescription();
    } else {
      console.error("Groq API key is missing");
      setAiDescription(course?.description || "No description available.");
      setIsLoading(false);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "API key not configured",
      });
    }
  }, [course?.id]);

  const sections: Section[] = [
    {
      id: "header",
      type: "header",
      data: null,
    },
    {
      id: "description",
      type: "description",
      data: { title: course?.title, description: aiDescription, isLoading },
    },
    {
      id: "instructor",
      type: "instructor",
      data: course?.instructor,
    },
    {
      id: "details",
      type: "details",
      data: {
        level: course?.level,
        duration: course?.duration,
        rating: course?.rating,
        totalStudents: course?.totalStudents,
        certificateAvailable: course?.certificateAvailable,
      },
    },
    {
      id: "objectives",
      type: "objectives",
      data: course?.learningObjectives,
    },
    {
      id: "audience",
      type: "audience",
      data: course?.targetAudience,
    },
    {
      id: "requirements",
      type: "requirements",
      data: course?.requirements,
    },
    {
      id: "companies",
      type: "companies",
      data: course?.topCompanies,
    },
  ];

  const renderSection = ({ item }: { item: Section }) => {
    switch (item.type) {
      case "header":
        return (
          <View style={styles.header}>
            <BookOpen color="#a500ff" size={24} style={styles.icon} />
            <Text style={styles.headerText}>About this Course</Text>
          </View>
        );
      case "description":
        return (
          <View style={styles.card}>
            <Text style={styles.title}>
              {item.data.title || "Course Title"}
            </Text>
            {item.data.isLoading ? (
              <Text style={styles.description}>Generating description...</Text>
            ) : (
              <Text style={styles.description}>{item.data.description}</Text>
            )}
          </View>
        );
      case "instructor":
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Instructor</Text>
            {item.data?.image && (
              <Image
                source={{ uri: item.data.image }}
                style={styles.instructorImage}
              />
            )}
            <Text style={styles.instructorName}>
              {item.data?.name || "Unknown"}
            </Text>
            <Text style={styles.instructorBio}>
              {item.data?.bio || "No bio available."}
            </Text>
          </View>
        );
      case "details":
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Key Details</Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Level: </Text>
              {item.data?.level || "Not specified"}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Duration: </Text>
              {item.data?.duration
                ? `${Math.round(item.data.duration / 60)} hours`
                : "Not specified"}
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Rating: </Text>
              {item.data?.rating || "Not rated"} (
              {item.data?.totalStudents || 0} students)
            </Text>
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Certificate: </Text>
              {item.data?.certificateAvailable ? "Available" : "Not available"}
            </Text>
          </View>
        );
      case "objectives":
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Learning Objectives</Text>
            {item.data?.length ? (
              item.data.map((objective: string, index: number) => (
                <Text key={index} style={styles.listItem}>
                  • {objective}
                </Text>
              ))
            ) : (
              <Text style={styles.listItem}>No objectives listed.</Text>
            )}
          </View>
        );
      case "audience":
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Target Audience</Text>
            {item.data?.length ? (
              item.data.map((audience: string, index: number) => (
                <Text key={index} style={styles.listItem}>
                  • {audience}
                </Text>
              ))
            ) : (
              <Text style={styles.listItem}>No target audience specified.</Text>
            )}
          </View>
        );
      case "requirements":
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {item.data?.length ? (
              item.data.map((req: string, index: number) => (
                <Text key={index} style={styles.listItem}>
                  • {req}
                </Text>
              ))
            ) : (
              <Text style={styles.listItem}>No requirements listed.</Text>
            )}
          </View>
        );
      case "companies":
        return (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Trusted by Companies</Text>
            {item.data?.length ? (
              item.data.map((company: string, index: number) => (
                <Text key={index} style={styles.listItem}>
                  • {company}
                </Text>
              ))
            ) : (
              <Text style={styles.listItem}>No companies listed.</Text>
            )}
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <FlatList
      data={sections}
      renderItem={renderSection}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
    />
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
