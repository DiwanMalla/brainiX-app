import { Course } from "@/types/my-learning";
import { useAuth } from "@clerk/clerk-expo";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import Toast from "react-native-toast-message";
import CourseDiscussion from "../../components/my-learning/CourseDiscussion";

export default function DiscussionScreen() {
  const { course } = useLocalSearchParams();
  const { getToken } = useAuth();
  const [send, setSend] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [showChat, setShowChat] = useState(true); // Always true for standalone screen
  let parsedCourse: Course | undefined;

  try {
    parsedCourse = course ? JSON.parse(course as string) : undefined;
  } catch (error) {
    console.error("Error parsing navigation params:", error);
  }

  const slug = parsedCourse?.slug || "";

  const sendChatMessage = async () => {
    if (!chatMessage.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Message cannot be empty",
      });
      return;
    }

    if (!slug) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Course information is unavailable",
      });
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token is missing");
      }

      console.log("Sending message:", chatMessage, "for course:", slug);

      const response = await fetch(
        `https://braini-x-one.vercel.app/api/courses/${slug}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            content: chatMessage.trim(),
            intake: "current", // Assuming messages are for the current intake
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const newMessage = await response.json();
      console.log("Message sent successfully:", newMessage);

      // Clear the input field on success
      setChatMessage("");
      setSend(!send);
      // Show success toast
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Message sent!",
      });
    } catch (error) {
      console.error("Error sending message:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error instanceof Error ? error.message : "Failed to send message",
      });
    }
  };

  return (
    <CourseDiscussion
      slug={slug}
      setShowChat={setShowChat}
      chatMessage={chatMessage}
      setChatMessage={setChatMessage}
      sendChatMessage={sendChatMessage}
    />
  );
}
