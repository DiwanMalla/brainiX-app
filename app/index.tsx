import { useColorScheme } from "@/hooks/useColorScheme";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export default function SplashScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const opacity = useSharedValue(0);

  // Fade-in animation
  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
  }, [opacity]);

  // Navigate to /auth after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      return router.replace("/(tabs)/featured");
    }, 3500);
    return () => clearTimeout(timer);
  }, [router]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colorScheme === "dark" ? "#000" : "#fff" },
      ]}
    >
      <Animated.View style={[styles.logoContainer, animatedStyle]}>
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  logoImage: {
    width: 200,
    height: 200,
  },
});
