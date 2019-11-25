export default interface IAsyncQueue<T> {
  offer(
    params: {
      item: T;
      depend?: T | T[];
      resolver?: (item: T) => Promise<boolean | boolean[]>;
    },
  ): void;
  execute(): Promise<Map<T, boolean | boolean[]>>;
}
