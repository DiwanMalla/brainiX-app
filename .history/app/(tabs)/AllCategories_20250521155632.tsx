import { ThemedText } from "@/components/ThemedText";
import { useAuth } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
} from "react-native";

export default function AllCategoriesScreen() {
  const { getToken } = useAuth();
  const navigation = useNavigation();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const token = await getToken();
      if (!token) {
        console.log("User is not authenticated");
        return;
      }

      try {
        const response = await fetch(
          "https://braini-x-one.vercel.app/api/categories/full",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const formattedCategories = data.map((cat) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
        }));
        setCategories(formattedCategories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const handleCategoryPress = (slug: string) => {
    navigation.navigate("CategoryDetails", { slug });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText style={styles.header}>All Categories</ThemedText>
        {loading ? (
          <ActivityIndicator size="large" color="#ffffff" />
        ) : categories.length > 0 ? (
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <Pressable
                style={styles.categoryItem}
                onPress={() => handleCategoryPress(item.slug)}
              >
                <ThemedText style={styles.categoryText}>{item.name}</ThemedText>
              </Pressable>
            )}
            keyExtractor={(item) => item.id}
          />
        ) : (
          <ThemedText style={styles.noCategoriesText}>
            No categories found.
          </ThemedText>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 10,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
    textAlign: "center",
  },
  categoryItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  categoryText: {
    fontSize: 18,
    color: "#fff",
  },
  noCategoriesText: {
    fontSize: 16,
    color: "#fff",
    textAlign: "center",
    marginVertical: 10,
  },
});
