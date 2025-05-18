import { AIGeneratedQuiz } from "@/components/quiz/AIGeneratedQuiz";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Course, Lesson, Note } from "@/types/my-learning";
import React from "react";
import { ScrollView, Text, View } from "react-native";

interface CourseLearningScreenProps {
  course: Course;
  lesson: Lesson | undefined;
  activeModule: number;
  activeLesson: number;
  setActiveModule: (value: number) => void;
  setActiveLesson: (value: number) => void;
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  setVideoError: (value: string | null) => void;
  setIsVideoLoading: (value: boolean) => void;
  markLessonComplete: () => void;
}

export default function CourseLearningScreen({
  course,
  lesson,
  activeModule,
  activeLesson,
  setActiveModule,
  setActiveLesson,
  notes,
  setNotes,
  setVideoError,
  setIsVideoLoading,
  markLessonComplete,
}: CourseLearningScreenProps) {
  // const handleMarkComplete = async (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   if (!lesson) return;
  //   console.log("LessonContent: Marking lesson complete", {
  //     lessonId: lesson.id,
  //     lessonTitle: lesson.title,
  //   });
  //   try {
  //     await markLessonComplete();
  //   } catch (error) {
  //     console.error("Failed to mark lesson complete:", error);
  //   }
  // };

  // const handlePrevious = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   console.log("LessonContent: Navigating to previous lesson");
  //   if (activeLesson > 0) {
  //     setActiveLesson(activeLesson - 1);
  //     setVideoError(null);
  //     setIsVideoLoading(true);
  //   } else if (activeModule > 0) {
  //     setActiveModule(activeModule - 1);
  //     setActiveLesson(course.modules[activeModule - 1].lessons.length - 1);
  //     setVideoError(null);
  //     setIsVideoLoading(true);
  //   }
  // };

  // const handleNext = (e: React.MouseEvent) => {
  //   e.preventDefault();
  //   console.log("LessonContent: Navigating to next lesson");
  //   if (activeLesson < course.modules[activeModule].lessons.length - 1) {
  //     setActiveLesson(activeLesson + 1);
  //     setVideoError(null);
  //     setIsVideoLoading(true);
  //   } else if (activeModule < course.modules.length - 1) {
  //     setActiveModule(activeModule + 1);
  //     setActiveLesson(0);
  //     setVideoError(null);
  //     setIsVideoLoading(true);
  //   }
  // };

  // const handleAddNote = (content: string) => {
  //   if (!lesson) return;
  //   const newNote: Note = {
  //     id: crypto.randomUUID(),
  //     content,
  //     lessonId: lesson.id,
  //     courseId: course.id,
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //   };
  //   setNotes((prevNotes) => [...prevNotes, newNote]);
  // };

  // if (!lesson) {
  //   return <div className="p-4">No lesson selected.</div>;
  // }

  // Filter notes for the current lesson
  const lessonNotes = notes.filter((note) => note.lessonId === lesson?.id);

  return (
    <View className="flex-1 bg-white rounded-lg p-4">
      {/* <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-xl font-bold">{lesson.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <Badge variant="outline" className="flex items-center">
              {lesson.type === "VIDEO" ? (
                <>
                  <Play className="h-3 w-3 mr-1" />
                  Video
                </>
              ) : lesson.type === "TEXT" ? (
                <>
                  <FileText className="h-3 w-3 mr-1" />
                  Article
                </>
              ) : lesson.type === "QUIZ" ? (
                <>
                  <FileQuestion className="h-3 w-3 mr-1" />
                  Quiz
                </>
              ) : lesson.type === "ASSIGNMENT" ? (
                <>
                  <PenLine className="h-3 w-3 mr-1" />
                  Assignment
                </>
              ) : (
                <>
                  <Award className="h-3 w-3 mr-1" />
                  Live Session
                </>
              )}
            </Badge>
            <Badge variant="outline" className="flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {lesson.duration
                ? `${Math.floor(lesson.duration / 60)}:${(lesson.duration % 60)
                    .toString()
                    .padStart(2, "0")}`
                : "N/A"}
            </Badge>
            {lesson.isPreview && (
              <Badge variant="secondary" className="flex items-center">
                Preview
              </Badge>
            )}
          </div>
          {lesson.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {lesson.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={activeLesson === 0 && activeModule === 0}
            onClick={handlePrevious}
          >
            Previous
          </Button>
          <Button
            size="sm"
            onClick={handleMarkComplete}
            disabled={lesson.progress[0]?.completed}
          >
            {lesson.progress[0]?.completed
              ? "Already Completed"
              : "Mark as Complete"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={
              activeLesson ===
                course.modules[activeModule].lessons.length - 1 &&
              activeModule === course.modules.length - 1
            }
            onClick={handleNext}
          >
            Next
          </Button>
        </div>
      </div> */}

      <Tabs defaultValue="content" className="w-full">
        <TabsList className="flex">
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="ai-quiz">AI Quiz</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="p-4 border rounded-md mt-4">
          <ScrollView>
            <Text className="text-lg font-semibold">Lesson Overview</Text>
            {lesson?.description ? (
              <Text className="mt-2">{lesson.description}</Text>
            ) : (
              <Text className="mt-2 text-gray-500">
                No description available.
              </Text>
            )}
            <Text className="text-lg font-semibold mt-4">
              Learning Objectives
            </Text>
            <View className="mt-2">
              <Text>
                • Understand the fundamental principles of {course.title}
              </Text>
              <Text>• Apply theoretical knowledge to practical scenarios</Text>
              <Text>
                • Develop problem-solving skills through guided exercises
              </Text>
              <Text>
                • Build a foundation for advanced topics in future lessons
              </Text>
            </View>
            <Text className="text-lg font-semibold mt-4">Key Takeaways</Text>
            <Text className="mt-2">
              By the end of this lesson, you should be able to confidently
              implement the concepts covered and understand how they fit into
              the broader context of {course.title}.
            </Text>
          </ScrollView>
        </TabsContent>

        <TabsContent value="resources" className="p-4 border rounded-md mt-4">
          <View className="space-y-4">
            <Text className="text-lg font-semibold">
              Supplementary Materials
            </Text>
            <Text className="text-gray-500">
              No resources available for this lesson.
            </Text>
          </View>
        </TabsContent>

        <TabsContent value="transcript" className="p-4 border rounded-md mt-4">
          <View className="space-y-4">
            <Text className="text-lg font-semibold">Video Transcript</Text>
            <ScrollView className="max-h-[400px]">
              <Text className="text-gray-500">
                Transcript not available for this lesson.
              </Text>
            </ScrollView>
          </View>
        </TabsContent>

        <TabsContent value="ai-quiz" className="p-4 border rounded-md mt-4">
          <AIGeneratedQuiz courseId={course.id} lessonId={lesson?.id || ""} />
        </TabsContent>

        {/* <TabsContent value="notes" className="p-4 border rounded-md mt-4">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Lesson Notes</h3>
            {lessonNotes.length > 0 ? (
              <ul className="space-y-2">
                {lessonNotes.map((note) => (
                  <li key={note.id} className="text-sm">
                    {note.content}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No notes available.</p>
            )}
            <Button onClick={() => handleAddNote("Sample note")}>
              Add Sample Note
            </Button>
          </div>
        </TabsContent> */}
      </Tabs>
    </View>
  );
}
