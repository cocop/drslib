import assert from "assert";
import * as drs from "../src/index";
import * as tst from "./testobj";

/* ------------------------ */
async function testAsync(
    action: drs.IAction<void, Promise<void>>,
    resultLog: Array<string>) {

    tst.log.msgs = [];
    await action.execute();
    assert.ok(JSON.stringify(tst.log.msgs) === JSON.stringify(resultLog));
}

async function testParamAsync<TParam, TResult>(
    action: drs.IAction<TParam, Promise<TResult>>,
    param: TParam,
    result: TResult,
    resultLog: Array<string>) {

    tst.log.msgs = [];
    assert.ok(result === await action.execute(param));
    assert.ok(JSON.stringify(tst.log.msgs) === JSON.stringify(resultLog));
}

/* ------------------------ */
describe("ListRunner", () => {
    it("Sync Only", async () => await testAsync(
        new drs.ListRunner([
            new tst.SA(),
            new tst.SB(),
            new tst.SA()
        ]),
        [
            "S_", "SA", "S_",
            "S_", "SA", "S_",
            "SB",
            "S_", "SA", "S_",
            "S_", "SA", "S_",
        ]
    ));

    it("Async Only", async () => await testAsync(
        new drs.ListRunner([
            new tst.AA(),
            new tst.AB(),
            new tst.AA()
        ]),
        [
            "A_", "AA", "A_",
            "A_", "AA", "A_",
            "AB",
            "A_", "AA", "A_",
            "A_", "AA", "A_",
        ]
    ));

    it("Async, Sync Mixing", async () => await testAsync(
        new drs.ListRunner([
            new tst.SA(),
            new tst.AB(),
            new tst.SA()
        ]),
        [
            "S_", "SA", "S_",
            "A_", "AA", "A_",
            "AB",
            "A_", "AA", "A_",
            "S_", "SA", "S_",
        ]
    ));

    it("in param", async () => await testParamAsync(
        new drs.ListRunner([
            new tst.SA(),
            new tst.ParamAction(),
            new tst.SA()
        ]),
        "param", undefined,
        [
            "S_", "SA", "S_",
            "param",
            "S_", "SA", "S_",
        ]
    ));
});

/* ------------------------ */
describe("SyncRunner", () => {
    it("Sync Only", async () => await testParamAsync(
        new drs.SyncRunner(
            [new tst.SA()],
            new tst.SyncAction(),
            [new tst.SA()]
        ),
        "xxx", "xxx",
        [
            "S_", "SA", "S_",
            "xxx",
            "S_", "SA", "S_",
        ]
    ));

    it("Async Only", async () => await testParamAsync(
        new drs.SyncRunner(
            [new tst.AA()],
            new tst.SyncAction(),
            [new tst.AA()]
        ),
        "xxx", "xxx",
        [
            "A_", "AA", "A_",
            "xxx",
            "A_", "AA", "A_",
        ]
    ));

    it("Async, Sync Mixing", async () => await testParamAsync(
        new drs.SyncRunner(
            [new tst.AA(), new tst.SA()],
            new tst.SyncAction(),
            [new tst.SA(), new tst.AA()]
        ),
        "xxx", "xxx",
        [
            "A_", "AA", "A_",
            "S_", "SA", "S_",
            "xxx",
            "S_", "SA", "S_",
            "A_", "AA", "A_",
        ]
    ));
});

/* ------------------------ */
describe("AsyncRunner", () => {
    it("Sync Only", async () => await testParamAsync(
        new drs.AsyncRunner(
            [new tst.SA()],
            new tst.AsyncAction(),
            [new tst.SA()]
        ),
        "xxx", "xxx",
        [
            "S_", "SA", "S_",
            "xxx",
            "S_", "SA", "S_",
        ]
    ));

    it("Async Only", async () => await testParamAsync(
        new drs.AsyncRunner(
            [new tst.AA()],
            new tst.AsyncAction(),
            [new tst.AA()]
        ),
        "xxx", "xxx",
        [
            "A_", "AA", "A_",
            "xxx",
            "A_", "AA", "A_",
        ]
    ));

    it("Async, Sync Mixing", async () => await testParamAsync(
        new drs.AsyncRunner(
            [new tst.AA(), new tst.SA()],
            new tst.AsyncAction(),
            [new tst.SA(), new tst.AA()]
        ),
        "xxx", "xxx",
        [
            "A_", "AA", "A_",
            "S_", "SA", "S_",
            "xxx",
            "S_", "SA", "S_",
            "A_", "AA", "A_",
        ]
    ));
});

/* ------------------------ */
describe("FreeAction", () => {
    it("success", () => {
        let isCall = false;

        new drs.FreeAction<void, void>(() => {
            isCall = true;
        }).execute();

        assert.ok(isCall);
    });
});