import { useAuth } from "@clerk/clerk-expo";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import axios, { isAxiosError } from "axios";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HEADER_HEIGHT = 60; // For consistency with SearchScreen
const CART_ITEM_HEIGHT = 300; // Fixed height per item
const BUTTON_HEIGHT = 60; // For buttons and total

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
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshCart, setRefreshCart] = useState(0);

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

  const deleteCartItem = async (itemId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        console.error("No token available");
        return;
      }

      await axios.delete(`https://braini-x-one.vercel.app/api/cart/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`Deleted item ${itemId} from cart`);
      setRefreshCart((prev) => prev + 1); // Trigger refetch
    } catch (err) {
      if (isAxiosError(err)) {
        console.error(
          "Error deleting cart item:",
          `Status: ${err.response?.status}, Data: ${JSON.stringify(
            err.response?.data
          )}`
        );
      } else {
        console.error(
          "Error deleting cart item:",
          (err as Error).message || err
        );
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCart();
    }, [fetchCart, refreshCart])
  );

  const proceedToCheckout = () => {
    if (cartItems && cartItems.length > 0) {
      const totalPrice = cartItems.reduce((sum, item) => {
        return sum + (item.discountPrice ?? item.price ?? 0);
      }, 0);
      navigation.navigate("Checkout", { cartItems, totalPrice });
    }
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

  const totalPrice = cartItems.reduce((sum, item) => {
    return sum + (item.discountPrice ?? item.price ?? 0);
  }, 0);

  return (
    <View style={styles.container}>
      {cartItems.slice(0, 2).map((item) => (
        <View key={item.id} style={styles.cartItem}>
          <Image source={{ uri: item.thumbnail }} style={styles.image} />
          <View style={styles.itemDetails}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.instructor}>By {item.instructor?.name}</Text>
            <Text style={styles.shortDescription} numberOfLines={2}>
              {item.shortDescription}
            </Text>
            <Text style={styles.level}>Level: {item.level}</Text>
            <Text style={styles.price}>
              $
              {item.discountPrice != null
                ? item.discountPrice.toFixed(2)
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
      <View style={styles.footer}>
        <Text style={styles.totalPrice}>Total: ${totalPrice.toFixed(2)}</Text>
        <Pressable
          style={styles.checkoutButton}
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
    backgroundColor: "#000", // Match SearchScreen dark theme
    padding: 16,
    height: SCREEN_HEIGHT,
  },
  loader: { flex: 1, justifyContent: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, color: "#888" },
  cartItem: {
    flexDirection: "row",
    height: CART_ITEM_HEIGHT,
    backgroundColor: "#111",
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  instructor: {
    fontSize: 14,
    color: "#999",
    marginBottom: 4,
  },
  shortDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  level: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#007bff",
    marginBottom: 4,
  },
  strikeThrough: {
    textDecorationLine: "line-through",
    color: "#999",
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: "#f44336",
    padding: 8,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  footer: {
    height: BUTTON_HEIGHT,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  checkoutButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 4,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Cart;
