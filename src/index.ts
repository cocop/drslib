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

/* ************************ */
// class
/* ************************ */

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

export type PromiseOrVoid = void | Promise<void>;


export class RunActions<TParam> implements IAction<TParam, Promise<void>>{
    private list: IAction<void | TParam, PromiseOrVoid>[];

    constructor(list: IAction<void | TParam, PromiseOrVoid>[]) {
        this.list = list;
    }

    async do(param: TParam): Promise<void> {
        for (const item of this.list) {
            const result = item.do(param);

            if (result instanceof Promise) {
                await result;
            }
        }
    }
}

export class RunActionsOrder<TParam, TResult> implements IAction<TParam, Promise<TResult>> {
    protected previous: RunActions<TParam>;
    protected executing: IAction<TParam, TResult | Promise<TResult>>;
    protected following: RunActions<TParam>;

    constructor(
        previous: IAction<TParam | void, PromiseOrVoid>[],
        executing: IAction<TParam, TResult | Promise<TResult>>,
        following: IAction<TParam | void, PromiseOrVoid>[]) {

        this.previous = new RunActions(previous);
        this.executing = executing;
        this.following = new RunActions(following);
    }

    async do(param: TParam): Promise<TResult> {

        await this.previous.do(param);

        const promiseOrResult = this.executing.do(param);
        const result = (promiseOrResult instanceof Promise) ? await promiseOrResult : promiseOrResult;

        await this.following.do(param);
        return result;
    }
}

/* ------------------------ */
