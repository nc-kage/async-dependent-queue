/* tslint:disable:max-classes-per-file */
import AsyncQueue from '../../../src/AsyncQueue';
import { delay } from '../../utils/time';
import BaseEntity from '../Entity/BaseEntity';
import IEntity from '../Entity/IEntity';

class FirstEntity extends BaseEntity implements IEntity {
  public readonly type: string = 'first';
}

class SecondEntity extends BaseEntity implements IEntity  {
  public readonly type: string = 'second';
}

const typeGetter = (queueItem: IEntity): string => {
  return queueItem.type;
};

describe('AsyncQueue', () => {
  beforeEach(async () => {
    await AsyncQueue.waitStop();
    AsyncQueue.setCapacity(1);
    AsyncQueue.setTypeGetter(typeGetter);
  });

  it('executes four items', async () => {
    const resolvedItems: IEntity[] = [];
    const first = new FirstEntity();
    const second = new SecondEntity();
    const third = new SecondEntity();
    const fourth = new FirstEntity();
    const aq = new AsyncQueue<IEntity>();
    const getLocalResolver = () => (item: IEntity): Promise<boolean> => {
      return item.execute(true).then((r: boolean): Promise<boolean> => {
        resolvedItems.push(item);
        return Promise.resolve(r);
      });
    };
    aq.offer({ item: first, resolver: getLocalResolver() });
    aq.offer({ item: second, resolver: getLocalResolver() });
    aq.offer({ item: third, depend: first, resolver: getLocalResolver() });
    aq.offer({ item: fourth, depend: [first, second], resolver: getLocalResolver() });
    const resultPromise = aq.execute();
    await delay(101);
    expect(resolvedItems.length).toBe(2);
    expect(resolvedItems).toEqual(expect.arrayContaining([first, second]));
    await delay(699);
    expect(resolvedItems.length).toBe(2);
    await delay(301);
    expect(resolvedItems.length).toBe(4);
    expect(resolvedItems).toEqual(expect.arrayContaining([third, fourth]));
    const result = await resultPromise;
    expect(result.size).toBe(4);
  });

  it('executes four items in one second', async () => {
    AsyncQueue.setCapacity(2);
    const resolvedItems: Array<{ item: IEntity, timestamp: number }> = [];
    const first = new FirstEntity();
    const second = new SecondEntity();
    const third = new SecondEntity();
    const fourth = new FirstEntity();
    const aq = new AsyncQueue<IEntity>();
    const getLocalResolver = () => (item: IEntity): Promise<boolean> => {
      return item.execute(true).then((r: boolean): Promise<boolean> => {
        resolvedItems.push({ item, timestamp: Date.now() });
        return Promise.resolve(r);
      });
    };
    aq.offer({ item: first, resolver: getLocalResolver() });
    aq.offer({ item: second, resolver: getLocalResolver() });
    aq.offer({ item: third, depend: first, resolver: getLocalResolver() });
    aq.offer({ item: fourth, depend: [third, first, second], resolver: getLocalResolver() });
    const result = await aq.execute();
    expect(resolvedItems.length).toBe(4);
    expect(resolvedItems[1].timestamp - resolvedItems[0].timestamp).toBeLessThan(100);
    expect(resolvedItems[2].timestamp - resolvedItems[1].timestamp).toBeGreaterThan(100);
    expect(resolvedItems[2].timestamp - resolvedItems[1].timestamp).toBeLessThan(200);
    expect(resolvedItems[2].timestamp - resolvedItems[0].timestamp).toBeGreaterThan(100);
    expect(resolvedItems[2].timestamp - resolvedItems[0].timestamp).toBeLessThan(200);
    expect(resolvedItems[3].timestamp - resolvedItems[2].timestamp).toBeGreaterThan(100);
    expect(resolvedItems[3].timestamp - resolvedItems[2].timestamp).toBeLessThan(200);
    expect(result.size).toBe(4);
  });
});
