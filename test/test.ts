import assert from "assert";
import * as drs from "../src/index";
import * as tst from "./testobj";

/* ------------------------ */
async function testAsync(
    testParam: {
        action: drs.IAction<void, Promise<void>>,
        resultLog: Array<string>
    }) {

    tst.log.msgs = [];
    await testParam.action.do();
    assert.ok(JSON.stringify(tst.log.msgs) === JSON.stringify(testParam.resultLog));
}

async function testParamAsync<TParam, TResult>(
    testParam: {
        action: drs.IAction<TParam, Promise<TResult>>,
        param: TParam,
        result: TResult,
        resultLog: Array<string>
    }) {

    tst.log.msgs = [];
    assert.ok(testParam.result === await testParam.action.do(testParam.param));
    assert.ok(JSON.stringify(tst.log.msgs) === JSON.stringify(testParam.resultLog));
}

/* ------------------------ */
describe("RunActions", () => {
    it("Sync Only", async () =>
        await testAsync({
            action: new drs.RunActions([
                new tst.SA(),
                new tst.SB(),
                new tst.SA()
            ]),
            resultLog: [
                "S_", "SA", "S_",
                "S_", "SA", "S_",
                "SB",
                "S_", "SA", "S_",
                "S_", "SA", "S_",
            ]
        }));

    it("Async Only", async () =>
        await testAsync({
            action: new drs.RunActions([
                new tst.AA(),
                new tst.AB(),
                new tst.AA()
            ]),
            resultLog: [
                "A_", "AA", "A_",
                "A_", "AA", "A_",
                "AB",
                "A_", "AA", "A_",
                "A_", "AA", "A_",
            ]
        }));

    it("Async, Sync Mixing", async () =>
        await testAsync({
            action: new drs.RunActions([
                new tst.SA(),
                new tst.AB(),
                new tst.SA()
            ]),
            resultLog: [
                "S_", "SA", "S_",
                "A_", "AA", "A_",
                "AB",
                "A_", "AA", "A_",
                "S_", "SA", "S_",
            ]
        }));

    it("in param", async () =>
        await testParamAsync({
            action: new drs.RunActions([
                new tst.SA(),
                new tst.ParamAction(),
                new tst.SA()
            ]),
            param: "param",
            result: undefined,
            resultLog: [
                "S_", "SA", "S_",
                "param",
                "S_", "SA", "S_",
            ]
        }));
});

/* ------------------------ */
describe("RunActionsOrder", () => {
    it("SyncAction Sync Only", async () =>
        await testParamAsync({
            action: new drs.RunActionsOrder(
                [new tst.SA()],
                new tst.SyncAction(),
                [new tst.SA()]
            ),
            param: "xxx",
            result: "xxx",
            resultLog: [
                "S_", "SA", "S_",
                "xxx",
                "S_", "SA", "S_",
            ]
        }));

    it("SyncAction Async Only", async () =>
        await testParamAsync({
            action: new drs.RunActionsOrder(
                [new tst.AA()],
                new tst.SyncAction(),
                [new tst.AA()]
            ),
            param: "xxx",
            result: "xxx",
            resultLog: [
                "A_", "AA", "A_",
                "xxx",
                "A_", "AA", "A_",
            ]
        }));

    it("SyncAction Async, Sync Mixing", async () =>
        await testParamAsync({
            action: new drs.RunActionsOrder(
                [
                    new tst.AA(),
                    new tst.SA()
                ],
                new tst.SyncAction(),
                [
                    new tst.SA(),
                    new tst.AA()
                ]
            ),
            param: "xxx",
            result: "xxx",
            resultLog: [
                "A_", "AA", "A_",
                "S_", "SA", "S_",
                "xxx",
                "S_", "SA", "S_",
                "A_", "AA", "A_",
            ]
        }));

    it("AsyncAction Sync Only", async () =>
        await testParamAsync({
            action: new drs.RunActionsOrder(
                [new tst.SA()],
                new tst.AsyncAction(),
                [new tst.SA()]
            ),
            param: "xxx",
            result: "xxx",
            resultLog: [
                "S_", "SA", "S_",
                "xxx",
                "S_", "SA", "S_",
            ]
        }));

    it("AsyncAction Async Only", async () =>
        await testParamAsync({
            action: new drs.RunActionsOrder(
                [new tst.AA()],
                new tst.AsyncAction(),
                [new tst.AA()]
            ),
            param: "xxx",
            result: "xxx",
            resultLog: [
                "A_", "AA", "A_",
                "xxx",
                "A_", "AA", "A_",
            ]
        }));

    it("AsyncAction Async, Sync Mixing", async () =>
        await testParamAsync({
            action: new drs.RunActionsOrder(
                [
                    new tst.AA(),
                    new tst.SA()
                ],
                new tst.AsyncAction(),
                [
                    new tst.SA(),
                    new tst.AA()
                ]
            ),
            param: "xxx",
            result: "xxx",
            resultLog: [
                "A_", "AA", "A_",
                "S_", "SA", "S_",
                "xxx",
                "S_", "SA", "S_",
                "A_", "AA", "A_",
            ]
        }));
});


/* ------------------------ */
describe("Free", () => {
    it("success", async () =>
        await testParamAsync({
            action: new drs.Free<string, Promise<string>>(async (param) => param),
            param: "xxx",
            result: "xxx",
            resultLog: []
        }));
});