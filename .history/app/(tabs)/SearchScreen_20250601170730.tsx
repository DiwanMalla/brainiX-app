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

  // Fetch AI-powered suggestions using Groq API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setShowCourses(false);
        return;
      }

      setSuggestionsLoading(true);
      setShowCourses(true); // Show courses when user starts typing
      try {
        const prompt = `
          Given the search query "${searchQuery}", generate a list of up to 5 relevant suggestions for an e-learning platform. Suggestions can include course titles or categories that match the query. Return the suggestions as a JSON array of objects with "id", "text", and "type" ("course" or "category"). Use the following available categories: ${JSON.stringify(
          categories.map((c) => c.name)
        )} and courses: ${JSON.stringify(
          allCourses.map((c) => c.title)
        )}. Ensure suggestions are relevant to the query.
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
              id: item.id || Math.random().toString(36).substring(2, 15), // Fallback ID
              text: item.text,
              type: item.type as "course" | "category",
            }))
          : [];

        setSuggestions(suggestionsArray);
      } catch (error) {
        console.error("Error fetching suggestions from Groq:", error);
        // Fallback to client-side suggestions
        const fallbackSuggestions: Suggestion[] = [
          ...categories
            .filter((cat) =>
              cat.name.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((cat) => ({
              id: cat.id,
              text: cat.name,
              type: "category" as const,
            })),
          ...allCourses
            .filter((course) =>
              course.title.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((course) => ({
              id: course.id,
              text: course.title,
              type: "course" as const,
            })),
        ].slice(0, 5);
        setSuggestions(fallbackSuggestions);
      } finally {
        setSuggestionsLoading(false);
      }
    };

    fetchSuggestions();
  }, [searchQuery, categories, allCourses]);

  // Filter courses based on search query
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCourses([]);
      setShowCourses(false);
    } else {
      const filtered = allCourses.filter(
        (course) =>
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (course.shortDescription &&
            course.shortDescription
              .toLowerCase()
              .includes(searchQuery.toLowerCase())) ||
          course.instructor.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
      );
      setFilteredCourses(filtered);
      setShowCourses(true);
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
      const category = categories.find((cat) => cat.id === suggestion.id);
      if (category) {
        handleCategoryPress(category.slug);
      }
    } else {
      const course = allCourses.find((course) => course.id === suggestion.id);
      if (course) {
        handleCoursePress(course.slug);
        // Optionally, set search query to course title and show filtered courses
        setSearchQuery(course.title);
        setFilteredCourses(
          allCourses.filter(
            (c) =>
              c.title.toLowerCase().includes(course.title.toLowerCase()) ||
              (c.shortDescription &&
                c.shortDescription
                  .toLowerCase()
                  .includes(course.title.toLowerCase())) ||
              c.instructor.name
                .toLowerCase()
                .includes(course.title.toLowerCase())
          )
        );
        setShowCourses(true);
      }
    }
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
                    {item.text} ({item.type})
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
