import RecommendedCourses from "@/components/RecommendedCourse";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function FeaturedScreen() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const userName = user?.firstName || "User";
  const userAvatar = user?.imageUrl || "https://via.placeholder.com/50";

  const [categories, setCategories] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      const token = await getToken();
      if (!token) {
        console.log("User is not authenticated");
        return;
      }

      try {
        const response = await fetch(
          "https://braini-x-one.vercel.app/api/categories/full",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const formattedCategories = data.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        }));
        setCategories(formattedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const handleSeeAllCategories = () => {
    router.push("/AllCategories");
  };

  const handleCategoryPress = (slug: string) => {
    router.replace({ pathname: "/CategoryDetails", params: { slug } });
  };

  const handleCoursePress = (slug: string) => {
    router.replace({ pathname: "/CourseDetailsScreen", params: { slug } });
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <ThemedView style={styles.header}>
          <Image source={{ uri: userAvatar }} style={styles.avatar} />
          <View style={styles.headerTextContainer}>
            <ThemedText style={styles.welcome}>Welcome, {userName}</ThemedText>
            <Pressable onPress={() => router.push("/EditProfile")}>
              <ThemedText style={styles.edit}>
                Edit occupation and interests
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>

        {/* Hero Image */}
        <Image
          source={require("@/assets/images/hero-image.png")}
          style={styles.heroImage}
          contentFit="cover"
        />

        <ThemedText style={styles.slogan}>
          Empowering You With Future-Ready Skills 🚀
        </ThemedText>

        {/* Recommended Courses */}
        <RecommendedCourses />

        {/* Categories Section */}
        <View style={styles.categoriesHeader}>
          <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
          <Pressable onPress={handleSeeAllCategories}>
            <ThemedText style={styles.seeAll}>See all</ThemedText>
          </Pressable>
        </View>
        {loadingCategories ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : categories.length > 0 ? (
          <FlatList
            horizontal
            data={categories}
            renderItem={({ item }) => (
              <Pressable
                style={styles.categoryButton}
                onPress={() => handleCategoryPress(item.slug)}
              >
                <ThemedText style={styles.categoryButtonText}>
                  {item.name}
                </ThemedText>
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          />
        ) : (
          <ThemedText style={styles.noCategoriesText}>
            No categories found.
          </ThemedText>
        )}

        {/* Category Details Section (if navigated back with state) */}
        {selectedCategory && (
          <View style={styles.categoryDetails}>
            <ThemedText style={styles.sectionTitle}>
              Courses in{" "}
              {categories.find((cat) => cat.slug === selectedCategory)?.name ||
                selectedCategory}
            </ThemedText>
            <ThemedText>Course list will load here.</ThemedText>
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={styles.backButton}
            >
              <ThemedText style={styles.backButtonText}>
                Back to Categories
              </ThemedText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  welcome: {
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
  },
  edit: {
    color: "#a500ff",
    fontSize: 14,
    marginTop: 2,
  },
  heroImage: {
    width: "100%",
    height: 200,
  },
  slogan: {
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
    marginVertical: 15,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 20,
    marginBottom: 10,
  },
  content: {
    paddingHorizontal: 10,
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
  categoriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  seeAll: {
    color: "#a500ff",
    fontSize: 16,
    fontWeight: "600",
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 15,
    backgroundColor: "transparent",
    borderColor: "#fff",
    borderWidth: 1,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  noCategoriesText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginVertical: 10,
  },
  categoryDetails: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    borderColor: "#fff",
    borderWidth: 1,
  },
  backButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#a500ff",
    borderRadius: 5,
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
