import DependentQueue, { IDependentQueue } from 'dependent-queue';
import isArray from 'lodash/isArray';

import Executor from '../Executor';
import IExecutor from '../Executor/IExecutor';
import { AsyncQueueOfferParamsType, DependentQueueItemType } from '../types';
import { DEFAULT_CAPACITY, ONE_SECOND_MILLISECONDS } from './constants';
import IAsyncQueue from './IAsyncQueue';
import IAsyncQueueStatic from './IAsyncQueueStatic';

// tslint:disable-next-line:variable-name
const AsyncQueue: IAsyncQueueStatic = class AsyncQueueClass<T> implements IAsyncQueue<T> {
  public static setCapacity(capacity: number, type?: string) {
    if (!type) return this.defaultCapacity = capacity;
    this.capacity[type] = capacity;
  }

  public static setResetInterval(time: number) {
    this.resetInterval = time;
  }

  public static setTypeGetter<K>(typeGetter?: (item: K) => string) {
    this.setDependentQueue<K>(typeGetter);
  }

  public static getExecutor<K>(type: string): IExecutor<K> | null {
    const { executors } = this;
    if (executors[type]) return executors[type];
    const dependentQueue = this.getDependentQueue<K>();
    if (!dependentQueue) return null;
    const executor = new Executor<K>(dependentQueue, type);
    executors[type] = executor;
    return executor;
  }

  private static capacity: { [type: string]: number } = {};
  private static defaultCapacity: number = DEFAULT_CAPACITY;
  private static resetInterval: number = ONE_SECOND_MILLISECONDS;
  private static dependentQueue?: IDependentQueue<DependentQueueItemType<any>>;
  private static executors: { [type: string]: IExecutor<any> } = {};
  private static itemMap: Map<any, DependentQueueItemType<any>> = new Map();
  private static typeGetter: (item: any) => string = (): string => '1';

  private static setDependQueueItem(dependentQueueItem: DependentQueueItemType<any>) {
    this.itemMap.set(dependentQueueItem.item, dependentQueueItem);
  }

  private static getDependQueueItem<K>(
    item: K, resolver?: (item: K) => Promise<boolean>,
  ): DependentQueueItemType<K> | null {
    const dependentQueueItem = this.itemMap.get(item);
    if (dependentQueueItem) return dependentQueueItem;
    if (!resolver) return null;
    const newDependentQueueItem = { item, resolver };
    this.setDependQueueItem(newDependentQueueItem);
    return newDependentQueueItem;
  }

  private static getCapacity(type?: string): number {
    if (!type) return this.defaultCapacity;
    return this.capacity[type] || this.defaultCapacity;
  }

  private static setDependentQueue<K>(typeGetter?: (item: K) => string) {
    if (typeGetter) this.typeGetter = typeGetter;
    this.dependentQueue = new DependentQueue<DependentQueueItemType<K>>((
      queueItem: DependentQueueItemType<K>,
    ): string  => this.typeGetter(queueItem.item));
  }

  private static getDependentQueue<K>(): IDependentQueue<DependentQueueItemType<K>> | null {
    return (this.dependentQueue as IDependentQueue<DependentQueueItemType<K>>) || null;
  }

  private static addItemToQueue<K>(offerData: AsyncQueueOfferParamsType<K>): boolean | boolean[] {
    const { item, resolver, depend } = offerData;
    const isDependArray = isArray(depend);
    let isDependError = false;
    let dependQueueItemList;
    if (depend) {
      dependQueueItemList = ((isDependArray ? depend : [depend]) as K[])
        .map((dependItem: K): DependentQueueItemType<K> | null => {
          const dependQueueItem = AsyncQueueClass.getDependQueueItem<K>(dependItem);
          if (!dependQueueItem) isDependError = true;
          return dependQueueItem;
        });
    }
    isDependError = Boolean(depend && isDependError);
    if (isDependError) {
      return isDependArray
        ? (dependQueueItemList as Array<DependentQueueItemType<K> | null>)
          .map((dependItem): boolean => Boolean(dependItem))
        : Boolean((dependQueueItemList as Array<DependentQueueItemType<K> | null>)[0]);
    }
    const dependentQueueItem = AsyncQueueClass.getDependQueueItem<K>(item, resolver);
    if (!dependentQueueItem) return false;
    const dependentQueue = this.getDependentQueue<K>();
    if (!dependentQueue) return false;
    return dependentQueue.offer(
      dependentQueueItem, dependQueueItemList as Array<DependentQueueItemType<K>>,
    );
  }

  private result: Map<T, boolean | boolean[]> = new Map();
  private offerList: Array<AsyncQueueOfferParamsType<T>> = [];
  private executePromise?: Promise<Map<T, boolean | boolean[]>>;

  public async execute(): Promise<Map<T, boolean | boolean[]>> {
    const { offerList, executePromise } = this;
    if (executePromise) return executePromise;
    if (!offerList.length) return Promise.resolve(this.result);

    this.executePromise = new Promise<Map<T, boolean | boolean[]>>((res: (
      result: Map<T, boolean | boolean[]>,
    ) => void) => {
      Promise.all(offerList.map((offerData): Promise<Map<T, boolean | boolean[]>> => {
        return this.executeOffer(offerData);
      })).then(() => res(this.result));
    });
    return this.executePromise;
  }

  public offer(params: AsyncQueueOfferParamsType<T>) {
    this.offerList.push(params);
  }

  private async executeOffer(
    offerData: AsyncQueueOfferParamsType<T>,
  ): Promise<Map<T, boolean | boolean[]>> {
    const { result } = this;
    const dependentQueue = AsyncQueueClass.getDependentQueue<T>();
    const { item } = offerData;
    if (!dependentQueue) {
      result.set(item, false);
      return Promise.resolve(result);
    }
    const type = AsyncQueueClass.typeGetter(item);
    const executor = AsyncQueueClass.getExecutor<T>(type);
    if (!executor) {
      result.set(item, false);
      return Promise.resolve(result);
    }
    return new Promise((res: (result: Map<T, boolean | boolean[]>) => void) => {
      const addItemToQueueResult = AsyncQueueClass.addItemToQueue(offerData);
      const isAddFailed = !addItemToQueueResult
        || (addItemToQueueResult as boolean[]).some((itemResult): boolean => !itemResult);
      if (isAddFailed) {
        result.set(item, addItemToQueueResult);
        return res(result);
      }
      executor.on('resolve', (resolveItem?: T) => {
        if (resolveItem === item) {
          result.set(item, true);
          res(result);
        }
      });
    });
  }
}

export default AsyncQueue;
