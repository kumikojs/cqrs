import type { Command, Event, ModuleWrapper, Query } from '@kumiko/react';

export type CreateTodoCommand = Command<
  'CreateTodo',
  {
    title: string;
  }
>;

export type UpdateTodoCommand = Command<
  'UpdateTodo',
  {
    id: string;
    title: string;
  }
>;

export type TodoCreated = Event<
  'TodoCreated',
  {
    id: string;
    title: string;
  }
>;

export type TodoUpdated = Event<
  'TodoUpdated',
  {
    id: string;
    title: string;
  }
>;

export type GetTodoQuery = Query<
  'GetTodo',
  {
    id: string;
    title: string;
  }
>;

export type GetTodosQuery = Query<
  'GetTodos',
  {
    todos: {
      id: string;
      title: string;
    }[];
  }
>;

export type TodoModule = ModuleWrapper<{
  commands: {
    CreateTodo: CreateTodoCommand;
    UpdateTodo: UpdateTodoCommand;
  };
  events: {
    TodoCreated: TodoCreated;
    TodoUpdated: TodoUpdated;
  };
  queries: {
    GetTodo: {
      query: GetTodoQuery;
      response: GetTodoQuery['payload'];
    };
    GetTodos: {
      query: GetTodosQuery;
      response: GetTodosQuery['payload'];
    };
  };
}>;
