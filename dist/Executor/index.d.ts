import { IDependentQueue } from 'dependent-queue';
import { DependentQueueItemType, ExecutorEventMapType } from '../types';
import IExecutor from './IExecutor';
declare class Executor<T> implements IExecutor<T> {
    private limit;
    private count;
    private executeTimestamp;
    private isExecuting;
    private readonly dependentQueue;
    private readonly type;
    private readonly eventHandlers;
    constructor(dependentQueue: IDependentQueue<DependentQueueItemType<T>>, type: string);
    setLimit(limit: number): void;
    getCount(): number;
    resetCounter(): void;
    on<K extends keyof ExecutorEventMapType<T>>(name: K, handler: (item?: T) => void): void;
    off<K extends keyof ExecutorEventMapType<T>>(name: K, handler: (item?: T) => void): void;
    start(): void;
    stop(): void;
    getExecuteTimestamp(): number;
    private next;
    private resolveHandler;
    private endHandler;
    private finishHandler;
    private waitHandler;
    private limitHandler;
    private stopHandler;
    private resumeHandler;
    private existItemsHandler;
}
export default Executor;
