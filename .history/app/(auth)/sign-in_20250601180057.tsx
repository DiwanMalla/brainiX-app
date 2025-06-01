import OAuthButton from "@/components/0authButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSignIn } from "@clerk/clerk-expo";
import { FontAwesome } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSignInPress = React.useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    try {
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      if (signInAttempt.status === "complete") {
        await setActive({
          session: signInAttempt.createdSessionId,
        });
        router.replace("/");
      } else {
        console.error(JSON.stringify(signInAttempt, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
    }
  }, [isLoaded, emailAddress, password, router, setActive, signIn]);

  if (!isLoaded) {
    return <ActivityIndicator size="large" color="#A259FF" />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconHeader}>
        <FontAwesome name="tv" size={30} color="#A259FF" />
        <FontAwesome name="code" size={30} color="#A259FF" />
        <FontAwesome name="globe" size={30} color="#A259FF" />
      </View>

      <ThemedView style={{ marginVertical: 16, alignItems: "center" }}>
        <ThemedText type="title" style={styles.title}>
          Log in to BrainiX
        </ThemedText>
        <ThemedText type="default" style={styles.subtitle}>
          Welcome back! Please sign in to continue
        </ThemedText>
      </ThemedView>

      <View style={styles.socialLoginContainer}>
        <OAuthButton strategy="oauth_google">
          <FontAwesome name="google" size={24} color="white" />
        </OAuthButton>
        <OAuthButton strategy="oauth_github">
          <FontAwesome name="github" size={24} color="white" />
        </OAuthButton>
      </View>

      <Text style={styles.otherLoginText}>Or sign in with email</Text>

      <TextInput
        style={styles.input}
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Email"
        placeholderTextColor="#999"
        keyboardType="email-address"
        onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
      />
      <TextInput
        style={styles.input}
        value={password}
        placeholder="Password"
        placeholderTextColor="#999"
        secureTextEntry={true}
        onChangeText={(password) => setPassword(password)}
      />

      <TouchableOpacity style={styles.loginButton} onPress={onSignInPress}>
        <Text style={styles.loginButtonText}>Continue Learning</Text>
      </TouchableOpacity>

      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don&apos;t have an account? </Text>
        <Link href="/sign-up" style={styles.signupLink}>
          Sign up
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  iconHeader: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
  input: {
    height: 52,
    borderColor: "#333",
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    color: "white",
    backgroundColor: "#1A1A1A",
    marginBottom: 24,
    fontSize: 16,
  },
  loginButton: {
    backgroundColor: "#A259FF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 32,
    shadowColor: "#A259FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },
  otherLoginText: {
    color: "#999",
    textAlign: "center",
    marginBottom: 16,
    fontSize: 14,
  },
  socialLoginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 28,
  },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  signupText: {
    color: "#999",
    fontSize: 14,
  },
  signupLink: {
    color: "#A259FF",
    fontWeight: "700",
    fontSize: 14,
  },
});
