import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RadioButton } from "react-native-paper";
import Toast from "react-native-toast-message";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface QuizResult {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
}

interface AIGeneratedQuizProps {
  courseId: string;
  lessonId: string;
}

export default function AIGeneratedQuiz({
  courseId,
  lessonId,
}: AIGeneratedQuizProps) {
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  const generateQuiz = async () => {
    setIsLoading(true);
    setIsSubmitted(false);
    setResults([]);
    try {
      const res = await fetch(
        "https://braini-x-one.vercel.app/api/quiz/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId }),
        }
      );
      if (!res.ok) throw new Error("Failed to generate quiz");
      const data = await res.json();
      setQuizId(data.quizId);
      setQuestions(data.questions);
      setAnswers({});
      Toast.show({
        type: "success",
        text1: "Quiz Generated",
        text2: "Your AI-generated quiz is ready!",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Failed to generate quiz: ${error}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!quizId) return;
    try {
      const res = await fetch(
        "https://braini-x-one.vercel.app/api/quiz/submit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quizId, answers, courseId }),
        }
      );
      if (!res.ok) throw new Error("Failed to submit quiz");
      const result = await res.json();
      setResults(result.results);
      setIsSubmitted(true);
      Toast.show({
        type: "success",
        text1: "Quiz Submitted",
        text2: `Your score: ${result.score}%${
          result.passed ? " (Passed)" : ""
        }`,
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Failed to submit quiz: ${error}`,
      });
    }
  };

  const resetQuiz = () => {
    setQuizId(null);
    setQuestions([]);
    setResults([]);
    setIsSubmitted(false);
    setAnswers({});
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>AI-Generated Quiz</Text>
        <TouchableOpacity
          onPress={generateQuiz}
          disabled={isLoading}
          style={styles.generateButton}
        >
          <Feather
            name="refresh-cw"
            size={16}
            color="#fff"
            style={styles.icon}
          />
          <Text style={styles.buttonText}>
            {isLoading ? "Generating..." : "Generate New Quiz"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.infoContainer}>
        <MaterialIcons
          name="lightbulb-outline"
          size={20}
          color="#007bff"
          style={styles.icon}
        />
        <Text style={styles.infoText}>
          This quiz is generated by AI based on the content of this lesson.
        </Text>
      </View>
      {questions.length > 0 ? (
        <ScrollView>
          {questions.map((question, index) => {
            const result = results.find((r) => r.questionId === question.id);
            return (
              <View key={question.id} style={styles.questionContainer}>
                <View style={styles.questionHeader}>
                  <Text style={styles.questionText}>
                    {index + 1}. {question.text}
                  </Text>
                  {isSubmitted && result && (
                    <MaterialIcons
                      name={result.isCorrect ? "check-circle" : "cancel"}
                      size={20}
                      color={result.isCorrect ? "green" : "red"}
                    />
                  )}
                </View>
                <RadioButton.Group
                  onValueChange={(value) => {
                    setAnswers((prev) => ({ ...prev, [question.id]: value }));
                  }}
                  value={answers[question.id] || ""}
                >
                  {question.options.map((option, i) => {
                    const isSelected = isSubmitted
                      ? result?.selectedAnswer === option
                      : answers[question.id] === option;
                    const isCorrect = result?.correctAnswer === option;
                    const optionStyle = isSubmitted
                      ? isCorrect
                        ? styles.optionCorrect
                        : isSelected && !isCorrect
                        ? styles.optionIncorrect
                        : styles.optionDefault
                      : styles.optionDefault;
                    return (
                      <View
                        key={i}
                        style={[styles.optionContainer, optionStyle]}
                      >
                        <RadioButton value={option} disabled={isSubmitted} />
                        <Text style={styles.optionText}>{option}</Text>
                      </View>
                    );
                  })}
                </RadioButton.Group>
                {isSubmitted && result && (
                  <View style={styles.explanationContainer}>
                    <Text style={styles.explanationTitle}>Explanation:</Text>
                    <Text style={styles.explanationText}>
                      {result.explanation}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
          <TouchableOpacity
            onPress={isSubmitted ? resetQuiz : onSubmit}
            style={styles.submitButton}
          >
            <Text style={styles.buttonText}>
              {isSubmitted ? "Try Another Quiz" : "Submit Answers"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <Text style={styles.noQuizText}>
          Click "Generate New Quiz" to start.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerText: { fontSize: 18, fontWeight: "600", color: "#333" },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    padding: 8,
    borderRadius: 4,
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  icon: { marginRight: 4 },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f0ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: { fontSize: 14, color: "#333" },
  questionContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  questionText: { fontSize: 16, fontWeight: "500", color: "#333" },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  optionDefault: { backgroundColor: "#fff" },
  optionCorrect: { backgroundColor: "#e6ffed" },
  optionIncorrect: { backgroundColor: "#ffe6e6" },
  optionText: { fontSize: 14, color: "#333" },
  explanationContainer: {
    backgroundColor: "#f0f0f0",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  explanationTitle: { fontSize: 14, fontWeight: "600", color: "#333" },
  explanationText: { fontSize: 14, color: "#666" },
  submitButton: {
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    marginTop: 16,
  },
  noQuizText: { fontSize: 14, color: "#666", textAlign: "center" },
});
