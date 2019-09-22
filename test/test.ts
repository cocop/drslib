import assert from "assert";
import * as drs from "../src/index";
import * as tst from "./testobj";


/* ------------------------ */
describe("Action Only", () => {
    it("not undefined", () => {
        tst.log.msgs = [];
        const edr = new drs.Runner([
            new tst.RA(),
            new tst.RB(),
            new tst.RA()
        ]);

        edr.run();

        assert.ok(JSON.stringify(tst.log.msgs) == JSON.stringify([
            "R_", "RA", "R_",
            "R_", "RA", "R_",
            "RB",
            "R_", "RA", "R_",
            "R_", "RA", "R_",
        ]));
    });

    it("undefined", () => {
        tst.log.msgs = []
        const edr = new drs.Runner([
            new tst.RA(),
            undefined,
            new tst.RA()
        ]);

        edr.run();

        assert.ok(JSON.stringify(tst.log.msgs) == JSON.stringify([
            "R_", "RA", "R_",
            "R_", "RA", "R_",
        ]));
    });

    it("lr undefined", () => {
        tst.log.msgs = []
        const edr = new drs.Runner([
            undefined,
            new tst.RA(),
            new tst.RA(),
            undefined
        ]);

        edr.run();

        assert.ok(JSON.stringify(tst.log.msgs) == JSON.stringify([
            "R_", "RA", "R_",
            "R_", "RA", "R_",
        ]));
    });
});

/* ------------------------ */
describe("AsyncAction Only", () => {
    it("not undefined", async () => {
        tst.log.msgs = []
        const edr = new drs.AsyncRunner([
            new tst.EA(),
            new tst.EB(),
            new tst.EA()
        ]);

        await edr.run();

        assert.ok(JSON.stringify(tst.log.msgs) == JSON.stringify([
            "E_", "EA", "E_",
            "E_", "EA", "E_",
            "EB",
            "E_", "EA", "E_",
            "E_", "EA", "E_",
        ]));
    });

    it("undefined", async () => {
        tst.log.msgs = []
        const edr = new drs.AsyncRunner([
            new tst.EA(),
            undefined,
            new tst.EA()
        ]);

        await edr.run();

        assert.ok(JSON.stringify(tst.log.msgs) == JSON.stringify([
            "E_", "EA", "E_",
            "E_", "EA", "E_",
        ]));
    });

    it("lr undefined", async () => {
        tst.log.msgs = []
        const edr = new drs.AsyncRunner([
            undefined,
            new tst.EA(),
            new tst.EA(),
            undefined
        ]);

        await edr.run();

        assert.ok(JSON.stringify(tst.log.msgs) == JSON.stringify([
            "E_", "EA", "E_",
            "E_", "EA", "E_",
        ]));
    });
});

/* ------------------------ */
describe("Action, AsyncAction Mixing", () => {
    it("AsyncAction, Action, AsyncAction", async () => {
        tst.log.msgs = []
        const edr = new drs.AsyncRunner([
            new tst.EA(),
            new tst.RB(),
            new tst.EA()]);

        await edr.run();

        assert.ok(JSON.stringify(tst.log.msgs) == JSON.stringify([
            "E_", "EA", "E_",
            "R_", "RA", "R_",
            "RB",
            "R_", "RA", "R_",
            "E_", "EA", "E_",
        ]));
    });

    it("Action, AsyncAction, Action", async () => {
        tst.log.msgs = []
        const edr = new drs.AsyncRunner([
            new tst.RA(),
            new tst.EB(),
            new tst.RA()
        ]);

        await edr.run();

        assert.ok(JSON.stringify(tst.log.msgs) == JSON.stringify([
            "R_", "RA", "R_",
            "E_", "EA", "E_",
            "EB",
            "E_", "EA", "E_",
            "R_", "RA", "R_",
        ]));
    });
});

/* ------------------------ */
describe("AsyncAction Multi Run", () => {
    it("Double", async () => {
        tst.log.msgs = []
        const edr = new tst.ParamSetRunner([
            new tst.E_(),
            () => new tst.ParamAsyncAction(),
            new tst.E_(),
        ]);

        await Promise.all([
            edr.run("1"),
            edr.run("2"),
        ]);

        assert.ok("1" in tst.log.msgs);
        assert.ok("2" in tst.log.msgs);
        assert.ok(tst.log.msgs.filter((v) => v === "E_").length == 4);
    });
});
