export type ExecutorEventMapType<T> = {
  resolve: (item: T) => void;
  wait: () => void;
  resume: () => void;
  limit: () => void;
  finish: () => void;
  stop: () => void;
};

export type DependentQueueItemType<T> = {
  item: T;
  resolver: (item: T) => Promise<boolean>;
};
