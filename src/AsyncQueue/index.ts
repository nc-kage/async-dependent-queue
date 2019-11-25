import DependentQueue, { IDependentQueue } from 'dependent-queue';
import isUndefined from 'lodash/isUndefined';

import { ONE_SECOND_MILLISECONDS } from './constants';
import IAsyncQueue from './IAsyncQueue';
import IAsyncQueueStatic from './IAsyncQueueStatic';
import { QueueItemParamsTypes } from './types';

// tslint:disable-next-line:variable-name
const AsyncQueue: IAsyncQueueStatic = class AsyncQueueClass<T> implements IAsyncQueue<T> {
  public static setCapacity(capacity: number, type?: string) {
    if (type) return this.capacity[type] = capacity;
    this.defaultCapacity = capacity;
  }

  public static setTypeGetter(typeGetter: (item: any) => string) {
    this.typeGetter = typeGetter;
    this.dependentQueue = new DependentQueue(typeGetter);
  }

  private static defaultCapacity: number = 1;
  private static capacity: { [type: string]: number } = {};
  private static dependentQueue: IDependentQueue<any> = new DependentQueue();
  private static isQueueProcessingStart: boolean = false;
  private static queueStatus: { [type: string]: number } = {};
  private static queueInterval?: number;
  private static typeList: string[] = [];
  private static executingTypeList: { [type: string]: number } = {};
  private static nextStepPromise?: Promise<number>;
  private static typeGetter: (item: any) => string = (item: any): string => '1';

  private static addType(item: any) {
    const { typeGetter, typeList } = this;
    const type = typeGetter(item);
    if (!typeList.includes(type)) typeList.push(type);
  }

  private static start() {
    this.typeList.forEach((type: string) => {
      this.typeStart(type);
    });
  }

  private static typeStart(type: string) {
    if (isUndefined(this.executingTypeList[type])) return;
    this.next(type);
  }

  private static next(type: string) {

  }

  private static getCapacity(type?: string): number {
    if (!type) return this.defaultCapacity;
    return this.capacity[type] || this.defaultCapacity;
  }

  private status: Map<T, QueueItemParamsTypes<T>> = new Map<T, QueueItemParamsTypes<T>>();

  public execute(): Promise<Map<T, boolean | boolean[]>> {
    const { dependentQueue } = AsyncQueueClass;
    const { status } = this;
    const result = new Map<T, boolean | boolean[]>();
    status.forEach((params: QueueItemParamsTypes<T>, item: T) => {
      result.set(item, false);
      dependentQueue.offer(item, params.depend);
    });
    AsyncQueueClass.start();
    return Promise.resolve(result);
  }

  public offer(
    params: {
      item: T;
      depend?: T | T[];
      resolver?: (item: T) => Promise<boolean | boolean[]>;
    },
  ) {
    const { item, depend, resolver } = params;
    AsyncQueueClass.addType(item);
    this.status.set(item, {
      set: false,
      ...(depend ? { depend } : {}),
      ...(resolver ? { resolver } : {}),
    });
  }
}

export default AsyncQueue;
