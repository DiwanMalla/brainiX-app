import { Course, Note } from "@/types/my-learning";
import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

interface CourseNotesProps {
  course: Course;
  lessonId: string;
  notes: Note[];
  setNotes: (notes: Note[]) => void;
  setShowNotes: () => void;
}

export default function CourseNotes({
  course,
  lessonId,
  notes,
  setNotes,
  setShowNotes,
}: CourseNotesProps) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Note content cannot be empty",
      });
      return;
    }

    try {
      const res = await fetch(
        "https://braini-x-one.vercel.app/api/courses/notes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: course.id,
            lessonId,
            content: newNoteContent,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to add note");
      const newNote = await res.json();
      setNotes([newNote, ...notes]);
      setNewNoteContent("");
      setIsDialogOpen(false);
      Toast.show({
        type: "success",
        text1: "Note Added",
        text2: "Your note has been added successfully.",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: error instanceof Error ? error.message : "Failed to add note.",
      });
    }
  };

  const handleEditNote = async () => {
    if (!editingNote || !newNoteContent.trim()) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Note content cannot be empty",
      });
      return;
    }

    try {
      const res = await fetch(
        "https://braini-x-one.vercel.app/api/courses/notes",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteId: editingNote.id,
            content: newNoteContent,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to update note");
      const updatedNote = await res.json();
      setNotes(
        notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
      );
      setNewNoteContent("");
      setEditingNote(null);
      setIsDialogOpen(false);
      Toast.show({
        type: "success",
        text1: "Note Updated",
        text2: "Your note has been updated successfully.",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error instanceof Error ? error.message : "Failed to update note.",
      });
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const res = await fetch(
        "https://braini-x-one.vercel.app/api/courses/notes",
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ noteId }),
        }
      );

      if (!res.ok) throw new Error("Failed to delete note");
      setNotes(notes.filter((note) => note.id !== noteId));
      Toast.show({
        type: "success",
        text1: "Note Deleted",
        text2: "Your note has been deleted successfully.",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2:
          error instanceof Error ? error.message : "Failed to delete note.",
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Your Notes</Text>
        <TouchableOpacity onPress={setShowNotes}>
          <Feather name="x" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setNewNoteContent("");
            setEditingNote(null);
            setIsDialogOpen(true);
          }}
        >
          <Feather name="plus" size={16} color="#fff" style={styles.icon} />
          <Text style={styles.buttonText}>Add Note</Text>
        </TouchableOpacity>
        <ScrollView style={styles.notesContainer}>
          {notes.length === 0 ? (
            <Text style={styles.noNotesText}>No notes yet. Add one above!</Text>
          ) : (
            notes.map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <View style={styles.noteContent}>
                  <Text style={styles.noteText}>{note.content}</Text>
                  <Text style={styles.noteMeta}>
                    Created: {new Date(note.createdAt).toLocaleString()}
                  </Text>
                  {note.createdAt !== note.updatedAt && (
                    <Text style={styles.noteMeta}>
                      Updated: {new Date(note.updatedAt).toLocaleString()}
                    </Text>
                  )}
                </View>
                <View style={styles.noteActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setNewNoteContent(note.content);
                      setEditingNote(note);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Feather name="edit" size={16} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteNote(note.id)}>
                    <Feather
                      name="trash-2"
                      size={16}
                      color="#666"
                      style={styles.actionIcon}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <Modal visible={isDialogOpen} animationType="fade" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingNote ? "Edit Note" : "Add Note"}
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Write your note here..."
              multiline
              value={newNoteContent}
              onChangeText={setNewNoteContent}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setNewNoteContent("");
                  setEditingNote(null);
                  setIsDialogOpen(false);
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingNote ? handleEditNote : handleAddNote}
              >
                <Text style={styles.buttonText}>
                  {editingNote ? "Save Changes" : "Add Note"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#e0e0e0",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  headerText: { fontSize: 18, fontWeight: "600", color: "#333" },
  content: { padding: 16, flex: 1 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007bff",
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  icon: { marginRight: 4 },
  notesContainer: { flex: 1 },
  noNotesText: { fontSize: 14, color: "#666", textAlign: "center" },
  noteCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noteContent: { flex: 1 },
  noteText: { fontSize: 14, color: "#333" },
  noteMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  noteActions: { flexDirection: "row", gap: 8 },
  actionIcon: { marginLeft: 8 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    width: "80%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 4,
    padding: 8,
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  cancelButton: { backgroundColor: "#ccc", padding: 8, borderRadius: 4 },
  saveButton: { backgroundColor: "#007bff", padding: 8, borderRadius: 4 },
});
