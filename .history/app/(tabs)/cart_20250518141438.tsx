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
  price: number;
  discountPrice: number;
  instructor: Instructor;
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
  const [cartItem, setCartItem] = useState<CartItem | null>(null);
  const [loading, setLoading] = useState(true);
  // Assuming token is available in scope (e.g., from context or props)
  const token = "your-auth-token"; // Replace with actual token source

  useEffect(() => {
    axios
      .get("https://braini-x-one.vercel.app/api/cart", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setCartItem(res.data);
      })
      .catch((err) => {
        console.error("Error fetching cart:", err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
      <Image source={{ uri: cartItem.thumbnail }} style={styles.image} />
      <Text style={styles.title}>{cartItem.title}</Text>
      <Text style={styles.instructor}>By {cartItem.instructor.name}</Text>
      <Text style={styles.shortDescription}>{cartItem.shortDescription}</Text>
      <Text style={styles.level}>Level: {cartItem.level}</Text>
      <Text style={styles.price}>
        ₹ {cartItem.discountPrice.toFixed(2)}{" "}
        <Text style={styles.strikeThrough}>₹ {cartItem.price.toFixed(2)}</Text>
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
