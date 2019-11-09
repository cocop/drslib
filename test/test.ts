import assert from "assert";
import * as drs from "../src/index";

/* ------------------------ */
function check<TResult>(
    call: TResult,
    test: TResult,
) {
    const cJson = JSON.stringify(call);
    const tJson = JSON.stringify(test);

    if (cJson !== tJson) {
        console.log(cJson);
        console.log(tJson);
    }

    assert.ok(cJson === tJson);
}

/* ------------------------ */
describe("Call", () => {
    it("Sync", () => {
        const action = new drs.Call((p: string) => p);

        check(action.do("xxx"), "xxx");
    });

    it("Async", async () => {
        const action = new drs.Call(async (p: string) => p);

        check(await action.do("xxx"), "xxx");
    });
});

/* ------------------------ */
describe("RunActions", () => {
    it("Sync Only", async () => {
        const log: number[] = []
        const action = new drs.RunActions<void>([
            new drs.Call(() => { log.push(1) }),
            new drs.Call(() => { log.push(2) }),
            new drs.Call(() => { log.push(3) }),
        ]);

        await action.do();

        check(log, [1, 2, 3]);
    });

    it("Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActions<void>([
            new drs.Call(async () => { log.push(1) }),
            new drs.Call(async () => { log.push(2) }),
            new drs.Call(async () => { log.push(3) }),
        ]);

        await action.do();

        check(log, [1, 2, 3]);
    });

    it("Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActions<void>([
            new drs.Call(async () => { log.push(1) }),
            new drs.Call(() => { log.push(2) }),
            new drs.Call(async () => { log.push(3) }),
        ]);

        await action.do();

        check(log, [1, 2, 3]);
    });

    it("in param", async () => {
        const log: number[] = []
        const action = new drs.RunActions<number>([
            new drs.Call(() => { log.push(1) }),
            new drs.Call((p) => { log.push(p) }),
            new drs.Call(() => { log.push(3) }),
        ]);

        await action.do(2);

        check(log, [1, 2, 3]);
    });
});

/* ------------------------ */
describe("RunActionsOrder", () => {
    it("SyncAction Sync Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Call(() => { log.push(1) })
            ],
            new drs.Call((p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Call(() => { log.push(3) })
            ],
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("SyncAction Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Call(async () => { log.push(1) })
            ],
            new drs.Call((p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Call(async () => { log.push(3) })
            ],
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("SyncAction Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Call(() => { log.push(1) }),
                new drs.Call(async () => { log.push(2) })
            ],
            new drs.Call((p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Call(async () => { log.push(4) }),
                new drs.Call(() => { log.push(5) })
            ],
        );

        check(await action.do(3), "xxx");
        check(log, [1, 2, 3, 4, 5]);
    });

    it("AsyncAction Sync Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Call(() => { log.push(1) })
            ],
            new drs.Call(async (p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Call(() => { log.push(3) })
            ],
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("AsyncAction Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Call(async () => { log.push(1) })
            ],
            new drs.Call(async (p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Call(async () => { log.push(3) })
            ],
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("AsyncAction Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Call(() => { log.push(1) }),
                new drs.Call(async () => { log.push(2) })
            ],
            new drs.Call(async (p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Call(async () => { log.push(4) }),
                new drs.Call(() => { log.push(5) })
            ],
        );

        check(await action.do(3), "xxx");
        check(log, [1, 2, 3, 4, 5]);
    });
});

/* ------------------------ */
describe("chain", () => {
    it("Sync", () => {
        const action = new drs.Chain<void>()
            .join(new drs.Call((p) => "1"))
            .join(new drs.Call((p) => p + " 2 "))
            .join(new drs.Call((p) => p + "3"))
            .create();

        check(action.do(), "1 2 3");
    });

    it("Async", async () => {
        const log: number[] = [];
        const action = new drs.Chain<void>()
            .joinWait(new drs.RunActions([
                new drs.Call(() => { log.push(1) }),
                new drs.Call(() => { log.push(2) }),
            ]))
            .join(new drs.Call(() => { log.push(3) }))
            .join(new drs.Call((p) => "1"))
            .join(new drs.Call((p) => p + " 2 "))
            .join(new drs.Call((p) => p + "3"))
            .create();

        check(await action.do(), "1 2 3");
        check(log, [1, 2, 3]);
    });
});

/* ------------------------ */
describe("CountRepetition", () => {
    it("Sync", async () => {
        const log: string[] = [];
        const action = new drs.CountRepetition(new drs.Call(() => { log.push("x") }));

        await action.do(3);

        check(log, ["x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.CountRepetition(new drs.Call(async () => { log.push("x") }));

        await action.do(3);

        check(log, ["x", "x", "x"]);
    });
});

/* ------------------------ */
describe("ParamsRepetition", () => {
    it("Sync", async () => {
        const log: string[] = [];
        const action = new drs.ParamsRepetition(
            new drs.Call((p: string) => { log.push(p) }));

        await action.do(["x", "x", "x"]);

        check(log, ["x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.ParamsRepetition(
            new drs.Call(async (p: string) => { log.push(p) }));

        await action.do(["x", "x", "x"]);

        check(log, ["x", "x", "x"]);
    });
});

/* ------------------------ */
describe("ParamRepetition", () => {
    it("Sync", async () => {
        const log: string[] = [];
        const action = new drs.ParamRepetition(
            new drs.Call((p: string) => { log.push(p) }));

        await action.do({
            param: "x",
            count: 3
        });

        check(log, ["x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.ParamRepetition(
            new drs.Call(async (p: string) => { log.push(p) }));

        await action.do({
            param: "x",
            count: 3
        });

        check(log, ["x", "x", "x"]);
    });
});

/* ------------------------ */
describe("Repetition", () => {
    it("Sync", async () => {
        const log: string[] = [];
        const action = new drs.Repetition(
            new drs.Call((p: string) => {
                log.push(p);
                return log.length === 3;
            }));

        await action.do("x");

        check(log, ["x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.Repetition(
            new drs.Call(async (p: string) => {
                log.push(p);
                return log.length === 3;
            }));

        await action.do("x");

        check(log, ["x", "x", "x"]);
    });
});

/* ------------------------ */
