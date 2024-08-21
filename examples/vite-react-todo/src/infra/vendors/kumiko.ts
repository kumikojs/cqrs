import { create } from '@kumiko/react';

import type { TodoModule } from '../../types/todo';

export const kumiko = create<[TodoModule]>({
  cache: {
    l2: {
      driver: localStorage,
    },
  },
});

kumiko.kumiko.command.register('CreateTodo', async (command, context) => {
  console.log('CreateTodo', command);

  context.emit({
    eventName: 'TodoCreated',
    payload: {
      id: '1',
      title: 'Example Todo',
    },
  });
});

kumiko.kumiko.command.register('UpdateTodo', async (command) => {
  console.log('UpdateTodo', command);
});

kumiko.kumiko.event.on('TodoCreated', async (event) => {
  console.log('TodoCreated', event);
});

kumiko.kumiko.event.on('TodoUpdated', async (event) => {
  console.log('TodoUpdated', event);
});

kumiko.kumiko.query.register('GetTodo', async (query) => {
  console.log('GetTodo', query);

  return {
    id: '1',
    title: 'Example Todo',
  };
});

kumiko.kumiko.query.register('GetTodos', async (query) => {
  console.log('GetTodos', query);

  return {
    todos: [
      {
        id: '1',
        title: 'Example Todo',
      },
    ],
  };
});
