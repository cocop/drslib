import * as drs from "../src/index";

/* ------------------------ */
export const log = {
    msgs: new Array<string>(),
};

/* ------------------------ */
export class S_ implements drs.IAction<void, void> {
    do(): void {
        log.msgs.push("S_");
    }
}

/* ------------------------ */
export class SA implements drs.IAction<void, void> {
    protected s_ = new S_();

    do(): void {
        this.s_.do();
        log.msgs.push("SA");
        this.s_.do();
    }
}

/* ------------------------ */
export class SB implements drs.IAction<void, void> {
    protected sa = new SA();

    do(): void {
        this.sa.do();
        log.msgs.push("SB");
        this.sa.do();
    }
}

/* ************************ */

/* ------------------------ */
export class A_ implements drs.IAction<void, Promise<void>> {
    async do(): Promise<void> {
        log.msgs.push("A_");
    }
}

/* ------------------------ */
export class AA implements drs.IAction<void, Promise<void>> {
    private a_ = new A_();

    async do(): Promise<void> {
        await this.a_.do();
        log.msgs.push("AA");
        await this.a_.do();
    }
}

/* ------------------------ */
export class AB implements drs.IAction<void, Promise<void>> {
    private aa = new AA();

    async do(): Promise<void> {
        await this.aa.do();
        log.msgs.push("AB");
        await this.aa.do();
    }
}

/* ************************ */
export class SyncAction implements drs.IAction<string, string> {
    do(param: string): string {
        log.msgs.push(param);
        return param;
    }
}

export class AsyncAction implements drs.IAction<string, Promise<string>> {
    async do(param: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 50));
        log.msgs.push(param);
        await new Promise(resolve => setTimeout(resolve, 50));
        return param;
    }
}

/* ************************ */
export class ParamAction implements drs.IAction<string, void> {
    async do(param: string) {
        log.msgs.push(param);
    }
}
