export {};
export type Module = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: Lesson[];
};

export type Lesson = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  type: "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT" | "LIVE_SESSION";
  videoUrl: string | null;
  duration: number;
  isPreview: boolean;
  position: number;
};
export type Roles = "student" | "instructor" | "admin";

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: Roles;
    };
  }
}
type SyllabusItem = {
  title: string;
  lectures: number;
  duration: string;
};

export type Course = {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string | null;
  price: number;
  discountPrice?: number | null;
  discount?: number | null;
  students: number | null;
  thumbnail?: string | null;
  previewVideo?: string | null;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  status: "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
  featured: boolean;
  bestseller: boolean;
  published: boolean;
  publishedAt?: Date | null;
  language: string;
  subtitlesLanguages: string[];
  duration: number | string;
  totalLessons: number;
  totalModules: number;
  requirements: string[];
  learningObjectives: string[];
  targetAudience: string[];
  tags: string[];
  rating?: number | null;
  totalStudents?: number | null;
  topCompanies: string[];
  createdAt: Date;
  updatedAt: Date;
  lastUpdated?: string | null;
  // Relations
  instructorId: string;
  category?: string | null;
  categoryId: string;
  whatYoullLearn?: string[] | null;
  syllabus?: SyllabusItem[] | number | null;
  // Optional relations (when using includes)
  instructor?: User;
  category?: Category;
  modules?: Module[];
  reviews?: Review[];
  enrollments?: Enrollment[];
  // ... other relations as needed
  modules: Module[];
};

export type CourseLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
export type CourseStatus = "DRAFT" | "UNDER_REVIEW" | "PUBLISHED" | "ARCHIVED";
