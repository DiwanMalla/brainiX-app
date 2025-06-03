import { useAuth } from "@clerk/clerk-expo";
import axios from "axios";
import { router } from "expo-router";
import { Star } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
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
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getToken();
        if (!token) {
          throw new Error("No token available. Please sign in.");
        }

        // Fetch purchased courses
        const coursesRes = await axios.get(
          "https://braini-x-one.vercel.app/api/courses/purchased",
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
          }
        );

        // Fetch progress data
        const progressRes = await axios.get(
          "https://braini-x-one.vercel.app/api/courses/progress",
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000,
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
        let errorMessage = "Failed to fetch courses. Please try again.";
        if (axios.isAxiosError(err)) {
          if (err.response?.status === 504) {
            errorMessage = "Server timeout. Please try again later.";
          } else if (err.response?.status === 401) {
            errorMessage = "Authentication failed. Please sign in again.";
          }
          console.error(
            `Failed to fetch courses or progress: Status: ${
              err.response?.status
            }, Data: ${JSON.stringify(err.response?.data)}, Message: ${
              err.message
            }`
          );
        } else {
          console.error(
            "Failed to fetch courses or progress:",
            err.message || err
          );
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleCoursePress = (slug: string) => {
    router.replace({
      pathname: "/CourseLearningScreen",
      params: { slug, source: "my-learning" },
    });
  };

  // Render stars based on rating
  const renderStars = (rating: number = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={16}
          color="#FFD700"
          fill={i < fullStars ? "#FFD700" : "none"}
          style={styles.star}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            fetchCourses(); // Manually trigger fetch
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>No courses found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Learning</Text>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleCoursePress(item.slug)}
            activeOpacity={0.8}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.instructor}>By {item.instructor}</Text>
              <View style={styles.detailsContainer}>
                {item.category && (
                  <Text style={styles.category}>{item.category}</Text>
                )}
                {item.rating && (
                  <View style={styles.ratingContainer}>
                    {renderStars(item.rating)}
                    <Text style={styles.ratingText}>
                      ({item.rating.toFixed(1)})
                    </Text>
                  </View>
                )}
                {item.duration && (
                  <Text style={styles.duration}>{item.duration}</Text>
                )}
              </View>
              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Progress: {item.progress}%
                </Text>
                <Progress.Bar
                  progress={item.progress / 100}
                  width={null}
                  height={10}
                  color="#007bff"
                  unfilledColor="#333"
                  borderWidth={0}
                  borderRadius={5}
                  style={styles.progressBar}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
    marginTop: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
  },
  errorText: {
    fontSize: 16,
    color: "#f44336",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  card: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#111",
    borderRadius: 8,
    overflow: "hidden",
  },
  image: {
    width: 120,
    height: 120,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  info: {
    flex: 1,
    padding: 12,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  instructor: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  detailsContainer: {
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: "#007bff",
    fontWeight: "600",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  star: {
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    color: "#fff",
    marginLeft: 4,
  },
  duration: {
    fontSize: 12,
    color: "#999",
  },
  progressContainer: {
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    color: "#007bff",
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
  },
});

export default MyLearning;
