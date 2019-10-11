/* ************************ */
// interface
/* ************************ */

export interface IAction<TParam, TResult> {
    execute(param: TParam): TResult;
}

/**
 * Type parameter is indistinguishable
 * @param arg instance IAction is true
 */
export function isIAction<TParam, TResult>(arg: any): arg is IAction<TParam, TResult> {
    return arg
        && typeof arg === "object"
        && typeof arg.execute === "function";
}

/* ************************ */
// abstract
/* ************************ */

export abstract class BOrderRunner<TParam, TResult, TExecutorResult> implements IAction<TParam, TResult> {
    protected previous: ListRunner<TParam>;
    protected executor: IAction<TParam, TExecutorResult>;
    protected following: ListRunner<TParam>;

    constructor(
        previous: IAction<TParam | void, void | Promise<void>>[],
        executor: IAction<TParam | TParam, TExecutorResult>,
        following: IAction<TParam | void, void | Promise<void>>[]) {

        this.previous = new ListRunner(previous);
        this.executor = executor;
        this.following = new ListRunner(following);
    }

    abstract execute(param: TParam): TResult;
}


/* ************************ */
// class
/* ************************ */

export class FreeAction<TParam, TResult> implements IAction<TParam, TResult> {
    private func: (param: TParam) => TResult;

    constructor(func: (param: TParam) => TResult) {
        this.func = func;
    }

    execute(param: TParam): TResult {
        return this.func(param);
    }
}

export class ListRunner<TParam> implements IAction<TParam, Promise<void>>{
    private list: IAction<void | TParam, void | Promise<void>>[];

    constructor(list: IAction<void | TParam, void | Promise<void>>[]) {
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

export class SyncRunner<TParam, TResult> extends BOrderRunner<TParam, Promise<TResult>, TResult> {
    async execute(param: TParam): Promise<TResult> {
        await this.previous.execute(param);
        const result = this.executor.execute(param);
        await this.following.execute(param);
        return result;
    }
}

export class AsyncRunner<TParam, TResult> extends BOrderRunner<TParam, Promise<TResult>, Promise<TResult>> {
    async execute(param: TParam): Promise<TResult> {
        await this.previous.execute(param);
        const result = await this.executor.execute(param);
        await this.following.execute(param);
        return result;
    }
}