/*!
 * drslib
 * Apache Licence 2.0
 * https://github.com/cocop/drslib/blob/master/LICENSE
 */

/* ######################## */
// Actions
/* ######################## */

/**
 * Action interface
 */
export interface IAction<TParam, TResult> {
    do(param: TParam): TResult;
}

/**
 * Type parameter is indistinguishable
 * @param arg True if the instance implements IAction
 */
export function isIAction<TParam, TResult>(arg: any): arg is IAction<TParam, TResult> {
    return arg
        && typeof arg === "object"
        && typeof arg.do === "function";
}

export type Syncable<T> = T | Promise<T>;
export type VoidSyncable = Syncable<void>;

const async = async <T>(syncable: Syncable<T>) => {
    return (syncable instanceof Promise) ? await syncable : syncable;
}

/* ------------------------ */

/**
 * base class for common constructor
 */
export abstract class BAction<TParam, TResult, TValues> implements IAction<TParam, TResult> {
    protected $: TValues

    constructor(values: TValues) {
        this.$ = values;
    }

    abstract do(param: TParam): TResult;
}

/**
 * base class for action accept constructor
 */
export abstract class BOuter<TOuterParam, TOuterResult, TInnerParam, TInnerResult> implements IAction<TOuterParam, TOuterResult> {
    protected _inner: IAction<TInnerParam, TInnerResult>;

    constructor(inner: IAction<TInnerParam, TInnerResult>) {
        this._inner = inner;
    }

    abstract do(param: TOuterParam): TOuterResult;
}

/* ------------------------ */

/**
 * execute function
 */
export class Run<TParam, TResult> implements IAction<TParam, TResult> {
    private _func: (param: TParam) => TResult;

    constructor(func: (param: TParam) => TResult) {
        this._func = func;
    }

    do(param: TParam): TResult {
        return this._func(param);
    }
}

/**
 * execute getting function
 */
export class Get<TResult> implements IAction<void, TResult> {
    private _ref: RefReader<TResult> | (() => TResult);

    constructor(ref: RefReader<TResult> | (() => TResult)) {
        this._ref = ref;
    }

    do(param: void): TResult {
        if (typeof (this._ref) === "function") {
            return this._ref();
        } else {
            return this._ref.get();
        }
    }
}

/**
 * execute setting function
 */
export class Set<TParam> implements IAction<TParam, void> {
    private _ref: RefWriter<TParam> | ((p: TParam) => void);

    constructor(ref: RefWriter<TParam> | ((p: TParam) => void)) {
        this._ref = ref;
    }

    do(param: TParam): void {
        if (typeof (this._ref) === "function") {
            this._ref(param);
        } else {
            this._ref.set(param);
        }
    }
}

/**
 * If isDo is true, execute inner
 */
export class IfValid<TParam, TResult> extends BOuter<TParam, TResult | void, TParam, TResult> {
    private readonly _isDo: IAction<void, boolean>;

    constructor(isDo: IAction<void, boolean>, inner: IAction<TParam, TResult>) {
        super(inner);
        this._isDo = isDo;
    }

    do(param: TParam): TResult | void {
        if (this._isDo.do()) {
            return this._inner.do(param);
        }
    }
}

// RunActions
/* ------------------------ */

/**
 * Actions that perform multiple actions
 */
export class RunActions<TParam> implements IAction<TParam, Promise<void>> {
    protected _list: IAction<TParam, VoidSyncable>[];

    constructor(list: IAction<TParam, VoidSyncable>[]) {
        this._list = list;
    }

    async do(param: TParam): Promise<void> {
        for (const item of this._list) {
            await async(item.do(param));
        }
    }
}

/**
 * An action that executes multiple actions asynchronously
 */
export class RunActionsParallel<TParam> extends RunActions<TParam> {
    async do(param: TParam): Promise<void> {
        await Promise.all(
            this._list.map(
                (i) => async(i.do(param))
            )
        );
    }
}

/**
 * Actions that perform ordered actions
 */
export class RunActionsOrder<TParam, TResult> implements IAction<TParam, Promise<TResult>> {
    private _previous: IAction<TParam, VoidSyncable>;
    private _executing: IAction<TParam, Syncable<TResult>>;
    private _following: IAction<TParam, VoidSyncable>;

