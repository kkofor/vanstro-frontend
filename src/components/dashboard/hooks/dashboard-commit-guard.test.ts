import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  createDashboardCommitGuard,
  shouldPropagateDashboardAuthorizationError,
  type DashboardRequestIdentity
} from "./dashboard-commit-guard.ts";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function harness() {
  let current: DashboardRequestIdentity = { generation: 0, actorKey: "A" };
  const state = { data: [] as string[], meta: {} as Record<string, number>, stats: 0, resource: "idle", error: "", loading: false };
  return {
    state,
    request: () => ({ ...current }),
    current: () => current,
    switchActor: () => {
      current = { generation: current.generation + 1, actorKey: "B" };
      state.data = [];
      state.meta = {};
      state.stats = 0;
      state.resource = "idle";
      state.error = "";
      state.loading = false;
    }
  };
}

test("read-only Overview and CMS child authorization errors propagate to centralized handling", () => {
  assert.equal(shouldPropagateDashboardAuthorizationError(true, { status: 401 }), true);
  assert.equal(shouldPropagateDashboardAuthorizationError(true, { status: 403 }), true);
  assert.equal(shouldPropagateDashboardAuthorizationError(true, new Error("network")), false);
  assert.equal(shouldPropagateDashboardAuthorizationError(false, { status: 401 }), false);
});

test("late A success cannot repopulate cleared B data, meta, stats, resource state, or finally", async () => {
  const run = harness();
  const request = run.request();
  const commit = createDashboardCommitGuard(request, run.current);
  const response = deferred<string[]>();
  run.state.loading = true;

  const pending = response.promise.then((data) => {
    commit(() => {
      run.state.data = data;
      run.state.meta = { total: data.length };
      run.state.stats = data.length;
      run.state.resource = "ready";
    });
  }).finally(() => {
    commit(() => {
      run.state.loading = false;
    });
  });

  run.switchActor();
  response.resolve(["A product"]);
  await pending;

  assert.deepEqual(run.state, { data: [], meta: {}, stats: 0, resource: "idle", error: "", loading: false });
});

test("late A error cannot overwrite cleared B resource error or finally state", async () => {
  const run = harness();
  const request = run.request();
  const commit = createDashboardCommitGuard(request, run.current);
  const response = deferred<never>();
  run.state.loading = true;

  const pending = response.promise.catch((error) => {
    commit(() => {
      run.state.resource = "error";
      run.state.error = error instanceof Error ? error.message : "Request failed";
    });
  }).finally(() => {
    commit(() => {
      run.state.loading = false;
    });
  });

  run.switchActor();
  response.reject(new Error("A failed"));
  await pending;

  assert.deepEqual(run.state, { data: [], meta: {}, stats: 0, resource: "idle", error: "", loading: false });
});

test("F0 CMS records partial and all-failed states without treating failures as empty", async () => {
  const source = await readFile(new URL("./useDashboardData.ts", import.meta.url), "utf8");
  assert.match(source, /case "cms":[\s\S]*?Promise\.allSettled\(requests\)/);
  assert.match(source, /fulfilled < results\.length[\s\S]*?cms: "partial"/);
  assert.match(source, /fulfilled === 0[\s\S]*?DashboardDataRequestError\(forbidden \? 403 : 500\)/);
  assert.match(source, /unauthorized\?\.status === "rejected"\) throw unauthorized\.reason/);
});

test("F0 Operations records partial and all-failed states without committing empty success", async () => {
  const source = await readFile(new URL("./useDashboardData.ts", import.meta.url), "utf8");
  const operations = source.match(/case "operations":[\s\S]*?case "emailOutbox"/)?.[0] ?? "";
  assert.match(operations, /Promise\.allSettled/);
  assert.match(operations, /status === 401/);
  assert.match(operations, /fulfilled === 0[\s\S]*?DashboardDataRequestError\(forbidden \? 403 : 500\)/);
  assert.match(operations, /fulfilled < results\.length[\s\S]*?operations: "partial"/);
  const legacyOperations = operations.slice(operations.indexOf("if (dashboardOptions.readOnly)"));
  assert.ok(legacyOperations.indexOf("if (fulfilled === 0)") < legacyOperations.indexOf("setData((current)"));
});

test("F0 error presentation does not expose raw technical resource messages", async () => {
  const source = await readFile(new URL("../DashboardF0ReadOnlyContent.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /resourceErrors\[activeTab\]/);
  assert.doesNotMatch(source, /\{error \?\?/);
  assert.match(source, /数据暂时无法载入/);
  assert.match(source, /请检查网络后重试；如问题持续，请联系管理员。/);
});
