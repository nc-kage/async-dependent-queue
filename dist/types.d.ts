export declare type ExecutorEventMapType<T> = {
    resolve: (item: T) => void;
    wait: () => void;
    resume: () => void;
    limit: () => void;
    finish: () => void;
    stop: () => void;
};
export declare type DependentQueueItemType<T> = {
    item: T;
    resolver: (item: T) => Promise<boolean>;
};
export declare type AsyncQueueOfferParamsType<T> = {
    item: T;
    depend?: T | T[];
    resolver: (item: T) => Promise<boolean>;
};
