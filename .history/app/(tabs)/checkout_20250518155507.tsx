import { ThemedText } from "@/components/ThemedText";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import {
  CardField,
  StripeProvider,
  useConfirmPayment,
} from "@stripe/stripe-react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import Toast from "react-native-toast-message";

interface CartItem {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  price: number;
  discountPrice: number | null;
  instructor: { name: string };
  rating: number;
  totalStudents: number;
  duration: number;
  level: string;
  totalLessons: number;
  totalModules: number;
  shortDescription: string;
  tags: string[];
  language: string;
  subtitlesLanguages: string[];
  certificateAvailable: boolean;
  published: boolean;
  featured: boolean;
  bestseller: boolean;
  addedAt: string;
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
  firstName?: string;
  lastName?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
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
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
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
  const [saveInfo, setSaveInfo] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  // Track promo code error state
  const [promoError, setPromoError] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      Toast.show({
        type: "error",
        text1: "Authentication Required",
        text2: "Please sign in to proceed with checkout.",
      });
      router.push("/sign-in");
    }
  }, [user]);

  // Fetch cart items
  useEffect(() => {
    if (!user) return;

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
        Toast.show({
          type: "error",
          text1: "Error",
          text2: `Failed to load cart: ${err.message || String(err)}`,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCart();
  }, [user]);

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => {
    const price = Number(item.discountPrice) || Number(item.price) || 0;
    return sum + price;
  }, 0);

  const total = Number((subtotal - discount).toFixed(2));

  // Validate billing details
  const validateBillingDetails = (): FormErrors => {
    const errors: FormErrors = {};
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";
    if (!email || !/\S+@\S+\.\S+/.test(email))
      errors.email = "Valid email is required";
    if (!address) errors.address = "Address is required";
    if (!city) errors.city = "City is required";
    if (country.cca2 === "AU" && !state) errors.state = "State is required";
    if (!postalCode) {
      errors.postal_code = "Postal code is required";
    } else if (country.cca2 === "AU" && !/^\d{4}$/.test(postalCode)) {
      errors.postal_code = "Invalid Australian postcode (e.g., 1234)";
    }
    if (!country.cca2) errors.country = "Country is required";
    return errors;
  };

  // Fetch clientSecret
  useEffect(() => {
    if (cartItems.length === 0 || !user) return;

    const fetchClientSecret = async () => {
      setClientSecret(null);
      setError(null);
      try {
        const billingDetails = {
          name: `${firstName} ${lastName}`.trim(),
          email,
          address: {
            line1: address,
            city,
            state: state || "",
            postal_code: postalCode,
            country: country.cca2,
          },
        };

        const errors = validateBillingDetails();
        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          setError("Please complete all required billing details");
          Toast.show({
            type: "error",
            text1: "Incomplete Billing Details",
            text2: "Please fill in all required fields.",
          });
          return;
        }

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
            total,
            promoCode,
            billingDetails,
            cartItems: cartItemIds,
          }),
        });
        const data = await res.json();
        console.log("Client secret response:", data);
        if (res.ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || "Failed to initialize payment");
          Toast.show({
            type: "error",
            text1: "Payment Error",
            text2: data.error || "Unable to initialize payment.",
          });
        }
      } catch (err) {
        console.error("fetchClientSecret error:", err.message);
        setError("Unable to connect to payment service");
        Toast.show({
          type: "error",
          text1: "Connection Error",
          text2: `Failed to connect to payment service: ${
            err.message || String(err)
          }`,
        });
      }
    };
    fetchClientSecret();
  }, [
    cartItems,
    total,
    promoCode,
    user,
    firstName,
    lastName,
    email,
    address,
    city,
    state,
    postalCode,
    country,
  ]);

  // Apply promo code
  const applyPromoCode = async () => {
    setPromoError(false);
    setPromoApplied(false);
    setDiscount(0);
    setClientSecret(null);

    if (!promoCode) {
      setPromoError(true);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Please enter a promo code.",
      });
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
          total: subtotal,
          promoCode,
          cartItems: cartItemIds,
        }),
      });
      const data = await res.json();
      console.log("Promo code response:", data);
      if (res.ok && data.clientSecret && data.discount !== undefined) {
        setPromoApplied(true);
        setDiscount(Number(data.discount) || 0);
        setClientSecret(data.clientSecret);
        Toast.show({
          type: "success",
          text1: "Promo Applied",
          text2: `Discount of A$${data.discount.toFixed(2)} applied!`,
        });
      } else {
        setPromoError(true);
        throw new Error(data.error || "Invalid promo code");
      }
    } catch (err) {
      setPromoError(true);
      setError(err.message || "Failed to validate promo code");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Failed to validate promo code",
      });
    }
  };

  // Handle payment
  const handlePayment = async () => {
    if (!clientSecret) {
      setError("Payment system not ready");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Payment system is not initialized.",
      });
      return;
    }

    setPaymentLoading(true);
    setError(null);

    try {
      const billingDetails = {
        name: `${firstName} ${lastName}`.trim(),
        email,
        address: {
          line1: address,
          city,
          state: state || "",
          postal_code: postalCode,
          country: country.cca2,
        },
      };

      const token = await getToken();
      console.log("Clerk token for payment:", token ? "Valid" : "Missing");
      if (!token) throw new Error("Authentication token not found");

      const { paymentIntent, error: stripeError } = await confirmPayment(
        clientSecret,
        {
          paymentMethodType: "Card",
          paymentMethodData: {
            billingDetails,
          },
        }
      );

      if (stripeError) {
        console.log("Stripe error:", JSON.stringify(stripeError, null, 2));
        setError(stripeError.message || "Payment failed");
        Toast.show({
          type: "error",
          text1: "Payment Error",
          text2: stripeError.message || "Failed to process payment.",
        });
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        const cartItemIds = cartItems.map((item) => item.id);
        const response = await fetch(`${API_BASE_URL}/api/orders/create`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            total,
            promoCode,
            billingDetails,
            cartItems: cartItemIds,
          }),
        });

        const data = await response.json();
        console.log("Order creation response:", data);
        if (!response.ok) {
          throw new Error(data.error || "Failed to create order");
        }

        setPaymentSuccess(true);
        Toast.show({
          type: "success",
          text1: "Order Placed",
          text2: "Your order has been successfully created!",
        });

        setTimeout(() => {
          router.push(`/thankyou?orderNumber=${data.order.orderNumber}`);
        }, 2000);
      }
    } catch (err) {
      console.log("Payment error:", err.message);
      setError(err.message || "Unexpected error");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err.message || "Something went wrong.",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    const errors = validateBillingDetails();
    return Object.keys(errors).length === 0;
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
                A${total.toFixed(2)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.promoContainer}>
            <ThemedText style={styles.sectionTitle}>
              Apply Promo Code
            </ThemedText>
            <View style={styles.promoInputContainer}>
              <TextInput
                style={[styles.input, promoError && styles.inputError]}
                placeholder="Enter code"
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
                  Promo code applied successfully!
                </ThemedText>
              </Animated.View>
            )}
          </View>
          <View style={styles.guaranteeContainer}>
            <ThemedText style={styles.guaranteeTitle}>
              30-Day Money-Back Guarantee
            </ThemedText>
            <ThemedText style={styles.guaranteeText}>
              Full refund within 30 days if not satisfied.
            </ThemedText>
          </View>
        </View>

        {/* Payment Options */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Payment Options</ThemedText>
          <View style={styles.secureContainer}>
            <Ionicons name="shield-checkmark" size={16} color="#a500ff" />
            <ThemedText style={styles.secureText}>
              Secure payment processing
            </ThemedText>
          </View>
          {clientSecret ? (
            <View style={styles.paymentContainer}>
              <ThemedText style={styles.sectionTitle}>
                Pay with Credit / Debit Card
              </ThemedText>
              <CardField
                postalCodeEnabled={true}
                placeholders={{
                  number: "1234 5678 9012 3456",
                  expiration: "MM/YY",
                  cvc: "CVC",
                  postalCode: "Postal Code",
                }}
                cardStyle={{
                  backgroundColor: "#2a2a2a",
                  textColor: "#fff",
                  borderColor: "#333",
                  borderWidth: 1,
                  borderRadius: 8,
                  placeholderColor: "#888",
                }}
                style={styles.cardField}
                onCardChange={(cardDetails) => {
                  console.log("Card details:", cardDetails);
                }}
              />
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
                    : `Pay A${total.toFixed(2)}`}
                </ThemedText>
              </TouchableOpacity>
              <View style={styles.secureContainer}>
                <Ionicons name="shield-checkmark" size={16} color="#a500ff" />
                <ThemedText style={styles.secureText}>
                  Secured by Stripe
                </ThemedText>
              </View>
            </View>
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
            <ThemedText style={styles.infoText}>
              Preparing payment options...
            </ThemedText>
          )}
        </View>

        {/* Billing Information */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>Billing Information</ThemedText>
          <View style={styles.inputRow}>
            <View style={[styles.inputContainer, styles.inputHalf]}>
              <ThemedText style={styles.label}>First Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  formErrors.firstName && styles.inputError,
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First Name"
                placeholderTextColor="#888"
              />
              {formErrors.firstName && (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.messageContainer}
                >
                  <ThemedText style={styles.errorText}>
                    {formErrors.firstName}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
            <View style={[styles.inputContainer, styles.inputHalf]}>
              <ThemedText style={styles.label}>Last Name</ThemedText>
              <TextInput
                style={[styles.input, formErrors.lastName && styles.inputError]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last Name"
                placeholderTextColor="#888"
              />
              {formErrors.lastName && (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.messageContainer}
                >
                  <ThemedText style={styles.errorText}>
                    {formErrors.lastName}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
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
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setSaveInfo(!saveInfo)}
            >
              <Ionicons
                name={saveInfo ? "checkbox" : "square-outline"}
                size={20}
                color={saveInfo ? "#a500ff" : "#888"}
              />
              <ThemedText style={styles.checkboxLabel}>
                Save this information for next time
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setNewsletter(!newsletter)}
            >
              <Ionicons
                name={newsletter ? "checkbox" : "square-outline"}
                size={20}
                color={newsletter ? "#a500ff" : "#888"}
              />
              <ThemedText style={styles.checkboxLabel}>
                Receive updates about new courses and promotions
              </ThemedText>
            </TouchableOpacity>
          </View>
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
  cardField: {
    height: 50,
    marginVertical: 12,
  },
  paymentContainer: {
    marginTop: 12,
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
    marginBottom: 12,
  },
  secureText: {
    fontSize: 14,
    color: "#aaa",
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
  },
  checkboxContainer: {
    marginTop: 12,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#fff",
    marginLeft: 8,
  },
  guaranteeContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    textAlign: "center",
  },
  guaranteeText: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "center",
    marginTop: 4,
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
// Track promo code error state
const [promoError, setPromoError] = useState(false);

