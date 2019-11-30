/* tslint:disable:max-classes-per-file */
import DependentQueue from 'dependent-queue';
import Executor from '../../../src/Executor';
import { DependentQueueItemType } from '../../../src/types';

import { delay } from '../../utils/time';
import BaseEntity from '../Entity/BaseEntity';
import IEntity from '../Entity/IEntity';

class FirstEntity extends BaseEntity implements IEntity {
  public readonly type: string = 'first';
}

class SecondEntity extends BaseEntity implements IEntity  {
  public readonly type: string = 'second';
}

const typeGetter = (queueItem: DependentQueueItemType<IEntity>): string => {
  return queueItem.item.type;
};

const getResolver = (
  result: boolean = true, timeout?: number,
) => (item: IEntity): Promise<boolean> => item.execute(result, timeout);

describe('Executor', () => {
  it('resumes execution after the counter resetting', async () => {
    const first = new FirstEntity();
    const second = new FirstEntity();
    const third = new FirstEntity();
    const fourth = new FirstEntity();
    const type = first.type;
    const dq = new DependentQueue<DependentQueueItemType<IEntity>>(typeGetter);
    const executor = new Executor<IEntity>(dq, type);
    dq.offer({ item: first, resolver: getResolver() });
    dq.offer({ item: second, resolver: getResolver() });
    dq.offer({ item: third, resolver: getResolver() });
    dq.offer({ item: fourth, resolver: getResolver() });
    executor.start();
    await delay(110);
    expect(executor.getCount()).toBe(1);
    expect((dq.peek(type) as DependentQueueItemType<IEntity>).item).toBe(second);
    executor.resetCounter();
    executor.setLimit(2);
    await delay(310);
    expect((dq.peek(type) as DependentQueueItemType<IEntity>).item).toBe(fourth);
  });

  it('resumes execution after the dependent item removing from queue', async () => {
    const first = new FirstEntity();
    const depend = new SecondEntity();
    const second = new FirstEntity();
    const firstType = first.type;
    const dependType = depend.type;
    const dq = new DependentQueue<DependentQueueItemType<IEntity>>(typeGetter);
    const executor = new Executor<IEntity>(dq, firstType);
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
    const first = new FirstEntity();
    const second = new FirstEntity();
    const third = new FirstEntity();
    const type = first.type;
    const dq = new DependentQueue<DependentQueueItemType<IEntity>>(typeGetter);
    const executor = new Executor<IEntity>(dq, type);
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
    const first = new FirstEntity();
    const depend = new SecondEntity();
    const second = new FirstEntity();
    const firstType = first.type;
    const dependType = depend.type;
    const dq = new DependentQueue<DependentQueueItemType<IEntity>>(typeGetter);
    const executor = new Executor<IEntity>(dq, firstType);
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
