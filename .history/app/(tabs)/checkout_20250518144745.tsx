import { ThemedText } from "@/components/ThemedText";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import { StripeProvider, useConfirmPayment } from "@stripe/stripe-react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

interface CartItem {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  price: number;
  discountPrice: number | null;
  instructor: { name: string };
}

interface BillingDetails {
  name: string;
  email: string;
  address: {
    line1: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
}

interface FormErrors {
  name?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
}

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://braini-x-one.vercel.app";

export default function CheckoutScreen() {
  const { getToken } = useAuth();
  const { user } = useUser();
  const { confirmPayment } = useConfirmPayment();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [serverTotal, setServerTotal] = useState(0);
  const [promoError, setPromoError] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [name, setName] = useState(
    user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : ""
  );
  const [email, setEmail] = useState(
    user?.emailAddresses[0]?.emailAddress || ""
  );
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("AU");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!user) {
      Alert.alert("Authentication Required", "Please sign in to proceed.", [
        { text: "OK", onPress: () => router.push("/sign-in") },
      ]);
      return;
    }

    const fetchCart = async () => {
      setIsLoading(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE_URL}/api/cart`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setCartItems(
            data.map((item: CartItem) => ({
              ...item,
              price: Number(item.price) || 0,
              discountPrice: Number(item.discountPrice) || null,
            }))
          );
        } else {
          throw new Error(data.error || "Failed to load cart");
        }
      } catch (err) {
        Alert.alert(
          "Error",
          `Failed to load cart: ${err.message || String(err)}`
        );
      } finally {
        setIsLoading(false);
      }
    };
    fetchCart();
  }, [user]);

  const subtotal = cartItems.reduce((sum, item) => {
    const price = Number(item.discountPrice) || Number(item.price) || 0;
    return sum + price;
  }, 0);

  const displayTotal = Number(((subtotal || 0) - (discount || 0)).toFixed(2));

  const applyPromoCode = async () => {
    setPromoError(false);
    setPromoApplied(false);
    setDiscount(0);
    setServerTotal(0);

    if (!promoCode) {
      setPromoError(true);
      return;
    }

    try {
      const token = await getToken();
      const cartItemIds = cartItems.map((item) => item.id);
      const res = await fetch(`${API_BASE_URL}/api/stripe/checkout-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          total: displayTotal || 0,
          promoCode,
          cartItems: cartItemIds,
        }),
      });
      const data = await res.json();
      if (
        res.ok &&
        data.clientSecret &&
        data.discount !== undefined &&
        data.total !== undefined
      ) {
        setPromoApplied(true);
        setDiscount(Number(data.discount) || 0);
        setServerTotal(Number(data.total) || 0);
        setClientSecret(data.clientSecret);
      } else {
        setPromoError(true);
        throw new Error(data.error || "Invalid promo code");
      }
    } catch (err) {
      setPromoError(true);
      Alert.alert("Error", err.message || "Failed to validate promo code");
    }
  };

  const validateBillingDetails = (): FormErrors => {
    const errors: FormErrors = {};
    if (!name) errors.name = "Name is required";
    if (!email || !/\S+@\S+\.\S+/.test(email))
      errors.email = "Valid email is required";
    if (!address) errors.address = "Address is required";
    if (!city) errors.city = "City is required";
    if (!state) errors.state = "State is required";
    if (!postalCode) errors.postal_code = "Postal code is required";
    if (!country) errors.country = "Country is required";
    if (!cardNumber || cardNumber.replace(/\s/g, "").length !== 16)
      errors.cardNumber = "Valid 16-digit card number is required";
    if (!expiry || !/^\d{2}\/\d{2}$/.test(expiry))
      errors.expiry = "Valid expiry (MM/YY) is required";
    if (!cvv || cvv.length !== 3) errors.cvv = "Valid 3-digit CVV is required";
    return errors;
  };

  const fetchClientSecret = async (billingDetails: BillingDetails) => {
    setClientSecret(null);
    setError(null);
    try {
      const token = await getToken();
      const cartItemIds = cartItems.map((item) => item.id);
      const res = await fetch(`${API_BASE_URL}/api/stripe/checkout-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          total: serverTotal || subtotal || 0,
          promoCode,
          cartItems: cartItemIds,
          billingDetails,
        }),
      });
      const data = await res.json();
      if (res.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setServerTotal(Number(data.total) || 0);
      } else {
        throw new Error(data.error || "Failed to initialize payment");
      }
    } catch (err) {
      setError(err.message || "Unable to connect to payment service");
      Alert.alert(
        "Payment Error",
        err.message || "Unable to initialize payment"
      );
    }
  };

  const handlePayment = async () => {
    if (!clientSecret) {
      setError("Payment system not ready");
      return;
    }

    const billingDetails: BillingDetails = {
      name: name.trim(),
      email,
      address: {
        line1: address,
        city,
        state,
        postal_code: postalCode,
        country,
      },
    };

    const errors = validateBillingDetails();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setPaymentLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const cartItemIds = cartItems.map((item) => item.id);
      const amountInCents = Math.round((serverTotal || subtotal || 0) * 100);

      const { paymentIntent, error: stripeError } = await confirmPayment(
        clientSecret,
        {
          paymentMethodType: "Card",
          paymentMethodData: {
            billingDetails,
            card: {
              number: cardNumber.replace(/\s/g, ""),
              expMonth: parseInt(expiry.split("/")[0], 10),
              expYear: parseInt(expiry.split("/")[1], 10),
              cvc: cvv,
            },
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
        Alert.alert(
          "Payment Error",
          stripeError.message || "Failed to process payment"
        );
        return;
      }

      if (paymentIntent && paymentIntent.status === "Succeeded") {
        const response = await fetch(`${API_BASE_URL}/api/orders/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            total: serverTotal || subtotal || 0,
            promoCode,
            cartItems: cartItemIds,
            billingDetails,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to create order");
        }

        setPaymentSuccess(true);
        setTimeout(() => {
          router.push(`/thankyou?orderNumber=${data.order.orderNumber}`);
        }, 2000);
      }
    } catch (err) {
      setError(err.message || "Unexpected error");
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    if (!cartItems.length || !user || isLoading) return;

    const billingDetails: BillingDetails = {
      name: name.trim(),
      email,
      address: {
        line1: address,
        city,
        state,
        postal_code: postalCode,
        country,
      },
    };

    const errors = validateBillingDetails();
    setFormErrors(errors);
    if (Object.keys(errors).length === 0) {
      fetchClientSecret(billingDetails);
    }
  }, [
    cartItems,
    serverTotal,
    promoCode,
    user,
    name,
    email,
    address,
    city,
    state,
    postalCode,
    country,
    isLoading,
  ]);

  const formatCardNumber = (text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, 16);
    const formatted = clean.match(/.{1,4}/g)?.join(" ") || clean;
    setCardNumber(formatted);
  };

  const formatExpiry = (text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, 4);
    if (clean.length >= 3) {
      setExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setExpiry(clean);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#a500ff" />
      </View>
    );
  }

  if (cartItems.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.title}>Your Cart is Empty</ThemedText>
        <ThemedText style={styles.subtitle}>
          Add courses to your cart to checkout
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
    <StripeProvider
      publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#a500ff" />
          <ThemedText style={styles.backButtonText}>Back to Cart</ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.title}>Checkout</ThemedText>
        <ThemedText style={styles.subtitle}>Complete Your Purchase</ThemedText>

        {/* Order Summary */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>
            Order Summary ({cartItems.length}{" "}
            {cartItems.length === 1 ? "Course" : "Courses"})
          </ThemedText>
          {cartItems.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <Image
                source={{
                  uri: item.thumbnail || "https://via.placeholder.com/80",
                }}
                style={styles.orderItemImage}
                contentFit="cover"
              />
              <View style={styles.orderItemDetails}>
                <ThemedText style={styles.orderItemTitle}>
                  {item.title}
                </ThemedText>
                <ThemedText style={styles.orderItemInstructor}>
                  By {item.instructor.name}
                </ThemedText>
                <ThemedText style={styles.orderItemPrice}>
                  A$
                  {(
                    Number(item.discountPrice) ||
                    Number(item.price) ||
                    0
                  ).toFixed(2)}
                </ThemedText>
              </View>
            </View>
          ))}
          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Subtotal:</ThemedText>
              <ThemedText style={styles.summaryValue}>
                A${subtotal.toFixed(2)}
              </ThemedText>
            </View>
            {promoApplied && (
              <View style={styles.summaryRow}>
                <ThemedText style={styles.discountText}>
                  Promo Discount:
                </ThemedText>
                <ThemedText style={styles.discountText}>
                  -A${discount.toFixed(2)}
                </ThemedText>
              </View>
            )}
            <View style={styles.summaryRow}>
              <ThemedText style={styles.totalText}>Total:</ThemedText>
              <ThemedText style={styles.totalText}>
                A${(serverTotal || subtotal || 0).toFixed(2)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.promoContainer}>
            <ThemedText style={styles.sectionTitle}>Promo Code</ThemedText>
            <View style={styles.promoInputContainer}>
              <TextInput
                style={[styles.input, promoError && styles.inputError]}
                placeholder="Enter promo code"
                value={promoCode}
                onChangeText={setPromoCode}
                placeholderTextColor="#888"
              />
              <TouchableOpacity
                style={styles.promoButton}
                onPress={applyPromoCode}
              >
                <ThemedText style={styles.promoButtonText}>Apply</ThemedText>
              </TouchableOpacity>
            </View>
            {promoError && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.messageContainer}
              >
                <Ionicons name="alert-circle" size={16} color="#FF5252" />
                <ThemedText style={styles.errorText}>
                  Invalid promo code
                </ThemedText>
              </Animated.View>
            )}
            {promoApplied && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.messageContainer}
              >
                <Ionicons name="checkmark-circle" size={16} color="#00FF88" />
                <ThemedText style={styles.successText}>
                  Promo applied! Saved A${discount.toFixed(2)}
                </ThemedText>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Billing Information */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Billing Information</ThemedText>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Full Name</ThemedText>
            <TextInput
              style={[styles.input, formErrors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Full Name"
              placeholderTextColor="#888"
            />
            {formErrors.name && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.messageContainer}
              >
                <ThemedText style={styles.errorText}>
                  {formErrors.name}
                </ThemedText>
              </Animated.View>
            )}
          </View>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Email Address</ThemedText>
            <TextInput
              style={[styles.input, formErrors.email && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#888"
            />
            {formErrors.email && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.messageContainer}
              >
                <ThemedText style={styles.errorText}>
                  {formErrors.email}
                </ThemedText>
              </Animated.View>
            )}
          </View>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Address</ThemedText>
            <TextInput
              style={[styles.input, formErrors.address && styles.inputError]}
              value={address}
              onChangeText={setAddress}
              placeholder="Address"
              placeholderTextColor="#888"
            />
            {formErrors.address && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.messageContainer}
              >
                <ThemedText style={styles.errorText}>
                  {formErrors.address}
                </ThemedText>
              </Animated.View>
            )}
          </View>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>State/Province</ThemedText>
            <TextInput
              style={[styles.input, formErrors.state && styles.inputError]}
              value={state}
              onChangeText={setState}
              placeholder="State"
              placeholderTextColor="#888"
            />
            {formErrors.state && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.messageContainer}
              >
                <ThemedText style={styles.errorText}>
                  {formErrors.state}
                </ThemedText>
              </Animated.View>
            )}
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, styles.inputHalf]}>
              <ThemedText style={styles.label}>City</ThemedText>
              <TextInput
                style={[styles.input, formErrors.city && styles.inputError]}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#888"
              />
              {formErrors.city && (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.messageContainer}
                >
                  <ThemedText style={styles.errorText}>
                    {formErrors.city}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
            <View style={[styles.inputContainer, styles.inputHalf]}>
              <ThemedText style={styles.label}>Postal Code</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  formErrors.postal_code && styles.inputError,
                ]}
                value={postalCode}
                onChangeText={setPostalCode}
                placeholder="Postal Code"
                placeholderTextColor="#888"
              />
              {formErrors.postal_code && (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.messageContainer}
                >
                  <ThemedText style={styles.errorText}>
                    {formErrors.postal_code}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
          </View>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>Country</ThemedText>
            <Picker
              selectedValue={country}
              onValueChange={setCountry}
              style={[styles.picker, formErrors.country && styles.inputError]}
            >
              <Picker.Item label="Australia" value="AU" />
              <Picker.Item label="United States" value="US" />
              <Picker.Item label="Canada" value="CA" />
              <Picker.Item label="United Kingdom" value="UK" />
            </Picker>
            {formErrors.country && (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.messageContainer}
              >
                <ThemedText style={styles.errorText}>
                  {formErrors.country}
                </ThemedText>
              </Animated.View>
            )}
          </View>
        </View>

        {/* Payment Details */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Payment Details</ThemedText>
          {paymentSuccess ? (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.successContainer}
            >
              <Ionicons name="checkmark-circle" size={48} color="#00FF88" />
              <ThemedText style={styles.successTitle}>
                Payment Successful!
              </ThemedText>
              <ThemedText style={styles.successMessage}>
                Your order is being processed. Redirecting...
              </ThemedText>
            </Animated.View>
          ) : clientSecret ? (
            <>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Card Number</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    formErrors.cardNumber && styles.inputError,
                  ]}
                >
                  <Ionicons
                    name="card-outline"
                    size={20}
                    color="#aaa"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={cardNumber}
                    onChangeText={formatCardNumber}
                    placeholder="1234 5678 9012 3456"
                    keyboardType="numeric"
                    maxLength={19}
                    placeholderTextColor="#888"
                  />
                </View>
                {formErrors.cardNumber && (
                  <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    style={styles.messageContainer}
                  >
                    <ThemedText style={styles.errorText}>
                      {formErrors.cardNumber}
                    </ThemedText>
                  </Animated.View>
                )}
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, styles.inputHalf]}>
                  <ThemedText style={styles.label}>Expiry Date</ThemedText>
                  <View
                    style={[
                      styles.inputWrapper,
                      formErrors.expiry && styles.inputError,
                    ]}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#aaa"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={expiry}
                      onChangeText={formatExpiry}
                      placeholder="MM/YY"
                      keyboardType="numeric"
                      maxLength={5}
                      placeholderTextColor="#888"
                    />
                  </View>
                  {formErrors.expiry && (
                    <Animated.View
                      entering={FadeIn}
                      exiting={FadeOut}
                      style={styles.messageContainer}
                    >
                      <ThemedText style={styles.errorText}>
                        {formErrors.expiry}
                      </ThemedText>
                    </Animated.View>
                  )}
                </View>
                <View style={[styles.inputContainer, styles.inputHalf]}>
                  <ThemedText style={styles.label}>CVV</ThemedText>
                  <View
                    style={[
                      styles.inputWrapper,
                      formErrors.cvv && styles.inputError,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color="#aaa"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      value={cvv}
                      onChangeText={(text) =>
                        setCvv(text.replace(/\D/g, "").slice(0, 3))
                      }
                      placeholder="123"
                      keyboardType="numeric"
                      maxLength={3}
                      placeholderTextColor="#888"
                    />
                  </View>
                  {formErrors.cvv && (
                    <Animated.View
                      entering={FadeIn}
                      exiting={FadeOut}
                      style={styles.messageContainer}
                    >
                      <ThemedText style={styles.errorText}>
                        {formErrors.cvv}
                      </ThemedText>
                    </Animated.View>
                  )}
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.payButton,
                  (!clientSecret || paymentLoading) && styles.disabledButton,
                ]}
                onPress={handlePayment}
                disabled={!clientSecret || paymentLoading}
              >
                {paymentLoading ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                ) : (
                  <Ionicons
                    name="lock-closed"
                    size={16}
                    color="#fff"
                    style={styles.buttonIcon}
                  />
                )}
                <ThemedText style={styles.payButtonText}>
                  {paymentLoading
                    ? "Processing..."
                    : `Pay A${(serverTotal || subtotal || 0).toFixed(2)}`}
                </ThemedText>
              </TouchableOpacity>
              <View style={styles.secureContainer}>
                <Ionicons name="shield-checkmark" size={16} color="#a500ff" />
                <ThemedText style={styles.secureText}>
                  Secured by Stripe
                </ThemedText>
              </View>
            </>
          ) : error ? (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.messageContainer}
            >
              <Ionicons name="alert-circle" size={16} color="#FF5252" />
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </Animated.View>
          ) : (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.messageContainer}
            >
              <Ionicons name="alert-circle" size={16} color="#FF5252" />
              <ThemedText style={styles.errorText}>
                Please fill the form to proceed with payment
              </ThemedText>
            </Animated.View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, styles.outlineButton]}
          onPress={() => router.push("/cart")}
        >
          <ThemedText style={styles.actionButtonText}>
            Return to Cart
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </StripeProvider>
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 24,
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
  summary: {
    borderTopWidth: 1,
    borderTopColor: "#333",
    paddingTop: 16,
    marginBottom: 16,
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
  promoContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 12,
  },
  promoInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#2a2a2a",
    color: "#fff",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#333",
  },
  inputError: {
    borderColor: "#FF5252",
  },
  promoButton: {
    backgroundColor: "#a500ff",
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginLeft: 12,
  },
  promoButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  errorText: {
    color: "#FF5252",
    fontSize: 14,
    marginLeft: 4,
  },
  successText: {
    color: "#00FF88",
    fontSize: 14,
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inputHalf: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    color: "#fff",
    marginBottom: 8,
    fontWeight: "500",
  },
  picker: {
    backgroundColor: "#2a2a2a",
    color: "#fff",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#333",
    paddingHorizontal: 10,
  },
  inputIcon: {
    marginRight: 10,
  },
  payButton: {
    backgroundColor: "#a500ff",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  disabledButton: {
    backgroundColor: "#555",
  },
  payButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
  secureContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secureText: {
    fontSize: 14,
    color: "#aaa",
    marginLeft: 8,
  },
  successContainer: {
    alignItems: "center",
    padding: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00FF88",
    marginVertical: 12,
  },
  successMessage: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
  },
  actionButton: {
    backgroundColor: "#a500ff",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
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
