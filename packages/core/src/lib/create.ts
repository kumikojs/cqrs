import { Client } from './client';
import type { ClientOptions, Feature } from './types/main';

// Define a subset type that allows for any subset of the FeatureList
type Subset<FeatureList extends Feature[]> = FeatureList extends (infer U)[]
  ? U[]
  : never;

type ExtendedClientOptions<FeatureList extends Feature[]> = ClientOptions & {
  // Accepts an array of functions where each function operates on a subset of the FeatureList
  features?: ((client: any) => void)[];
};

// Define a feature for a subset of the feature list
export const defineFeature = <FeatureList extends Feature[]>(
  fn: (client: Client<FeatureList>) => void
) => fn;

// Create client function with subset support
export function createClient<FeatureList extends Feature[] = Feature[]>({
  features,
  ...options
}: ExtendedClientOptions<FeatureList>) {
  const client = new Client<FeatureList>(options);

  // Allow subsets of FeatureList to be passed, with reusable client type
  const compute = <SubsetList extends Subset<FeatureList>>(
    ...fns: ((client: Client<SubsetList>) => void)[]
  ) => fns.forEach((fn) => fn(client as Client<SubsetList>));

  // Plugin system for attaching subsets
  const plugin = <SubsetList extends Subset<FeatureList>>(
    fn: (client: Client<SubsetList>) => void
  ) => {
    return (client: Client<SubsetList>) => fn(client);
  };

  // Run feature functions if provided
  if (features) {
    compute(...features);
  }

  return {
    kumiko: client,
    compute,
    plugin,
  };
}
