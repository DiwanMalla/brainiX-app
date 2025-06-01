import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import Groq from "groq-sdk";
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
        return;
      }

      setSuggestionsLoading(true);
      try {
        const prompt = `
          Given the search query "${searchQuery}", generate a list of up to 5 relevant keyword or tag suggestions for an e-learning platform. Suggestions should be single words or short phrases (e.g., "web development", "python", "data analysis") related to the following courses: ${JSON.stringify(
          allCourses.map((c) => ({
            title: c.title,
            description: c.shortDescription,
            category: c.category.name,
          }))
        )}. Do not suggest course titles or category names directly; instead, provide related keywords or tags. Return the suggestions as a JSON array of objects with "id" (generate a unique ID) and "text" (the keyword/tag). Ensure suggestions are relevant to the query.
        `;

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

        const parsedResponse = JSON.parse(response);
        const suggestionsArray = Array.isArray(parsedResponse.suggestions)
          ? parsedResponse.suggestions.map((item: any) => ({
              id: item.id || Math.random().toString(36).substring(2, 15),
              text: item.text,
            }))
          : [];

        setSuggestions(suggestionsArray);
      } catch (error) {
        console.error("Error fetching suggestions from Groq:", error);
        // Fallback to client-side keyword suggestions
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
        const fallbackSuggestions: Suggestion[] = keywords
          .slice(0, 5)
          .map((text, index) => ({
            id: `fallback-${index}`,
            text,
          }));
        setSuggestions(fallbackSuggestions);
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
   router.push({ pathname: "/(tabs)/CourseDetailsScreen", params: { slug } });

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
