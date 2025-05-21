import { Course } from "@/types/my-learning";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import CourseDiscussion from "../../components/my-learning/CourseDiscussion";

export default function DiscussionScreen() {
  const { course } = useLocalSearchParams();
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
    // Implementation moved to CourseLearningScreen or parent component
    console.log("Sending message:", chatMessage);
    setChatMessage("");
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
