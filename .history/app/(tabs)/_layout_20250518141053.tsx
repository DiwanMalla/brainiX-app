import { useAuth } from "@clerk/clerk-expo";
import { AntDesign, FontAwesome, Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";

export default function TabLayout() {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#a500ff" }}>
      <Tabs.Screen
        name="featured"
        options={{
          title: "Featured",
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="star" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <AntDesign name="search1" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="my-learning"
        options={{
          title: "My Learning",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "book" : "book-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: "Wishlist",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "heart" : "heart-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="AllCategories" options={{ href: null }} />
      <Tabs.Screen name="CategoryDetails" options={{ href: null }} />
      <Tabs.Screen name="CourseDetailsScreen" options={{ href: null }} />
      <Tabs.Screen name="checkout" options={{ href: null }} />
      <Tabs.Screen name="thankyou" options={{ href: null }} />
      <Tabs.Screen name="CourseLearningScreen" options={{ href: null }} />
    </Tabs>
  );
}
