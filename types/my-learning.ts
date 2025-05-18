interface Progress {
  id?: string;
  completed?: boolean;
  watchedSeconds?: number;
  lastPosition?: number;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export type Lesson = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  type: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT";
  videoUrl: string | null; // Allows null
  duration: number;
  isPreview: boolean;
  position: number;
  progress: Progress[];
  quiz?: QuizQuestion[];
  assignment?: Assignment;
};
interface Assignment {
  instructions: string;
  submissionDetails?: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
  };
}
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

// In /types/my-learning.ts
export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  discountPrice?: number | null;
  thumbnail?: string | null;
  previewVideo?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean; // Change to required boolean
  bestseller?: boolean;
  published?: boolean;
  publishedAt?: string | null;
  language?: string;
  subtitlesLanguages?: string[];
  certificateAvailable?: boolean;
  duration?: number;
  totalLessons?: number;
  totalModules?: number;
  requirements?: string[];
  learningObjectives?: string[];
  targetAudience?: string[];
  tags?: string[];
  rating?: number | null;
  totalStudents?: number | null;
  topCompanies?: string[];
  createdAt?: string;
  updatedAt?: string;
  instructorId: string;
  categoryId: string;
  modules: Module[];
}

export interface Note {
  id: string;
  content: string;
  lessonId: string; // Add this
  courseId: string | undefined;
  createdAt: string;
  updatedAt: string;
}
