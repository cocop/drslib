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
describe("Run", () => {
    it("Sync", () => {
        const action = new drs.Run((p: string) => p);

        check(action.do("xxx"), "xxx");
    });

    it("Async", async () => {
        const action = new drs.Run(async (p: string) => p);

        check(await action.do("xxx"), "xxx");
    });
});

/* ------------------------ */
describe("Get", () => {
    it("Ref", () => {
        let count = 12;
        const getCount = new drs.Get(new drs.RefReader(() => count));
        check(getCount.do(), 12);
    });

    it("function", () => {
        let count = 12;
        const getCount = new drs.Get(() => count);
        check(getCount.do(), 12);
    });
});

/* ------------------------ */
describe("Set", () => {
    it("Ref", () => {
        let count = 0;
        const setCount = new drs.Set(new drs.RefWriter((v: number) => count = v));
        setCount.do(12);
        check(count, 12);
    });

    it("function", () => {
        let count = 0;
        const setCount = new drs.Set((v: number) => count = v);
        setCount.do(12);
        check(count, 12);
    });
});

/* ------------------------ */
describe("RunActions", () => {
    it("Sync Only", async () => {
        const log: number[] = []
        const action = new drs.RunActions<void>([
            new drs.Run(() => { log.push(1) }),
            new drs.Run(() => { log.push(2) }),
            new drs.Run(() => { log.push(3) }),
        ]);

        await action.do();

        check(log, [1, 2, 3]);
    });

    it("Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActions<void>([
            new drs.Run(async () => { log.push(1) }),
            new drs.Run(async () => { log.push(2) }),
            new drs.Run(async () => { log.push(3) }),
        ]);

        await action.do();

        check(log, [1, 2, 3]);
    });

    it("Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActions<void>([
            new drs.Run(async () => { log.push(1) }),
            new drs.Run(() => { log.push(2) }),
            new drs.Run(async () => { log.push(3) }),
        ]);

        await action.do();

        check(log, [1, 2, 3]);
    });

    it("in param", async () => {
        const log: number[] = []
        const action = new drs.RunActions<number>([
            new drs.Run(() => { log.push(1) }),
            new drs.Run((p) => { log.push(p) }),
            new drs.Run(() => { log.push(3) }),
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
                new drs.Run(() => { log.push(1) })
            ],
            new drs.Run((p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Run(() => { log.push(3) })
            ],
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("SyncAction Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Run(async () => { log.push(1) })
            ],
            new drs.Run((p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Run(async () => { log.push(3) })
            ],
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("SyncAction Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Run(() => { log.push(1) }),
                new drs.Run(async () => { log.push(2) })
            ],
            new drs.Run((p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Run(async () => { log.push(4) }),
                new drs.Run(() => { log.push(5) })
            ],
        );

        check(await action.do(3), "xxx");
        check(log, [1, 2, 3, 4, 5]);
    });

    it("AsyncAction Sync Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Run(() => { log.push(1) })
            ],
            new drs.Run(async (p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Run(() => { log.push(3) })
            ],
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("AsyncAction Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Run(async () => { log.push(1) })
            ],
            new drs.Run(async (p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Run(async () => { log.push(3) })
            ],
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("AsyncAction Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            [
                new drs.Run(() => { log.push(1) }),
                new drs.Run(async () => { log.push(2) })
            ],
            new drs.Run(async (p: number) => { log.push(p); return "xxx"; }),
            [
                new drs.Run(async () => { log.push(4) }),
                new drs.Run(() => { log.push(5) })
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
            .join(new drs.Run((p) => "1"))
            .join(new drs.Run((p) => p + " 2 "))
            .join(new drs.Run((p) => p + "3"))
            .create();

        check(action.do(), "1 2 3");
    });

    it("Async", async () => {
        const log: number[] = [];
        const action = new drs.Chain<void>()
            .joinWait(new drs.RunActions([
                new drs.Run(() => { log.push(1) }),
                new drs.Run(() => { log.push(2) }),
            ]))
            .join(new drs.Run(() => { log.push(3) }))
            .join(new drs.Run((p) => "1"))
            .join(new drs.Run((p) => p + " 2 "))
            .join(new drs.Run((p) => p + "3"))
            .create();

        check(await action.do(), "1 2 3");
        check(log, [1, 2, 3]);
    });

    it("Async Param", async () => {
        const log: number[] = [];
        const action = new drs.Chain<void>()
            .joinWait(new drs.RunActions([
                new drs.Run(() => { log.push(1) }),
                new drs.Run(() => { log.push(2) }),
            ]))
            .join(new drs.Run(async () => { // no wait
                await new Promise(resolve => setTimeout(resolve, 1 * 1000));
                log.push(4);
            }))
            .joinWait(new drs.Run(async (p) => {
                log.push(3);
                await p;
            }))
            .join(new drs.Run((p) => "1"))
            .join(new drs.Run((p) => p + " 2 "))
            .join(new drs.Run((p) => p + "3"))
            .create();

        check(await action.do(), "1 2 3");
        check(log, [1, 2, 3, 4]);
    });

    it("Sync pass", async () => {
        const log: number[] = [];
        const action = new drs.Chain<number>()
            .pass(new drs.Run((p) => log.push(p)))
            .join(new drs.Run((p) => p + 1))
            .create();

        check(action.do(10), 11);
        check(log, [10]);
    });

    it("Async pass", async () => {
        const log: number[] = [];
        const action = new drs.Chain<number>()
            .joinWait(new drs.Run(async (p) => p))
            .pass(new drs.Run((p) => log.push(p)))
            .join(new drs.Run((p) => p + 1))
            .create();

        check(await action.do(10), 11);
        check(log, [10]);
    });
});

/* ------------------------ */
describe("CountRepetition", () => {
    it("Sync", async () => {
        const log: string[] = [];
        const action = new drs.CountRepetition(new drs.Run(() => { log.push("x") }));

        await action.do(3);

        check(log, ["x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.CountRepetition(new drs.Run(async () => { log.push("x") }));

        await action.do(3);

        check(log, ["x", "x", "x"]);
    });
});

/* ------------------------ */
describe("ParamsRepetition", () => {
    it("Sync", async () => {
        const log: string[] = [];
        const action = new drs.ParamsRepetition(
            new drs.Run((p: string) => { log.push(p) }));

        await action.do(["x", "x", "x"]);

        check(log, ["x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.ParamsRepetition(
            new drs.Run(async (p: string) => { log.push(p) }));

        await action.do(["x", "x", "x"]);

        check(log, ["x", "x", "x"]);
    });
});

/* ------------------------ */
describe("ParamRepetition", () => {
    it("Sync", async () => {
        const log: string[] = [];
        const action = new drs.ParamRepetition(
            new drs.Run((p: string) => { log.push(p) }));

        await action.do({
            param: "x",
            count: 3
        });

        check(log, ["x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.ParamRepetition(
            new drs.Run(async (p: string) => { log.push(p) }));

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
            new drs.Run((p: string) => {
                log.push(p);
                return log.length === 3;
            }));

        await action.do("x");

        check(log, ["x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.Repetition(
            new drs.Run(async (p: string) => {
                log.push(p);
                return log.length === 3;
            }));

        await action.do("x");

        check(log, ["x", "x", "x"]);
    });
});

/* ------------------------ */
describe("RefReader", () => {
    it("success", () => {
        let count = 12;
        const reader = new drs.RefReader(() => count);
        check(reader.get(), 12);
    });
});

describe("RefWriter", () => {
    it("success", () => {
        let count = 0;
        const writer = new drs.RefWriter<number>((v) => count = v);
        writer.set(12);
        check(count, 12);
    });
});

describe("Ref", () => {
    it("success", () => {
        let count = 0;
        const ref = new drs.Ref(
            () => count,
            (v) => count = v);
        ref.set(12);
        check(ref.get(), 12);
    });
});
/* ------------------------ */
