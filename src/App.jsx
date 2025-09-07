import React, { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import "./App.css";

import { Amplify } from "aws-amplify";
import { Authenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import outputs from "../amplify_outputs.json";

// GraphQL helpers
import { generateClient } from "aws-amplify/api";
import { createTodo, deleteTodo } from "../graphql/mutations";
import { listTodos } from "../graphql/queries";

// Storage helpers
import { uploadData, getUrl, remove } from "aws-amplify/storage";

Amplify.configure(outputs);
const client = generateClient();

function App() {
  const [todos, setTodos] = useState([]);
  const [formData, setFormData] = useState({ name: "", description: "", image: null });

  // Load todos
  async function fetchTodos() {
    const apiData = await client.graphql({ query: listTodos });
    const items = apiData.data.listTodos.items;

    // attach image URLs
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

  // Add todo
  async function addTodo() {
    if (!formData.name || !formData.description) return;

    let imageKey = null;
    if (formData.image) {
      const result = await uploadData({
        path: `media/${Date.now()}-${formData.image.name}`,
        data: formData.image,
      }).result;
      imageKey = result.path;
    }

    await client.graphql({
      query: createTodo,
      variables: { input: { name: formData.name, description: formData.description, image: imageKey } },
    });

    setFormData({ name: "", description: "", image: null });
    fetchTodos();
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

            <h3>Create a new Todo</h3>
            <input
              placeholder="Todo name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              placeholder="Todo description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <input
              type="file"
              onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
            />
            <button onClick={addTodo}>Add Todo</button>

            <h3 style={{ marginTop: 30 }}>Todos</h3>
            {todos.map((todo) => (
              <div key={todo.id} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
                <h4>{todo.name}</h4>
                <p>{todo.description}</p>
                {todo.imageUrl && <img src={todo.imageUrl} alt={todo.name} style={{ maxWidth: "100%" }} />}
                <button onClick={() => removeTodo(todo)}>Delete</button>
              </div>
            ))}
          </main>
        )}
      </Authenticator>
    </div>
  );
}

export default App;
