import React, { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";

import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import outputs from "../amplify_outputs.json";

// GraphQL helpers
import { generateClient } from "aws-amplify/api";
import { createTodo, updateTodo, deleteTodo } from "../graphql/mutations";
import { listTodos } from "../graphql/queries";

// Storage helpers
import { uploadData, getUrl, remove } from "aws-amplify/storage";

Amplify.configure(outputs);
const client = generateClient();

function App() {
  const [todos, setTodos] = useState([]);
  const [formData, setFormData] = useState({ name: "", description: "", image: null });
  const [editingTodo, setEditingTodo] = useState(null); // track the todo being edited

  // Load todos
  async function fetchTodos() {
    const apiData = await client.graphql({ query: listTodos });
    const items = apiData.data.listTodos.items;

    const withUrls = await Promise.all(
      items.map(async (todo) => {
        if (todo.image) {
          const url = await getUrl({ path: todo.image });
          return { ...todo, imageUrl: url.url };
        }
        return todo;
      })
    );

    setTodos(withUrls);
  }

  useEffect(() => {
    fetchTodos();
  }, []);

  // Add or update todo
  async function saveTodo() {
    if (!formData.name || !formData.description) return;

    let imageKey = editingTodo?.image || null;
    if (formData.image) {
      const result = await uploadData({
        path: `media/${Date.now()}-${formData.image.name}`,
        data: formData.image,
      }).result;
      imageKey = result.path;
    }

    if (editingTodo) {
      // Update
      await client.graphql({
        query: updateTodo,
        variables: { input: { id: editingTodo.id, name: formData.name, description: formData.description, image: imageKey } },
      });
      setEditingTodo(null);
    } else {
      // Create
      await client.graphql({
        query: createTodo,
        variables: { input: { name: formData.name, description: formData.description, image: imageKey } },
      });
    }

    setFormData({ name: "", description: "", image: null });
    fetchTodos();
  }

  // Edit todo
  function editTodo(todo) {
    setFormData({ name: todo.name, description: todo.description, image: null });
    setEditingTodo(todo);
  }

  // Delete todo
  async function removeTodo(todo) {
    if (todo.image) {
      await remove({ path: todo.image });
    }

    await client.graphql({
      query: deleteTodo,
      variables: { input: { id: todo.id } },
    });

    fetchTodos();
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={reactLogo} className="logo react" alt="React logo" />
        <h2>Hello from Amplify 🚀</h2>
      </header>

      <Authenticator>
        {({ signOut, user }) => (
          <main style={{ padding: 20, maxWidth: 600, margin: "auto" }}>
            <h2>Hello {user.username}</h2>
            <button onClick={signOut} style={{ marginBottom: 20 }}>
              Sign out
            </button>

            <h3>{editingTodo ? "Edit Todo" : "Create a new Todo"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <input
                placeholder="Note name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              />
              <input
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc" }}
              />
              <input
                type="file"
                onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
              />
              <button
                onClick={saveTodo}
                style={{ padding: "10px", borderRadius: "5px", backgroundColor: "#61dafb", border: "none", cursor: "pointer" }}
              >
                {editingTodo ? "Update Note" : "Add Note"}
              </button>
            </div>

            <h3 style={{ marginTop: 30 }}>All Notes</h3>
            {todos.map((todo) => (
              <div key={todo.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
                <h4>{todo.name}</h4>
                <p>{todo.description}</p>
                {todo.imageUrl && <img src={todo.imageUrl} alt={todo.name} style={{ maxWidth: "100%" }} />}
                <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                  <button onClick={() => editTodo(todo)}>Edit</button>
                  <button onClick={() => removeTodo(todo)}>Delete</button>
                </div>
              </div>
            ))}
          </main>
        )}
      </Authenticator>
    </div>
  );
}

export default App;
