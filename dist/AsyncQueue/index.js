"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dependent_queue_1 = __importDefault(require("dependent-queue"));
const isArray_1 = __importDefault(require("lodash/isArray"));
const noop_1 = __importDefault(require("lodash/noop"));
const Executor_1 = __importDefault(require("../Executor"));
const constants_1 = require("./constants");
class AsyncQueue {
    constructor() {
        this.result = new Map();
        this.offerList = [];
        this.executorList = [];
    }
    static setCapacity(capacity, type) {
        if (type) {
            this.capacity[type] = capacity;
        }
        else {
            this.defaultCapacity = capacity;
        }
        this.updateExecutorsCapacity();
    }
    static setResetInterval(time) {
        this.resetInterval = time;
    }
    static setTypeGetter(typeGetter) {
        this.setDependentQueue(typeGetter);
        this.executors = {};
    }
    static async waitStop() {
        return this.stopPromise;
    }
    static updateExecutorsCapacity() {
        const { executors } = this;
        Object.keys(executors).forEach((type) => {
            executors[type].setLimit(this.getCapacity(type));
        });
    }
    static getExecutor(type) {
        const { executors } = this;
        if (executors[type])
            return executors[type];
        const dependentQueue = this.getDependentQueue();
        if (!dependentQueue)
            return null;
        const executor = new Executor_1.default(dependentQueue, type);
        executor.setLimit(this.getCapacity(type));
        executors[type] = executor;
        return executor;
    }
    static setDependQueueItem(dependentQueueItem) {
        this.itemMap.set(dependentQueueItem.item, dependentQueueItem);
    }
    static getDependQueueItem(item, resolver) {
        const dependentQueueItem = this.itemMap.get(item);
        if (dependentQueueItem)
            return dependentQueueItem;
        if (!resolver)
            return null;
        const newDependentQueueItem = { item, resolver };
        this.setDependQueueItem(newDependentQueueItem);
        return newDependentQueueItem;
    }
    static getCapacity(type) {
        if (!type)
            return this.defaultCapacity;
        return this.capacity[type] || this.defaultCapacity;
    }
    static setDependentQueue(typeGetter) {
        if (typeGetter)
            this.typeGetter = typeGetter;
        this.dependentQueue = new dependent_queue_1.default((queueItem) => this.typeGetter(queueItem.item));
    }
    static getDependentQueue() {
        return this.dependentQueue || null;
    }
    static addItemToQueue(offerData) {
        const { item, resolver, depend } = offerData;
        const isDependArray = isArray_1.default(depend);
        let isDependError = false;
        let dependQueueItemList;
        if (depend) {
            dependQueueItemList = (isDependArray ? depend : [depend])
                .map((dependItem) => {
                const dependQueueItem = AsyncQueue.getDependQueueItem(dependItem);
                if (!dependQueueItem)
                    isDependError = true;
                return dependQueueItem;
            });
        }
        isDependError = Boolean(depend && isDependError);
        if (isDependError) {
            return isDependArray
                ? dependQueueItemList
                    .map((dependItem) => Boolean(dependItem))
                : Boolean(dependQueueItemList[0]);
        }
        const dependentQueueItem = AsyncQueue.getDependQueueItem(item, resolver);
        if (!dependentQueueItem)
            return false;
        const dependentQueue = this.getDependentQueue();
        if (!dependentQueue)
            return false;
        return dependentQueue.offer(dependentQueueItem, dependQueueItemList);
    }
    static stopResetInterval() {
        if (this.resetIntervalInstance)
            this.stopOnNextStep = true;
    }
    static startResetInterval() {
        if (this.stopOnNextStep)
            this.stopOnNextStep = false;
        if (!this.resetIntervalInstance) {
            this.stopPromise = new Promise((res) => {
                this.resetIntervalInstance = setInterval(() => this.resetExecutors(), this.resetInterval);
                this.stopInnerHandler = res;
            });
        }
    }
    static resetExecutors() {
        const { executors } = this;
        Object.keys(executors).forEach((type) => {
            executors[type].resetCounter();
        });
        if (this.stopOnNextStep) {
            this.stopOnNextStep = false;
            clearInterval(this.resetIntervalInstance);
            this.resetIntervalInstance = undefined;
            this.stopInnerHandler();
        }
    }
    async execute() {
        const { offerList, executePromise, executorList } = this;
        if (executePromise)
            return executePromise;
        if (!offerList.length)
            return Promise.resolve(this.result);
        this.executePromise = new Promise((res) => {
            Promise.all(offerList.map((offerData) => {
                return this.executeOffer(offerData);
            })).then(() => {
                var _a;
                const dq = AsyncQueue.getDependentQueue();
                if ((_a = dq) === null || _a === void 0 ? void 0 : _a.checkQueueEmpty())
                    AsyncQueue.stopResetInterval();
                res(this.result);
            });
            executorList.forEach(executor => executor.start());
            AsyncQueue.startResetInterval();
        });
        return this.executePromise;
    }
    offer(params) {
        this.offerList.push(params);
    }
    async executeOffer(offerData) {
        const { result, executorList } = this;
        const dependentQueue = AsyncQueue.getDependentQueue();
        const { item } = offerData;
        if (!dependentQueue) {
            result.set(item, false);
            return Promise.resolve(result);
        }
        const type = AsyncQueue.typeGetter(item);
        const executor = AsyncQueue.getExecutor(type);
        if (!executor) {
            result.set(item, false);
            return Promise.resolve(result);
        }
        return new Promise((res) => {
            const addItemToQueueResult = AsyncQueue.addItemToQueue(offerData);
            const isAddFailed = !addItemToQueueResult
                || (isArray_1.default(addItemToQueueResult) ? addItemToQueueResult : [addItemToQueueResult])
                    .some((itemResult) => !itemResult);
            if (isAddFailed) {
                result.set(item, addItemToQueueResult);
                return res(result);
            }
            executorList.push(executor);
            const handler = (resolveItem) => {
                if (resolveItem === item) {
                    AsyncQueue.itemMap.delete(item);
                    result.set(item, true);
                    executor.off('resolve', handler);
                    res(result);
                }
            };
            executor.on('resolve', handler);
        });
    }
}
AsyncQueue.capacity = {};
AsyncQueue.defaultCapacity = constants_1.DEFAULT_CAPACITY;
AsyncQueue.resetInterval = constants_1.ONE_SECOND_MILLISECONDS;
AsyncQueue.executors = {};
AsyncQueue.itemMap = new Map();
AsyncQueue.stopOnNextStep = false;
AsyncQueue.stopPromise = Promise.resolve(undefined);
AsyncQueue.stopInnerHandler = noop_1.default;
AsyncQueue.typeGetter = () => '1';
exports.default = AsyncQueue;
