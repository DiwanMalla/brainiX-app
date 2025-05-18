"use client";

import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useClerk } from "@clerk/nextjs";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, CheckCircle, Lock, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

interface CartItem {
  id: string;
  slug: string;
  title: string;
  thumbnail: string;
  price: number;
  discountPrice: number | null;
  instructor: { name: string };
}

interface CheckoutFormProps {
  total: number;
  clientSecret: string;
  billingDetails: {
    name: string;
    email: string;
    address: {
      line1: string;
      city: string;
      state: string;
      postal_code: string;
      country: string;
    };
  };
  promoCode: string;
  items: CartItem[];
}

const CheckoutForm = ({
  total,
  clientSecret,
  billingDetails,
  promoCode,
  items,
}: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      setError("Payment system not ready");
      toast({
        title: "Error",
        description: "Payment system is not initialized.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment(
        {
          elements,
          confirmParams: {
            return_url: `${window.location.origin}/thank-you`,
            payment_method_data: { billing_details: billingDetails },
          },
          redirect: "if_required",
        }
      );

      if (stripeError) {
        setError(stripeError.message || "Payment failed");
        toast({
          title: "Payment Error",
          description: stripeError.message || "Failed to process payment.",
          variant: "destructive",
        });
        return;
      }

      if (paymentIntent && paymentIntent.status === "succeeded") {
        const response = await fetch("/api/orders/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            total,
            promoCode,
            billingDetails,
            cartItems: items.map((item) => item.id),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to create order");
        }

        toast({
          title: "Order Placed",
          description: "Your order has been successfully created!",
        });

        router.push(`/thank-you?orderNumber=${data.order.orderNumber}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      toast({
        title: "Error",
        description:
          err instanceof Error ? err.message : "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        className="p-4 border rounded-md bg-background"
        options={{
          layout: "tabs",
          paymentMethodOrder: ["card"],
          wallets: { applePay: "never", googlePay: "never" },
          defaultValues: { billingDetails },
        }}
      />
      {error && (
        <div className="flex items-center gap-1 mt-2 text-destructive text-sm">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full mt-4 gap-2"
        disabled={!stripe || loading}
      >
        <Lock className="h-4 w-4" />
        {loading ? "Processing..." : `Pay A$${total.toFixed(2)}`}
      </Button>
      <div className="flex items-center justify-center gap-1 mt-2 text-muted-foreground text-xs">
        <ShieldCheck className="h-4 w-4" /> Secured by Stripe
      </div>
    </form>
  );
};

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useClerk();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(
    user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : ""
  );
  const [email, setEmail] = useState(
    user?.primaryEmailAddress?.emailAddress || ""
  );
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("AU");
  const [saveInfo, setSaveInfo] = useState(false);
  const [newsletter, setNewsletter] = useState(true);

  const courseId = searchParams.get("courseId");

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to proceed with checkout.",
        variant: "destructive",
      });
      router.push("/auth?tab=signin");
    }
  }, [user, router, toast]);

  // Fetch items (single course or cart)
  useEffect(() => {
    if (!user) return;

    const fetchItems = async () => {
      setIsLoading(true);
      try {
        if (courseId) {
          const res = await fetch(
            `https://braini-x-one.vercel.app/api/courses/${courseId}`,
            {
              headers: { Authorization: `Bearer ${await user.getToken()}` },
            }
          );
          const data = await res.json();
          if (res.ok) {
            setItems([
              {
                id: data.id,
                slug: data.slug,
                title: data.title,
                thumbnail: data.thumbnail || "/placeholder.svg",
                price: Number(data.price) || 0,
                discountPrice: Number(data.discountPrice) || null,
                instructor: { name: data.instructor?.name || "Unknown" },
              },
            ]);
          } else {
            throw new Error(data.error || "Failed to load course");
          }
        } else {
          const res = await fetch("https://braini-x-one.vercel.app/api/cart", {
            headers: { Authorization: `Bearer ${await user.getToken()}` },
          });
          const data = await res.json();
          if (res.ok) {
            setItems(
              data.map((item: CartItem) => ({
                ...item,
                price: Number(item.price) || 0,
                discountPrice: Number(item.discountPrice) || null,
              }))
            );
          } else {
            throw new Error(data.error || "Failed to load cart");
          }
        }
      } catch (err) {
        toast({
          title: "Error",
          description: `Failed to load items: ${
            err instanceof Error ? err.message : String(err)
          }`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchItems();
  }, [user, courseId, toast]);

  // Calculate subtotal and total
  const subtotal = items.reduce((sum, item) => {
    const price = Number(item.discountPrice) || Number(item.price) || 0;
    return sum + price;
  }, 0);
  const total = Number((subtotal - discount).toFixed(2));

  // Validate billing details
  const validateBillingDetails = () => {
    const errors: { [key: string]: string } = {};
    if (!name) errors.name = "Name is required";
    if (!email || !/\S+@\S+\.\S+/.test(email))
      errors.email = "Valid email is required";
    if (!address) errors.address = "Address is required";
    if (!city) errors.city = "City is required";
    if (!state) errors.state = "State is required";
    if (!postalCode) errors.postal_code = "Postal code is required";
    if (!country) errors.country = "Country is required";
    return errors;
  };

  // Fetch clientSecret
  useEffect(() => {
    if (items.length === 0 || !user) return;

    const fetchClientSecret = async () => {
      setClientSecret(null);
      setError(null);
      try {
        const billingDetails = {
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
        if (Object.keys(errors).length > 0) {
          setError("Please fill the form to proceed with payment");
          return;
        }

        const res = await fetch(
          "https://braini-x-one.vercel.app/api/stripe/checkout-session",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${await user.getToken()}`,
            },
            body: JSON.stringify({
              total,
              promoCode,
              billingDetails,
              cartItems: items.map((item) => item.id),
            }),
          }
        );
        const data = await res.json();
        if (res.ok && data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.error || "Failed to initialize payment");
          toast({
            title: "Payment Error",
            description: data.error || "Unable to initialize payment.",
            variant: "destructive",
          });
        }
      } catch (err) {
        setError("Unable to connect to payment service");
        toast({
          title: "Connection Error",
          description: `Failed to connect to payment service: ${
            err instanceof Error ? err.message : String(err)
          }`,
          variant: "destructive",
        });
      }
    };
    fetchClientSecret();
  }, [
    items,
    total,
    promoCode,
    user,
    name,
    email,
    address,
    city,
    state,
    postalCode,
    country,
    toast,
  ]);

  const applyPromoCode = async () => {
    setPromoError(false);
    setPromoApplied(false);
    setDiscount(0);

    if (!promoCode) {
      setPromoError(true);
      toast({
        title: "Error",
        description: "Please enter a promo code.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(
        "https://braini-x-one.vercel.app/api/stripe/checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getToken()}`,
          },
          body: JSON.stringify({
            total: subtotal,
            promoCode,
            cartItems: items.map((item) => item.id),
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.clientSecret && data.discount !== undefined) {
        setPromoApplied(true);
        setDiscount(Number(data.discount) || 0);
        setClientSecret(data.clientSecret);
        toast({
          title: "Promo Applied",
          description: `Discount of A$${data.discount.toFixed(2)} applied!`,
        });
      } else {
        setPromoError(true);
        toast({
          title: "Invalid Promo Code",
          description: data.error || "Please check the code and try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      setPromoError(true);
      toast({
        title: "Error",
        description: `Failed to validate promo code: ${
          err instanceof Error ? err.message : String(err)
        }`,
        variant: "destructive",
      });
    }
  };

  const billingDetails = {
    name: name.trim(),
    email,
    address: { line1: address, city, state, postal_code: postalCode, country },
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-foreground text-lg">Loading checkout...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1 py-10">
          <div className="container px-4 md:px-6 max-w-6xl">
            <div className="flex flex-col items-center justify-center py-12">
              <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
              <p className="text-muted-foreground mb-6">
                Add courses to your cart to checkout
              </p>
              <Button asChild>
                <Link href="/courses">Browse Courses</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 py-10">
        <div className="container px-4 md:px-6 max-w-6xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">Complete your purchase</p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Payment Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Secure payment processing</span>
                  </div>

                  {clientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <CheckoutForm
                        total={total}
                        clientSecret={clientSecret}
                        billingDetails={billingDetails}
                        promoCode={promoCode}
                        items={items}
                      />
                    </Elements>
                  ) : (
                    <div className="flex items-center gap-1 text-destructive text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {error || "Please fill the form to proceed with payment"}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Billing Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="border-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="border-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      className="border-input"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        className="border-input"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State/Province</Label>
                      <Select value={state} onValueChange={setState} required>
                        <SelectTrigger id="state" className="border-input">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NSW">New South Wales</SelectItem>
                          <SelectItem value="VIC">Victoria</SelectItem>
                          <SelectItem value="QLD">Queensland</SelectItem>
                          <SelectItem value="WA">Western Australia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="postalCode">Postal Code</Label>
                      <Input
                        id="postalCode"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        required
                        className="border-input"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry} required>
                      <SelectTrigger id="country" className="border-input">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="UK">United Kingdom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-info"
                      checked={saveInfo}
                      onCheckedChange={(checked) =>
                        setSaveInfo(checked as boolean)
                      }
                    />
                    <Label htmlFor="save-info">
                      Save this information for next time
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="newsletter"
                      checked={newsletter}
                      onCheckedChange={(checked) =>
                        setNewsletter(checked as boolean)
                      }
                    />
                    <Label htmlFor="newsletter">
                      Receive updates about new courses and promotions
                    </Label>
                  </div>
                </CardContent>
              </Card>

              <Button variant="outline" asChild>
                <Link href={courseId ? `/courses/${items[0]?.slug}` : "/cart"}>
                  Return to {courseId ? "Course" : "Cart"}
                </Link>
              </Button>
            </div>

            <div>
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>
                    Order Summary ({items.length}{" "}
                    {items.length === 1 ? "course" : "courses"})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mb-4 max-h-[300px] overflow-auto pr-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="relative h-16 w-24 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={item.thumbnail || "/placeholder.svg"}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {item.instructor.name}
                          </p>
                          <p className="text-sm font-bold mt-1">
                            A$
                            {(
                              Number(item.discountPrice) ||
                              Number(item.price) ||
                              0
                            ).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>A${subtotal.toFixed(2)}</span>
                    </div>
                    {promoApplied && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Promo Discount:</span>
                        <span>-A${discount.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>A${total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Label className="text-sm font-medium mb-2 block">
                      Apply Promo Code
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter code"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        className={promoError ? "border-destructive" : ""}
                      />
                      <Button variant="outline" onClick={applyPromoCode}>
                        Apply
                      </Button>
                    </div>
                    {promoError && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        <span>Invalid promo code</span>
                      </div>
                    )}
                    {promoApplied && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-green-600 dark:text-green-400">
                        <CheckCircle className="h-3 w-3" />
                        <span>Promo code applied successfully!</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-center text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 mr-1" />
                    <span>Secure Checkout</span>
                  </div>

                  <div className="mt-4 text-center p-3 bg-muted rounded-md">
                    <p className="text-sm font-semibold">
                      30-Day Money-Back Guarantee
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Full refund within 30 days if not satisfied.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
