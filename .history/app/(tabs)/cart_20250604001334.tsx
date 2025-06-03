import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios, { isAxiosError } from "axios";
import { router } from "expo-router";
import { Star } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const HEADER_HEIGHT = 60;
const CART_ITEM_HEIGHT = 180; // Slightly reduced for compact, scannable cards
const FOOTER_HEIGHT = 100; // Increased for larger touch area

interface Instructor {
  name: string;
}

interface CartItem {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  price?: number;
  discountPrice?: number;
  instructor?: Instructor;
  rating: number;
  totalStudents: number;
  duration: number; // In hours
  level: string;
  totalLessons: number;
  totalModules: number;
  shortDescription: string;
  language: string;
  addedAt?: string;
  bestseller?: boolean;
  certificateAvailable?: boolean;
  featured?: boolean;
  published?: boolean;
  subtitlesLanguages?: string[];
  tags?: string[];
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[] | null>(null);
  const { getToken } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshCart, setRefreshCart] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getToken();
      if (!token) {
        throw new Error("No token available. Please sign in.");
      }

      const response = await axios.get(
        "https://braini-x-one.vercel.app/api/cart",
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000,
        }
      );

      if (Array.isArray(response.data)) {
        const formattedItems: CartItem[] = response.data.map((item: any) => ({
          id: item.id || Math.random().toString(36).substring(2, 15),
          slug: item.slug || "",
          title: item.title || "Untitled",
          thumbnail: item.thumbnail || "https://via.placeholder.com/200",
          price: item.price != null ? Number(item.price) : undefined,
          discountPrice:
            item.discountPrice != null ? Number(item.discountPrice) : undefined,
          instructor: item.instructor
            ? { name: item.instructor.name || "Unknown Instructor" }
            : undefined,
          rating: Number(item.rating) || 0,
          totalStudents: Number(item.totalStudents) || 0,
          duration: Number(item.duration) || 0,
          level: item.level || "Unknown",
          totalLessons: Number(item.totalLessons) || 0,
          totalModules: Number(item.totalModules) || 0,
          shortDescription: item.shortDescription || "No description available",
          language: item.language || "Unknown",
          addedAt: item.addedAt,
          bestseller: item.bestseller || false,
          certificateAvailable: item.certificateAvailable || false,
          featured: item.favored || false,
          published: item.published || false,
          subtitlesLanguages: item.subtitlesLanguages || [],
          tags: item.tags || [],
        }));
        setCartItems(formattedItems);
      } else {
        throw new Error(
          `Invalid API response: Expected array, got ${typeof response.data}`
        );
      }
    } catch (err) {
      let errorMessage = "Failed to fetch cart. Please try again.";
      if (isAxiosError(err)) {
        if (err.response?.status === 504) {
          errorMessage = "Server timeout. Please try again later.";
        } else if (err.response?.status === 401) {
          errorMessage = "Authentication failed. Please sign in again.";
        }
        console.error(
          `Error fetching cart: Status: ${
            err.response?.status
          }, Data: ${JSON.stringify(err.response?.data)}, Message: ${
            err.message
          }`
        );
      } else {
        console.error("Error fetching cart:", (err as Error).message || err);
      }
      setError(errorMessage);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCartItem = async (courseId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No token available. Please sign in.");
      }

      // Optimistic UI update
      setCartItems((prev) =>
        prev ? prev.filter((item) => item.id !== courseId) : prev
      );

      await axios.delete("https://braini-x-one.vercel.app/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
        data: { courseId },
      });

      Alert.alert("Success", "Item removed from cart.");
      setRefreshCart((prev) => prev + 1);
    } catch (err) {
      setRefreshCart((prev) => prev + 1); // Re-fetch to revert optimistic update
      let errorMessage = "Failed to remove item. Please try again.";
      if (isAxiosError(err)) {
        if (err.response?.status === 504) {
          errorMessage = "Server timeout. Please try again later.";
        } else if (err.response?.status === 404) {
          errorMessage = "Item not found in cart.";
        } else if (err.response?.status === 401) {
          errorMessage = "Authentication failed. Please sign in again.";
        }
        console.error(
          `Error deleting cart item: Status: ${
            err.response?.status
          }, Data: ${JSON.stringify(err.response?.data)}`
        );
      } else {
        console.error(
          "Error deleting cart item:",
          (err as Error).message || err
        );
      }
      Alert.alert("Error", errorMessage);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart, refreshCart])
  );

  const proceedToCheckout = () => {
    if (cartItems && cartItems.length > 0) {
      router.push("/checkout");
    } else {
      Alert.alert("Empty Cart", "Your cart is empty. Add items to proceed.");
    }
  };

  // Render stars based on rating
  const renderStars = (rating: number = 0) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          size={18}
          color="#FFD700"
          fill={i < fullStars ? "#FFD700" : "none"}
          style={styles.star}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading your cart...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => setRefreshCart((prev) => prev + 1)}
          accessibilityLabel="Retry loading cart"
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <View style={styles.center}>
        <Image
          source={{ uri: "https://via.placeholder.com/150?text=Empty+Cart" }}
          style={styles.emptyImage}
        />
        <Text style={styles.emptyText}>Your cart is empty.</Text>
        <Text style={styles.emptySubText}>
          Browse our courses and start learning today!
        </Text>
        <Pressable
          style={styles.exploreButton}
          onPress={() => router.push("/(tabs)/SearchScreen")}
          accessibilityLabel="Explore courses"
        >
          <Text style={styles.exploreButtonText}>Explore Courses</Text>
        </Pressable>
      </View>
    );
  }

  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + (item.discountPrice ?? item.price ?? 0);
  }, 0);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Cart ({cartItems.length})</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cartItems.map((item) => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [
              styles.cartItem,
              pressed && styles.cartItemPressed,
            ]}
            onPress={() =>
              router.push({
                pathname: "/CourseDetailsScreen",
                params: { slug: item.slug },
              })
            }
            accessibilityLabel={`View details for ${item.title}`}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.image} />
            <View style={styles.itemDetails}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.instructor}>By {item.instructor?.name}</Text>
              <View style={styles.ratingContainer}>
                {renderStars(item.rating)}
                <Text style={styles.ratingText}>
                  ({item.rating.toFixed(1)})
                </Text>
              </View>
              <Text style={styles.duration}>
                {item.duration} {item.duration === 1 ? "hour" : "hours"}
              </Text>
              <View style={styles.priceContainer}>
                <Text style={styles.price}>
                  $
                  {item.discountPrice != null
                    ? item.discountPrice.toFixed(2)
                    : item.price != null
                    ? item.price.toFixed(2)
                    : "N/A"}
                </Text>
                {item.price != null && item.discountPrice != null && (
                  <Text style={styles.strikeThrough}>
                    ${item.price.toFixed(2)}
                  </Text>
                )}
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => deleteCartItem(item.id)}
                accessibilityLabel={`Remove ${item.title} from cart`}
              >
                <Text style={styles.deleteButtonText}>Remove</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.checkoutButton,
            !cartItems.length && styles.disabledButton,
            pressed && cartItems.length && styles.buttonPressed,
          ]}
          onPress={proceedToCheckout}
          disabled={!cartItems.length}
          accessibilityLabel="Proceed to checkout"
        >
          <Text style={styles.checkoutButtonText}>Checkout</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 16,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: FOOTER_HEIGHT + 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    fontSize: 16,
    color: "#888",
    marginTop: 10,
  },
  emptyImage: {
    width: 150,
    height: 150,
    marginBottom: 20,
    opacity: 0.7,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    color: "#888",
    marginBottom: 20,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  exploreButton: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 2,
  },
  exploreButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 18,
    color: "#f44336",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 2,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cartItem: {
    flexDirection: "row",
    minHeight: CART_ITEM_HEIGHT,
    backgroundColor: "#111",
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cartItemPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  image: {
    width: 100,
    height: 100,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  itemDetails: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 6,
  },
  instructor: {
    fontSize: 14,
    color: "#999",
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  star: {
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    color: "#fff",
    marginLeft: 6,
  },
  duration: {
    fontSize: 14,
    color: "#999",
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007bff",
    marginRight: 8,
  },
  strikeThrough: {
    fontSize: 16,
    color: "#999",
    textDecorationLine: "line-through",
  },
  deleteButton: {
    backgroundColor: "#f44336",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: FOOTER_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#111",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
    elevation: 5,
  },
  totalContainer: {
    flexDirection: "column",
  },
  totalLabel: {
    fontSize: 16,
    color: "#999",
    marginBottom: 4,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  checkoutButton: {
    backgroundColor: "#007bff",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 2,
  },
  disabledButton: {
    backgroundColor: "#555",
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Cart;
