import * as drs from "../src/index";

/* ------------------------ */
let msgs: string[] = [];

export const log = {
    msgs: msgs,
};

/* ------------------------ */
export class R_ extends drs.BAction {
    execute(): void {
        log.msgs.push("R_");
    }
}

/* ------------------------ */
export class RA extends drs.BAction {
    * getActions(): IterableIterator<drs.IAction> {
        yield new R_();
        yield this;
        yield new R_();
    }

    execute(): void {
        log.msgs.push("RA");
    }
}

/* ------------------------ */
export class RB implements drs.BAction {
    * getActions(): IterableIterator<drs.IAction> {
        yield new RA();
        yield this;
        yield new RA();
    }

    execute(): void {
        log.msgs.push("RB");
    }
}

/* ************************ */

/* ------------------------ */
export class E_ extends drs.BAsyncAction {
    executeAsync(): Promise<void> {
        return new Promise((resolve) => {
            log.msgs.push("E_");
            resolve();
        });
    }
}

/* ------------------------ */
export class EA extends drs.BAsyncAction {
    * getActions(): IterableIterator<drs.IAction> {
        yield new E_();
        yield this;
        yield new E_();
    }

    executeAsync(): Promise<void> {
        return new Promise((resolve) => {
            log.msgs.push("EA");
            resolve();
        });
    }
}

/* ------------------------ */
export class EB extends drs.BAsyncAction {
    * getActions(): IterableIterator<drs.IAction> {
        yield new EA();
        yield this;
        yield new EA();
    }

    executeAsync(): Promise<void> {
        return new Promise((resolve) => {
            log.msgs.push("EB");
            resolve();
        });
    }
}

/* ------------------------ */
export class _EAsync extends drs.BAsyncAction {
    * getActions(): IterableIterator<drs.IAction> {
        yield new EB();
        yield this;
        yield new EB();
    }

    async executeAsync(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 500));
        log.msgs.push("_EA");
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

/* ************************ */
export class ParamAsyncAction extends drs.BAsyncAction {
    public param: string = "none";

    async executeAsync(): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 500));
        log.msgs.push(this.param);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

export class ParamSetRunner extends drs.BRunner<string, void> {
    public async run(param: string): Promise<void> {
        for (const action of this.actionsGenerator()) {

            if (action instanceof ParamAsyncAction) {
                action.param = param;
            }

            await this.executeAsync(action);
        }
    }
}
