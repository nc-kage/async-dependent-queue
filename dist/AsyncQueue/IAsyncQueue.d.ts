import { AsyncQueueOfferParamsType } from '../types';
export default interface IAsyncQueue<T> {
    offer(params: AsyncQueueOfferParamsType<T>): void;
    execute(): Promise<Map<T, boolean | boolean[]>>;
}
