import * as drs from "../src/index";

/* ------------------------ */
export const log = {
    msgs: new Array<string>(),
};

/* ------------------------ */
export class S_ implements drs.IAction<void, void> {
    execute(): void {
        log.msgs.push("S_");
    }
}

/* ------------------------ */
export class SA implements drs.IAction<void, void> {
    protected s_ = new S_();

    execute(): void {
        this.s_.execute();
        log.msgs.push("SA");
        this.s_.execute();
    }
}

/* ------------------------ */
export class SB implements drs.IAction<void, void> {
    protected sa = new SA();

    execute(): void {
        this.sa.execute();
        log.msgs.push("SB");
        this.sa.execute();
    }
}

/* ************************ */

/* ------------------------ */
export class A_ implements drs.IAction<void, Promise<void>> {
    async execute(): Promise<void> {
        log.msgs.push("A_");
    }
}

/* ------------------------ */
export class AA implements drs.IAction<void, Promise<void>> {
    private a_ = new A_();

    async execute(): Promise<void> {
        await this.a_.execute();
        log.msgs.push("AA");
        await this.a_.execute();
    }
}

/* ------------------------ */
export class AB implements drs.IAction<void, Promise<void>> {
    private aa = new AA();

    async execute(): Promise<void> {
        await this.aa.execute();
        log.msgs.push("AB");
        await this.aa.execute();
    }
}

/* ************************ */
export class SyncAction implements drs.IAction<string, string> {
    execute(param: string): string {
        log.msgs.push(param);
        return param;
    }
}

export class AsyncAction implements drs.IAction<string, Promise<string>> {
    async execute(param: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 50));
        log.msgs.push(param);
        await new Promise(resolve => setTimeout(resolve, 50));
        return param;
    }
}

/* ************************ */
export class ParamAction implements drs.IAction<string, void> {
    async execute(param: string) {
        log.msgs.push(param);
    }
}
