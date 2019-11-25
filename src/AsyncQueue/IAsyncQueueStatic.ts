export default interface IAsyncQueueStatic {
  setCapacity(capacity: number, type?: string): void;
  setTypeGetter(typeGetter: (item: any) => string): void;
}
