import { Feather } from "@expo/vector-icons";
import Pusher from "pusher-js";
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

interface CourseDiscussionProps {
  slug: string;
  setShowChat: () => void;
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

export default function CourseDiscussion({
  slug,
  setShowChat,
  chatMessage,
  setChatMessage,
  sendChatMessage,
}: CourseDiscussionProps) {
  const [activeIntake, setActiveIntake] = useState("current");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function fetchMessages() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://braini-x-one.vercel.app/api/courses/${slug}/messages?intake=${activeIntake}`
        );
        if (!response.ok) throw new Error("Failed to fetch messages");
        const data: ApiMessage[] = await response.json();
        setMessages(
          data.map((msg) => ({
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
          }))
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Error loading messages";
        setError(errorMessage);
        Toast.show({ type: "error", text1: "Error", text2: errorMessage });
      } finally {
        setLoading(false);
      }
    }
    fetchMessages();
  }, [slug, activeIntake]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const pusher = new Pusher("your-pusher-key", {
      cluster: "your-pusher-cluster",
    });
    const channel = pusher.subscribe(`course-${slug}`);
    channel.bind("new-message", (data: ChatMessage) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [slug]);

  const likeMessage = async (messageId: string) => {
    try {
      const response = await fetch(
        `https://braini-x-one.vercel.app/api/messages/${messageId}/like`,
        {
          method: "POST",
        }
      );
      if (!response.ok) throw new Error("Failed to like message");
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerText}>Course Discussion</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <View style={styles.onlineDot} />
              <Text style={styles.statText}>24 online</Text>
            </View>
            <Text style={styles.separator}>•</Text>
            <Text style={styles.statText}>156 total students</Text>
          </View>
        </View>
        <TouchableOpacity onPress={setShowChat}>
          <Feather name="x" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <View style={styles.tabList}>
        <TouchableOpacity
          style={[styles.tab, activeIntake === "current" && styles.activeTab]}
          onPress={() => setActiveIntake("current")}
        >
          <Text
            style={[
              styles.tabText,
              activeIntake === "current" && styles.activeTabText,
            ]}
          >
            Current Intake
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeIntake === "previous" && styles.activeTab]}
          onPress={() => setActiveIntake("previous")}
        >
          <Text
            style={[
              styles.tabText,
              activeIntake === "previous" && styles.activeTabText,
            ]}
          >
            Previous Intake
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView ref={scrollViewRef} style={styles.messagesContainer}>
        {loading ? (
          <Text style={styles.loadingText}>Loading messages...</Text>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : messages.length === 0 ? (
          <Text style={styles.noMessagesText}>
            No messages yet. Start the discussion!
          </Text>
        ) : (
          <View style={styles.messages}>
            {activeIntake === "current" ? (
              messages.map((msg) => (
                <View key={msg.id} style={styles.message}>
                  <View
                    style={[
                      styles.avatar,
                      msg.isInstructor && styles.instructorAvatar,
                    ]}
                  >
                    <Text style={styles.avatarText}>{msg.avatar}</Text>
                  </View>
                  <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageUser}>{msg.user}</Text>
                      {msg.isInstructor && (
                        <View style={styles.instructorBadge}>
                          <Text style={styles.badgeText}>Instructor</Text>
                        </View>
                      )}
                      <Text style={styles.messageTime}>{msg.time}</Text>
                    </View>
                    <Text style={styles.messageText}>{msg.message}</Text>
                    <View style={styles.messageActions}>
                      <TouchableOpacity
                        onPress={() => likeMessage(msg.id)}
                        style={styles.actionButton}
                      >
                        <Feather name="thumbs-up" size={14} color="#666" />
                        <Text style={styles.actionText}>{msg.likes}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButton} disabled>
                        <Text style={styles.actionText}>Reply</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <>
                <View style={styles.archiveNotice}>
                  <Text style={styles.archiveText}>
                    This is an archive of discussions from the previous course
                    intake. You can read these messages but cannot reply to
                    them.
                  </Text>
                </View>
                {messages.map((msg) => (
                  <View key={msg.id} style={styles.message}>
                    <View
                      style={[
                        styles.avatar,
                        msg.isInstructor && styles.instructorAvatar,
                      ]}
                    >
                      <Text style={styles.avatarText}>{msg.avatar}</Text>
                    </View>
                    <View style={styles.messageContent}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.messageUser}>{msg.user}</Text>
                        {msg.isInstructor && (
                          <View style={styles.instructorBadge}>
                            <Text style={styles.badgeText}>Instructor</Text>
                          </View>
                        )}
                        <Text style={styles.messageTime}>{msg.time}</Text>
                      </View>
                      <Text style={styles.messageText}>{msg.message}</Text>
                      <View style={styles.messageActions}>
                        <Text style={styles.likesText}>
                          <Feather name="thumbs-up" size={14} color="#666" />{" "}
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
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={chatMessage}
            onChangeText={setChatMessage}
            onSubmitEditing={sendChatMessage}
          />
          <TouchableOpacity
            onPress={sendChatMessage}
            disabled={!chatMessage.trim()}
            style={styles.sendButton}
          >
            <Feather
              name="send"
              size={20}
              color={chatMessage.trim() ? "#007bff" : "#ccc"}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#e0e0e0",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  headerText: { fontSize: 18, fontWeight: "600", color: "#333" },
  stats: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  stat: { flexDirection: "row", alignItems: "center" },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "green",
    marginRight: 4,
  },
  statText: { fontSize: 12, color: "#666" },
  separator: { fontSize: 12, color: "#666", marginHorizontal: 4 },
  tabList: {
    flexDirection: "row",
    padding: 8,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: { flex: 1, padding: 8, alignItems: "center" },
  activeTab: { borderBottomWidth: 2, borderBottomColor: "#007bff" },
  tabText: { fontSize: 14, color: "#666" },
  activeTabText: { color: "#007bff", fontWeight: "600" },
  messagesContainer: { flex: 1, padding: 16 },
  loadingText: { fontSize: 14, color: "#666", textAlign: "center" },
  errorText: { fontSize: 14, color: "red", textAlign: "center" },
  noMessagesText: { fontSize: 14, color: "#666", textAlign: "center" },
  messages: { flex: 1 },
  archiveNotice: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  archiveText: { fontSize: 14, color: "#666" },
  message: { flexDirection: "row", marginBottom: 16 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  instructorAvatar: { borderWidth: 2, borderColor: "#007bff" },
  avatarText: { fontSize: 14, color: "#fff", fontWeight: "600" },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  messageUser: { fontSize: 14, fontWeight: "600", color: "#333" },
  instructorBadge: {
    borderWidth: 1,
    borderColor: "#007bff",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, color: "#007bff" },
  messageTime: { fontSize: 12, color: "#666" },
  messageText: { fontSize: 14, color: "#333", marginTop: 4 },
  messageActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  actionButton: { flexDirection: "row", alignItems: "center" },
  actionText: { fontSize: 12, color: "#666", marginLeft: 4 },
  likesText: { fontSize: 12, color: "#666" },
  inputContainer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sendButton: { padding: 8, justifyContent: "center", alignItems: "center" },
});
