import { useAuth } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
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

interface Course {
  id: string;
  slug: string;
  title: string;
  image: string;
  instructor: string;
  price: number;
  purchaseDate: string;
  progress: number;
}

const MyLearning = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const { getToken } = useAuth();
  const navigation = useNavigation();

  // Static progress array for this example
  const progressArray = [
    { courseId: "course_13", progress: 10 },
    { courseId: "course_1", progress: 0 },
    { courseId: "course_5", progress: 0 },
    { courseId: "course_9", progress: 0 },
  ];
  const handleCoursePress = (slug: string) => {
    router.push({ pathname: "/(tabs)/CourseDetailsScreen", params: { slug } });
  };
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error("No token available");
          setLoading(false);
          return;
        }

        const res = await axios.get(
          "https://braini-x-one.vercel.app/api/courses/purchased",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = res.data;

        // Merge progress into each course
        const merged = data.map((course: any) => {
          const match = progressArray.find((p) => p.courseId === course.id);
          return {
            ...course,
            progress: match ? match.progress : 0,
          };
        });

        setCourses(merged);
      } catch (err) {
        console.error(
          "Failed to fetch courses:",
          err.response?.data || err.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [getToken]);

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
            <Text style={styles.progress}>Progress: {item.progress}%</Text>
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
  progress: { color: "#007bff" },
});

export default MyLearning;
