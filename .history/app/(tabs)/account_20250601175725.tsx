import { useAuth, useUser } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

const AccountScreen = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useAuth();
  const navigation = useNavigation();

  const [aboutVisible, setAboutVisible] = useState(false);
  const [supportVisible, setSupportVisible] = useState(false);

  const handleBecomeInstructor = () => {
    Alert.alert(
      "Become an Instructor",
      "Not available in mobile yet. Proceed on the website.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "BrainiX",
          onPress: () => Linking.openURL("https://braini-x-one.vercel.app"),
        },
      ]
    );
  };

  const handleAboutBrainiX = () => setAboutVisible(true);
  const handleHelpSupport = () => setSupportVisible(true);

  const handleShare = async () => {
    try {
      await Share.share({
        message:
          "Check out BrainiX for amazing online courses! https://braini-x-one.vercel.app",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigation.navigate("SignIn");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  if (!isLoaded) {
    return (
      <ActivityIndicator style={styles.loader} size="large" color="#007bff" />
    );
  }

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Please sign in to view your account.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.accountDetails}>
          <Image
            source={{ uri: user.imageUrl || "https://via.placeholder.com/100" }}
            style={styles.avatar}
          />
          <Text style={styles.fullName}>{user.fullName || "Unknown User"}</Text>
          <Text style={styles.email}>
            {user.primaryEmailAddress?.emailAddress || "No email"}
          </Text>
        </View>

        <Pressable
          style={styles.instructorButton}
          onPress={handleBecomeInstructor}
        >
          <Text style={styles.instructorButtonText}>Become an Instructor</Text>
        </Pressable>

        <View style={styles.supportSection}>
          <Text style={styles.sectionHeader}>Support</Text>

          <Pressable style={styles.supportItem} onPress={handleAboutBrainiX}>
            <Text style={styles.supportText}>About BrainiX</Text>
          </Pressable>

          <Pressable style={styles.supportItem} onPress={handleHelpSupport}>
            <Text style={styles.supportText}>Help and Support</Text>
          </Pressable>

          <Pressable style={styles.supportItem} onPress={handleShare}>
            <Text style={styles.supportText}>Share BrainiX</Text>
          </Pressable>
        </View>

        <Pressable style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>BrainiX - 2025</Text>
          <Text style={styles.footerText}>For education purpose only</Text>
        </View>
      </ScrollView>

      {/* About Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={aboutVisible}
        onRequestClose={() => setAboutVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>About BrainiX</Text>
            <Text style={styles.modalText}>
              BrainiX is an AI-powered e-learning platform offering personalized
              course recommendations, interactive content, and smart quizzes to
              elevate your learning experience.
            </Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setAboutVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Support Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={supportVisible}
        onRequestClose={() => setSupportVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Help & Support</Text>
            <Text style={styles.modalText}>
              For assistance, visit our website or contact us at:
              support@brainix.com
            </Text>
            <Pressable
              style={styles.modalCloseButton}
              onPress={() => setSupportVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    alignItems: "center",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: "#888",
  },
  accountDetails: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  fullName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: "#999",
  },
  instructorButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  instructorButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  supportSection: {
    width: "100%",
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 12,
  },
  supportItem: {
    padding: 12,
    backgroundColor: "#111",
    borderRadius: 8,
    marginBottom: 8,
  },
  supportText: {
    fontSize: 16,
    color: "#fff",
  },
  signOutButton: {
    backgroundColor: "#f44336",
    padding: 12,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: 24,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  },
  modalText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 16,
  },
});

export default AccountScreen;
