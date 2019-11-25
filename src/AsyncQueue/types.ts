export type QueueItemParamsTypes<T> = {
  set: boolean;
  depend?: T | T[];
  resolver?: (item: T) => Promise<boolean | boolean[]>;
};
