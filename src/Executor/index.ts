import { IDependentQueue } from 'dependent-queue';
import { DependentQueueItemType, ExecutorEventMapType } from '../types';
import IExecutor from './IExecutor';

class Executor<T> implements IExecutor<T> {
  private limit: number = 1;
  private count: number = 0;
  private executeTimestamp: number = 0;
  private isExecuting: boolean = false;
  private readonly dependentQueue: IDependentQueue<DependentQueueItemType<T>>;
  private readonly type: string;
  private readonly eventHandlers: { [name: string]: Array<(item?: T) => void> } = {};

  constructor(dependentQueue: IDependentQueue<DependentQueueItemType<T>>, type: string) {
    this.dependentQueue = dependentQueue;
    this.type = type;
    this.existItemsHandler = this.existItemsHandler.bind(this);
  }

  public setLimit(limit: number) {
    this.limit = limit;
  }

  public getCount(): number {
    return this.count;
  }

  public resetCounter(): void {
    this.count = 0;
    if (this.isExecuting) {
      this.resumeHandler();
      this.next();
    }
  }

  public on<K extends keyof ExecutorEventMapType<T>>(name: K, handler: (item?: T) => void) {
    const { eventHandlers } = this;
    if (!eventHandlers[name]) eventHandlers[name] = [];
    eventHandlers[name].push(handler);
  }

  public off<K extends keyof ExecutorEventMapType<T>>(name: K, handler: (item?: T) => void) {
    const list = this.eventHandlers[name];
    if (!list) return;
    const index = list.indexOf(handler);
    if (index >= 0) list.splice(index, 1);
  }

  public start() {
    if (this.isExecuting) return;
    this.isExecuting = true;
    this.next();
  }

  public stop() {
    if (!this.isExecuting) return;
    this.dependentQueue.off('existType', this.existItemsHandler);
    this.isExecuting = false;
  }

  public getExecuteTimestamp(): number {
    return this.executeTimestamp;
  }

  private async next() {
    const { dependentQueue, type, limit, count, isExecuting } = this;
    const queueItem = dependentQueue.peek(type);
    if (!isExecuting) return this.stopHandler();
    if (count >= limit) return this.limitHandler();
    if (!queueItem) return this.endHandler();
    const { item, resolver } = queueItem;
    const result = await resolver(item);
    if (result) {
      dependentQueue.poll(type);
      this.resolveHandler(item);
    } else {
      dependentQueue.moveEnd(queueItem);
    }
    this.count += 1;
    this.executeTimestamp = Date.now();
    this.next();
  }

  private resolveHandler(item: T) {
    const resolveHandlers = this.eventHandlers.resolve || [];
    resolveHandlers.forEach((handler) => {
      handler(item);
    });
  }

  private endHandler() {
    this.dependentQueue.on('existType', this.existItemsHandler);
    return this.dependentQueue.checkQueueEmpty(this.type)
      ? this.finishHandler() : this.waitHandler();
  }

  private finishHandler() {
    const finishHandlers = this.eventHandlers.finish || [];
    finishHandlers.forEach((handler) => {
      handler();
    });
  }

  private waitHandler() {
    const waitHandlers = this.eventHandlers.wait || [];
    waitHandlers.forEach((handler) => {
      handler();
    });
  }

  private limitHandler() {
    const limitHandlers = this.eventHandlers.limit || [];
    limitHandlers.forEach((handler) => {
      handler();
    });
  }

  private stopHandler() {
    const stopHandlers = this.eventHandlers.stop || [];
    stopHandlers.forEach((handler) => {
      handler();
    });
  }

  private resumeHandler() {
    const resumeHandlers = this.eventHandlers.resume || [];
    resumeHandlers.forEach((handler) => {
      handler();
    });
  }

  private existItemsHandler(type?: string) {
    if (type === this.type && this.isExecuting) {
      this.dependentQueue.off('existType', this.existItemsHandler);
      this.next();
    }
  }
}

export default Executor;
