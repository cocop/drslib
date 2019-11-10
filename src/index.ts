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

class RunChain<TParam, TResult> implements IAction<TParam, TResult> {
    protected chainActions: IAction<any, any>[];

    constructor(chainActions: IAction<any, any>[]) {
        this.chainActions = chainActions;
    }

    do(param: TParam): TResult {
        let result: any = param;

        for (const chainAction of this.chainActions) {
            result = chainAction.do(result);
        }

        return result;
    }
}

class RunChainAsync<TParam, TResult> extends RunChain<TParam, Promise<TResult>>{
    async do(param: TParam): Promise<TResult> {
        let result: any = param;

        for (const chainAction of this.chainActions) {
            result = await async(chainAction.do(result));
        }

        return result;
    }
}

class ChainLink<TTopParam, TBottomResult> {
    private actions: IAction<any, any>[];

    protected constructor(actions: IAction<any, any>[]) {
        this.actions = actions;
    }

    create(): IAction<TTopParam, TBottomResult> {
        return new RunChain(this.actions);
    }

    join<TResult>(action: IAction<TBottomResult, TResult>): ChainLink<TTopParam, TResult> {
        this.actions.push(action);
        return new ChainLink<TTopParam, TResult>(this.actions);
    }

    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): WaitChainLink<TTopParam, TResult> {
        this.actions.push(action);
        return new WaitChainLink<TTopParam, TResult>(this.actions);
    }
};

class WaitChainLink<TTopParam, TBottomResult> {
    private actions: IAction<any, any>[];

    public constructor(actions: IAction<any, any>[]) {
        this.actions = actions;
    }

    create(): IAction<TTopParam, Promise<TBottomResult>> {
        return new RunChainAsync(this.actions);
    }

    join<TResult>(action: IAction<TBottomResult, TResult>): WaitChainLink<TTopParam, TResult> {
        this.actions.push(action);
        return new WaitChainLink<TTopParam, TResult>(this.actions);
    }

    joinWait<TResult>(action: IAction<TBottomResult, Promise<TResult>>): WaitChainLink<TTopParam, TResult> {
        this.actions.push(action);
        return new WaitChainLink<TTopParam, TResult>(this.actions);
    }
};

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
