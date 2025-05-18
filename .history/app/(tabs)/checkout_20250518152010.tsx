const express = require("express");
const Stripe = require("stripe");
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

// Clerk middleware for authentication
const { clerkClient } = require("@clerk/clerk-sdk-node");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Missing or invalid Authorization header");
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = await clerkClient.verifyToken(token);
    req.userId = decoded.sub;
    next();
  } catch (err) {
    console.log("Clerk token verification failed:", err.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

router.post("/checkout-session", verifyToken, async (req, res) => {
  const { total, promoCode, cartItems, billingDetails } = req.body;

  console.log("Checkout session request:", {
    total,
    promoCode,
    cartItems,
    billingDetails,
  });

  if (!total || !cartItems) {
    console.log("Missing required fields");
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Validate promo code (replace with your logic)
    let discount = 0;
    if (promoCode) {
      if (promoCode === "SAVE10") {
        discount = total * 0.1;
      } else {
        console.log("Invalid promo code:", promoCode);
        return res.status(400).json({ error: "Invalid promo code" });
      }
    }

    const finalAmount = Math.round((total - discount) * 100); // Convert to cents

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: finalAmount,
      currency: "aud",
      payment_method_types: ["card"],
      metadata: {
        userId: req.userId,
        cartItems: JSON.stringify(cartItems),
        promoCode: promoCode || "",
      },
      ...(billingDetails && {
        billing_details: {
          name: billingDetails.name,
          email: billingDetails.email,
          address: {
            line1: billingDetails.address.line1,
            city: billingDetails.address.city,
            state: billingDetails.address.state || null,
            postal_code: billingDetails.address.postal_code,
            country: billingDetails.address.country,
          },
        },
      }),
    });

    console.log("PaymentIntent created:", paymentIntent.id);

    res.json({
      clientSecret: paymentIntent.client_secret,
      discount,
      total: finalAmount / 100,
    });
  } catch (err) {
    console.error("Stripe error:", err.message);
    res
      .status(500)
      .json({ error: `Failed to create payment session: ${err.message}` });
  }
});

module.exports = router;
