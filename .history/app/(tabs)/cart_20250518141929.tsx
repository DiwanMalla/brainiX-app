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
  price?: number; // Made optional to handle undefined
  discountPrice?: number; // Made optional to handle undefined
  instructor?: Instructor; // Already optional from previous fix
  rating: number;
  totalStudents: number;
  duration: number;
  level: string;
  totalLessons: number;
  totalModules: number;
  shortDescription: string;
  language: string;
}

const Cart = () => {
  const [cartItem, setCartItem] = useState<CartItem[] | null>(null);
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const token = await getToken(); // Fetch the token asynchronously
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
        console.log("API Response:", response.data); // Log response for debugging
        setCartItem(response.data);
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
  }, [getToken]);

  if (loading) {
    return (
      <ActivityIndicator style={styles.loader} size="large" color="#007bff" />
    );
  }

  if (!cartItem) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Cart is empty.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={{
          uri: cartItem.thumbnail ?? "https://via.placeholder.com/200",
        }}
        style={styles.image}
      />
      <Text style={styles.title}>{cartItem.title ?? "Untitled"}</Text>
      <Text style={styles.instructor}>
        By {cartItem.instructor?.name ?? "Unknown Instructor"}
      </Text>
      <Text style={styles.shortDescription}>
        {cartItem.shortDescription ?? "No description available"}
      </Text>
      <Text style={styles.level}>Level: {cartItem.level ?? "Unknown"}</Text>
      <Text style={styles.price}>
        ₹{" "}
        {cartItem.discountPrice != null
          ? cartItem.discountPrice.toFixed(2)
          : "N/A"}{" "}
        <Text style={styles.strikeThrough}>
          ₹ {cartItem.price != null ? cartItem.price.toFixed(2) : "N/A"}
        </Text>
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyText: { fontSize: 18, color: "#888" },
  container: { padding: 16, alignItems: "center" },
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
