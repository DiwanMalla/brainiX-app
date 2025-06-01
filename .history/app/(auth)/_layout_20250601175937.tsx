import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import React from "react";

import { useColorScheme } from "@/hooks/useColorScheme";

export default function AuthRoutesLayout() {
  const colorScheme = useColorScheme();
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href={"/"} />;
  }

  return <></>;
}
