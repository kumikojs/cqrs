import { useState, useEffect } from 'react';
import viteLogo from '/vite.svg';
import './App.css';
import { aesop } from './infra/vendors/aesop';

const { useCommand, useEvent, useQuery } = aesop;

function App() {
  const [result, fn] = useQuery({
    queryName: 'GetTodos',
  });
  const [createTodo, createTodoFn] = useCommand({
    commandName: 'CreateTodo',
  });

  useEffect(() => {
    fn();
  }, [fn]);

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <h2>Todos</h2>
      <ul>
        {result?.isPending && <li>Loading...</li>}
        {result?.isRejected && <li>Error: {result?.error?.message}</li>}
        {result?.response?.todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
      <div className="card">
        <button
          onClick={() =>
            createTodoFn({
              title: 'Example Todo',
            })
          }
        >
          Create Todo
        </button>
        {createTodo?.isPending && <p>Creating...</p>}
        {createTodo?.isRejected && <p>Error: {createTodo?.error?.message}</p>}
        {createTodo?.isFulfilled && <p>Created: {createTodo?.isFulfilled}</p>}
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
