import { useAuth } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Pusher from "pusher-js";
import { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import Toast from "react-native-toast-message";

interface CourseDiscussionProps {
  slug: string;
  setShowChat: (value: boolean) => void;
  chatMessage: string;
  setChatMessage: (value: string) => void;
  sendChatMessage: () => void;
}

interface ChatMessage {
  id: string;
  user: string;
  avatar?: string;
  message: string;
  time: string;
  likes: number;
  isInstructor?: boolean;
}

interface ApiMessage {
  id: string;
  content: string;
  createdAt: string;
  likes: number;
  sender: { name: string; image?: string | null; role: string };
}

const BASE_URL = "https://braini-x-one.vercel.app";

export default function CourseDiscussion({
  slug,
  setShowChat,
  chatMessage,
  setChatMessage,
  sendChatMessage,
}: CourseDiscussionProps) {
  const { getToken } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [activeIntake, setActiveIntake] = useState("current");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const fetchIdRef = useRef(0); // Track fetch calls

  console.log("CourseDiscussion: Mounted", { slug });
  console.log("CourseDiscussion: Props", { slug, chatMessage, showChat: true });

  useEffect(() => {
    return () => {
      console.log("CourseDiscussion: Unmounted", { slug });
    };
  }, [slug]);

  useEffect(() => {
    let isMounted = true;
    const fetchId = ++fetchIdRef.current;

    async function fetchMessages() {
      if (!slug || !isMounted) {
        setError("Course information is unavailable.");
        console.log("fetchMessages: No slug or unmounted");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        console.log("fetchMessages: Token", token ? "Present" : "Missing");
        console.log("fetchMessages: activeIntake", activeIntake);
        const response = await fetch(
          `${BASE_URL}/api/courses/${slug}/messages?intake=${activeIntake}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("fetchMessages: Response status", response.status);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch messages");
        }
        const data = await response.json();
        console.log("fetchMessages: API response", data);
        if (!Array.isArray(data)) {
          throw new Error("Invalid API response: Expected an array");
        }
        if (isMounted && fetchId === fetchIdRef.current) {
          const newMessages = data.map((msg: ApiMessage) => ({
            id: msg.id,
            user: msg.sender.name,
            avatar:
              msg.sender.image || msg.sender.name.slice(0, 2).toUpperCase(),
            message: msg.content,
            time: new Intl.DateTimeFormat("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            }).format(new Date(msg.createdAt)),
            likes: msg.likes,
            isInstructor: msg.sender.role === "INSTRUCTOR",
          }));
          setMessages(newMessages);
          console.log("fetchMessages: Updated messages", newMessages.length);
        } else {
          console.log("fetchMessages: Ignored outdated fetch", {
            fetchId,
            current: fetchIdRef.current,
          });
        }
      } catch (err) {
        if (isMounted && fetchId === fetchIdRef.current) {
          const errorMessage =
            err instanceof Error ? err.message : "Error loading messages";
          setError(errorMessage);
          console.error("fetchMessages: Error", err);
          Toast.show({ type: "error", text1: "Error", text2: errorMessage });
        }
      } finally {
        if (isMounted && fetchId === fetchIdRef.current) {
          setLoading(false);
          console.log("fetchMessages: State", {
            loading: false,
            error,
            messages,
          });
        }
      }
    }
    fetchMessages();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIntake]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    if (!slug) return;
    const pusher = new Pusher("your-actual-pusher-key", {
      cluster: "your-actual-pusher-cluster",
    });
    console.log("Pusher: Connecting...");
    pusher.connection.bind("connected", () => {
      console.log("Pusher: Connected");
    });
    pusher.connection.bind("error", (err: any) => {
      console.error("Pusher: Error", err);
    });
    const channel = pusher.subscribe(`course-${slug}`);
    console.log("Pusher: Subscribed to", `course-${slug}`);
    channel.bind("new-message", (data: ChatMessage) => {
      console.log("Pusher: New message received", data);
      setMessages((prev) => [...prev, data]);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [slug]);

  const likeMessage = async (messageId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${BASE_URL}/api/messages/${messageId}/like`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to like message");
      }
      const updatedMessage = await response.json();
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, likes: updatedMessage.likes } : msg
        )
      );
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err instanceof Error ? err.message : "Unable to like message.",
      });
    }
  };

  if (!slug) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#2c2c2e" : "#fff" },
        ]}
      >
        <Text
          style={[styles.errorText, { color: isDark ? "#ff4444" : "#ff0000" }]}
        >
          Error: Course information is unavailable.
        </Text>
      </View>
    );
  }

  console.log("CourseDiscussion: Rendering messages", messages.length);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? "#2c2c2e" : "#fff",
          shadowColor: isDark ? "#000" : "#a500ff",
        },
      ]}
      accessibilityLabel="Course Discussion"
    >
      <View
        style={[
          styles.card,
          { backgroundColor: isDark ? "#1c1c1e" : "#f5f5ff" },
        ]}
      >
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => setShowChat(false)}
          accessibilityLabel="Close discussion"
        >
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={isDark ? "#fff" : "#a500ff"}
          />
        </TouchableOpacity>
        <View style={styles.header}>
          <View>
            <Text
              style={[
                styles.headerText,
                { color: isDark ? "#fff" : "#a500ff" },
              ]}
            >
              Course Discussion
            </Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <View style={styles.onlineDot} />
                <Text
                  style={[styles.statText, { color: isDark ? "#ccc" : "#666" }]}
                >
                  24 online
                </Text>
              </View>
              <Text
                style={[styles.separator, { color: isDark ? "#ccc" : "#666" }]}
              >
                •
              </Text>
              <Text
                style={[styles.statText, { color: isDark ? "#ccc" : "#666" }]}
              >
                156 total students
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.tabList}>
          <TouchableOpacity
            style={[styles.tab, activeIntake === "current" && styles.activeTab]}
            onPress={() => setActiveIntake("current")}
            accessibilityLabel="Current Intake"
          >
            <Text
              style={[
                styles.tabText,
                { color: isDark ? "#ccc" : "#666" },
                activeIntake === "current" && {
                  color: isDark ? "#a500ff" : "#7b00cc",
                  fontWeight: "600",
                },
              ]}
            >
              Current Intake
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeIntake === "previous" && styles.activeTab,
            ]}
            onPress={() => setActiveIntake("previous")}
            accessibilityLabel="Previous Intake"
          >
            <Text
              style={[
                styles.tabText,
                { color: isDark ? "#ccc" : "#666" },
                activeIntake === "previous" && {
                  color: isDark ? "#a500ff" : "#7b00cc",
                  fontWeight: "600",
                },
              ]}
            >
              Previous Intake
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: isDark ? "#fff" : "#333", padding: 8 }}>
          Messages in state: {messages.length}
        </Text>
        {/* ScrollView section */}
        <ScrollView
          ref={scrollViewRef}
          style={[
            styles.messagesContainer,
            { backgroundColor: isDark ? "#333" : "#eee" },
          ]}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 16 }}
        >
          {loading ? (
            <Text
              style={{ ...styles.loadingText, color: isDark ? "#ccc" : "#666" }}
            >
              Loading messages...
            </Text>
          ) : error ? (
            <Text
              style={{
                ...styles.errorText,
                color: isDark ? "#ff4444" : "#ff0000",
              }}
            >
              {error}
            </Text>
          ) : messages.length === 0 ? (
            <Text
              style={{
                ...styles.noMessagesText,
                color: isDark ? "#ccc" : "#666",
              }}
            >
              No messages yet. Start the discussion!
            </Text>
          ) : (
            <View
              style={[
                styles.messages,
                { backgroundColor: isDark ? "#444" : "#ddd" },
              ]}
            >
              {activeIntake === "current" ? (
                messages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.message,
                      { backgroundColor: isDark ? "#555" : "#ccc" },
                    ]}
                  >
                    {msg.avatar && msg.avatar.startsWith("http") ? (
                      <Image
                        source={{ uri: msg.avatar }}
                        style={[
                          styles.avatar,
                          msg.isInstructor && styles.instructorAvatar,
                        ]}
                        onError={(e) =>
                          console.log(
                            "Image load error",
                            msg.id,
                            e.nativeEvent.error
                          )
                        }
                      />
                    ) : (
                      <View
                        style={[
                          styles.avatar,
                          msg.isInstructor && styles.instructorAvatar,
                          { backgroundColor: isDark ? "#666" : "#bbb" },
                        ]}
                      >
                        <Text
                          style={{
                            ...styles.avatarText,
                            color: isDark ? "#fff" : "#333",
                          }}
                        >
                          {msg.avatar || "??"}
                        </Text>
                      </View>
                    )}
                    <View style={styles.messageContent}>
                      <View style={styles.messageHeader}>
                        <Text
                          style={{
                            ...styles.messageUser,
                            color: isDark ? "#fff" : "#333",
                          }}
                        >
                          {msg.user}
                        </Text>
                        {msg.isInstructor && (
                          <View
                            style={[
                              styles.instructorBadge,
                              { borderColor: isDark ? "#a500ff" : "#7b00cc" },
                            ]}
                          >
                            <Text
                              style={{
                                ...styles.badgeText,
                                color: isDark ? "#a500ff" : "#7b00cc",
                              }}
                            >
                              Instructor
                            </Text>
                          </View>
                        )}
                        <Text
                          style={{
                            ...styles.messageTime,
                            color: isDark ? "#ccc" : "#666",
                          }}
                        >
                          {msg.time}
                        </Text>
                      </View>
                      <Text
                        style={{
                          ...styles.messageText,
                          color: isDark ? "#fff" : "#333",
                        }}
                      >
                        {msg.message}
                      </Text>
                      <View style={styles.messageActions}>
                        <TouchableOpacity
                          onPress={() => likeMessage(msg.id)}
                          style={styles.actionButton}
                          accessibilityLabel={`Like message by ${msg.user}`}
                        >
                          <MaterialCommunityIcons
                            name="thumb-up-outline"
                            size={14}
                            color={isDark ? "#ccc" : "#666"}
                          />
                          <Text
                            style={{
                              ...styles.actionText,
                              color: isDark ? "#ccc" : "#666",
                            }}
                          >
                            {msg.likes}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          disabled
                          accessibilityLabel="Reply disabled"
                        >
                          <Text
                            style={{
                              ...styles.actionText,
                              color: isDark ? "#ccc" : "#666",
                            }}
                          >
                            Reply
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <>
                  <View
                    style={[
                      styles.archiveNotice,
                      { backgroundColor: isDark ? "#2c2c2e" : "#f0f0f0" },
                    ]}
                  >
                    <Text
                      style={{
                        ...styles.archiveText,
                        color: isDark ? "#ccc" : "#666",
                      }}
                    >
                      This is an archive of discussions from the previous course
                      intake. You can read these messages but cannot reply to
                      them.
                    </Text>
                  </View>
                  {messages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.message,
                        { backgroundColor: isDark ? "#555" : "#ccc" },
                      ]}
                    >
                      {msg.avatar && msg.avatar.startsWith("http") ? (
                        <Image
                          source={{ uri: msg.avatar }}
                          style={[
                            styles.avatar,
                            msg.isInstructor && styles.instructorAvatar,
                          ]}
                          onError={(e) =>
                            console.log(
                              "Image load error",
                              msg.id,
                              e.nativeEvent.error
                            )
                          }
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatar,
                            msg.isInstructor && styles.instructorAvatar,
                            { backgroundColor: isDark ? "#666" : "#bbb" },
                          ]}
                        >
                          <Text
                            style={{
                              ...styles.avatarText,
                              color: isDark ? "#fff" : "#333",
                            }}
                          >
                            {msg.avatar || "??"}
                          </Text>
                        </View>
                      )}
                      <View style={styles.messageContent}>
                        <View style={styles.messageHeader}>
                          <Text
                            style={{
                              ...styles.messageUser,
                              color: isDark ? "#fff" : "#333",
                            }}
                          >
                            {msg.user}
                          </Text>
                          {msg.isInstructor && (
                            <View
                              style={[
                                styles.instructorBadge,
                                { borderColor: isDark ? "#a500ff" : "#7b00cc" },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.badgeText,
                                  { color: isDark ? "#a500ff" : "#7b00cc" },
                                ]}
                              >
                                Instructor
                              </Text>
                            </View>
                          )}
                          <Text
                            style={[
                              styles.messageTime,
                              { color: isDark ? "#ccc" : "#666" },
                            ]}
                          >
                            {msg.time}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.messageText,
                            { color: isDark ? "#fff" : "#333" },
                          ]}
                        >
                          {msg.message}
                        </Text>
                        <View style={styles.messageActions}>
                          <Text
                            style={[
                              styles.likesText,
                              { color: isDark ? "#ccc" : "#666" },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="thumb-up-outline"
                              size={14}
                              color={isDark ? "#ccc" : "#666"}
                            />{" "}
                            {msg.likes} likes
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </ScrollView>
        {activeIntake === "current" && (
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: isDark ? "#1c1c1e" : "#fff" },
            ]}
          >
            <TextInput
              style={{
                ...styles.input,
                backgroundColor: isDark ? "#2c2c2e" : "#f9f9f9",
                borderColor: isDark ? "#444" : "#e0e0e0",
                color: isDark ? "#fff" : "#333",
              }}
              placeholder="Type your message..."
              placeholderTextColor={isDark ? "#666" : "#999"}
              value={chatMessage}
              onChangeText={setChatMessage}
              onSubmitEditing={sendChatMessage}
              accessibilityLabel="Message input"
            />
            <TouchableOpacity
              onPress={sendChatMessage}
              disabled={!chatMessage.trim()}
              style={[
                styles.sendButton,
                !chatMessage.trim() && { opacity: 0.5 },
              ]}
              accessibilityLabel="Send message"
            >
              <MaterialCommunityIcons
                name="send"
                size={20}
                color={
                  chatMessage.trim()
                    ? isDark
                      ? "#a500ff"
                      : "#7b00cc"
                    : isDark
                    ? "#666"
                    : "#ccc"
                }
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    marginTop: 30,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  card: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#a500ff",
  },
  closeButton: {
    position: "absolute",
    top: 12,
    left: 12,
    padding: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 28,
    fontWeight: "700",
  },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#00cc00",
    marginRight: 4,
  },
  statText: {
    fontSize: 12,
  },
  separator: {
    fontSize: 12,
    marginHorizontal: 4,
  },
  tabList: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    padding: 8,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#a500ff",
  },
  tabText: {
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
  },
  noMessagesText: {
    fontSize: 14,
    textAlign: "center",
    padding: 16,
  },
  messages: {
    flexGrow: 1,
    padding: 8,
  },
  archiveNotice: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  archiveText: {
    fontSize: 14,
  },
  message: {
    flexDirection: "row",
    marginBottom: 16,
    padding: 8,
    borderRadius: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  instructorAvatar: {
    borderWidth: 2,
    borderColor: "#a500ff",
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "600",
  },
  messageContent: {
    flex: 1,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  messageUser: {
    fontSize: 14,
    fontWeight: "600",
  },
  instructorBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 10,
  },
  messageTime: {
    fontSize: 12,
  },
  messageText: {
    fontSize: 14,
    marginTop: 4,
  },
  messageActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    fontSize: 12,
    marginLeft: 4,
  },
  likesText: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  input: {
    flex: 1,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  sendButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
});
