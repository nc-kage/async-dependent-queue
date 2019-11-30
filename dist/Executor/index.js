"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Executor {
    constructor(dependentQueue, type) {
        this.limit = 1;
        this.count = 0;
        this.executeTimestamp = 0;
        this.isExecuting = false;
        this.eventHandlers = {};
        this.dependentQueue = dependentQueue;
        this.type = type;
        this.existItemsHandler = this.existItemsHandler.bind(this);
    }
    setLimit(limit) {
        this.limit = limit;
    }
    getCount() {
        return this.count;
    }
    resetCounter() {
        this.count = 0;
        if (this.isExecuting) {
            this.resumeHandler();
            this.next();
        }
    }
    on(name, handler) {
        const { eventHandlers } = this;
        if (!eventHandlers[name])
            eventHandlers[name] = [];
        eventHandlers[name].push(handler);
    }
    off(name, handler) {
        const list = this.eventHandlers[name];
        if (!list)
            return;
        const index = list.indexOf(handler);
        if (index >= 0)
            list.splice(index, 1);
    }
    start() {
        if (this.isExecuting)
            return;
        this.isExecuting = true;
        this.next();
    }
    stop() {
        if (!this.isExecuting)
            return;
        this.dependentQueue.off('existType', this.existItemsHandler);
        this.isExecuting = false;
    }
    getExecuteTimestamp() {
        return this.executeTimestamp;
    }
    async next() {
        const { dependentQueue, type, limit, count, isExecuting } = this;
        const queueItem = dependentQueue.peek(type);
        if (!isExecuting)
            return this.stopHandler();
        if (count >= limit)
            return this.limitHandler();
        if (!queueItem)
            return this.endHandler();
        const { item, resolver } = queueItem;
        const result = await resolver(item);
        if (result) {
            dependentQueue.poll(type);
            this.resolveHandler(item);
        }
        else {
            dependentQueue.moveEnd(queueItem);
        }
        this.count += 1;
        this.executeTimestamp = Date.now();
        this.next();
    }
    resolveHandler(item) {
        const resolveHandlers = this.eventHandlers.resolve || [];
        resolveHandlers.forEach((handler) => {
            handler(item);
        });
    }
    endHandler() {
        this.dependentQueue.on('existType', this.existItemsHandler);
        return this.dependentQueue.checkQueueEmpty(this.type)
            ? this.finishHandler() : this.waitHandler();
    }
    finishHandler() {
        const finishHandlers = this.eventHandlers.finish || [];
        finishHandlers.forEach((handler) => {
            handler();
        });
    }
    waitHandler() {
        const waitHandlers = this.eventHandlers.wait || [];
        waitHandlers.forEach((handler) => {
            handler();
        });
    }
    limitHandler() {
        const limitHandlers = this.eventHandlers.limit || [];
        limitHandlers.forEach((handler) => {
            handler();
        });
    }
    stopHandler() {
        const stopHandlers = this.eventHandlers.stop || [];
        stopHandlers.forEach((handler) => {
            handler();
        });
    }
    resumeHandler() {
        const resumeHandlers = this.eventHandlers.resume || [];
        resumeHandlers.forEach((handler) => {
            handler();
        });
    }
    existItemsHandler(type) {
        if (type === this.type && this.isExecuting) {
            this.dependentQueue.off('existType', this.existItemsHandler);
            this.next();
        }
    }
}
exports.default = Executor;
