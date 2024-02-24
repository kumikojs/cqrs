import * as React from 'react';

import { ClientContract } from '@stoik/cqrs-core';

export const ClientContext = React.createContext<ClientContract | undefined>(
  undefined
);

export const useClient = () => {
  const client = React.useContext(ClientContext);

  if (client) {
    return client;
  }

  throw new Error('useClient must be used within a ClientProvider');
};

export type ClientProviderProps = {
  client: ClientContract;
  children?: React.ReactNode;
};

export const ClientProvider = ({
  client,
  children,
}: ClientProviderProps): JSX.Element => {
  return (
    <ClientContext.Provider value={client}>{children}</ClientContext.Provider>
  );
};
