import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import { Search, Star } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  instructor: string;
  rating: number;
  price: number;
  discount?: number;
  discountPrice?: number;
  shortDescription?: string;
}

interface Suggestion {
  id: string;
  text: string;
  type: "course" | "category";
}

export default function SearchScreen() {
  const { getToken } = useAuth();
  const navigation = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Fetch categories and all courses on mount
  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken();
      if (!token) {
        console.log("User is not authenticated");
        setLoading(false);
        return;
      }

      try {
        // Fetch categories
        const categoriesResponse = await fetch(
          "https://braini-x-one.vercel.app/api/categories/full",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!categoriesResponse.ok) {
          throw new Error(`HTTP error! status: ${categoriesResponse.status}`);
        }

        const categoriesData = await categoriesResponse.json();
        const formattedCategories = categoriesData.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        }));
        setCategories(formattedCategories);

        // Fetch all courses
        const coursesResponse = await fetch(
          "https://braini-x-one.vercel.app/api/courses",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!coursesResponse.ok) {
          throw new Error(`HTTP error! status: ${coursesResponse.status}`);
        }

        const coursesData = await coursesResponse.json();
        const formattedCourses = coursesData.map((course: any) => ({
          id: course.id,
          title: course.title,
          slug: course.slug,
          thumbnail: course.thumbnail,
          instructor: course.instructor,
          rating: course.rating,
          price: course.price,
          discount: course.discount,
          discountPrice: course.discountPrice,
          shortDescription: course.shortDescription,
        }));
        setAllCourses(formattedCourses);
        setFilteredCourses(formattedCourses); // Initially show all courses
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch AI-powered suggestions based on search query
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setSuggestionsLoading(true);
      try {
        const token = await getToken();
        const response = await fetch(
          `https://braini-x-one.vercel.app/api/search/suggestions?q=${encodeURIComponent(
            searchQuery
          )}`,
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
        const formattedSuggestions = data.map((item: any) => ({
          id: item.id,
          text: item.name || item.title,
          type: item.name ? "category" : "course",
        }));
        setSuggestions(formattedSuggestions);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [searchQuery]);

  // Filter courses based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCourses(allCourses);
    } else {
      const filtered = allCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (course.shortDescription &&
            course.shortDescription
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          course.instructor.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCourses(filtered);
    }
  }, [searchQuery, allCourses]);

  const handleCategoryPress = (slug: string) => {
    navigation.navigate("CategoryDetails", { slug });
  };

  const handleCoursePress = (slug: string) => {
    navigation.navigate("CourseDetails", { slug });
  };

  const handleSuggestionPress = (suggestion: Suggestion) => {
    if (suggestion.type === "category") {
      handleCategoryPress(suggestion.id);
    } else {
      handleCoursePress(suggestion.id);
    }
    setSearchQuery("");
    setSuggestions([]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search style={styles.searchIcon} size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {suggestionsLoading && searchQuery.length >= 2 && (
        <View style={styles.suggestionsContainer}>
          <ActivityIndicator size="small" color="#ffffff" />
        </View>
      )}

      {suggestions.length > 0 && !suggestionsLoading && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={({ item }) => (
              <Pressable
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(item)}
              >
                <ThemedText style={styles.suggestionText}>
                  {item.text} ({item.type})
                </ThemedText>
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>
      )}

      <View style={styles.categoriesContainer}>
        <ThemedText style={styles.header}>Categories</ThemedText>
        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <Pressable
              style={styles.categoryItem}
              onPress={() => handleCategoryPress(item.slug)}
            >
              <ThemedText style={styles.categoryText}>{item.name}</ThemedText>
            </Pressable>
          )}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.coursesContainer}>
        {loading ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : filteredCourses.length > 0 ? (
          <FlatList
            data={filteredCourses}
            renderItem={({ item }) => (
              <Pressable
                style={styles.courseItem}
                onPress={() => handleCoursePress(item.slug)}
              >
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.courseImage}
                />
                <View style={styles.courseDetails}>
                  <ThemedText style={styles.courseTitle}>
                    {item.title}
                  </ThemedText>
                  <ThemedText style={styles.instructor}>
                    by {item.instructor}
                  </ThemedText>
                  <View style={styles.ratingContainer}>
                    <Star size={16} color="#FFD700" fill="#FFD700" />
                    <ThemedText style={styles.rating}>
                      {item.rating.toFixed(1)}
                    </ThemedText>
                  </View>
                  <View style={styles.priceContainer}>
                    {item.discount ? (
                      <>
                        <ThemedText style={styles.discountPrice}>
                          ${item.discountPrice?.toFixed(2)}
                        </ThemedText>
                        <ThemedText style={styles.originalPrice}>
                          ${item.price.toFixed(2)}
                        </ThemedText>
                      </>
                    ) : (
                      <ThemedText style={styles.price}>
                        ${item.price.toFixed(2)}
                      </ThemedText>
                    )}
                  </View>
                </View>
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <ThemedText style={styles.noResultsText}>
            {searchQuery
              ? `No courses found for "${searchQuery}"`
              : "No courses available."}
          </ThemedText>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  searchContainer: {
    padding: 10,
    backgroundColor: "#111",
  },
  searchInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: "#fff",
    fontSize: 16,
  },
  suggestionsContainer: {
    padding: 10,
    backgroundColor: "#111",
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  suggestionText: {
    fontSize: 16,
    color: "#fff",
  },
  categoriesContainer: {
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  categoryItem: {
    padding: 10,
    marginRight: 10,
    backgroundColor: "#222",
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 16,
    color: "#fff",
  },
  coursesContainer: {
    flex: 1,
    padding: 10,
  },
  courseItem: {
    flexDirection: "row",
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#111",
    borderRadius: 8,
  },
  courseImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
  },
  courseDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  instructor: {
    fontSize: 14,
    color: "#999",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    fontSize: 14,
    color: "#fff",
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  discountPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f0",
  },
  originalPrice: {
    fontSize: 14,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  noResultsText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginVertical: 20,
  },
});
