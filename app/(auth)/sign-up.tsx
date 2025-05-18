import OAuthButton from "@/components/0authButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useSignUp } from "@clerk/clerk-expo";
import { FontAwesome } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pendingVerification, setPendingVerification] = React.useState(false);
  const [code, setCode] = React.useState("");

  const onSignUpPress = async () => {
    if (!isLoaded) {
      return;
    }

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) {
      return;
    }

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId });
        router.replace("/");
      } else {
        console.error(JSON.stringify(completeSignUp, null, 2));
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
    }
  };

  return (
    <View style={styles.container}>
      {!pendingVerification && (
        <>
          <View style={styles.iconHeader}>
            <FontAwesome name="tv" size={30} color="#A259FF" />
            <FontAwesome name="code" size={30} color="#A259FF" />
            <FontAwesome name="globe" size={30} color="#A259FF" />
          </View>

          <ThemedView style={{ marginVertical: 16, alignItems: "center" }}>
            <ThemedText type="title" style={styles.title}>
              Sign up to start your adventure
            </ThemedText>
            <ThemedText type="default" style={styles.subtitle}>
              Welcome! Please fill in the details to get started.
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

          <Text style={styles.otherLoginText}>Or sign up with email</Text>

          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Email"
            placeholderTextColor="#999"
            keyboardType="email-address"
            onChangeText={(email) => setEmailAddress(email)}
          />
          <TextInput
            style={styles.input}
            value={password}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={true}
            onChangeText={(password) => setPassword(password)}
          />

          <TouchableOpacity style={styles.signupButton} onPress={onSignUpPress}>
            <Text style={styles.signupButtonText}>Create Account</Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Link href="/sign-in" style={styles.loginLink}>
              Sign in
            </Link>
          </View>
        </>
      )}

      {pendingVerification && (
        <>
          <TextInput
            style={styles.input}
            value={code}
            placeholder="Verification Code"
            placeholderTextColor="#999"
            onChangeText={(code) => setCode(code)}
          />
          <TouchableOpacity style={styles.signupButton} onPress={onPressVerify}>
            <Text style={styles.signupButtonText}>Verify Code</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    paddingHorizontal: 16,
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
  signupButton: {
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
  signupButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 18,
  },
  otherLoginText: {
    color: "#999",
    textAlign: "center",
    marginBottom: 14,
    fontSize: 14,
  },
  socialLoginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 28,
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  loginText: {
    color: "#999",
    fontSize: 14,
  },
  loginLink: {
    color: "#A259FF",
    fontWeight: "700",
    fontSize: 14,
  },
});
