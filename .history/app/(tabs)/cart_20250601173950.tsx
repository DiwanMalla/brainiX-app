import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect } from "@react-navigation/native";
import axios, { isAxiosError } from "axios";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
  duration: number;
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
  const [loading, setLoading] = useState(true);
  const [refreshCart, setRefreshCart] = useState(0); // Trigger refetch

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        console.error("No token available");
        return;
      }

      const response = await axios.get(
        "https://braini-x-one.vercel.app/api/cart",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("API Response:", response.data);

      // Validate response
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
          featured: item.featured || false,
          published: item.published || false,
          subtitlesLanguages: item.subtitlesLanguages || [],
          tags: item.tags || [],
        }));
        setCartItems(formattedItems);
      } else {
        console.error(
          "Invalid API response: Expected array, got",
          typeof response.data
        );
        setCartItems([]);
      }
    } catch (err) {
      if (isAxiosError(err)) {
        console.error(
          "Error fetching cart:",
          `Status: ${err.response?.status}, Data: ${JSON.stringify(
            err.response?.data
          )}, Message: ${err.message}`
        );
      } else {
        console.error("Error fetching cart:", (err as Error).message || err);
      }
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch cart data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart, refreshCart])
  );

  // Expose refreshCart function for other components (e.g., SearchScreen)
  const triggerCartRefresh = () => {
    setRefreshCart((prev) => prev + 1);
  };

  if (loading) {
    return (
      <ActivityIndicator style={styles.loader} size="large" color="#007bff" />
    );
  }

  if (!cartItems || cartItems.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Cart is empty.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {cartItems.map((item) => (
        <View key={item.id} style={styles.cartItem}>
          <Image source={{ uri: item.thumbnail }} style={styles.image} />
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.instructor}>By {item.instructor?.name}</Text>
          <Text style={styles.shortDescription}>{item.shortDescription}</Text>
          <Text style={styles.level}>Level: {item.level}</Text>
          <Text style={styles.price}>
            ₹{" "}
            {item.discountPrice != null ? item.discountPrice.toFixed(2) : "N/A"}{" "}
            {item.price != null && item.discountPrice != null && (
              <Text style={styles.strikeThrough}>
                ₹ {item.price.toFixed(2)}
              </Text>
            )}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, color: "#888" },
  container: { padding: 16 },
  cartItem: { alignItems: "center", marginBottom: 20 },
  image: { width: "100%", height: 200, borderRadius: 8 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginVertical: 10,
    textAlign: "center",
  },
  instructor: { fontSize: 16, color: "#555" },
  shortDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 8,
  },
  level: { fontSize: 14, fontWeight: "600", marginVertical: 4 },
  price: { fontSize: 18, fontWeight: "bold", color: "#007bff" },
  strikeThrough: {
    textDecorationLine: "line-through",
    color: "#999",
    fontSize: 16,
  },
});

export default Cart;
