import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { RadioButton } from "react-native-paper";
import Toast from "react-native-toast-message";

type Question = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type QuizResult = {
  questionId: string;
  isCorrect: boolean;
  selectedAnswer: string;
  correctAnswer: string;
  explanation: string;
};

type QuizProps = {
  generateQuiz: () => Promise<any>;
  submitQuiz: (quizId: string, answers: any) => Promise<any>;
  courseId: string;
  lessonId: string;
};

const Quiz = ({ generateQuiz, submitQuiz, courseId, lessonId }: QuizProps) => {
  const [quizId, setQuizId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});

  // Run only on initial mount if courseId and lessonId are valid
  useEffect(() => {
    if (courseId && lessonId && !quizId) {
      handleGenerateQuiz();
    } else if (!courseId || !lessonId) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Missing course or lesson information",
      });
    }
  }, []); // Empty dependency array to run once on mount

  const handleGenerateQuiz = async () => {
    setIsLoading(true);
    setIsSubmitted(false);
    setResults([]);
    try {
      const data = await generateQuiz();
      if (!data || !data.quizId || !data.questions) {
        throw new Error("Invalid quiz data format");
      }
      setQuizId(data.quizId);
      setQuestions(data.questions);
      setAnswers({});
      Toast.show({
        type: "success",
        text1: "Quiz Generated",
        text2: "Your AI-generated quiz is ready!",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Failed to generate quiz: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!quizId) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No quiz available to submit",
      });
      return;
    }
    try {
      const result = await submitQuiz(quizId, answers);
      if (!result || !result.results) {
        throw new Error("Invalid quiz submission response");
      }
      setResults(result.results);
      setIsSubmitted(true);
      Toast.show({
        type: "success",
        text1: "Quiz Submitted",
        text2: `Your score: ${result.score}%${
          result.passed ? " (Passed)" : ""
        }`,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: `Failed to submit quiz: ${error.message}`,
      });
    }
  };

  const handleResetQuiz = () => {
    setQuizId(null);
    setQuestions([]);
    setResults([]);
    setIsSubmitted(false);
    setAnswers({});
    handleGenerateQuiz();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>AI-Generated Quiz</Text>
        <TouchableOpacity
          onPress={handleGenerateQuiz}
          disabled={isLoading || !courseId || !lessonId}
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
          color="#a500ff"
          style={styles.icon}
        />
        <Text style={styles.infoText}>
          This quiz is generated by AI based on the content of this lesson.
        </Text>
      </View>
      {isLoading ? (
        <Text style={styles.noQuizText}>Loading quiz...</Text>
      ) : questions.length > 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
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
                      color={result.isCorrect ? "#00ff88" : "#ff4d4d"}
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
                        <RadioButton
                          value={option}
                          disabled={isSubmitted}
                          color="#a500ff"
                          uncheckedColor="#ccc"
                        />
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
            onPress={isSubmitted ? handleResetQuiz : handleSubmit}
            style={[
              styles.submitButton,
              !isSubmitted && Object.keys(answers).length !== questions.length
                ? styles.submitButtonDisabled
                : null,
            ]}
            disabled={
              !isSubmitted && Object.keys(answers).length !== questions.length
            }
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    padding: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#a500ff",
    padding: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  icon: {
    marginRight: 8,
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1c1c1e",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  infoText: {
    fontSize: 14,
    color: "#ccc",
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  questionContainer: {
    backgroundColor: "#1c1c1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    flex: 1,
  },
  optionContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  optionDefault: {
    backgroundColor: "#2c2c2e",
  },
  optionCorrect: {
    backgroundColor: "#003320",
  },
  optionIncorrect: {
    backgroundColor: "#3d0000",
  },
  optionText: {
    fontSize: 14,
    color: "#ccc",
    flex: 1,
  },
  explanationContainer: {
    backgroundColor: "#2c2c2e",
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#333",
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 5,
  },
  explanationText: {
    fontSize: 13,
    color: "#aaa",
  },
  submitButton: {
    backgroundColor: "#a500ff",
    padding: 12,
    borderRadius: 5,
    alignItems: "center",
    marginTop: 15,
  },
  submitButtonDisabled: {
    backgroundColor: "#2c2c2e",
    opacity: 0.6,
  },
  noQuizText: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    paddingVertical: 20,
  },
});

export default Quiz;
