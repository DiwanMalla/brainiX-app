import { Course } from "@/types/my-learning";
import { useLocalSearchParams } from "expo-router";
import CourseDiscussion from "../../components/my-learning/CourseDiscussion";

export default function DiscussionScreen() {
  const { course, progress } = useLocalSearchParams();
  let parsedCourse: Course | undefined;
  let parsedProgress: number = 0;

  try {
    parsedCourse = course ? JSON.parse(course as string) : undefined;
    parsedProgress = progress ? parseFloat(progress as string) : 0;
  } catch (error) {
    console.error("Error parsing navigation params:", error);
  }

  return <CourseDiscussion course={parsedCourse} progress={parsedProgress} />;
}
