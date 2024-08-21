import { create } from '@aesop/react';

import type { TodoModule } from '../../types/todo';

export const aesop = create<[TodoModule]>({
  cache: {
    l2: {
      driver: localStorage,
    },
  },
});

aesop.aesop.command.register('CreateTodo', async (command, context) => {
  console.log('CreateTodo', command);

  context.emit({
    eventName: 'TodoCreated',
    payload: {
      id: '1',
      title: 'Example Todo',
    },
  });
});

aesop.aesop.command.register('UpdateTodo', async (command) => {
  console.log('UpdateTodo', command);
});

aesop.aesop.event.on('TodoCreated', async (event) => {
  console.log('TodoCreated', event);
});

aesop.aesop.event.on('TodoUpdated', async (event) => {
  console.log('TodoUpdated', event);
});

aesop.aesop.query.register('GetTodo', async (query) => {
  console.log('GetTodo', query);

  return {
    id: '1',
    title: 'Example Todo',
  };
});

aesop.aesop.query.register('GetTodos', async (query) => {
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
