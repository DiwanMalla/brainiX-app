import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from "react-native";

const { width } = Dimensions.get("window");

export default function CategoryDetailsScreen() {
  const { getToken } = useAuth();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [categoryName, setCategoryName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [categoryImage, setCategoryImage] = useState<string>("");
  const [favorites, setFavorites] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<any>(null);
  const [apiLoading, setApiLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when slug changes
    setCourses([]);
    setCategoryName("");
    setDescription("");
    setCategoryImage("");
    setLoading(true);
    setError(null);
    setCategoryData(null);
    setApiLoading(true);
    setApiError(null);

    const fetchCategoryData = async () => {
      try {
        // Check cache first
        const cached = await AsyncStorage.getItem(`category_${slug}`);
        if (cached) {
          console.log(`Loaded category ${slug} from cache`);
          const data = JSON.parse(cached);
          setCategoryData(data);
          setCourses(data.courses || []);
          setCategoryName(data.name || (typeof slug === "string" ? slug : ""));
          setDescription(data.description || "");
          setCategoryImage(data.image || "");
          setLoading(false);
          setApiLoading(false);
          return;
        }

        // Fetch from API
        const response = await fetch(
          `https://braini-x-one.vercel.app/api/categories/${slug}`
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setCategoryData(data);
        setCourses(data.courses || []);
        setCategoryName(data.name || (typeof slug === "string" ? slug : ""));
        setDescription(data.description || "");
        setCategoryImage(data.image || "");

        // Cache the response
        await AsyncStorage.setItem(`category_${slug}`, JSON.stringify(data));
        setLoading(false);
        setApiLoading(false);
      } catch (err) {
        console.error("Error fetching category data:", err);
        setApiError("Failed to load category data");
        setError("Failed to load category data");
        setLoading(false);
        setApiLoading(false);
      }
    };

    fetchCategoryData();

    // Fetch wishlist to initialize favorites
    const fetchWishlist = async () => {
      const token = await getToken();
      if (!token) return;

      try {
        const response = await fetch(
          "https://braini-x-one.vercel.app/api/wishlist",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.ok) {
          const wishlist = await response.json();
          const favoritesMap = wishlist.reduce(
            (acc: { [key: string]: boolean }, item: { id: string }) => {
              acc[item.id] = true;
              return acc;
            },
            {}
          );
          setFavorites(favoritesMap);
        }
      } catch (err) {
        console.error("Error fetching wishlist:", err);
      }
    };

    fetchWishlist();

    // Cleanup on unmount
    return () => {
      setCourses([]);
      setCategoryName("");
      setDescription("");
      setCategoryImage("");
      setLoading(true);
      setError(null);
      setCategoryData(null);
      setApiLoading(true);
      setApiError(null);
    };
  }, [slug]);

  const addToWishlist = async (course: any) => {
    const token = await getToken();
    if (!token) {
      Alert.alert("Error", "Please sign in to manage your wishlist");
      router.push("/sign-in");
      return;
    }

    const isCurrentlyFavorite = !!favorites[course.id];

    try {
      const method = isCurrentlyFavorite ? "DELETE" : "POST";
      const response = await fetch(
        "https://braini-x-one.vercel.app/api/wishlist",
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ courseId: course.id }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setFavorites((prev) => ({
        ...prev,
        [course.id]: !isCurrentlyFavorite,
      }));
      Alert.alert(
        "Success",
        `Course ${
          isCurrentlyFavorite ? "removed from" : "added to"
        } your wishlist`
      );
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      Alert.alert("Error", "Failed to update wishlist");
    }
  };

  const handleCoursePress = (courseSlug: string) => {
    router.replace({
      pathname: "/CourseDetailsScreen",
      params: { slug: courseSlug },
    });
  };

  if (loading || apiLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  if (error || apiError || !categoryName) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText style={styles.errorText}>
          {error || apiError || "Category not found"}
        </ThemedText>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            setError(null);
            setApiLoading(true);
            setApiError(null);
          }}
        >
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </Pressable>
        <ThemedText style={styles.header}>Courses in {categoryName}</ThemedText>

        {/* Category Image */}
        {categoryImage && (
          <Image
            source={{ uri: categoryImage }}
            style={styles.categoryImage}
            contentFit="cover"
          />
        )}

        {/* Category Description */}
        <ThemedText style={styles.description}>{description}</ThemedText>

        {courses.length > 0 ? (
          <FlatList
            horizontal
            data={courses}
            renderItem={({ item }) => (
              <Pressable
                style={styles.courseItem}
                onPress={() => handleCoursePress(item.slug)}
              >
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.courseImage}
                  contentFit="cover"
                />
                <ThemedText style={styles.courseTitle}>{item.title}</ThemedText>
                <ThemedText style={styles.instructor}>
                  By {item.instructor?.name || "Unknown"}
                </ThemedText>
                <ThemedText style={styles.meta}>
                  ⭐ {item.rating || "N/A"} | {item.studentsCount || "0"}+
                  students
                </ThemedText>
                <Pressable
                  onPress={() => addToWishlist(item)}
                  style={styles.wishlistButton}
                >
                  <Ionicons
                    name={favorites[item.id] ? "heart" : "heart-outline"}
                    size={24}
                    color={favorites[item.id] ? "#FF0000" : "#fff"}
                  />
                </Pressable>
                <ThemedText style={styles.level}>
                  Level: {item.level || "N/A"}
                </ThemedText>
                <ThemedText style={styles.priceContainer}>
                  <ThemedText style={styles.duration}>
                    {item.duration || "N/A"}
                  </ThemedText>
                  <ThemedText style={styles.price}>
                    ${item.discountPrice || item.price || "N/A"}
                    {item.discountPrice && item.price && (
                      <ThemedText style={styles.originalPrice}>
                        ${item.price}
                      </ThemedText>
                    )}
                  </ThemedText>
                </ThemedText>
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          />
        ) : (
          <ThemedText style={styles.noCoursesText}>
            No courses found for {categoryName}.
          </ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  backButton: {
    padding: 10,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: "#a500ff",
    fontWeight: "600",
  },
  categoryImage: {
    width: "100%",
    height: 150,
    borderRadius: 10,
    marginBottom: 15,
  },
  description: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 20,
    textAlign: "center",
  },
  courseItem: {
    width: width * 0.7,
    marginRight: 15,
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 10,
  },
  courseImage: {
    width: "100%",
    height: 130,
    borderRadius: 8,
    marginBottom: 8,
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
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  duration: {
    fontSize: 14,
    color: "#aaa",
  },
  price: {
    fontSize: 15,
    color: "#00ff88",
    fontWeight: "bold",
  },
  originalPrice: {
    fontSize: 13,
    color: "#aaa",
    textDecorationLine: "line-through",
    marginLeft: 5,
  },
  level: {
    fontSize: 12,
    color: "#aaa",
    marginTop: 2,
  },
  wishlistButton: {
    position: "absolute",
    top: 15,
    right: 15,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  noCoursesText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginVertical: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#ff5252",
    textAlign: "center",
    marginTop: 20,
  },
  retryButton: {
    backgroundColor: "#a500ff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  retryButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
