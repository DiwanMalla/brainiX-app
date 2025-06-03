import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios, { isAxiosError } from "axios";
import { router } from "expo-router";
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
import { Star } from "lucide-react-native";

const HEADER_HEIGHT = 60;
const CART_ITEM_HEIGHT = 200; // Reduced height for compact cards
const FOOTER_HEIGHT = 80;

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
          size={16}
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
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Your cart is empty.</Text>
        <Pressable
          style={styles.exploreButton}
          onPress={() => router.push("/(tabs)/SearchScreen")}
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
      <Text style={styles.header}>My Cart</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {cartItems.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <Image source={{ uri: item.thumbnail }} style={styles.image} />
            <View style={styles.itemDetails}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.instructor}>By {item.instructor?.name}</Text>
              <View style={styles.ratingContainer}>
                {renderStars(item.rating)}
                <Text style={styles.ratingText}>({item.rating.toFixed(1)})</Text>
              </View>
              <Text style={styles.duration}>
                {item.duration} {item.duration === 1 ? "hour" : "hours"}
              </Text>
              <Text style={styles.price}>
                $
                {item.discountPrice != null
                  ? item.discountPrice.toFixed(2)
                  : item.price != null
                  ? item.price.toFixed(2)
                  : "N/A"}{" "}
                {item.price != null && item.discountPrice != null && (
                  <Text style={styles.strikeThrough}>
                    ${item.price.toFixed(2)}
                  </Text>
                )}
              </Text>
              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteCartItem(item.id)}
              >
                <Text style={styles.deleteButtonText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.totalPrice}>Total: ${totalPrice.toFixed(2)}</Text>
        <Pressable
          style={[
            styles.checkoutButton,
            !cartItems.length && styles.disabledButton,
          ]}
          onPress={proceedToCheckout}
          disabled={!cartItems.length}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
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
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  scrollContent: {
    paddingBottom: FOOTER_HEIGHT + 16,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
    marginBottom: 16,
  },
  exploreButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 4,
  },
  exploreButtonText: {
    color: "#fff