import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  discount: number;
  tax: number;
  currency: string;
  paymentMethod: string | null;
  paymentId: string | null;
  billingAddress: {
    name: string;
    email: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  } | null;
  coupon: { code: string } | null;
  items: {
    id: string;
    course: {
      id: string;
      title: string;
      thumbnail: string | null;
      price: number;
      discountPrice: number | null;
      instructor: { name: string };
    };
    price: number;
  }[];
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://braini-x-one.vercel.app";

export default function ThankYouScreen() {
  const { getToken } = useAuth();
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderNumber) {
      Alert.alert("Error", "No order number provided.", [
        { text: "OK", onPress: () => router.push("/featured") },
      ]);
      setIsLoading(false);
      return;
    }

    const fetchOrder = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/orders/${orderNumber}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch order");
        }
        setOrder(data);
      } catch (err) {
        Alert.alert("Error", err.message || "Unable to load order details.", [
          { text: "OK", onPress: () => router.push("/featured") },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#a500ff" />
        <ThemedText style={styles.loadingText}>
          Loading order details...
        </ThemedText>
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>Order Not Found</ThemedText>
        <ThemedText style={styles.subtitle}>
          We couldn’t find the order details. Please contact support.
        </ThemedText>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/featured")}
        >
          <ThemedText style={styles.actionButtonText}>
            Browse Courses
          </ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#a500ff" />
        <ThemedText style={styles.backButtonText}>Back</ThemedText>
      </TouchableOpacity>

      <Animated.View entering={FadeIn} style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={48} color="#00FF88" />
        <ThemedText style={styles.title}>
          Thank You for Your Purchase!
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Your order has been successfully placed. You’ll receive a confirmation
          email soon.
        </ThemedText>
      </Animated.View>

      <View style={styles.card}>
        <ThemedText style={styles.cardTitle}>
          Order Details - #{order.orderNumber}
        </ThemedText>

        {/* Order Summary */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Order Summary</ThemedText>
          {order.items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Image
                source={{
                  uri:
                    item.course.thumbnail || "https://via.placeholder.com/80",
                }}
                style={styles.orderItemImage}
                contentFit="cover"
              />
              <View style={styles.orderItemDetails}>
                <ThemedText style={styles.orderItemTitle}>
                  {item.course.title}
                </ThemedText>
                <ThemedText style={styles.orderItemInstructor}>
                  By {item.course.instructor.name}
                </ThemedText>
                <ThemedText style={styles.orderItemPrice}>
                  A${item.price.toFixed(2)}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Billing Details */}
        <View style={[styles.section, styles.separator]}>
          <ThemedText style={styles.sectionTitle}>Billing Details</ThemedText>
          {order.billingAddress ? (
            <View style={styles.billingDetails}>
              <ThemedText style={styles.billingText}>
                {order.billingAddress.name}
              </ThemedText>
              <ThemedText style={styles.billingText}>
                {order.billingAddress.email}
              </ThemedText>
              <ThemedText style={styles.billingText}>
                {order.billingAddress.address.line1}
              </ThemedText>
              <ThemedText style={styles.billingText}>
                {order.billingAddress.address.city},{" "}
                {order.billingAddress.address.state}{" "}
                {order.billingAddress.address.postal_code}
              </ThemedText>
              <ThemedText style={styles.billingText}>
                {order.billingAddress.address.country}
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.billingText}>
              No billing address provided.
            </ThemedText>
          )}
        </View>

        {/* Payment Summary */}
        <View style={[styles.section, styles.separator]}>
          <ThemedText style={styles.sectionTitle}>Payment Summary</ThemedText>
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Subtotal:</ThemedText>
              <ThemedText style={styles.summaryValue}>
                A${(order.total + order.discount).toFixed(2)}
              </ThemedText>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.discountText}>
                  Discount ({order.coupon?.code || "Promo"}):
                </ThemedText>
                <ThemedText style={styles.discountText}>
                  -A${order.discount.toFixed(2)}
                </ThemedText>
              </View>
            )}
            {order.tax > 0 && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Tax:</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  A${order.tax.toFixed(2)}
                </ThemedText>
              </View>
            )}
            <View style={styles.summaryRow}>
              <ThemedText style={styles.totalText}>Total:</ThemedText>
              <ThemedText style={styles.totalText}>
                A${order.total.toFixed(2)}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>
                Payment Method:
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                {order.paymentMethod || "Card"}
              </ThemedText>
            </View>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Status:</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {order.status.toLowerCase()}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.secureContainer}>
          <Ionicons name="shield-checkmark" size={16} color="#a500ff" />
          <ThemedText style={styles.secureText}>Secured by Stripe</ThemedText>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/featured")}
        >
          <ThemedText style={styles.actionButtonText}>
            Continue Shopping
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.outlineButton]}
          onPress={() => router.push("/my-learning")}
        >
          <ThemedText style={styles.actionButtonText}>
            View My Courses
          </ThemedText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 20,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 18,
    color: "#a500ff",
    fontWeight: "600",
    marginLeft: 8,
  },
  successContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 18,
    color: "#aaa",
    marginTop: 12,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  separator: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 16,
  },
  orderItem: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "center",
  },
  orderItemImage: {
    width: 80,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  orderItemDetails: {
    flex: 1,
  },
  orderItemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  orderItemInstructor: {
    fontSize: 14,
    color: "#aaa",
    marginVertical: 4,
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00ff88",
  },
  billingDetails: {
    marginTop: 8,
  },
  billingText: {
    fontSize: 14,
    color: "#aaa",
    marginBottom: 4,
  },
  summary: {
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: "#aaa",
  },
  summaryValue: {
    fontSize: 16,
    color: "#fff",
  },
  discountText: {
    fontSize: 16,
    color: "#00ff88",
  },
  totalText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  secureContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secureText: {
    fontSize: 14,
    color: "#aaa",
    marginLeft: 8,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#a500ff",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginHorizontal: 6,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#a500ff",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
