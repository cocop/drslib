/* ************************ */
// interface
/* ************************ */

/**
 * Running in parallel creates a new instance for each
 */
export interface IAction {
    /**
     * Returns an iterator containing a self-instance
     */
    getActions(): IterableIterator<(IAction | undefined)>;
    execute(): void;
}

export function isIAction(arg: any): arg is IAction {
    return arg
        && typeof arg === "object"
        && typeof arg.getActions === "function"
        && typeof arg.execute === "function";
}

/**
 * Set up a new instance each time it runs
 */
export interface IAsyncAction extends IAction {
    promise: Promise<void> | null;
}

export function isIAsyncAction(arg: any): arg is IAsyncAction {
    return isIAction(arg)
        && (arg as any).promise !== undefined
        && (arg as any).promise instanceof Promise;
}

/* ------------------------ */
export interface IRunner<TParam, TResult> {
    run(param: TParam): TResult;
}

/**
 * Type parameter is indistinguishable
 * @param arg instance IRunner is true
 */
export function isIRunner<TParam, TResult>(arg: any): arg is IRunner<TParam, TResult> {
    return arg
        && typeof arg === "object"
        && typeof arg.run === "function";
}

/* ------------------------ */

export type UndefinableIAction = IAction | undefined
export type GetAction = () => UndefinableIAction
export type GetActionGenerator = () => IterableIterator<UndefinableIAction>

/* ************************ */
// abstract
/* ************************ */
export abstract class BAction implements IAction {
    public * getActions(): IterableIterator<UndefinableIAction> {
        yield this;
    }

    abstract execute(): void;
}

export abstract class BAsyncAction extends BAction implements IAsyncAction {
    public promise: Promise<void> | null = null;

    execute(): void {
        this.promise = this.executeAsync();
    }

    abstract executeAsync(): Promise<void>;
}

/* ------------------------ */
export abstract class BRunner<TParam, TResult> implements IRunner<TParam, TResult> {
    private readonly getActions: GetActionGenerator;

    public constructor(getActions: GetActionGenerator | (UndefinableIAction | GetAction)[]) {

        if (typeof (getActions) === "function") {
            this.getActions = getActions;
        } else {
            this.getActions = () => this.convertGenerator(getActions);
        }
    }

    abstract run(param: TParam): TResult;

    protected execute(action: IAction): void {
        action.execute();
    }

    protected async executeAsync(action: IAction): Promise<void> {
        this.execute(action);

        if (isIAsyncAction(action) && action.promise)
            await action.promise;
    }

    protected * actionsGenerator(): IterableIterator<IAction> {
        for (const action of this.getActions()) {
            if (!action) {
                continue;
            }

            for (let localAction of this.executeGenerator(action)) {
                yield localAction;
            }
        }
    }

    private * convertGenerator(actions: (UndefinableIAction | GetAction)[]): IterableIterator<UndefinableIAction> {
        for (const action of actions) {
            if (typeof (action) === "function") {
                yield action();
            } else {
                yield action;
            }
        }
    }

    private * executeGenerator(action: IAction): IterableIterator<IAction> {
        for (let localAction of action.getActions()) {
            if (!localAction)
                continue;

            if (localAction == action) {
                yield localAction;
                continue;
            }

            for (let r of this.executeGenerator(localAction))
                yield r;
        }
    }
}


/* ************************ */
// class
/* ************************ */
export class Runner extends BRunner<void, void> {
    public run(): void {
        for (const action of this.actionsGenerator()) {
            this.execute(action);
        }
    }
}

export class AsyncRunner extends BRunner<void, Promise<void>> {
    public async run(): Promise<void> {
        for (const action of this.actionsGenerator()) {
            await this.executeAsync(action);
        }
    }
}