    constructor(
        previous: IAction<TParam, VoidSyncable>,
        executing: IAction<TParam, Syncable<TResult>>,
        following: IAction<TParam, VoidSyncable>) {

        this._previous = previous;
        this._executing = executing;
        this._following = following;
    }

    async do(param: TParam): Promise<TResult> {
        await async(this._previous.do(param));
        const result = await async(this._executing.do(param));
        await async(this._following.do(param));

        return result;
    }
}

// Chain
/* ------------------------ */

const enum ChainedDoStatus {
    JoinAsync,
    JoinSync,
    PassAsync,
    PassSync,
}

interface ChainedAction {
    doStatus: ChainedDoStatus,
    action: IAction<any, any>
}

abstract class BRunChain<TParam, TResult> implements IAction<TParam, TResult> {
    protected _chain: ChainedAction[];

    constructor(chain: ChainedAction[]) {
        this._chain = chain;
    }

    abstract do(param: TParam): TResult;
}

class RunChainSync<TParam, TResult> extends BRunChain<TParam, TResult> {
    do(param: TParam): TResult {
        let result: any = param;

        for (const chainLink of this._chain) {
            switch (chainLink.doStatus) {
                case ChainedDoStatus.JoinSync:
                    result = chainLink.action.do(result);
                    break;
                case ChainedDoStatus.PassSync:
                    chainLink.action.do(result);
                    break;
                case ChainedDoStatus.JoinAsync:
                case ChainedDoStatus.PassAsync:
                    throw new Error("Asynchronous task called in synchronous runner");
            }
        }

        return result;
    }
}

class RunChainAsync<TParam, TResult> extends BRunChain<TParam, Promise<TResult>>{
    async do(param: TParam): Promise<TResult> {
        let result: any = param;

        for (const chainLink of this._chain) {
            switch (chainLink.doStatus) {
                case ChainedDoStatus.JoinAsync:
                    result = await async(chainLink.action.do(result));
                    break;
                case ChainedDoStatus.PassAsync:
                    await async(chainLink.action.do(result));
                    break;
                case ChainedDoStatus.JoinSync:
                    result = chainLink.action.do(result);
                    break;
                case ChainedDoStatus.PassSync:
                    chainLink.action.do(result);
                    break;
            }
        }

        return result;
    }
}

abstract class BChainLink<TBottomResult> {
    protected _chain: ChainedAction[];

    protected constructor(chain: ChainedAction[]) {
        this._chain = chain;
    }

    protected join<TResult>(action: IAction<TBottomResult, TResult>): any {
        this._chain.push({
            doStatus: ChainedDoStatus.JoinSync,
            action: action
        });

        return this;
    }

    protected pass(action: IAction<TBottomResult, void>): any {
        this._chain.push({
            doStatus: ChainedDoStatus.PassSync,
            action: action
        });

        return this;
    }

    protected joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): any {
        this._chain.push({
            doStatus: ChainedDoStatus.JoinAsync,
            action: action
        });

        return this;
    }

    protected passWait(action: IAction<TBottomResult, void>): any {
        this._chain.push({
            doStatus: ChainedDoStatus.PassAsync,
            action: action
        });

        return this;
    }
}

class SyncChainLink<TTopParam, TBottomResult> extends BChainLink<TBottomResult> {
    /**
     * Create action
     */
    create(): IAction<TTopParam, TBottomResult> {
        return new RunChainSync(this._chain);
    }

    /**
     * Set an action that accepts a parameter and returns the next parameter
     * @param action An action that accepts a parameter and returns the next parameter
     */
    join<TResult>(action: IAction<TBottomResult, TResult>): SyncChainLink<TTopParam, TResult> {
        return super.join(action);
    }

    /**
     * Set an action that accepts parameters
     * @param action Action that accepts parameters
     */
    pass(action: IAction<TBottomResult, void>): SyncChainLink<TTopParam, TBottomResult> {
        return super.pass(action);
    }

    /**
     * Sets an asynchronous action that accepts parameters and returns the next parameter  
     *     Calling this method makes the action created asynchronous
     * @param action Asynchronous action that accepts a parameter and returns the next parameter
     */
    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): AsyncChainLink<TTopParam, TResult> {
        super.joinWait(action);
        return new AsyncChainLink<TTopParam, TResult>(this._chain);
    }

    /**
     * Set an asynchronous action that accepts parameters  
     *     Calling this method makes the action created asynchronous
     * @param action Asynchronous actions that accept parameters
     */
    passWait(action: IAction<TBottomResult, void>): AsyncChainLink<TTopParam, TBottomResult> {
        super.passWait(action);
        return new AsyncChainLink<TTopParam, TBottomResult>(this._chain);
    }
}

