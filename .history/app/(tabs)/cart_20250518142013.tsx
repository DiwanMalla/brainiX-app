import { useAuth } from "@clerk/clerk-expo";
import axios from "axios";
import React, { useEffect, useState } from "react";
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
  addedAt?: string; // Added from API response
  bestseller?: boolean; // Added from API response
  certificateAvailable?: boolean; // Added from API response
  featured?: boolean; // Added from API response
  published?: boolean; // Added from API response
  subtitlesLanguages?: string[]; // Added from API response
  tags?: string[]; // Added from API response
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[] | null>(null);
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.error("No token available");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          "https://braini-x-one.vercel.app/api/cart",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("API Response:", response.data);
        setCartItems(response.data);
      } catch (err) {
        console.error(
          "Error fetching cart:",
          err.response?.data || err.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, []);

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
          <Image
            source={{
              uri: item.thumbnail ?? "https://via.placeholder.com/200",
            }}
            style={styles.image}
          />
          <Text style={styles.title}>{item.title ?? "Untitled"}</Text>
          <Text style={styles.instructor}>
            By {item.instructor?.name ?? "Unknown Instructor"}
          </Text>
          <Text style={styles.shortDescription}>
            {item.shortDescription ?? "No description available"}
          </Text>
          <Text style={styles.level}>Level: {item.level ?? "Unknown"}</Text>
          <Text style={styles.price}>
            ₹{" "}
            {item.discountPrice != null ? item.discountPrice.toFixed(2) : "N/A"}{" "}
            <Text style={styles.strikeThrough}>
              ₹ {item.price != null ? item.price.toFixed(2) : "N/A"}
            </Text>
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
