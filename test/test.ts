import assert from "assert";
import * as drs from "../src/index";
import { setTimeout } from "timers";

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
describe("BAction", () => {
    it("extends", () => {
        class xxx extends drs.BAction<void, number, {
            index: number,
            array: number[],
        }> {
            do() {
                return this.$.array[this.$.index];
            }
        }

        const action = new xxx({
            index: 1,
            array: [20, 10]
        });

        check(action.do(), 10);
    });
});

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
describe("IfValid", () => {
    it("true", () => {
        let isCall = false;
        const ifValid = new drs.IfValid<void, void>(
            new drs.Run(() => true),
            new drs.Run((p: void) => { isCall = true; }));
        ifValid.do();
        check(isCall, true);
    });

    it("false", () => {
        let isCall = false;
        const ifValid = new drs.IfValid<void, void>(
            new drs.Run(() => false),
            new drs.Run((p: void) => { isCall = true; }));
        ifValid.do();
        check(isCall, false);
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
describe("RunActionsParallel", () => {
    it("Sync Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsParallel<void>([
            new drs.Run(() => { log.push(1) }),
            new drs.Run(() => { log.push(2) }),
            new drs.Run(() => { log.push(3) }),
        ]);

        await action.do();

        check(log, [1, 2, 3]);
    });

    it("Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsParallel<void>([
            new drs.Run(async () => {
                await new Promise((e) => setTimeout(e, 100));
                log.push(1)
            }),
            new drs.Run(async () => {
                await new Promise((e) => setTimeout(e, 50));
                log.push(2);
            }),
            new drs.Run(async () => {
                await new Promise((e) => setTimeout(e, 10));
                log.push(3)
            }),
        ]);

        await action.do();

        check(log, [3, 2, 1]);
    });

    it("Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActionsParallel<void>([
            new drs.Run(async () => {
                await new Promise((e) => setTimeout(e, 50));
                log.push(1)
            }),
            new drs.Run(() => { log.push(2) }),
            new drs.Run(async () => {
                await new Promise((e) => setTimeout(e, 10));
                log.push(3);
            }),
        ]);

        await action.do();

        check(log, [2, 3, 1]);
    });

    it("in param", async () => {
        const log: number[] = []
        const action = new drs.RunActionsParallel<number>([
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
            new drs.Run(() => { log.push(1) }),
            new drs.Run((p: number) => { log.push(p); return "xxx"; }),
            new drs.Run(() => { log.push(3) })
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("SyncAction Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            new drs.Run(async () => { log.push(1) }),
            new drs.Run((p: number) => { log.push(p); return "xxx"; }),
            new drs.Run(async () => { log.push(3) })
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("SyncAction Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            new drs.Run(() => { log.push(1) }),
            new drs.Run((p: number) => { log.push(p); return "xxx"; }),
            new drs.Run(async () => { log.push(3) }),
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("AsyncAction Sync Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            new drs.Run(() => { log.push(1) }),
            new drs.Run(async (p: number) => { log.push(p); return "xxx"; }),
            new drs.Run(() => { log.push(3) })
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("AsyncAction Async Only", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            new drs.Run(async () => { log.push(1) }),
            new drs.Run(async (p: number) => { log.push(p); return "xxx"; }),
            new drs.Run(async () => { log.push(3) })
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
    });

    it("AsyncAction Async, Sync Mixing", async () => {
        const log: number[] = []
        const action = new drs.RunActionsOrder(
            new drs.Run(async () => { log.push(1) }),
            new drs.Run(async (p: number) => { log.push(p); return "xxx"; }),
            new drs.Run(() => { log.push(3) })
        );

        check(await action.do(2), "xxx");
        check(log, [1, 2, 3]);
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
            .join(new drs.Run(async () => { // not wait
                await new Promise(resolve => setTimeout(resolve, 10));
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

    it("passWait", async () => {
        const log: number[] = [];
        const action = new drs.Chain<number>()
            .join(new drs.Run((p) => p))
            .passWait(new drs.Run(async (p) => log.push(p)))
            .join(new drs.Run((p) => p + 1))
            .create();

        check(await action.do(10), 11);
        check(log, [10]);
    });
});

/* ------------------------ */
describe("Retry", () => {
    it("Sync", async () => {
        const log: string[] = [];
        const action = new drs.Retry(
            3,
            new drs.Run(() => {
                log.push("x");
                return false;
            }));

        await action.do();

        check(log, ["x", "x", "x", "x"]);
    });

    it("Async", async () => {
        const log: string[] = [];
        const action = new drs.Retry(
            3,
            new drs.Run(async () => {
                log.push("x");
                return false;
            }));

        await action.do();

        check(log, ["x", "x", "x", "x"]);
    });

    it("success", async () => {
        const log: string[] = [];
        const action = new drs.Retry(
            3,
            new drs.Run(() => {
                log.push("x");
                return true;
            }));

        await action.do();

        check(log, ["x"]);
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

/* ------------------------ */
describe("RefWriter", () => {
    it("success", () => {
        let count = 0;
        const writer = new drs.RefWriter<number>((v) => count = v);
        writer.set(12);
        check(count, 12);
    });
});

/* ------------------------ */
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
describe("RefPath", () => {
    it("success array", () => {
        const context = {
            xxx: "1",
            yyy: {
                aaa: "error"
            }
        }

        const ref = new drs.RefPath<string>(
            context, ["yyy", "aaa"]
        );

        ref.set("ok");

        check(ref.get(), "ok");
    });

    it("success string", () => {
        const context = {
            xxx: "1",
            yyy: {
                aaa: "error"
            }
        }

        const ref = new drs.RefPath<string>(
            context, "yyy.aaa"
        );

        ref.set("ok");

        check(ref.get(), "ok");
    });
});
