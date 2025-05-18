import RecommendedCourses from "@/components/RecommendedCourse";
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
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  discount?: number;
  discountPrice?: number;
  thumbnail: string;
  rating: number;
  students: number;
  category: string;
  level: string;
  duration: string;
  language: string;
  lastUpdated: string;
  instructor: {
    name: string;
    image: string;
    bio?: string;
    instructorProfile?: {
      title?: string;
      specialization?: string;
      biography?: string;
      averageRating?: number;
      totalStudents?: number;
      socialLinks?: { twitter?: string; linkedin?: string };
    };
  };
  whatYoullLearn: string[];
  syllabus: { title: string; lectures: number; duration: string }[];
  topCompanies: string[];
}

export default function CourseDetailsScreen() {
  const { getToken } = useAuth();
  const { slug, source } = useLocalSearchParams<{
    slug: string;
    source?: string;
  }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [isPurchased, setIsPurchased] = useState<boolean>(false);
  const [isInCart, setIsInCart] = useState<boolean>(false);
  const [addingToCart, setAddingToCart] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when slug changes
    setCourse(null);
    setIsFavorite(false);
    setIsPurchased(false);
    setIsInCart(false);
    setLoading(true);
    setError(null);

    const fetchCourseData = async () => {
      try {
        const cached = await AsyncStorage.getItem(`course_${slug}`);
        if (cached) {
          setCourse(JSON.parse(cached));
          setLoading(false);
          return;
        }

        const token = await getToken();
        const response = await fetch(
          `https://braini-x-one.vercel.app/api/courses/${slug}`,
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
        setCourse(data);
        await AsyncStorage.setItem(`course_${slug}`, JSON.stringify(data));
      } catch (err) {
        setError("Failed to load course data");
      }
    };

    const fetchUserData = async () => {
      const token = await getToken();
      if (!token) return;

      try {
        const [wishlistRes, enrollmentRes, cartRes] = await Promise.all([
          fetch("https://braini-x-one.vercel.app/api/wishlist", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://braini-x-one.vercel.app/api/enrollments", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("https://braini-x-one.vercel.app/api/cart", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (wishlistRes.ok) {
          const wishlist = await wishlistRes.json();
          setIsFavorite(
            !!wishlist.find((item: { id: string }) => item.id === course?.id)
          );
        }
        if (enrollmentRes.ok) {
          const enrollments = await enrollmentRes.json();
          setIsPurchased(
            !!enrollments.find((item: { id: string }) => item.id === course?.id)
          );
        }
        if (cartRes.ok) {
          const cart = await cartRes.json();
          setIsInCart(
            !!cart.find(
              (item: { courseId: string }) => item.courseId === course?.id
            )
          );
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    const fetchAllData = async () => {
      await Promise.all([fetchCourseData(), fetchUserData()]);
      setLoading(false);
    };

    fetchAllData();

    // Cleanup on unmount
    return () => {
      setCourse(null);
      setIsFavorite(false);
      setIsPurchased(false);
      setIsInCart(false);
      setLoading(true);
      setError(null);
    };
  }, [slug]);

  const toggleFavorite = async () => {
    const token = await getToken();
    if (!token) {
      Alert.alert("Error", "Please sign in to manage your wishlist");
      router.push("/sign-in");
      return;
    }

    try {
      const method = isFavorite ? "DELETE" : "POST";
      const response = await fetch(
        "https://braini-x-one.vercel.app/api/wishlist",
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ courseId: course?.id }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setIsFavorite(!isFavorite);
      Alert.alert(
        "Success",
        `Course ${isFavorite ? "removed from" : "added to"} your wishlist`
      );
    } catch (error) {
      console.error("Error toggling wishlist:", error);
      Alert.alert("Error", "Failed to update wishlist");
    }
  };

  const addToCart = async () => {
    const token = await getToken();
    if (!token) {
      Alert.alert("Error", "Please sign in to add to cart");
      router.push("/sign-in");
      return;
    }

    setAddingToCart(true);
    try {
      const response = await fetch("https://braini-x-one.vercel.app/api/cart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ courseId: course?.id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setIsInCart(true);
      Alert.alert("Success", `${course?.title} has been added to your cart`);
    } catch (error) {
      console.error("Error adding to cart:", error);
      Alert.alert("Error", "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const goToCart = () => {
    router.push("/cart");
  };

  const buyNow = () => {
    if (!isInCart) {
      addToCart();
    }

    if (!addingToCart) {
      setTimeout(() => {
        router.push("/checkout");
      }, 500);
    }
  };

  const goToLearning = () => {
    router.replace({
      pathname: "/my-learning",
      params: { slug: course?.slug },
    });
  };

  const handleBackPress = () => {
    if (source === "my-learning") {
      router.replace("/my-learning");
    } else {
      router.back();
    }
  };

  const toggleModule = (moduleTitle: string) => {
    setExpandedModules((prev) =>
      prev.includes(moduleTitle)
        ? prev.filter((title) => title !== moduleTitle)
        : [...prev, moduleTitle]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
      </SafeAreaView>
    );
  }

  if (error || !course) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText style={styles.errorText}>
          {error || "Course not found"}
        </ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={handleBackPress} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>← Back</ThemedText>
        </Pressable>

        {/* Course Header */}
        <View style={styles.headerContainer}>
          <ThemedText style={styles.categoryBadge}>
            {course.category}
          </ThemedText>
          <ThemedText style={styles.courseTitle}>{course.title}</ThemedText>
          <ThemedText style={styles.shortDescription}>
            {course.shortDescription}
          </ThemedText>
          <View style={styles.instructorContainer}>
            <Image
              source={{
                uri:
                  course.instructor.image || "https://via.placeholder.com/50",
              }}
              style={styles.instructorImage}
              contentFit="cover"
            />
            <View>
              <ThemedText style={styles.instructorName}>
                {course.instructor.name}
              </ThemedText>
              <ThemedText style={styles.instructorRole}>
                Course Instructor
              </ThemedText>
            </View>
          </View>
          <View style={styles.ratingContainer}>
            <ThemedText style={styles.ratingText}>
              {course.rating.toFixed(1)}
            </ThemedText>
            <View style={styles.starsContainer}>
              {[...Array(5)].map((_, i) => (
                <Ionicons
                  key={i}
                  name={i < Math.floor(course.rating) ? "star" : "star-outline"}
                  size={16}
                  color={i < Math.floor(course.rating) ? "#FFD700" : "#aaa"}
                />
              ))}
            </View>
            <ThemedText style={styles.studentsText}>
              ({course.students.toLocaleString()} students)
            </ThemedText>
          </View>
          <View style={styles.badgesContainer}>
            <View style={styles.badge}>
              <Ionicons name="time-outline" size={16} color="#aaa" />
              <ThemedText style={styles.badgeText}>
                {course.duration}
              </ThemedText>
            </View>
            <View style={styles.badge}>
              <Ionicons name="people-outline" size={16} color="#aaa" />
              <ThemedText style={styles.badgeText}>
                {course.students.toLocaleString()} students
              </ThemedText>
            </View>
            <View style={styles.badge}>
              <Ionicons name="bar-chart-outline" size={16} color="#aaa" />
              <ThemedText style={styles.badgeText}>{course.level}</ThemedText>
            </View>
            <View style={styles.badge}>
              <Ionicons name="globe-outline" size={16} color="#aaa" />
              <ThemedText style={styles.badgeText}>
                {course.language}
              </ThemedText>
            </View>
            <View style={styles.badge}>
              <Ionicons name="calendar-outline" size={16} color="#aaa" />
              <ThemedText style={styles.badgeText}>
                Last updated {course.lastUpdated}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Course Thumbnail and Purchase Card */}
        <View style={styles.purchaseCard}>
          <Image
            source={{ uri: course.thumbnail }}
            style={styles.thumbnail}
            contentFit="cover"
          />
          <View style={styles.priceContainer}>
            {course.discount ? (
              <View style={styles.priceWrapper}>
                <ThemedText style={styles.discountPrice}>
                  ${course.discountPrice?.toFixed(2)}
                </ThemedText>
                <ThemedText style={styles.originalPrice}>
                  ${course.price.toFixed(2)}
                </ThemedText>
                <ThemedText style={styles.discountBadge}>
                  Save {course.discount}%
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.discountPrice}>
                ${course.price.toFixed(2)}
              </ThemedText>
            )}
            <Pressable onPress={toggleFavorite} style={styles.wishlistButton}>
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? "#FF0000" : "#fff"}
              />
            </Pressable>
          </View>
          <View style={styles.buttonContainer}>
            {isPurchased ? (
              <Pressable style={styles.actionButton} onPress={goToLearning}>
                <ThemedText style={styles.actionButtonText}>
                  Continue Learning
                </ThemedText>
              </Pressable>
            ) : (
              <>
                <Pressable style={styles.actionButton} onPress={buyNow}>
                  <ThemedText style={styles.actionButtonText}>
                    Buy Now
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.outlineButton]}
                  onPress={isInCart ? goToCart : addToCart}
                  disabled={addingToCart}
                >
                  <Ionicons
                    name="cart-outline"
                    size={20}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                  <ThemedText style={styles.actionButtonText}>
                    {addingToCart
                      ? "Adding..."
                      : isInCart
                      ? "Go to Cart"
                      : "Add to Cart"}
                  </ThemedText>
                </Pressable>
              </>
            )}
          </View>
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#00FF00"
              />
              <ThemedText style={styles.benefitText}>
                Full lifetime access
              </ThemedText>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#00FF00"
              />
              <ThemedText style={styles.benefitText}>
                Access on mobile and TV
              </ThemedText>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#00FF00"
              />
              <ThemedText style={styles.benefitText}>
                Certificate of completion
              </ThemedText>
            </View>
            <ThemedText style={styles.guaranteeText}>
              30-day money-back guarantee
            </ThemedText>
          </View>
        </View>

        {/* What You'll Learn */}
        <View style={styles.sectionContainer}>
          <ThemedText style={styles.sectionTitle}>
            What You&apos;ll Learn
          </ThemedText>
          <View style={styles.learnItemsContainer}>
            {course.whatYoullLearn.map((item, index) => (
              <View key={index} style={styles.learnItem}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#00FF00"
                />
                <ThemedText style={styles.learnItemText}>{item}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Syllabus */}
        <View style={styles.sectionContainer}>
          <ThemedText style={styles.sectionTitle}>Course Syllabus</ThemedText>
          {course.syllabus.map((module, index) => (
            <View key={index} style={styles.accordionItem}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => toggleModule(module.title)}
              >
                <ThemedText style={styles.accordionTitle}>
                  {module.title}
                </ThemedText>
                <Ionicons
                  name={
                    expandedModules.includes(module.title)
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={20}
                  color="#fff"
                />
              </TouchableOpacity>
              {expandedModules.includes(module.title) && (
                <View style={styles.accordionContent}>
                  <ThemedText style={styles.accordionText}>
                    This module covers all aspects of{" "}
                    {module.title.toLowerCase()}.
                  </ThemedText>
                  <ThemedText style={styles.accordionSubText}>
                    {module.lectures} lectures • {module.duration}
                  </ThemedText>
                  <ThemedText style={styles.accordionSubText}>
                    You&apos;ll complete hands-on exercises and projects to reinforce
                    your learning.
                  </ThemedText>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Tabs for Course Details, Instructor, Reviews */}
        <View style={styles.sectionContainer}>
          <View style={styles.tabsContainer}>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === "details" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("details")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === "details" && styles.activeTabText,
                ]}
              >
                Course Details
              </ThemedText>
              {activeTab === "details" && <View style={styles.tabIndicator} />}
            </Pressable>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === "instructor" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("instructor")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === "instructor" && styles.activeTabText,
                ]}
              >
                Instructor
              </ThemedText>
              {activeTab === "instructor" && (
                <View style={styles.tabIndicator} />
              )}
            </Pressable>
            <Pressable
              style={[
                styles.tabButton,
                activeTab === "reviews" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("reviews")}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  activeTab === "reviews" && styles.activeTabText,
                ]}
              >
                Reviews
              </ThemedText>
              {activeTab === "reviews" && <View style={styles.tabIndicator} />}
            </Pressable>
          </View>
          <View style={styles.tabContent}>
            {activeTab === "details" && (
              <View>
                <ThemedText style={styles.tabSectionTitle}>
                  Description
                </ThemedText>
                <ThemedText style={styles.tabTextContent}>
                  {course.description}
                </ThemedText>
                <ThemedText style={styles.tabSectionTitle}>
                  Who this course is for:
                </ThemedText>
                <View style={styles.listContainer}>
                  <ThemedText style={styles.listItem}>
                    • Students looking to master {course.category.toLowerCase()}{" "}
                    skills
                  </ThemedText>
                  <ThemedText style={styles.listItem}>
                    • Professionals wanting to advance their career in{" "}
                    {course.category}
                  </ThemedText>
                  <ThemedText style={styles.listItem}>
                    • Anyone interested in learning {course.title.toLowerCase()}{" "}
                    from scratch
                  </ThemedText>
                  <ThemedText style={styles.listItem}>
                    • Self-taught practitioners looking to fill knowledge gaps
                  </ThemedText>
                </View>
              </View>
            )}
            {activeTab === "instructor" && (
              <View>
                <View style={styles.instructorProfileContainer}>
                  <Image
                    source={{
                      uri:
                        course.instructor.image ||
                        "https://via.placeholder.com/150",
                    }}
                    style={styles.instructorProfileImage}
                    contentFit="cover"
                  />
                  <View>
                    <ThemedText style={styles.instructorProfileName}>
                      {course.instructor.name}
                    </ThemedText>
                    <ThemedText style={styles.instructorProfileTitle}>
                      {course.instructor.instructorProfile?.title ||
                        "Instructor"}{" "}
                      -{" "}
                      {course.instructor.instructorProfile?.specialization ||
                        course.category}{" "}
                      Expert
                    </ThemedText>
                  </View>
                </View>
                <View style={styles.instructorStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={20} color="#FFD700" />
                    <ThemedText style={styles.statText}>
                      {course.instructor.instructorProfile?.averageRating?.toFixed(
                        1
                      ) || "N/A"}{" "}
                      Rating
                    </ThemedText>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="people" size={20} color="#a500ff" />
                    <ThemedText style={styles.statText}>
                      {course.instructor.instructorProfile?.totalStudents?.toLocaleString() ||
                        "0"}{" "}
                      Students
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.tabTextContent}>
                  {course.instructor.instructorProfile?.biography ||
                    course.instructor.bio ||
                    "No biography available."}
                </ThemedText>
                {course.instructor.instructorProfile?.socialLinks && (
                  <View style={styles.socialLinks}>
                    {course.instructor.instructorProfile.socialLinks
                      .twitter && (
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Open Link",
                            course.instructor.instructorProfile!.socialLinks!
                              .twitter!
                          );
                        }}
                      >
                        <ThemedText style={styles.socialLinkText}>
                          Twitter
                        </ThemedText>
                      </Pressable>
                    )}
                    {course.instructor.instructorProfile.socialLinks
                      .linkedin && (
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            "Open Link",
                            course.instructor.instructorProfile!.socialLinks!
                              .linkedin!
                          );
                        }}
                      >
                        <ThemedText style={styles.socialLinkText}>
                          LinkedIn
                        </ThemedText>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            )}
            {activeTab === "reviews" && (
              <View>
                <View style={styles.reviewSummary}>
                  <ThemedText style={styles.reviewRating}>
                    {course.rating.toFixed(1)}
                  </ThemedText>
                  <View style={styles.starsContainer}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons
                        key={i}
                        name={
                          i < Math.floor(course.rating)
                            ? "star"
                            : "star-outline"
                        }
                        size={24}
                        color={
                          i < Math.floor(course.rating) ? "#FFD700" : "#aaa"
                        }
                      />
                    ))}
                  </View>
                  <ThemedText style={styles.reviewLabel}>
                    {course.students.toLocaleString()} Ratings
                  </ThemedText>
                </View>
                <View style={styles.reviewDistribution}>
                  {[
                    { stars: 5, percentage: 70 },
                    { stars: 4, percentage: 20 },
                    { stars: 3, percentage: 7 },
                    { stars: 2, percentage: 2 },
                    { stars: 1, percentage: 1 },
                  ].map((item) => (
                    <View key={item.stars} style={styles.reviewBar}>
                      <View style={styles.reviewStars}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons
                            key={i}
                            name={i < item.stars ? "star" : "star-outline"}
                            size={16}
                            color={i < item.stars ? "#FFD700" : "#aaa"}
                          />
                        ))}
                      </View>
                      <View style={styles.reviewBarContainer}>
                        <View
                          style={[
                            styles.reviewBarFill,
                            { width: `${item.percentage}%` },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.reviewPercentage}>
                        {item.percentage}%
                      </ThemedText>
                    </View>
                  ))}
                </View>
                <View style={styles.sampleReviews}>
                  <ThemedText style={styles.tabSectionTitle}>
                    What Students Say
                  </ThemedText>
                  {[
                    {
                      name: "Alex Johnson",
                      rating: 5,
                      comment:
                        "This course was a game-changer! The instructor explains complex concepts in a clear and engaging way.",
                      date: "2025-04-15",
                    },
                    {
                      name: "Samantha Lee",
                      rating: 4,
                      comment:
                        "Really enjoyed the hands-on projects, though some modules could use more examples.",
                      date: "2025-03-20",
                    },
                  ].map((review, index) => (
                    <View key={index} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <ThemedText style={styles.reviewerName}>
                          {review.name}
                        </ThemedText>
                        <View style={styles.reviewStars}>
                          {[...Array(5)].map((_, i) => (
                            <Ionicons
                              key={i}
                              name={i < review.rating ? "star" : "star-outline"}
                              size={16}
                              color={i < review.rating ? "#FFD700" : "#aaa"}
                            />
                          ))}
                        </View>
                      </View>
                      <ThemedText style={styles.reviewComment}>
                        {review.comment}
                      </ThemedText>
                      <ThemedText style={styles.reviewDate}>
                        {review.date}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Top Companies */}
        {course.topCompanies.length > 0 && (
          <View style={styles.sectionContainer}>
            <ThemedText style={styles.sectionTitle}>
              Top Companies Trust This Course
            </ThemedText>
            <View style={styles.companiesContainer}>
              {course.topCompanies.map((company, index) => (
                <View key={index} style={styles.companyItem}>
                  <Ionicons name="business-outline" size={20} color="#a500ff" />
                  <ThemedText style={styles.companyText}>{company}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={styles.sectionContainer}>
          <RecommendedCourses />
        </View>
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
  backButton: {
    padding: 10,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 18,
    color: "#a500ff",
    fontWeight: "600",
  },
  headerContainer: {
    marginBottom: 20,
  },
  categoryBadge: {
    fontSize: 14,
    color: "#fff",
    backgroundColor: "#1c1c1e",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  courseTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  shortDescription: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 15,
  },
  instructorContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  instructorImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  instructorName: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  instructorRole: {
    fontSize: 14,
    color: "#aaa",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  ratingText: {
    fontSize: 18,
    color: "#FFD700",
    fontWeight: "bold",
    marginRight: 5,
  },
  starsContainer: {
    flexDirection: "row",
    marginRight: 10,
    marginVertical: 12,
  },
  studentsText: {
    fontSize: 14,
    color: "#aaa",
  },
  badgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  badgeText: {
    fontSize: 14,
    color: "#aaa",
    marginLeft: 5,
  },
  purchaseCard: {
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  thumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  priceWrapper: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  discountPrice: {
    fontSize: 20,
    color: "#00ff88",
    fontWeight: "bold",
    marginRight: 10,
  },
  originalPrice: {
    fontSize: 16,
    color: "#aaa",
    textDecorationLine: "line-through",
    marginRight: 10,
  },
  discountBadge: {
    fontSize: 14,
    color: "#fff",
    backgroundColor: "#a500ff",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  wishlistButton: {
    padding: 5,
  },
  buttonContainer: {
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: "#a500ff",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#a500ff",
    flexDirection: "row",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 10,
  },
  benefitsContainer: {
    marginTop: 10,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  benefitText: {
    fontSize: 14,
    color: "#ccc",
    marginLeft: 10,
  },
  guaranteeText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
    marginTop: 10,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  learnItemsContainer: {
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 15,
  },
  learnItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  learnItemText: {
    fontSize: 14,
    color: "#ccc",
    marginLeft: 10,
    flex: 1,
  },
  accordionItem: {
    backgroundColor: "transparent",
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
  },
  accordionTitle: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
    flex: 1,
  },
  accordionContent: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
  accordionText: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 10,
  },
  accordionSubText: {
    fontSize: 14,
    color: "#aaa",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    position: "relative",
  },
  activeTab: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontSize: 18,
    color: "#aaa",
    fontWeight: "600",
  },
  activeTabText: {
    color: "#fff",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -2,
    left: "20%",
    right: "20%",
    height: 3,
    backgroundColor: "#a500ff",
    borderRadius: 2,
  },
  tabContent: {
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 20,
  },
  tabSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },
  tabTextContent: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 15,
  },
  listContainer: {
    marginBottom: 15,
  },
  listItem: {
    fontSize: 16,
    color: "#ccc",
    marginBottom: 8,
  },
  instructorProfileContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  instructorProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginRight: 15,
  },
  instructorProfileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 5,
  },
  instructorProfileTitle: {
    fontSize: 16,
    color: "#aaa",
  },
  instructorStats: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 16,
    color: "#ccc",
    marginLeft: 8,
  },
  socialLinks: {
    flexDirection: "row",
    gap: 20,
  },
  socialLinkText: {
    fontSize: 16,
    color: "#a500ff",
    textDecorationLine: "underline",
  },
  reviewSummary: {
    alignItems: "center",
    marginBottom: 20,
    padding: 24,
    backgroundColor: "#000",
    borderRadius: 10,
    minHeight: 120,
    width: "100%",
    overflow: "visible",
    shadowColor: "#a500ff",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewRating: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#FFD700",
    marginBottom: 10,
    lineHeight: 48,
    textAlign: "center",
    includeFontPadding: false,
  },
  reviewLabel: {
    fontSize: 18,
    color: "#aaa",
    marginTop: 10,
  },
  reviewDistribution: {
    marginBottom: 20,
  },
  reviewBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewBarContainer: {
    flex: 1,
    height: 10,
    backgroundColor: "#333",
    borderRadius: 5,
    marginHorizontal: 10,
  },
  reviewBarFill: {
    height: 10,
    backgroundColor: "#FFD700",
    borderRadius: 5,
  },
  reviewStars: {
    flexDirection: "row",
    width: 90,
  },
  reviewPercentage: {
    fontSize: 16,
    color: "#ccc",
    width: 40,
    textAlign: "right",
  },
  sampleReviews: {
    marginTop: 20,
  },
  reviewCard: {
    backgroundColor: "#000",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  reviewComment: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 10,
  },
  reviewDate: {
    fontSize: 12,
    color: "#aaa",
  },
  companiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
    backgroundColor: "#1c1c1e",
    borderRadius: 10,
    padding: 15,
  },
  companyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 8,
    flex: 1,
    minWidth: width * 0.4,
  },
  companyText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
    marginLeft: 10,
  },
  errorText: {
    fontSize: 16,
    color: "#ff5252",
    textAlign: "center",
    marginTop: 20,
  },
});
