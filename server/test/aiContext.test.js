const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

function mockQuery(rows) {
  return {
    select() { return this; },
    sort() { return this; },
    limit() { return this; },
    lean() { return Promise.resolve(rows); },
  };
}

test("AI account context loads independent collections before summarizing activity", async () => {
  const originalLoad = Module._load;
  const sampleProblem = {
    title: "Two Sum",
    platform: "LeetCode",
    difficulty: "Easy",
    topics: ["Array"],
    solvedAt: new Date(),
    origin: "manual",
  };

  Module._load = function patchedLoad(request, parent, isMain) {
    if (parent?.filename?.endsWith("/controllers/aiController.js")) {
      if (request === "../models/Problem") return { find: () => mockQuery([sampleProblem]) };
      if (request === "../models/Goal") return { find: () => mockQuery([]) };
      if (request === "../models/Project") return { find: () => mockQuery([]) };
    }
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const controllerPath = require.resolve("../src/controllers/aiController");
    delete require.cache[controllerPath];
    const controller = require(controllerPath);
    const context = await controller.buildUserContext({
      _id: "test-user",
      integrations: { providers: new Map() },
    });

    assert.equal(context.loggedProblemTotals.total, 1);
    assert.equal(context.loggedProblemTotals.difficulty.Easy, 1);
    assert.equal(context.loggedProblemTotals.last7Days, 1);
  } finally {
    Module._load = originalLoad;
  }
});
