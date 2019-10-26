/* ************************ */
// interface
/* ************************ */

export interface IAction<TParam, TResult> {
    execute(param: TParam): TResult;
}

/**
 * Type parameter is indistinguishable
 * @param arg True if the instance implements IAction
 */
export function isIAction<TParam, TResult>(arg: any): arg is IAction<TParam, TResult> {
    return arg
        && typeof arg === "object"
        && typeof arg.execute === "function";
}

/* ************************ */
// class
/* ************************ */

export class Free<TParam, TResult> implements IAction<TParam, TResult> {
    private func: (param: TParam) => TResult;

    constructor(func: (param: TParam) => TResult) {
        this.func = func;
    }

    execute(param: TParam): TResult {
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

    async execute(param: TParam): Promise<void> {
        for (const item of this.list) {
            const result = item.execute(param);

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

    async execute(param: TParam): Promise<TResult> {

        await this.previous.execute(param);

        const promiseOrResult = this.executing.execute(param);
        const result = (promiseOrResult instanceof Promise) ? await promiseOrResult : promiseOrResult;

        await this.following.execute(param);
        return result;
    }
}

/* ------------------------ */
