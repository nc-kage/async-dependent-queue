/* tslint:disable:max-classes-per-file */
import DependentQueue from 'dependent-queue';
import Executor from '../../../src/Executor';
import { DependentQueueItemType } from '../../../src/types';

import { delay } from '../../utils/time';
import BaseType from './BaseType';
import IType from './IType';

class FirstType extends BaseType implements IType {
  public readonly type: string = 'first';
}

class SecondType extends BaseType implements IType  {
  public readonly type: string = 'second';
}

class ThirdType extends BaseType implements IType  {
  public readonly type: string = 'third';
}

class FourthType extends BaseType implements IType  {
  public readonly type: string = 'fourth';
}

const typeGetter = (queueItem: DependentQueueItemType<IType>): string => {
  return queueItem.item.type;
};

const getResolver = (
  result: boolean = true, timeout?: number,
) => (item: IType): Promise<boolean> => item.execute(result, timeout);

describe('Executor', () => {
  it('resumes execution after the counter resetting', async () => {
    const first = new FirstType();
    const second = new FirstType();
    const third = new FirstType();
    const fourth = new FirstType();
    const type = first.type;
    const dq = new DependentQueue<DependentQueueItemType<IType>>(typeGetter);
    const executor = new Executor<IType>(dq, type);
    dq.offer({ item: first, resolver: getResolver() });
    dq.offer({ item: second, resolver: getResolver() });
    dq.offer({ item: third, resolver: getResolver() });
    dq.offer({ item: fourth, resolver: getResolver() });
    executor.start();
    await delay(110);
    expect(executor.getCount()).toBe(1);
    expect((dq.peek(type) as DependentQueueItemType<IType>).item).toBe(second);
    executor.resetCounter();
    executor.setLimit(2);
    await delay(110);
    expect((dq.peek(type) as DependentQueueItemType<IType>).item).toBe(fourth);
  });

  it('resumes execution after the dependent item removing from queue', async () => {
    const first = new FirstType();
    const depend = new SecondType();
    const second = new FirstType();
    const firstType = first.type;
    const dependType = depend.type;
    const dq = new DependentQueue<DependentQueueItemType<IType>>(typeGetter);
    const executor = new Executor<IType>(dq, firstType);
    const dependQueueItem = { item: depend, resolver: getResolver() };
    dq.offer({ item: first, resolver: getResolver() });
    dq.offer(dependQueueItem);
    dq.offer({ item: second, resolver: getResolver() }, dependQueueItem);
    executor.setLimit(2);
    executor.start();
    await delay(110);
    expect(executor.getCount()).toBe(1);
    expect(dq.peek(firstType)).toBeNull();
    dq.poll(dependType);
    await delay(110);
    expect(executor.getCount()).toBe(2);
    expect(dq.checkQueueEmpty(firstType)).toBeTruthy();
  });

  it('resumes execution after the finish', async () => {
    const first = new FirstType();
    const second = new FirstType();
    const third = new FirstType();
    const type = first.type;
    const dq = new DependentQueue<DependentQueueItemType<IType>>(typeGetter);
    const executor = new Executor<IType>(dq, type);
    executor.setLimit(3);
    dq.offer({ item: first, resolver: getResolver() });
    executor.start();
    await delay(110);
    expect(executor.getCount()).toBe(1);
    expect(dq.peek(type)).toBeNull();
    dq.offer({ item: second, resolver: getResolver() });
    await delay(110);
    expect(executor.getCount()).toBe(2);
    expect(dq.peek(type)).toBeNull();
    dq.offer({ item: third, resolver: getResolver() });
    await delay(110);
    expect(executor.getCount()).toBe(3);
    expect(dq.peek(type)).toBeNull();
  });

  // tslint:disable-next-line:max-line-length
  it('resumes execution after the dependent item removing from queue and counter resetting', async () => {
    const first = new FirstType();
    const depend = new SecondType();
    const second = new FirstType();
    const firstType = first.type;
    const dependType = depend.type;
    const dq = new DependentQueue<DependentQueueItemType<IType>>(typeGetter);
    const executor = new Executor<IType>(dq, firstType);
    const dependQueueItem = { item: depend, resolver: getResolver() };
    dq.offer({ item: first, resolver: getResolver() });
    dq.offer(dependQueueItem);
    dq.offer({ item: second, resolver: getResolver() }, dependQueueItem);
    executor.start();
    await delay(110);
    expect(executor.getCount()).toBe(1);
    expect(dq.peek(firstType)).toBeNull();
    dq.poll(dependType);
    await delay(110);
    expect(executor.getCount()).toBe(1);
    expect(dq.peek(firstType)).not.toBeNull();
    executor.resetCounter();
    await delay(110);
    expect(executor.getCount()).toBe(1);
    expect(dq.checkQueueEmpty(firstType)).toBeTruthy();
  });
});
