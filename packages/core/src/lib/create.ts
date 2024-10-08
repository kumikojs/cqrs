import { Client } from './client';
import type { ClientOptions, Feature } from './types/main';

type ExtendedClientOptions<FeatureList extends Feature[]> = ClientOptions & {
  features?: {
    [K in keyof FeatureList]: (client: Client<[FeatureList[K]]>) => void;
  };
};

const compute = <FeatureList extends Feature[]>(
  client: Client<FeatureList>,
  ...features: {
    [K in keyof FeatureList]: (client: Client<[FeatureList[K]]>) => void;
  }
) => features.forEach((feature) => feature(client as unknown as Client));

export function defineFeature<FeatureList extends Feature[]>(
  fn: (client: Client<FeatureList>) => void
): (client: Client<FeatureList>) => void {
  return fn;
}

export function createClient<FeatureList extends Feature[]>({
  features,
  ...options
}: ExtendedClientOptions<FeatureList>) {
  const client = new Client<FeatureList>(options);

  if (features) {
    compute(client, ...features);
  }

  return {
    kumiko: client,
    compute: (
      ...features: {
        [K in keyof FeatureList]: (client: Client<[FeatureList[K]]>) => void;
      }
    ) => compute(client, ...features),
  };
}
