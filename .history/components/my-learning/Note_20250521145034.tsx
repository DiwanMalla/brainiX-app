import { useAuth } from "@clerk/clerk-expo";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_BASE_URL ||
  "https://braini-x-one.vercel.app";

type Note = {
  id: string;
  enrollmentId: string;
  lessonId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type NoteProps = {
  courseId: string;
  lessonId: string;
  notes: Note[];
  setNotes: (notes: Note[]) => void;
};

const Note = ({ courseId, lessonId, notes, setNotes }: NoteProps) => {
  const { getToken } = useAuth();
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Note cannot be empty",
      });
      return;
    }
    if (!courseId || !lessonId) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Missing course or lesson information",
      });
      return;
    }
    setIsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/courses/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ courseId, lessonId, content: newNote }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `HTTP error! Status: ${res.status}, Response: ${errorText}`
        );
      }
      const addedNote = await res.json();
      setNotes([...notes, addedNote]);
      setNewNote("");
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Note added successfully",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err instanceof Error ? err.message : "Failed to add note",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditNote = async (noteId: string) => {
    if (!editingContent.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Note cannot be empty",
      });
      return;
    }
    setIsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/courses/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editingContent }),
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `HTTP error! Status: ${res.status}, Response: ${errorText}`
        );
      }
      const updatedNote = await res.json();
      setNotes(
        notes.map((note) =>
          note.id === noteId
            ? {
                ...note,
                content: updatedNote.content,
                updatedAt: updatedNote.updatedAt,
              }
            : note
        )
      );
      setEditingNoteId(null);
      setEditingContent("");
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Note updated successfully",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err instanceof Error ? err.message : "Failed to update note",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE_URL}/api/courses/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `HTTP error! Status: ${res.status}, Response: ${errorText}`
        );
      }
      setNotes(notes.filter((note) => note.id !== noteId));
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Note deleted successfully",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: err instanceof Error ? err.message : "Failed to delete note",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new note..."
          placeholderTextColor="#aaa"
          value={newNote}
          onChangeText={setNewNote}
          multiline
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[styles.addButton, isLoading && styles.addButtonDisabled]}
          onPress={handleAddNote}
          disabled={isLoading}
        >
          <Feather name="plus" size={20} color="#fff" />
          <Text style={styles.buttonText}>Add Note</Text>
        </TouchableOpacity>
      </View>
      {isLoading && !newNote && !editingNoteId ? (
        <Text style={styles.noNotesText}>Loading notes...</Text>
      ) : notes.length > 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {notes.map((note) => (
            <View key={note.id} style={styles.noteContainer}>
              {editingNoteId === note.id ? (
                <View style={styles.editContainer}>
                  <TextInput
                    style={[styles.input, styles.editInput]}
                    value={editingContent}
                    onChangeText={setEditingContent}
                    multiline
                    editable={!isLoading}
                  />
                  <View style={styles.editButtons}>
                    <TouchableOpacity
                      style={[
                        styles.editButton,
                        isLoading && styles.editButtonDisabled,
                      ]}
                      onPress={() => handleEditNote(note.id)}
                      disabled={isLoading}
                    >
                      <Text style={styles.buttonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.cancelButton,
                        isLoading && styles.editButtonDisabled,
                      ]}
                      onPress={() => {
                        setEditingNoteId(null);
                        setEditingContent("");
                      }}
                      disabled={isLoading}
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.noteContent}>{note.content}</Text>
                  <View style={styles.noteActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setEditingNoteId(note.id);
                        setEditingContent(note.content);
                      }}
                      disabled={isLoading}
                    >
                      <Feather name="edit" size={16} color="#a500ff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteNote(note.id)}
                      disabled={isLoading}
                    >
                      <MaterialIcons name="delete" size={16} color="#ff4d4d" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.noteTimestamp}>
                    {new Date(
                      note.updatedAt || note.createdAt
                    ).toLocaleString()}
                  </Text>
                </>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.noNotesText}>No notes yet. Add one above!</Text>
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
  inputContainer: {
    backgroundColor: "#1c1c1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  input: {
    fontSize: 14,
    color: "#fff",
    backgroundColor: "#2c2c2e",
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  editInput: {
    marginBottom: 10,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#a500ff",
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  addButtonDisabled: {
    backgroundColor: "#2c2c2e",
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 5,
  },
  scrollContainer: {
    paddingBottom: 20,
  },
  noteContainer: {
    backgroundColor: "#1c1c1e",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#333",
  },
  noteContent: {
    fontSize: 14,
    color: "#ccc",
    marginBottom: 10,
  },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 5,
  },
  actionButton: {
    padding: 8,
    marginLeft: 10,
  },
  noteTimestamp: {
    fontSize: 12,
    color: "#aaa",
    textAlign: "right",
  },
  editContainer: {
    flex: 1,
  },
  editButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  editButton: {
    backgroundColor: "#a500ff",
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  cancelButton: {
    backgroundColor: "#2c2c2e",
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  editButtonDisabled: {
    backgroundColor: "#2c2c2e",
    opacity: 0.6,
  },
  noNotesText: {
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
    paddingVertical: 20,
  },
});

export default Note;
