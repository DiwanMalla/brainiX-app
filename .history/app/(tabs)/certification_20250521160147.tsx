import Certificate from "@/components/my-learning/Certificate";
import { Course } from "@/types/my-learning";
import { useLocalSearchParams } from "expo-router";

export default function CertificationScreen() {
  const { course, progress, source } = useLocalSearchParams();

  let parsedCourse: Course | undefined;
  let parsedProgress: number = 0;

  try {
    parsedCourse = course ? JSON.parse(course as string) : undefined;
    parsedProgress = progress ? parseFloat(progress as string) : 0;
  } catch (error) {
    console.error("Error parsing navigation params:", error);
  }

  return (
    <Certificate
      course={parsedCourse}
      progress={parsedProgress}
      source={source}
    />
  );
}
