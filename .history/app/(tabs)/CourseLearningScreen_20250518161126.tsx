// CourseLearningScreen.tsx
import { useAuth } from "@clerk/clerk-expo";
import axios from "axios";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Define the shape of a content item (adjust based on actual API response)
interface ContentItem {
  id: string;
  title: string;
  type: string; // e.g., "video", "article", "quiz"
  duration?: string;
  url?: string;
  description?: string;
}

const CourseLearningScreen = () => {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchCourseContent = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError("Authentication token not available");
          setLoading(false);
          return;
        }

        // Construct API URL dynamically using the slug
        const apiUrl = `https://braini-x-one.vercel.app/api/courses/${slug}/content`;
        const res = await axios.get(apiUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Assuming the API returns an array of content items
        setContent(res.data);
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "response" in err &&
          err.response &&
          typeof err.response === "object" &&
          "data" in err.response
        ) {
          setError(
            `Failed to fetch content: ${
              err.response.data.message || "Unknown error"
            }`
          );
        } else if (err && typeof err === "object" && "message" in err) {
          setError(`Failed to fetch content: ${err.message}`);
        } else {
          setError("Failed to fetch content: Unknown error");
        }
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCourseContent();
    } else {
      setError("No course slug provided");
      setLoading(false);
    }
  }, [slug, getToken]);

  const handleContentPress = (item: ContentItem) => {
    // Handle navigation to specific content (e.g., video player, article viewer)
    // Example: Navigate to a video player screen if item.type === "video"
    console.log(`Clicked content: ${item.title}`, item);
    // Implement navigation or action based on content type
    // router.push({ pathname: "/ContentViewer", params: { url: item.url, type: item.type } });
  };

  if (loading) {
    return <ActivityIndicator style={styles.center} size="large" />;
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (content.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          No content available for this course.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Course Content</Text>
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.contentCard}
            onPress={() => handleContentPress(item)}
          >
            <Text style={styles.contentTitle}>{item.title}</Text>
            <Text style={styles.contentType}>{item.type}</Text>
            {item.duration && (
              <Text style={styles.contentDuration}>
                Duration: {item.duration}
              </Text>
            )}
            {item.description && (
              <Text style={styles.contentDescription}>{item.description}</Text>
            )}
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.contentList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: 16, backgroundColor: "#f5f5f5" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  contentList: { paddingBottom: 16 },
  contentCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  contentTitle: { fontSize: 18, fontWeight: "600", marginBottom: 4 },
  contentType: { color: "#666", textTransform: "capitalize" },
  contentDuration: { color: "#666", marginTop: 4 },
  contentDescription: { color: "#888", marginTop: 8, fontSize: 14 },
  errorText: { fontSize: 18, color: "red", textAlign: "center" },
  emptyText: { fontSize: 18, color: "#888", textAlign: "center" },
});

export default CourseLearningScreen;
