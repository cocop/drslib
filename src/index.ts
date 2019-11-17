/*!
 * drslib
 * Apache Licence 2.0
 * https://github.com/cocop/drslib/blob/master/LICENSE
 */

/* ######################## */
// Actions
/* ######################## */


// interface
/* ************************ */

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

// class
/* ************************ */

export abstract class BOuter<TOuterParam, TOuterResult, TInnerParam, TInnerResult> implements IAction<TOuterParam, TOuterResult> {
    protected _inner: IAction<TInnerParam, TInnerResult>;

    constructor(inner: IAction<TInnerParam, TInnerResult>) {
        this._inner = inner;
    }

    abstract do(param: TOuterParam): TOuterResult;
}

/* ------------------------ */

export class Run<TParam, TResult> implements IAction<TParam, TResult> {
    private _func: (param: TParam) => TResult;

    constructor(func: (param: TParam) => TResult) {
        this._func = func;
    }

    do(param: TParam): TResult {
        return this._func(param);
    }
}

/* ------------------------ */

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

/* ------------------------ */

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

/* ------------------------ */


// RunActions
/* ------------------------ */

export class RunActions<TParam> implements IAction<TParam, Promise<void>> {
    protected _list: IAction<TParam, VoidSyncable>[];

    constructor(list: IAction<TParam | void, VoidSyncable>[]) {
        this._list = list;
    }

    async do(param: TParam): Promise<void> {
        for (const item of this._list) {
            await async(item.do(param));
        }
    }
}

export class RunActionsParallel<TParam> extends RunActions<TParam> {
    async do(param: TParam): Promise<void> {
        await Promise.all(
            this._list.map(
                (i) => async(i.do(param))
            )
        );
    }
}

export class RunActionsOrder<TParam, TResult> implements IAction<TParam, Promise<TResult>> {
    private _previous: IAction<TParam, VoidSyncable>;
    private _executing: IAction<TParam, Syncable<TResult>>;
    private _following: IAction<TParam, VoidSyncable>;

    constructor(
        previous: IAction<TParam | void, VoidSyncable>,
        executing: IAction<TParam | void, Syncable<TResult>>,
        following: IAction<TParam | void, VoidSyncable>) {

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

enum ChainRunStatus {
    Async,
    Sync,
    Pass,
}

type ChainedAction = {
    chainRunStatus: ChainRunStatus,
    action: IAction<any, any>
}

class RunChain<TParam, TResult> implements IAction<TParam, TResult> {
    protected _chain: ChainedAction[];

    constructor(chain: ChainedAction[]) {
        this._chain = chain;
    }

    do(param: TParam): TResult {
        let result: any = param;

        for (const chainLink of this._chain) {
            switch (chainLink.chainRunStatus) {
                case ChainRunStatus.Async:
                    throw new Error("Asynchronous task called in synchronous runner");
                case ChainRunStatus.Sync:
                    result = chainLink.action.do(result);
                    break;
                case ChainRunStatus.Pass:
                    chainLink.action.do(result);
                    break;
            }
        }

        return result;
    }
}

class RunChainAsync<TParam, TResult> extends RunChain<TParam, Promise<TResult>>{
    async do(param: TParam): Promise<TResult> {
        let result: any = param;

        for (const chainLink of this._chain) {
            switch (chainLink.chainRunStatus) {
                case ChainRunStatus.Async:
                    result = await async(chainLink.action.do(result));
                    break;
                case ChainRunStatus.Sync:
                    result = chainLink.action.do(result);
                    break;
                case ChainRunStatus.Pass:
                    chainLink.action.do(result);
                    break;
            }
        }

        return result;
    }
}

abstract class BChainLink {
    protected _chain: ChainedAction[];

    protected constructor(chain: ChainedAction[]) {
        this._chain = chain;
    }
}

class ChainLink<TTopParam, TBottomResult> extends BChainLink {
    create(): IAction<TTopParam, TBottomResult> {
        return new RunChain(this._chain);
    }

    join<TResult>(action: IAction<TBottomResult, TResult>): ChainLink<TTopParam, TResult> {
        this._chain.push({
            chainRunStatus: ChainRunStatus.Sync,
            action: action
        });

        return new ChainLink<TTopParam, TResult>(this._chain);
    }

    pass(action: IAction<TBottomResult, void>): ChainLink<TTopParam, TBottomResult> {
        this._chain.push({
            chainRunStatus: ChainRunStatus.Pass,
            action: action
        });

        return this;
    }

    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): WaitChainLink<TTopParam, TResult> {
        this._chain.push({
            chainRunStatus: ChainRunStatus.Async,
            action: action
        });
        return new WaitChainLink<TTopParam, TResult>(this._chain);
    }
}

class WaitChainLink<TTopParam, TBottomResult> extends BChainLink {
    create(): IAction<TTopParam, Promise<TBottomResult>> {
        return new RunChainAsync(this._chain);
    }

