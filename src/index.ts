/* ************************ */
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

/* ************************ */
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

export class Free<TParam, TResult> implements IAction<TParam, TResult> {
    private func: (param: TParam) => TResult;

    constructor(func: (param: TParam) => TResult) {
        this.func = func;
    }

    do(param: TParam): TResult {
        return this.func(param);
    }
}

/* ------------------------ */
// RunActions
/* ------------------------ */

export class RunActions<TParam> implements IAction<TParam, Promise<void>>{
    private list: IAction<void | TParam, VoidPromise>[];

    constructor(list: IAction<void | TParam, VoidPromise>[]) {
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
        previous: IAction<TParam | void, VoidPromise>[],
        executing: IAction<TParam, ParamPromise<TResult>>,
        following: IAction<TParam | void, VoidPromise>[]) {

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

/* ------------------------ */
// Repetition
/* ------------------------ */

export class CountRepetition extends BOuter<number, Promise<void>, void, VoidPromise> {
    async do(count: number): Promise<void> {
        for (let i = 0; i < count; i++) {
            await async(this.inner.do());
        }
    }
}

export class ParamsRepetition<TParam> extends BOuter<[TParam], Promise<void>, TParam, VoidPromise> {
    async do(params: [TParam]): Promise<void> {
        for (const param of params) {
            await async(this.inner.do(param));
        }
    }
}

type WithCount<TParam> = {
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

/* ------------------------ */
