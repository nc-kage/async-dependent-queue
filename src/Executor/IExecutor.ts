import { ExecutorEventMapType } from '../types';

export default interface IExecutor<T> {
  setLimit(limit: number): void;
  resetCounter(): void;
  getCount(): number;
  on<K extends keyof ExecutorEventMapType<T>>(
    name: K, handler: (item?: T) => void,
  ): void;
  off<K extends keyof ExecutorEventMapType<T>>(
    name: K, handler: (item?: T) => void,
  ): void;
  start(): void;
  stop(): void;
  getExecuteTimestamp(): number;
}
