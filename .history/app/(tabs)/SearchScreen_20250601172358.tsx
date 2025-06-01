import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import { Groq } from "groq-sdk";
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

const GROQ_API_KEY = "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";

const groq = new Groq({ apiKey: GROQ_API_KEY });

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
        console.log("Categories data:", categoriesData); // Debug: Check for unexpected logs
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
        console.log("Courses data:", coursesData); // Debug: Check for unexpected logs
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
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch tag/keyword suggestions using Groq API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setShowCourses(false);
        setApiError(null);
        return;
      }

      setSuggestionsLoading(true);
      try {
        if (!GROQ_API_KEY) {
          throw new Error("GROQ_API_KEY is not defined");
        }

        console.log(
          "Fetching suggestions with GROQ_API_KEY:",
          GROQ_API_KEY.substring(0, 5) + "..."
        ); // Debug: Log partial key

        const courseData = allCourses
          .map((c) => `${c.title}, ${c.category.name}`)
          .join("; ");
        const prompt = `Generate a JSON object with an array of up to 5 keyword or tag suggestions relevant to the search query "${searchQuery}" for an e-learning platform. Suggestions should be single words or short phrases (e.g., "web development", "python", "data analysis"), not course titles or category names. Use these courses and categories: ${courseData}. Return exactly this JSON format: {"suggestions": [{"id": "1", "text": "keyword1"}, {"id": "2", "text": "keyword2"}, ...]}. Ensure suggestions are relevant.`;

        console.log("Groq prompt:", prompt); // Debug: Log prompt

        const completion = await groq.chat.completions.create({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          response_format: { type: "json_object" },
        });

        const response = completion.choices[0]?.message?.content;
        if (!response) {
          throw new Error("No response from Groq API");
        }

        console.log("Groq API response:", response); // Debug: Log response

        const parsedResponse = JSON.parse(response);
        const suggestionsArray = Array.isArray(parsedResponse.suggestions)
          ? parsedResponse.suggestions.map((item: any) => ({
              id: item.id || Math.random().toString(36).substring(2, 15),
              text: item.text,
            }))
          : [];

        setSuggestions(suggestionsArray);
        setApiError(null);
      } catch (error: any) {
        console.error("Error fetching suggestions from Groq:", error);
        let errorMessage =
          "Failed to fetch suggestions. Using fallback suggestions.";
        let suggestionsArray: Suggestion[] = [];

        if (error.message.includes("400") && error.failed_generation) {
          // Try to parse failed_generation
          try {
            const failedResponse = JSON.parse(error.failed_generation);
            if (Array.isArray(failedResponse.suggestions)) {
              suggestionsArray = failedResponse.suggestions.map(
                (item: any) => ({
                  id:
                    item.id.toString() ||
                    Math.random().toString(36).substring(2, 15),
                  text: item.text,
                })
              );
              errorMessage = "Recovered suggestions from failed generation.";
            }
          } catch (parseError) {
            console.error("Error parsing failed_generation:", parseError);
          }
        } else if (error.message.includes("401")) {
          errorMessage =
            "Invalid Groq API key. Please check your API key in the Groq console.";
        }

        setApiError(errorMessage);

        // Fallback to client-side keyword suggestions
        if (suggestionsArray.length === 0) {
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
                .filter((word) =>
                  word.toLowerCase().includes(searchQuery.toLowerCase())
                )
            ),
          ];
          suggestionsArray = keywords.slice(0, 5).map((text, index) => ({
            id: `fallback-${index}`,
            text,
          }));
        }

        setSuggestions(suggestionsArray);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [searchQuery, allCourses]);

  // Filter courses based on search query
  const filterCourses = (query: string) => {
    if (!query) {
      setFilteredCourses([]);
      setShowCourses(false);
      return;
    }

    const filtered = allCourses.filter(
      (course) =>
        course.title.toLowerCase().includes(query.toLowerCase()) ||
        (course.shortDescription &&
          course.shortDescription
            .toLowerCase()
            .includes(query.toLowerCase())) ||
        course.instructor.name.toLowerCase().includes(query.toLowerCase()) ||
        course.category.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredCourses(filtered);
    setShowCourses(true);
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    filterCourses(searchQuery);
  };

  const handleCategoryPress = (slug: string) => {
    navigation.navigate("CategoryDetails", { slug });
  };

  const handleCoursePress = (slug: string) => {
    navigation.navigate("CourseDetails", { slug });
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

      {suggestionsLoading && searchQuery.length >= 2 && (
        <View style={styles.suggestionsContainer}>
          <ActivityIndicator size="small" color="#ffffff" />
        </View>
      )}

      {suggestions.length > 0 &&
        !suggestionsLoading &&
        searchQuery.length >= 2 && (
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
              No courses found for "{searchQuery}"
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