    join<TResult>(action: IAction<TBottomResult, TResult>): WaitChainLink<TTopParam, TResult> {
        this._chain.push({
            chainRunStatus: ChainRunStatus.Sync,
            action: action
        });

        return new WaitChainLink<TTopParam, TResult>(this._chain);
    }

    pass(action: IAction<TBottomResult, void>): WaitChainLink<TTopParam, TBottomResult> {
        this._chain.push({
            chainRunStatus: ChainRunStatus.Pass,
            action: action
        });

        return this;
    }

    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): WaitChainLink<TTopParam, TResult> {
        this._chain.push({
            chainRunStatus: ChainRunStatus.Async,
            action: action
        });

        return new WaitChainLink<TTopParam, TResult>(this._chain);
    }
}

export class Chain<TParam> extends ChainLink<TParam, TParam> {
    constructor() {
        super([]);
    }
}

// Repetition
/* ------------------------ */

export class CountRepetition extends BOuter<number, Promise<void>, void, VoidSyncable> {
    async do(count: number): Promise<void> {
        for (let i = 0; i < count; i++) {
            await async(this._inner.do());
        }
    }
}

export class ParamsRepetition<TParam> extends BOuter<TParam[], Promise<void>, TParam, VoidSyncable> {
    async do(params: TParam[]): Promise<void> {
        for (const param of params) {
            await async(this._inner.do(param));
        }
    }
}

export type WithCount<TParam> = {
    param: TParam,
    count: number
}

export class ParamRepetition<TParam> extends BOuter<WithCount<TParam>, Promise<void>, TParam, VoidSyncable> {
    async do(param: WithCount<TParam>): Promise<void> {
        for (let i = 0; i < param.count; i++) {
            await async(this._inner.do(param.param));
        }
    }
}

export class Repetition<TParam> extends BOuter<TParam, Promise<void>, TParam, Syncable<boolean>> {
    async do(param: TParam): Promise<void> {
        while (!await async(this._inner.do(param))) { };
    }
}

/* ------------------------ */

/* ######################## */
// reference
/* ######################## */


// class
/* ************************ */

export class RefReader<T> {
    get: () => T

    constructor(get: () => T) {
        this.get = get;
    }
}

export class RefWriter<T> {
    set: (v: T) => void

    constructor(set: (v: T) => void) {
        this.set = set
    }
}

export class Ref<T> {
    get: () => T
    set: (v: T) => void

    constructor(
        get: () => T,
        set: (v: T) => void) {
        this.get = get
        this.set = set
    }

    getReader() {
        return new RefReader(this.get);
    }

    getWriter() {
        return new RefWriter(this.set);
    }
}

/**
 * Note that you can specify an invalid path
 */
export class RefPath<TParam> extends Ref<TParam> {
    private readonly _context: any
    private readonly _path: string[]

    constructor(context: any, path: string | string[]) {
        const get = () => this._get;
        const set = () => this._set;
        super(get(), set());

        this._context = context
        this._path = this._pathToArray(path);
    }

    private _pathToArray(path: string | string[]) {
        if (typeof path === "string") {
            return path.split(".");
        }

        return path
    }

    private _get(): TParam {
        let node = this._context;

        for (let i = 0; i < this._path.length; i++) {
            node = node[this._path[i]]
        }

        return node
    }

    private _set(value: TParam) {
        let node = this._context;

        for (let i = 0; i < this._path.length - 1; i++) {
            node = node[this._path[i]]
        }

        node[this._path[this._path.length - 1]] = value;
    }
}

/* ------------------------ */
