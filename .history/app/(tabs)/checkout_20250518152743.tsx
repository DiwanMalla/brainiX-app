import { ThemedText } from "@/components/ThemedText";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import {
  CardField,
  StripeProvider,
  useConfirmPayment,
} from "@stripe/stripe-react-native";
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
import { Button, Card, CheckBox, Image } from "react-native-elements";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

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
  zip?: string;
  state?: string;
  country?: string;
  card?: string;
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
  const [email, setEmail] = useState(
    user?.emailAddresses[0]?.emailAddress || ""
  );
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("AU");
  const [saveInfo, setSaveInfo] = useState(false);
  const [newsletter, setNewsletter] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isCardValid, setIsCardValid] = useState(false);

  useEffect(() => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to proceed with checkout.",
        [{ text: "OK", onPress: () => router.push("/sign-in") }]
      );
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
          `Failed to load cart items: ${
            err instanceof Error ? err.message : String(err)
          }`
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
      Alert.alert(
        "Error",
        err instanceof Error
          ? err.message
          : String(err) || "Failed to validate promo code"
      );
    }
  };

  const validateBillingDetails = (): FormErrors => {
    const errors: FormErrors = {};
    if (!firstName) errors.firstName = "First name is required";
    if (!lastName) errors.lastName = "Last name is required";
    if (!email || !/\S+@\S+\.\S+/.test(email))
      errors.email = "Valid email is required";
    if (!address) errors.address = "Address is required";
    if (!city) errors.city = "City is required";
    if (!zip) errors.zip = "ZIP/Postal code is required";
    if (!state) errors.state = "State is required";
    if (!country) errors.country = "Country is required";
    if (!isCardValid) errors.card = "Valid card details are required";
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
      setError(
        err instanceof Error
          ? err.message
          : String(err) || "Unable to connect to payment service"
      );
      Alert.alert(
        "Payment Error",
        err instanceof Error
          ? err.message
          : String(err) || "Unable to initialize payment"
      );
    }
  };

  const handlePayment = async () => {
    if (!clientSecret) {
      setError("Payment system not ready");
      return;
    }

    const billingDetails: BillingDetails = {
      name: `${firstName} ${lastName}`.trim(),
      email,
      address: { line1: address, city, state, postal_code: zip, country },
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
      console.log("Payment attempt:", {
        serverTotal,
        subtotal,
        discount,
        amountInCents,
        cartItemIds,
      });

      const { paymentIntent, error: stripeError } = await confirmPayment(
        clientSecret,
        {
          paymentMethodType: "Card",
          paymentMethodData: { billingDetails },
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
          console.log("Order creation failed:", data);
          throw new Error(data.error || "Failed to create order");
        }

        setPaymentSuccess(true);
        setTimeout(() => {
          router.push(`/thankyou?orderNumber=${data.order.orderNumber}`);
        }, 2000); // Redirect after 2 seconds
      }
    } catch (err) {
      console.log("Payment error:", err);
      setError(
        err instanceof Error ? err.message : String(err) || "Unexpected error"
      );
      Alert.alert(
        "Error",
        err instanceof Error
          ? err.message
          : String(err) || "Something went wrong"
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  useEffect(() => {
    if (!cartItems.length || !user || isLoading) return;

    const billingDetails: BillingDetails = {
      name: `${firstName} ${lastName}`.trim(),
      email,
      address: { line1: address, city, state, postal_code: zip, country },
    };

    const errors = validateBillingDetails();
    if (Object.keys(errors).length === 0) {
      fetchClientSecret(billingDetails);
    }
  }, [
    cartItems,
    serverTotal,
    promoCode,
    user,
    firstName,
    lastName,
    email,
    address,
    city,
    state,
    zip,
    country,
    isLoading,
  ]);

  if (isLoading || !cartItems) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6200EA" />
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
        <Button
          title="Browse Courses"
          onPress={() => router.push("/featured")}
          buttonStyle={styles.actionButton}
          titleStyle={styles.actionButtonText}
        />
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
          <Ionicons name="arrow-back" size={24} color="#6200EA" />
          <ThemedText style={styles.backButtonText}>Back</ThemedText>
        </TouchableOpacity>

        <ThemedText style={styles.title}>Checkout</ThemedText>
        <ThemedText style={styles.subtitle}>Complete Your Purchase</ThemedText>

        {/* Order Summary */}
        <Card containerStyle={styles.card}>
          {/* Card children are nested here as JSX */}
          <View>
            <ThemedText style={styles.cardTitle}>
              Order Summary ({cartItems.length}{" "}
              {cartItems.length === 1 ? "Course" : "Courses"})
            </ThemedText>
            <View style={styles.orderItems}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.orderItem}>
                  <Image
                    source={{
                      uri: item.thumbnail || "https://via.placeholder.com/100",
                    }}
                    style={styles.orderItemImage}
                  />
                  <View style={styles.orderItemDetails}>
                    <ThemedText style={styles.orderItemTitle}>
                      {item.title}
                    </ThemedText>
                    <ThemedText style={styles.orderItemInstructor}>
                      {item.instructor.name}
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
            </View>
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
                  style={[styles.promoInput, promoError && styles.inputError]}
                  placeholder="Enter code"
                  value={promoCode}
                  onChangeText={setPromoCode}
                  placeholderTextColor="#888"
                />
                <Button
                  title="Apply"
                  onPress={applyPromoCode}
                  buttonStyle={styles.promoButton}
                  titleStyle={styles.promoButtonText}
                />
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
                  <Ionicons name="checkmark-circle" size={16} color="#00C4B4" />
                  <ThemedText style={styles.successText}>
                    Promo code applied! Saved A${discount.toFixed(2)}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
            <View style={styles.secureContainer}>
              <Ionicons name="shield-checkmark" size={16} color="#6200EA" />
              <ThemedText style={styles.secureText}>Secure Checkout</ThemedText>
            </View>
          </View>
        </Card>

        {/* Payment Details */}
        <Card containerStyle={styles.card}>
          <ThemedText style={styles.cardTitle}>Payment Details</ThemedText>
          {paymentSuccess ? (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.successContainer}
            >
              <Ionicons name="checkmark-circle" size={48} color="#00C4B4" />
              <ThemedText style={styles.successTitle}>
                Payment Successful!
              </ThemedText>
              <ThemedText style={styles.successMessage}>
                Your order is being processed. Redirecting...
              </ThemedText>
            </Animated.View>
          ) : clientSecret ? (
            <>
              <View style={styles.paymentHeader}>
                <Ionicons name="card" size={20} color="#fff" />
                <ThemedText style={styles.paymentTitle}>
                  Credit / Debit Card
                </ThemedText>
              </View>
              <View style={styles.inputContainer}>
                <ThemedText style={styles.label}>Card Information</ThemedText>
                <View
                  style={[
                    styles.cardFieldWrapper,
                    formErrors.card && styles.inputError,
                  ]}
                >
                  <CardField
                    postalCodeEnabled={true}
                    placeholders={{ number: "4242 4242 4242 4242" }}
                    cardStyle={styles.cardField}
                    style={styles.cardFieldContainer}
                    onCardChange={(cardDetails) => {
                      setIsCardValid(cardDetails.complete);
                      if (cardDetails.complete) {
                        setError(null);
                        setFormErrors((prev) => ({ ...prev, card: undefined }));
                      } else {
                        setFormErrors((prev) => ({
                          ...prev,
                          card: "Valid card details are required",
                        }));
                      }
                    }}
                  />
                </View>
                {formErrors.card && (
                  <Animated.View
                    entering={FadeIn}
                    exiting={FadeOut}
                    style={styles.messageContainer}
                  >
                    <Ionicons name="alert-circle" size={16} color="#FF5252" />
                    <ThemedText style={styles.errorText}>
                      {formErrors.card}
                    </ThemedText>
                  </Animated.View>
                )}
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
              <Button
                title={
                  paymentLoading
                    ? "Processing..."
                    : `Pay A${(serverTotal || subtotal || 0).toFixed(2)}`
                }
                onPress={handlePayment}
                buttonStyle={styles.payButton}
                titleStyle={styles.payButtonText}
                disabled={!clientSecret || paymentLoading || !isCardValid}
                icon={
                  paymentLoading ? (
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
                  )
                }
              />
              <ThemedText style={styles.secureText}>
                Secured by Stripe
              </ThemedText>
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
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6200EA" />
              <ThemedText style={styles.loadingText}>
                Preparing payment...
              </ThemedText>
            </View>
          )}
        </Card>

        {/* Billing Information */}
        <Card containerStyle={styles.card}>
          <ThemedText style={styles.cardTitle}>Billing Information</ThemedText>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>First Name</ThemedText>
            <TextInput
              style={[styles.input, formErrors.firstName && styles.inputError]}
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
          <View style={styles.inputContainer}>
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
              <ThemedText style={styles.label}>ZIP/Postal Code</ThemedText>
              <TextInput
                style={[styles.input, formErrors.zip && styles.inputError]}
                value={zip}
                onChangeText={setZip}
                placeholder="ZIP"
                placeholderTextColor="#888"
              />
              {formErrors.zip && (
                <Animated.View
                  entering={FadeIn}
                  exiting={FadeOut}
                  style={styles.messageContainer}
                >
                  <ThemedText style={styles.errorText}>
                    {formErrors.zip}
                  </ThemedText>
                </Animated.View>
              )}
            </View>
          </View>
          <View style={styles.inputContainer}>
            <ThemedText style={styles.label}>State/Province</ThemedText>
            <Picker
              selectedValue={state}
              onValueChange={setState}
              style={[styles.picker, formErrors.state && styles.inputError]}
            >
              <Picker.Item label="Select" value="" />
              <Picker.Item label="New South Wales" value="NSW" />
              <Picker.Item label="Victoria" value="VIC" />
              <Picker.Item label="Queensland" value="QLD" />
              <Picker.Item label="Western Australia" value="WA" />
            </Picker>
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
          <CheckBox
            title="Save this information for next time"
            checked={saveInfo}
            onPress={() => setSaveInfo(!saveInfo)}
            containerStyle={styles.checkbox}
            textStyle={styles.checkboxText}
          />
          <CheckBox
            title="Receive updates about new courses and promotions"
            checked={newsletter}
            onPress={() => setNewsletter(!newsletter)}
            containerStyle={styles.checkbox}
            textStyle={styles.checkboxText}
          />
        </Card>

        <Button
          title="Return to Cart"
          onPress={() => router.push("/cart")}
          buttonStyle={[styles.actionButton, styles.outlineButton]}
          titleStyle={styles.actionButtonText}
        />
      </ScrollView>
    </StripeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
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
    color: "#6200EA",
    fontWeight: "600",
    marginLeft: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#B0B0B0",
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
    borderWidth: 0,
    marginBottom: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  orderItems: {
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
    borderRadius: 12,
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
    color: "#B0B0B0",
    marginVertical: 4,
  },
  orderItemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
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
    color: "#B0B0B0",
  },
  summaryValue: {
    fontSize: 16,
    color: "#fff",
  },
  discountText: {
    color: "#00C4B4",
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
  promoInput: {
    flex: 1,
    backgroundColor: "#2A2A2A",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
  },
  inputError: {
    borderColor: "#FF5252",
  },
  promoButton: {
    backgroundColor: "#6200EA",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
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
    color: "#00C4B4",
    fontSize: 14,
    marginLeft: 4,
  },
  secureContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  secureText: {
    fontSize: 14,
    color: "#B0B0B0",
    marginLeft: 8,
  },
  paymentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginLeft: 8,
  },
  cardFieldContainer: {
    height: 50,
  },
  cardField: {
    backgroundColor: "#fff",
    textColor: "#000",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  cardFieldWrapper: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 12,
    padding: 2,
    backgroundColor: "#fff",
  },
  payButton: {
    backgroundColor: "#6200EA",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "center",
  },
  payButtonText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "#B0B0B0",
    marginLeft: 8,
  },
  successContainer: {
    alignItems: "center",
    padding: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00C4B4",
    marginVertical: 12,
  },
  successMessage: {
    fontSize: 16,
    color: "#B0B0B0",
    textAlign: "center",
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
  input: {
    backgroundColor: "#2A2A2A",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
    fontSize: 16,
  },
  picker: {
    backgroundColor: "#2A2A2A",
    color: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#333",
  },
  checkbox: {
    backgroundColor: "transparent",
    borderWidth: 0,
    padding: 0,
    marginBottom: 12,
  },
  checkboxText: {
    fontSize: 14,
    color: "#B0B0B0",
  },
  actionButton: {
    backgroundColor: "#6200EA",
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 24,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#6200EA",
  },
  actionButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
