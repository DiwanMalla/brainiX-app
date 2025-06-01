import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Tabs } from "expo-router";
import React from "react";

import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function AuthRoutesLayout() {
  const colorScheme = useColorScheme();
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href={"/"} />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarStyle: {
          height: 0,
          backgroundColor: "white",
        },
      }}
    >
      <Tabs.Screen name="sign-in" options={{ href: null }} />
      <Tabs.Screen name="sign-up" options={{ href: null }} />
    </Tabs>
  );
}
