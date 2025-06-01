import { useAuth } from "@clerk/clerk-expo";
import axios from "axios";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Progress from "react-native-progress";

interface Course {
  id: string;
  slug: string;
  title: string;
  image: string;
  instructor: string;
  price: number;
  purchaseDate: string;
  progress: number;
  description?: string;
  shortDescription?: string;
  rating?: number;
  students?: number;
  category?: string;
  level?: string;
  duration?: string;
  language?: string;
  lastUpdated?: string;
  whatYoullLearn?: string[];
  syllabus?: { title: string; lectures: number; duration: string }[];
  topcompanies?: string[];
}

const MyLearning = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error("No token available");
          setLoading(false);
          return;
        }

        // Fetch purchased courses
        const coursesRes = await axios.get(
          "https://braini-x-one.vercel.app/api/courses/purchased",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Fetch progress data
        const progressRes = await axios.get(
          "https://braini-x-one.vercel.app/api/courses/progress",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const coursesData = coursesRes.data;
        const progressData = progressRes.data;

        // Merge progress into each course
        const merged = coursesData.map((course: Course) => {
          const progressEntry = progressData.find(
            (p: { courseId: string; progress: number }) =>
              p.courseId === course.id
          );
          return {
            ...course,
            progress: progressEntry ? progressEntry.progress : 0,
          };
        });

        setCourses(merged);
      } catch (err) {
        console.error(
          "Failed to fetch courses or progress:",
          err.response?.data || err.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [getToken]);

  const handleCoursePress = (slug: string) => {
    router.replace({
      pathname: "/CourseLearningScreen",
      params: { slug, source: "my-learning" },
    });
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  if (courses.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No courses found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={courses}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleCoursePress(item.slug)}
        >
          <Image source={{ uri: item.image }} style={styles.image} />
          <View style={styles.info}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.instructor}>By {item.instructor}</Text>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Progress: {item.progress}%
              </Text>
              <Progress.Bar
                progress={item.progress / 100}
                width={null}
                height={8}
                color="#007bff"
                unfilledColor="#e0e0e0"
                borderWidth={0}
                style={styles.progressBar}
              />
            </View>
          </View>
        </TouchableOpacity>
      )}
    />
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, color: "#888" },
  container: { padding: 16 },
  card: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    elevation: 2,
  },
  image: {
    width: 100,
    height: 100,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  info: { flex: 1, padding: 12 },
  title: { fontSize: 16, fontWeight: "bold" },
  instructor: { color: "#666", marginVertical: 4 },
  progressContainer: { marginTop: 8 },
  progressText: { color: "#007bff", marginBottom: 4 },
  progressBar: { flex: 1 },
});

export default MyLearning;
