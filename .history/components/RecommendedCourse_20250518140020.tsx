import { ThemedText } from "@/components/ThemedText";
import { useUser } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const BASE_URL = "https://braini-x-one.vercel.app/api";

export default function RecommendedCourses() {
  const { user } = useUser();
  const [recommendedCourses, setRecommendedCourses] = useState<any[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user?.id) return;

    setLoadingCourses(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE_URL}/courses/recommended?userId=${user.id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          cache: "no-store",
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Fetch failed: ${res.status} ${res.statusText} - ${errorText}`
        );
      }

      const data = await res.json();
      setRecommendedCourses(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Failed to fetch recommended courses:", message);
    } finally {
      setLoadingCourses(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleCoursePress = (slug: string) => {
    router.push({ pathname: "/(tabs)/CourseDetailsScreen", params: { slug } });
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.sectionTitle}>Recommended for You</ThemedText>
      {loadingCourses ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : error ? (
        <ThemedText style={{ color: "red" }}>{error}</ThemedText>
      ) : (
        <FlatList
          horizontal
          data={recommendedCourses}
          renderItem={({ item }) => (
            <Pressable
              style={styles.courseItem}
              onPress={() => handleCoursePress(item.slug)}
            >
              <Image
                source={{ uri: item.thumbnail }}
                style={styles.courseImage}
              />
              {item.bestSeller && (
                <View style={styles.bestSellerBadge}>
                  <ThemedText style={styles.bestSellerText}>
                    Best Seller
                  </ThemedText>
                </View>
              )}
              <ThemedText style={styles.courseTitle}>{item.title}</ThemedText>
              <ThemedText style={styles.instructor}>
                By {item.instructor || "Unknown"}
              </ThemedText>
              <ThemedText style={styles.meta}>
                ⭐ {item.rating || "N/A"} | {item.students || "0"}+ students
              </ThemedText>
              <View style={styles.priceContainer}>
                <ThemedText style={styles.price}>
                  $
                  {item.price
                    ? item.discount
                      ? (
                          item.price -
                          (item.price * item.discount) / 100
                        ).toFixed(2)
                      : item.price.toFixed(2)
                    : "N/A"}
                </ThemedText>
                {item.discount && item.price && (
                  <ThemedText style={styles.originalPrice}>
                    ${item.price.toFixed(2)}
                  </ThemedText>
                )}
              </View>
            </Pressable>
          )}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  courseItem: {
    width: width * 0.7,
    marginRight: 15,
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 10,
    position: "relative",
  },
  courseImage: {
    width: "100%",
    height: 130,
    borderRadius: 8,
    marginBottom: 8,
  },
  bestSellerBadge: {
    position: "absolute",
    top: 18,
    left: 18,
    backgroundColor: "#FFD700",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  bestSellerText: {
    fontSize: 12,
    color: "#000",
    fontWeight: "600",
  },
  courseTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  instructor: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    color: "#aaa",
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    color: "#00ff88",
    fontWeight: "bold",
    marginRight: 8,
  },
  originalPrice: {
    fontSize: 13,
    color: "#aaa",
    textDecorationLine: "line-through",
  },
});
