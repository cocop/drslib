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

export type ParamPromise<TParam> = TParam | Promise<TParam>;
export type VoidPromise = ParamPromise<void>;

const async = async <TParam>(paramPromise: ParamPromise<TParam>) => {
    return (paramPromise instanceof Promise) ? await paramPromise : paramPromise;
}

// class
/* ************************ */

export abstract class BOuter<TOuterParam, TOuterResult, TInnerParam, TInnerResult> implements IAction<TOuterParam, TOuterResult> {
    protected inner: IAction<TInnerParam, TInnerResult>;

    constructor(inner: IAction<TInnerParam, TInnerResult>) {
        this.inner = inner;
    }

    abstract do(param: TOuterParam): TOuterResult;
}

/* ------------------------ */

export class Run<TParam, TResult> implements IAction<TParam, TResult> {
    private func: (param: TParam) => TResult;

    constructor(func: (param: TParam) => TResult) {
        this.func = func;
    }

    do(param: TParam): TResult {
        return this.func(param);
    }
}

/* ------------------------ */

export class Get<TResult> implements IAction<void, TResult> {
    ref: RefReader<TResult> | (() => TResult);

    constructor(ref: RefReader<TResult> | (() => TResult)) {
        this.ref = ref;
    }

    do(param: void): TResult {
        if (typeof (this.ref) === "function") {
            return this.ref();
        } else {
            return this.ref.get();
        }
    }
}

/* ------------------------ */

export class Set<TParam> implements IAction<TParam, void> {
    ref: RefWriter<TParam> | ((p: TParam) => void);

    constructor(ref: RefWriter<TParam> | ((p: TParam) => void)) {
        this.ref = ref;
    }

    do(param: TParam): void {
        if (typeof (this.ref) === "function") {
            this.ref(param);
        } else {
            this.ref.set(param);
        }
    }
}

/* ------------------------ */


// RunActions
/* ------------------------ */

export class RunActions<TParam> implements IAction<TParam, Promise<void>>{
    private list: IAction<TParam, VoidPromise>[];

    constructor(list: IAction<TParam, VoidPromise>[]) {
        this.list = list;
    }

    async do(param: TParam): Promise<void> {
        for (const item of this.list) {
            await async(item.do(param));
        }
    }
}

export class RunActionsOrder<TParam, TResult> implements IAction<TParam, Promise<TResult>> {
    private previous: RunActions<TParam>;
    private executing: IAction<TParam, ParamPromise<TResult>>;
    private following: RunActions<TParam>;

    constructor(
        previous: IAction<TParam, VoidPromise>[],
        executing: IAction<TParam, ParamPromise<TResult>>,
        following: IAction<TParam, VoidPromise>[]) {

        this.previous = new RunActions(previous);
        this.executing = executing;
        this.following = new RunActions(following);
    }

    async do(param: TParam): Promise<TResult> {
        await this.previous.do(param);
        const result = await async(this.executing.do(param));
        await this.following.do(param);

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
    protected chain: ChainedAction[];

    constructor(chain: ChainedAction[]) {
        this.chain = chain;
    }

    do(param: TParam): TResult {
        let result: any = param;

        for (const chainLink of this.chain) {
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

        for (const chainLink of this.chain) {
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

abstract class BChainLink<TTopParam, TBottomResult> {
    protected chain: ChainedAction[];

    protected constructor(chain: ChainedAction[]) {
        this.chain = chain;
    }
}

class ChainLink<TTopParam, TBottomResult> extends BChainLink<TTopParam, TBottomResult> {
    create(): IAction<TTopParam, TBottomResult> {
        return new RunChain(this.chain);
    }

    join<TResult>(action: IAction<TBottomResult, TResult>): ChainLink<TTopParam, TResult> {
        this.chain.push({
            chainRunStatus: ChainRunStatus.Sync,
            action: action
        });

        return new ChainLink<TTopParam, TResult>(this.chain);
    }

    pass(action: IAction<TBottomResult, void>): ChainLink<TTopParam, TBottomResult> {
        this.chain.push({
            chainRunStatus: ChainRunStatus.Pass,
            action: action
        });

        return this;
    }

    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): WaitChainLink<TTopParam, TResult> {
        this.chain.push({
            chainRunStatus: ChainRunStatus.Async,
            action: action
        });
        return new WaitChainLink<TTopParam, TResult>(this.chain);
    }
}

class WaitChainLink<TTopParam, TBottomResult> extends BChainLink<TTopParam, TBottomResult> {
    create(): IAction<TTopParam, Promise<TBottomResult>> {
        return new RunChainAsync(this.chain);
    }

    join<TResult>(action: IAction<TBottomResult, TResult>): WaitChainLink<TTopParam, TResult> {
        this.chain.push({
            chainRunStatus: ChainRunStatus.Sync,
            action: action
        });

        return new WaitChainLink<TTopParam, TResult>(this.chain);
    }

    pass(action: IAction<TBottomResult, void>): WaitChainLink<TTopParam, TBottomResult> {
        this.chain.push({
            chainRunStatus: ChainRunStatus.Pass,
            action: action
        });

        return this;
    }

    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): WaitChainLink<TTopParam, TResult> {
        this.chain.push({
            chainRunStatus: ChainRunStatus.Async,
            action: action
        });

        return new WaitChainLink<TTopParam, TResult>(this.chain);
    }
}

export class Chain<TParam> extends ChainLink<TParam, TParam> {
    constructor() {
        super([]);
    }
}

// Repetition
/* ------------------------ */

export class CountRepetition extends BOuter<number, Promise<void>, void, VoidPromise> {
    async do(count: number): Promise<void> {
        for (let i = 0; i < count; i++) {
            await async(this.inner.do());
        }
    }
}

export class ParamsRepetition<TParam> extends BOuter<TParam[], Promise<void>, TParam, VoidPromise> {
    async do(params: TParam[]): Promise<void> {
        for (const param of params) {
            await async(this.inner.do(param));
        }
    }
}

export type WithCount<TParam> = {
    param: TParam,
    count: number
};

export class ParamRepetition<TParam> extends BOuter<WithCount<TParam>, Promise<void>, TParam, VoidPromise> {
    async do(param: WithCount<TParam>): Promise<void> {
        for (let i = 0; i < param.count; i++) {
            await async(this.inner.do(param.param));
        }
    }
}

export class Repetition<TParam> extends BOuter<TParam, Promise<void>, TParam, ParamPromise<boolean>> {
    async do(param: TParam): Promise<void> {
        while (!await async(this.inner.do(param))) { };
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
    private readonly context: any
    private readonly path: string[]

    constructor(context: any, path: string | string[]) {
        const get = () => this._get;
        const set = () => this._set;
        super(get(), set());

        this.context = context
        this.path = this._pathToArray(path);
    }

    private _pathToArray(path: string | string[]) {
        if (typeof path === "string") {
            return path.split(".");
        }

        return path
    }

    private _get(): TParam {
        let node = this.context;

        for (let i = 0; i < this.path.length; i++) {
            node = node[this.path[i]]
        }

        return node
    }

    private _set(value: TParam) {
        let node = this.context;

        for (let i = 0; i < this.path.length - 1; i++) {
            node = node[this.path[i]]
        }

        node[this.path[this.path.length - 1]] = value;
    }
}

/* ------------------------ */
