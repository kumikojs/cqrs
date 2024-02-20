---
id: Client
title: Client
---

## `Client``

## Examples Usage

```ts
const client = new Client();

client.command.bind('createUser').to(async (command) => {
  console.log('createUser', command);
  return 'createUser';
});

client.command.dispatch({
  commandName: 'createUser',
  payload: {
    name: 'Jane Doe',
  },
});

client.command.interception.apply(async (command, next) => {
  console.log('before', command);
  const result = await next?.(command);
  console.log('after', result);
  return result;
});

client.command.interception
  .select((command) => command.commandName === 'createUser')
  .apply(async (command, next) => {
    console.log('before select', command);
    const result = await next?.(command);
    console.log('after select', result);
    return result;
  });

```