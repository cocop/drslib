/*!
 * drslib
 * Apache Licence 2.0
 * https://github.com/cocop/drslib/blob/master/LICENSE
 */

/* ######################## */
// Actions
/* ######################## */

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

export abstract class BAction<TParam, TResult, TValues> implements IAction<TParam, TResult> {
    protected $: TValues

    constructor(values: TValues) {
        this.$ = values;
    }

    abstract do(param: TParam): TResult;
}

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


// RunActions
/* ------------------------ */

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

class ChainLink<TTopParam, TBottomResult> extends BChainLink<TBottomResult> {
    create(): IAction<TTopParam, TBottomResult> {
        return new RunChainSync(this._chain);
    }

    join: <TResult>(action: IAction<TBottomResult, TResult>) => ChainLink<TTopParam, TResult>
        = super.join;

    pass: (action: IAction<TBottomResult, void>) => ChainLink<TTopParam, TBottomResult>
        = super.pass;

    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): WaitChainLink<TTopParam, TResult> {
        super.joinWait(action);
        return new WaitChainLink<TTopParam, TResult>(this._chain);
    }

    passWait(action: IAction<TBottomResult, void>): WaitChainLink<TTopParam, TBottomResult> {
        super.passWait(action);
        return new WaitChainLink<TTopParam, TBottomResult>(this._chain);
    }
}

class WaitChainLink<TTopParam, TBottomResult> extends BChainLink<TBottomResult> {
    create(): IAction<TTopParam, Promise<TBottomResult>> {
        return new RunChainAsync(this._chain);
    }

    join: <TResult>(action: IAction<TBottomResult, TResult>) => WaitChainLink<TTopParam, TResult>
        = super.join;

    pass: (action: IAction<TBottomResult, void>) => ChainLink<TTopParam, TBottomResult>
        = super.pass;

    joinWait: <TResult>(action: IAction<TBottomResult, Promise<TResult>>) => WaitChainLink<TTopParam, TResult>
        = super.joinWait;

    passWait: (action: IAction<TBottomResult, void>) => WaitChainLink<TTopParam, TBottomResult>
        = super.passWait
}

export class Chain<TParam> extends ChainLink<TParam, TParam> {
    constructor() {
        super([]);
    }
}

// Repetition
/* ------------------------ */

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

export class Repetition<TParam> extends BOuter<TParam, Promise<void>, TParam, Syncable<boolean>> {
    async do(param: TParam): Promise<void> {
        while (!await async(this._inner.do(param))) { };
    }
}

/* ######################## */
// reference
/* ######################## */

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
