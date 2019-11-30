import { DependentQueueItemType } from '../types';

export default interface IAsyncQueueStatic {
  setCapacity(capacity: number, type?: string): void;
  setResetInterval(time: number): void;
  setTypeGetter<K>(typeGetter?: (item: DependentQueueItemType<K>) => string): void;
}