class AsyncChainLink<TTopParam, TBottomResult> extends BChainLink<TBottomResult> {
    /**
     * Create an asynchronous action
     */
    create(): IAction<TTopParam, Promise<TBottomResult>> {
        return new RunChainAsync(this._chain);
    }

    /**
     * Set an action that accepts parameters
     * @param action Action that accepts parameters
     */
    join<TResult>(action: IAction<TBottomResult, TResult>): AsyncChainLink<TTopParam, TResult> {
        return super.join(action);
    }

    /**
     * Set an action that accepts parameters
     * @param action Action that accepts parameters
     */
    pass(action: IAction<TBottomResult, void>): AsyncChainLink<TTopParam, TBottomResult> {
        return super.pass(action);
    }

    /**
     * Sets an asynchronous action that accepts parameters and returns the next parameter
     * @param action Asynchronous action that accepts a parameter and returns the next parameter
     */
    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): AsyncChainLink<TTopParam, TResult> {
        return super.joinWait(action);
    }

    /**
     * Set an asynchronous action that accepts parameters
     * @param action Asynchronous actions that accept parameters
     */
    passWait(action: IAction<TBottomResult, void>): AsyncChainLink<TTopParam, TBottomResult> {
        return super.passWait(action);
    }
}

/**
 * A class that creates an action that pipelines the actions  
 *     Use in method chain format
 */
export class Chain<TParam> extends SyncChainLink<TParam, TParam> {
    constructor() {
        super([]);
    }
}

// Repetition
/* ------------------------ */

/**
 * Action to retry until successful
 */
export class Retry extends BOuter<void, Promise<void>, void, Syncable<boolean>>{
    private readonly _retryCount: number;

    constructor(retryCount: number, inner: IAction<void, Syncable<boolean>>) {
        super(inner);
        this._retryCount = retryCount;
    }

    async do(): Promise<void> {
        let count = 0;

        while (
            !await async(this._inner.do()) &&
            count < this._retryCount) {
            ++count;
        }
    }
}

/**
 * Repeat action until it returns true
 */
export class Repetition<TParam> extends BOuter<TParam, Promise<void>, TParam, Syncable<boolean>> {
    async do(param: TParam): Promise<void> {
        while (!await async(this._inner.do(param))) { };
    }
}

/* ######################## */
// reference
/* ######################## */

/**
 * Read-only context reference interface
 */
export interface IRefReader<T> {
    get: () => T;
}

/**
 * Write-only context reference interface
 */
export interface IRefWriter<T> {
    set: (param: T) => void;
}

/**
 * Context reference interface
 */
export interface IRef<T> extends IRefReader<T>, IRefWriter<T> { }

/**
 * Read-only context reference class
 */
export class RefReader<T> implements IRefReader<T> {
    get: () => T

    constructor(get: () => T) {
        this.get = get;
    }
}

/**
 * Write-only context reference class
 */
export class RefWriter<T> implements IRefWriter<T> {
    set: (v: T) => void

    constructor(set: (v: T) => void) {
        this.set = set
    }
}

/**
 * Context reference class
 */
export class Ref<T> implements IRef<T> {
    get: () => T
    set: (v: T) => void

    constructor(
        get: () => T,
        set: (v: T) => void) {
        this.get = get
        this.set = set
    }
}

/**
 * Context reference class
 */
export class RefPath<T> implements IRef<T> {
    private readonly _context: any
    private readonly _path: string[]

    /**
     * Note that you can specify an invalid path
     * @param context Context instance
     * @param path Context path. Strings separated by "." or array
     */
    constructor(context: any, path: string | string[]) {
        this._context = context
        this._path = this._pathToArray(path);
    }

    private _pathToArray(path: string | string[]) {
        if (typeof path === "string") {
            return path.split(".");
        }

        return path
    }

    get(): T {
        let node = this._context;

        for (let i = 0; i < this._path.length; i++) {
            node = node[this._path[i]]
        }

        return node
    }

    set(value: T) {
        let node = this._context;

        for (let i = 0; i < this._path.length - 1; i++) {
            node = node[this._path[i]]
        }

        node[this._path[this._path.length - 1]] = value;
    }
}
