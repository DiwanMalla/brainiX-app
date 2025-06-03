import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
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
  instructor: { name: string };
  rating: number;
  price: number;
  discount?: number;
  discountPrice?: number;
  shortDescription?: string;
  students: number;
  bestseller: boolean;
  level: string;
  category: { name: string };
}

interface Suggestion {
  id: string;
  text: string;
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
  const [showCourses, setShowCourses] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

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
        const formattedCategories = Array.isArray(categoriesData)
          ? categoriesData.map((cat: any) => ({
              id: cat.id,
              name: cat.name,
              slug: cat.slug,
            }))
          : [];
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
        const formattedCourses = Array.isArray(coursesData)
          ? coursesData.map((course: any) => ({
              id: course.id,
              title: course.title,
              slug: course.slug,
              thumbnail: course.thumbnail,
              instructor: { name: course.instructor.name },
              rating: course.rating,
              price: course.price,
              discount: course.discount,
              discountPrice: course.discount
                ? course.price * (1 - course.discount / 100)
                : undefined,
              shortDescription: course.shortDescription,
              students: course.students,
              bestseller: course.bestseller,
              level: course.level,
              category: { name: course.category.name },
            }))
          : [];
        setAllCourses(formattedCourses);
      } catch (error) {
        console.error("Error fetching data:", error);
        setApiError("Failed to fetch data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch suggestions based on search query
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 1) {
        setSuggestions([]);
        setShowCourses(false);
        setApiError(null);
        return;
      }

      setSuggestionsLoading(true);
      try {
        // Generate keyword suggestions from course titles, descriptions, and categories
        const keywords = [
          ...new Set(
            allCourses
              .flatMap((course) => [
                ...course.title.toLowerCase().split(" "),
                ...(course.shortDescription
                  ? course.shortDescription.toLowerCase().split(" ")
                  : []),
                course.category.name.toLowerCase(),
              ])
              .filter(
                (word) =>
                  word.length > 2 &&
                  word.toLowerCase().startsWith(searchQuery.toLowerCase())
              )
          ),
        ];

        // Check if the query matches a category exactly
        const exactCategoryMatch = categories.find(
          (cat) => cat.name.toLowerCase() === searchQuery.toLowerCase()
        );

        let suggestionsArray: Suggestion[] = [];

        // If query matches a category, prioritize showing courses for that category
        if (exactCategoryMatch) {
          setSuggestions([]);
          filterCourses(searchQuery);
        } else {
          // Include the search query as the first suggestion if it's a valid keyword
          const queryAsSuggestion = keywords.includes(searchQuery.toLowerCase())
            ? [{ id: "query-1", text: searchQuery }]
            : [];

          // Generate suggestions, prioritizing words that start with the query
          suggestionsArray = [
            ...queryAsSuggestion,
            ...keywords
              .filter((word) => word !== searchQuery.toLowerCase()) // Avoid duplicating the query
              .slice(0, 4) // Limit to 4 additional suggestions
              .map((text, index) => ({
                id: `suggestion-${index + 1}`,
                text,
              })),
          ];

          // Enhance suggestions for specific cases (e.g., "web" -> "website", "web development")
          if (searchQuery.toLowerCase() === "web") {
            suggestionsArray = [
              ...queryAsSuggestion,
              { id: "suggestion-1", text: "website" },
              { id: "suggestion-2", text: "web development" },
              { id: "suggestion-3", text: "web design" },
              ...keywords
                .filter(
                  (word) =>
                    !["website", "web development", "web design"].includes(word)
                )
                .slice(0, 2)
                .map((text, index) => ({
                  id: `suggestion-${index + 4}`,
                  text,
                })),
            ];
          }

          setSuggestions(suggestionsArray);
          setShowCourses(false);
        }

        setApiError(null);
      } catch (error: any) {
        console.error("Error generating suggestions:", error);
        setApiError("Failed to generate suggestions. Please try again.");
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [searchQuery, allCourses, categories]);

  // Filter courses based on search query
  const filterCourses = (query: string) => {
    if (!query) {
      setFilteredCourses([]);
      setShowCourses(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const exactCategoryMatch = categories.find(
      (cat) => cat.name.toLowerCase() === lowerQuery
    );

    let filtered: Course[] = [];

    if (exactCategoryMatch) {
      // If query matches a category, show all courses in that category
      filtered = allCourses.filter((course) =>
        course.category.name.toLowerCase().includes(lowerQuery)
      );
    } else {
      // Otherwise, filter by title, description, instructor, or category
      filtered = allCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(lowerQuery) ||
          (course.shortDescription &&
            course.shortDescription.toLowerCase().includes(lowerQuery)) ||
          course.instructor.name.toLowerCase().includes(lowerQuery) ||
          course.category.name.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredCourses(filtered);
    setShowCourses(true);
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    filterCourses(searchQuery);
  };

  const handleCategoryPress = (slug: string) => {
    router.push({ pathname: "/(tabs)/CourseDetailsScreen", params: { slug } });
  };

  const handleCoursePress = (slug: string) => {
    router.push({ pathname: "/(tabs)/CourseDetailsScreen", params: { slug } });
  };

  const handleSuggestionPress = (suggestion: Suggestion) => {
    setSearchQuery(suggestion.text);
    filterCourses(suggestion.text);
    setSuggestions([]);
  };

  // Render stars based on rating
  const renderStars = (rating: number) => {
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
            onSubmitEditing={handleSearchSubmit}
          />
        </View>
      </View>

      {apiError && (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{apiError}</ThemedText>
        </View>
      )}

      {suggestionsLoading && searchQuery.length >= 1 && (
        <View style={styles.suggestionsContainer}>
          <ActivityIndicator size="small" color="#ffffff" />
        </View>
      )}

      {suggestions.length > 0 &&
        !suggestionsLoading &&
        searchQuery.length >= 1 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(item)}
                >
                  <ThemedText style={styles.suggestionText}>
                    {item.text}
                  </ThemedText>
                </Pressable>
              )}
              keyExtractor={(item) => item.id}
            />
          </View>
        )}

      {searchQuery.length === 0 && (
        <View style={styles.categoriesContainer}>
          <ThemedText style={styles.header}>Categories</ThemedText>
          {loading ? (
            <ActivityIndicator size="large" color="#ffffff" />
          ) : (
            <FlatList
              data={categories}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.categoryItem}
                  onPress={() => handleCategoryPress(item.slug)}
                >
                  <ThemedText style={styles.categoryText}>
                    {item.name}
                  </ThemedText>
                </Pressable>
              )}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {showCourses && (
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
                      by {item.instructor.name}
                    </ThemedText>
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsContainer}>
                        {renderStars(item.rating)}
                      </View>
                      <ThemedText style={styles.students}>
                        ({item.students.toLocaleString()})
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
              No courses found for &quot;{searchQuery}&quot;
            </ThemedText>
          )}
        </View>
      )}
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
  errorContainer: {
    padding: 10,
    backgroundColor: "#511",
  },
  errorText: {
    fontSize: 14,
    color: "#f99",
    textAlign: "center",
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
    flex: 1,
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
    marginBottom: 10,
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
    justifyContent: "space-between",
  },
  starsContainer: {
    flexDirection: "row",
  },
  star: {
    marginRight: 2,
  },
  students: {
    fontSize: 14,
    color: "#fff",
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
