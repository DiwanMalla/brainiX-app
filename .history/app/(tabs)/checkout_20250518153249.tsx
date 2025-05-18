import { ThemedText } from "@/components/ThemedText";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
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
import CountryPicker, {
  Country,
  CountryCode,
} from "react-native-country-picker-modal";
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
  const [country, setCountry] = useState<{ cca2: CountryCode; name: string }>({
    cca2: "AU",
    name: "Australia",
  });
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Fetch cart items on mount
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
        console.log("Clerk token for cart fetch:", token ? "Valid" : "Missing");
        if (!token) throw new Error("Authentication token not found");
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

  // Real-time validation for all form fields
  useEffect(() => {
    if (!cartItems.length || !user || isLoading) return;
    const errors = validateBillingDetails(true);
    console.log("Validation errors:", errors);
    setFormErrors(errors);
  }, [
    cartItems,
    user,
    isLoading,
    name,
    email,
    address,
    city,
    state,
    postalCode,
    country,
    cardNumber,
    expiry,
    cvv,
  ]);

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => {
    const price = Number(item.discountPrice) || Number(item.price) || 0;
    return sum + price;
  }, 0);

  const displayTotal = Number(((subtotal || 0) - (discount || 0)).toFixed(2));

  // Check if all required fields are valid
  const isFormValid = () => {
    const errors = validateBillingDetails(true);
    return Object.keys(errors).length === 0;
  };

  // Validate Luhn algorithm for card number
  const isValidLuhn = (cardNumber: string): boolean => {
    const cleanNumber = cardNumber.replace(/\D/g, "");
    if (cleanNumber.length !== 16) return false;
    let sum = 0;
    let isEven = false;
    for (let i = cleanNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanNumber[i], 10);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  };

  // Validate billing and card details
  const validateBillingDetails = (requireCard: boolean = false): FormErrors => {
    const errors: FormErrors = {};
    if (!name.trim()) errors.name = "Name is required";
    if (!email || !/\S+@\S+\.\S+/.test(email))
      errors.email = "Valid email is required";
    if (!address) errors.address = "Address is required";
    if (!city) errors.city = "City is required";
    if ((country.cca2 === "US" || country.cca2 === "AU") && !state)
      errors.state = "State is required";
    if (!postalCode) {
      errors.postal_code = "Postal code is required";
    } else {
      if (country.cca2 === "US" && !/^\d{5}(-\d{4})?$/.test(postalCode)) {
        errors.postal_code = "Invalid US ZIP code (e.g., 12345 or 12345-6789)";
      } else if (country.cca2 === "AU" && !/^\d{4}$/.test(postalCode)) {
        errors.postal_code = "Invalid Australian postcode (e.g., 1234)";
      } else if (
        country.cca2 === "CA" &&
        !/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(postalCode)
      ) {
        errors.postal_code = "Invalid Canadian postal code (e.g., A1B 2C3)";
      } else if (
        country.cca2 === "GB" &&
        !/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i.test(postalCode)
      ) {
        errors.postal_code = "Invalid UK postcode (e.g., SW1A 1AA)";
      }
    }
    if (!country.cca2) errors.country = "Country is required";

    if (requireCard) {
      const cleanCardNumber = cardNumber.replace(/\D/g, "");
      if (!cleanCardNumber || cleanCardNumber.length !== 16) {
        errors.cardNumber = "16-digit card number is required";
      } else if (!isValidLuhn(cardNumber)) {
        errors.cardNumber = "Invalid card number";
      }
      if (!expiry || !/^\d{2}\/\d{2,4}$/.test(expiry)) {
        errors.expiry = "Valid expiry (MM/YY or MM/YYYY) is required";
      } else {
        const [month, year] = expiry.split("/");
        const expMonth = parseInt(month, 10);
        const expYear = parseInt(year.length === 4 ? year : `20${year}`, 10);
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        if (
          expMonth < 1 ||
          expMonth > 12 ||
          expYear < currentYear ||
          (expYear === currentYear && expMonth < currentMonth)
        ) {
          errors.expiry = "Card has expired or invalid expiry date";
        }
      }
      if (!cvv || !/^\d{3,4}$/.test(cvv))
        errors.cvv = "Valid 3- or 4-digit CVV is required";
    }
    return errors;
  };

  // Apply promo code
  const applyPromoCode = async () => {
    setPromoError(false);
    setPromoApplied(false);
    setDiscount(0);
    setServerTotal(0);
    setClientSecret(null);

    if (!promoCode) {
      setPromoError(true);
      Alert.alert("Error", "Please enter a promo code.");
      return;
    }

    try {
      const token = await getToken();
      console.log("Clerk token for promo:", token ? "Valid" : "Missing");
      if (!token) throw new Error("Authentication token not found");
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
      console.log("Promo code response:", data);
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
        console.log("Client secret set after promo:", data.clientSecret);
        Alert.alert(
          "Success",
          `Promo applied! Saved A$${data.discount.toFixed(2)}`
        );
      } else {
        setPromoError(true);
        throw new Error(data.error || "Invalid promo code");
      }
    } catch (err) {
      setPromoError(true);
      setError(err.message || "Failed to validate promo code");
      Alert.alert("Error", err.message || "Failed to validate promo code");
    }
  };

  // Fetch client secret for payment
  const fetchClientSecret = async (billingDetails: BillingDetails) => {
    try {
      const token = await getToken();
      console.log(
        "Clerk token for client secret:",
        token ? "Valid" : "Missing"
      );
      if (!token) throw new Error("Authentication token not found");
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
      console.log("Client secret response:", data);
      if (res.ok && data.clientSecret) {
        setClientSecret(data.clientSecret);
        setServerTotal(Number(data.total) || 0);
        console.log("Client secret set:", data.clientSecret);
        return data.clientSecret;
      } else {
        throw new Error(data.error || "Failed to initialize payment");
      }
    } catch (err) {
      console.error("fetchClientSecret error:", err.message);
      setError(err.message || "Unable to connect to payment service");
      Alert.alert(
        "Payment Error",
        err.message || "Unable to initialize payment"
      );
      return null;
    }
  };

  // Handle payment
  const handlePayment = async () => {
    const billingDetails: BillingDetails = {
      name: name.trim(),
      email,
      address: {
        line1: address,
        city,
        state: state || "",
        postal_code: postalCode,
        country: country.cca2,
      },
    };

    const errors = validateBillingDetails(true);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const errorMessages = Object.values(errors).join(", ");
      console.log("Validation errors on payment:", errors);
      Alert.alert("Validation Error", `Please correct: ${errorMessages}`);
      return;
    }

    setPaymentLoading(true);
    setError(null);

    try {
      let currentClientSecret = clientSecret;
      if (!currentClientSecret) {
        currentClientSecret = await fetchClientSecret(billingDetails);
        if (!currentClientSecret) {
          throw new Error("Failed to initialize payment session");
        }
      }
      console.log("Using clientSecret:", currentClientSecret);

      const token = await getToken();
      console.log("Clerk token for payment:", token ? "Valid" : "Missing");
      if (!token) throw new Error("Authentication token not found");
      const cartItemIds = cartItems.map((item) => item.id);

      // Parse expiry date
      const [month, year] = expiry.split("/");
      const expMonth = parseInt(month, 10);
      const expYear = parseInt(year.length === 4 ? year : `20${year}`, 10);
      const cleanCardNumber = cardNumber.replace(/\D/g, "");

      const paymentMethodData = {
        billingDetails,
        card: {
          number: cleanCardNumber,
          exp_month: expMonth,
          exp_year: expYear,
          cvc: cvv,
          postalCode: postalCode, // Include postal code in card object
        },
      };

      console.log(
        "Payment method data:",
        JSON.stringify(paymentMethodData, null, 2)
      );

      const { paymentIntent, error: stripeError } = await confirmPayment(
        currentClientSecret,
        {
          paymentMethodType: "Card",
          paymentMethodData,
        }
      );

      if (stripeError) {
        console.log("Stripe error:", JSON.stringify(stripeError, null, 2));
        let errorMessage = stripeError.message || "Payment failed";
        if (stripeError.code === "card_declined") {
          errorMessage =
            "Your card was declined. Please try a different payment method.";
          setClientSecret(null);
        }
        setError(errorMessage);
        Alert.alert("Payment Error", errorMessage);
        return;
      }

      if (paymentIntent) {
        if (paymentIntent.status === "succeeded") {
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
          console.log("Order creation response:", data);
          if (!response.ok) {
            throw new Error(data.error || "Failed to create order");
          }

          setPaymentSuccess(true);
          setTimeout(() => {
            router.push(`/thankyou?orderNumber=${data.order.orderNumber}`);
          }, 2000);
        } else if (paymentIntent.status === "requires_action") {
          setError(
            "Additional authentication required. Please follow the prompts."
          );
          Alert.alert(
            "Authentication Required",
            "Please complete the authentication process."
          );
        } else if (paymentIntent.status === "requires_payment_method") {
          setClientSecret(null);
          setError(
            "Payment method invalid. Please try again with a different card."
          );
          Alert.alert("Payment Error", "Please enter a valid payment method.");
        } else {
          setError(`Unexpected payment status: ${paymentIntent.status}`);
          Alert.alert(
            "Error",
            "An unexpected error occurred. Please try again."
          );
        }
      }
    } catch (err) {
      console.log("Payment error:", err.message);
      setError(err.message || "Unexpected error");
      Alert.alert("Error", err.message || "Something went wrong");
    } finally {
      setPaymentLoading(false);
    }
  };

  // Format card number input
  const formatCardNumber = (text: string) => {
    const clean = text.replace(/\D/g, "").slice(0, 16);
    const formatted = clean.match(/.{1,4}/g)?.join(" ") || clean;
    setCardNumber(formatted);
  };

  // Format expiry input
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
            <ThemedText style={styles.label}>
              State/Province (if applicable)
            </ThemedText>
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
            <CountryPicker
              withFilter
              withFlag
              withCountryNameButton
              onSelect={(selected: Country) =>
                setCountry({ cca2: selected.cca2, name: selected.name })
              }
              countryCode={country.cca2}
              containerButtonStyle={[
                styles.input,
                formErrors.country && styles.inputError,
              ]}
              theme={{
                backgroundColor: "#2a2a2a",
                fontFamily: "System",
                fontSize: 16,
                onBackgroundTextColor: "#fff",
              }}
            />
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
          ) : (
            <>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Card Number</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    formErrors.cardNumber && styles.inputError,
                  ]}
                  value={cardNumber}
                  onChangeText={formatCardNumber}
                  placeholder="1234 5678 9012 3456"
                  keyboardType="numeric"
                  maxLength={19}
                  placeholderTextColor="#888"
                />
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
                  <TextInput
                    style={[
                      styles.input,
                      formErrors.expiry && styles.inputError,
                    ]}
                    value={expiry}
                    onChangeText={formatExpiry}
                    placeholder="MM/YY"
                    keyboardType="numeric"
                    maxLength={7}
                    placeholderTextColor="#888"
                  />
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
                  <TextInput
                    style={[styles.input, formErrors.cvv && styles.inputError]}
                    value={cvv}
                    onChangeText={setCvv}
                    placeholder="123"
                    keyboardType="numeric"
                    maxLength={4}
                    placeholderTextColor="#888"
                  />
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
              {error && (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.messageContainer}
                >
                  <Ionicons name="alert-circle" size={16} color="#FF5252" />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </Animated.View>
              )}
              <TouchableOpacity
                style={[
                  styles.payButton,
                  paymentLoading || !isFormValid()
                    ? styles.disabledButton
                    : null,
                ]}
                onPress={handlePayment}
                disabled={paymentLoading || !isFormValid()}
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
          )}
        </View>

        <TouchableOpacity
          style={[styles.actionButton, styles.outlineButton]}
          onPress={() => router.back()}
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
