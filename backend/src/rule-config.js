const {
  createTaskFromAliasPayload,
  deleteFutureUnstartedTasksByRule: deleteDbFutureUnstartedTasksByRule,
  listTaskAliasRecords,
  shouldWriteTasksToBes,
  shouldWriteTasksToDb,
} = require("./task-store");

const RULE_ENTRY_ID = "a00a40d98daef7b34214eb93";
const STANDARD_ENTRY_ID = "37204bb798aefcc5156f493e";
const DETAIL_ENTRY_ID = "99a2496eb8db1bcf9f1aae69";
const DEVICE_ENTRY_ID = "38104b6c9d74ce86a7c395b6";
const CHEMICAL_ENTRY_ID = "9739459da9671a832692915d";
const SITE_ENTRY_ID = "099e47809199d1d8214a984f";
const RELATION_ENTRY_ID = "f9fd4c8daab08083af9096a7";
const TASK_ENTRY_ID = "c0f0448b8de02de1a78829da";

const RULE_FIELD = {
  code: "_widget_1775878618637",
  name: "_widget_1775878618651",
  category: "_widget_1776236444214",
  generationType: "_widget_1775878618801",
  interval: "_widget_1775878618825",
  weekdays: "_widget_1775878618846",
  monthDay: "_widget_1775878618869",
  dailyStart: "_widget_1775878618890",
  dailyEnd: "_widget_1775878618914",
  status: "_widget_1775878619198",
  version: "_widget_1776078792298",
  effectiveDate: "_widget_1776078792354",
  remark: "_widget_1775878619215",
};

const STANDARD_FIELD = {
  code: "_widget_1775876696506",
  name: "_widget_1775876696520",
  category: "_widget_1775876696570",
  status: "_widget_1775876697472",
  version: "_widget_1776078594892",
  effectiveDate: "_widget_1776078594911",
  expiryDate: "_widget_1776078594976",
  applicableDeviceType: "_widget_1776740454451",
  linkedDeviceRange: "_widget_1776078595037",
};

const DETAIL_FIELD = {
  standardId: "_widget_1775877903686",
  standardName: "_widget_1775877903705",
  enabledStatus: "_widget_1775877904398",
};

const DEVICE_FIELD = {
  code: "_widget_1775562607984",
  name: "_widget_1775562608011",
  status: "_widget_1775562609528",
  inspectStandardId: "_widget_1776079114010",
  inspectStandardCode: "_widget_1776079114066",
};

const CHEMICAL_FIELD = {
  code: "_widget_1776738897288",
  name: "_widget_1776738897302",
  status: "_widget_1776738897684",
  included: "_widget_1776738897727",
  usageLocation: "_widget_1776738897321",
  storageLocation: "_widget_1776738897340",
  packageForm: "_widget_1776738897397",
  accidentType: "_widget_1776738897416",
  owner: "_widget_1776739402004",
  inspectStandardId: "_widget_1776738897791",
  qrCode: "_widget_1776738897828",
};

const SITE_FIELD = {
  code: "_widget_1776300861592",
  area: "_widget_1776754790282",
  name: "_widget_1776300861606",
  owner: "_widget_1776300861656",
};

const RELATION_FIELD = {
  standardId: "_widget_1776932400951",
  standardCode: "_widget_1776932400932",
  ruleId: "_widget_1776932401006",
  objectType: "_widget_1776932401079",
  objectId: "_widget_1776932401107",
  objectCode: "_widget_1776932401126",
  status: "_widget_1776932401145",
};

const TASK_FIELD = {
  taskDate: "_widget_1776079458825",
  generatedAt: "_widget_1776079458849",
  standardId: "_widget_1776079458873",
  standardCode: "_widget_1776079458933",
  standardName: "_widget_1776079458952",
  standardVersion: "_widget_1776079458971",
  ruleId: "_widget_1776079458990",
  ruleCode: "_widget_1776079459009",
  ruleName: "_widget_1776079459028",
  ruleVersion: "_widget_1776079459047",
  deviceId: "_widget_1776079459066",
  deviceCode: "_widget_1776079459085",
  deviceName: "_widget_1776079459104",
  shift: "_widget_1776079459123",
  windowStart: "_widget_1776079459142",
  windowEnd: "_widget_1776079459222",
  taskValidity: "_widget_1776079459246",
  taskStatus: "_widget_1776079459279",
  invalidateReason: "_widget_1776079459310",
  reportStatus: "_widget_1776079459327",
  reportedCount: "_widget_1776079459358",
  shouldReportCount: "_widget_1776079459379",
  batchSource: "_widget_1776079459400",
  manageRemark: "_widget_1776079459419",
};

const UNSTARTED_TASK_STATUS_SET = new Set(["", "未执行", "未开始", "待执行", "待点检"]);
const RULE_STATUS_ENABLED = "启用";
const RULE_STATUS_DISABLED = "停用";
const RULE_CATEGORIES = ["日检", "周检", "月检", "定期点检"];
const PERIODIC_CATEGORY = "定期点检";
const PERIODIC_GENERATION_TYPES = ["按天", "按周", "按月"];
const DEFAULT_RULE_VERSION = "V1";

const AUTO_SCHEDULER = {
  intervalMs: 60 * 1000,
  minuteWindow: 5,
};

let schedulerTimer = null;
let schedulerRunning = false;
let schedulerLastRunDate = "";

function registerRuleConfigRoutes(app, config) {
  app.get("/api/rule-config/bootstrap", asyncHandler(async (req, res) => {
    const ruleRecords = await fetchEntryRecords(config, RULE_ENTRY_ID);

    const rules = ruleRecords.map(mapRuleRecord).sort(sortByCategoryAndCode);
    const categories = [...RULE_CATEGORIES];

    res.json({
      ok: true,
      data: {
        rules,
        categoryOptions: categories,
        generationTypeOptions: PERIODIC_GENERATION_TYPES,
        statusOptions: [RULE_STATUS_ENABLED, RULE_STATUS_DISABLED],
      },
    });
  }));

  app.post("/api/rule-config/save", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const dataId = toDisplayText(payload.data_id || payload.id);
    const input = normalizeRuleInput(payload.rule || payload.data || payload);

    if (!input.name && !input.category) {
      res.status(400).json({ ok: false, message: "规则名称不能为空" });
      return;
    }

    if (normalizeCategory(input.category || input.name) === PERIODIC_CATEGORY && !PERIODIC_GENERATION_TYPES.includes(input.generationType)) {
      res.status(400).json({ ok: false, message: "定期点检的周期类型仅支持按天/按周/按月" });
      return;
    }

    const ruleRecords = await fetchEntryRecords(config, RULE_ENTRY_ID);
    const existingRules = ruleRecords.map(mapRuleRecord);

    const inputRuleName = normalizeRuleBindingText(input.name || input.category);
    const duplicate = existingRules.find((item) => {
      const itemRuleName = normalizeRuleBindingText(item.name || item.category);
      return itemRuleName && itemRuleName === inputRuleName && item.id !== dataId;
    });
    if (duplicate) {
      res.status(409).json({
        ok: false,
        message: `规则名称“${input.name || input.category}”已存在（${duplicate.code || duplicate.id}）`,
      });
      return;
    }

    let previousRule = null;
    let nextVersion = DEFAULT_RULE_VERSION;
    if (dataId) {
      previousRule = existingRules.find((item) => item.id === dataId) || null;
      nextVersion = bumpRuleVersion(previousRule && previousRule.version);
      await requestEntry(config, RULE_ENTRY_ID, "data_update", {
        data_id: dataId,
        data: buildRulePayload(input, { version: nextVersion }),
      });
    } else {
      const createResp = await requestEntry(config, RULE_ENTRY_ID, "data_create", {
        data: buildRulePayload(input, { version: DEFAULT_RULE_VERSION }),
      });
      const createdId = extractRecordId(createResp && createResp.data ? createResp.data : createResp);
      if (!createdId) {
        throw new Error("规则保存成功但未返回 data_id");
      }
      previousRule = null;
      input.id = createdId;
    }

    const latestRule = await fetchRuleById(config, input.id || dataId);
    const sync = await syncTasksByRuleChange(config, {
      previousRule,
      currentRule: latestRule,
    });

    res.json({
      ok: true,
      data: {
        rule: latestRule,
        sync,
      },
    });
  }));

  app.post("/api/rule-config/delete", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const dataId = toDisplayText(payload.data_id || payload.id);
    if (!dataId) {
      res.status(400).json({ ok: false, message: "缺少 data_id" });
      return;
    }

    const previousRule = await fetchRuleById(config, dataId);
    await requestEntry(config, RULE_ENTRY_ID, "data_delete", { data_id: dataId });

    const sync = await syncTasksByRuleChange(config, {
      previousRule,
      currentRule: null,
    });

    res.json({
      ok: true,
      data: { deletedId: dataId, sync },
    });
  }));

  app.post("/api/rule-config/toggle", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const dataId = toDisplayText(payload.data_id || payload.id);
    if (!dataId) {
      res.status(400).json({ ok: false, message: "缺少 data_id" });
      return;
    }

    const enabled = Boolean(payload.enabled);
    const status = enabled ? RULE_STATUS_ENABLED : RULE_STATUS_DISABLED;

    const previousRule = await fetchRuleById(config, dataId);
    await requestEntry(config, RULE_ENTRY_ID, "data_update", {
      data_id: dataId,
      data: {
        [RULE_FIELD.status]: status,
      },
    });

    const currentRule = await fetchRuleById(config, dataId);
    const sync = await syncTasksByRuleChange(config, {
      previousRule,
      currentRule,
    });

    res.json({
      ok: true,
      data: {
        rule: currentRule,
        sync,
      },
    });
  }));

  app.post("/api/rule-config/toggle-daily", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const enabled = Boolean(payload.enabled);
    const targetStatus = enabled ? RULE_STATUS_ENABLED : RULE_STATUS_DISABLED;

    const ruleRecords = await fetchEntryRecords(config, RULE_ENTRY_ID);
    const allRules = ruleRecords.map(mapRuleRecord);
    const dailyRules = allRules.filter((item) => {
      const effectiveDay = startOfDay(parseDateTime(item.effectiveDate || new Date()));
      return resolveRuleSchedule(item, effectiveDay).mode === "daily";
    });

    let updated = 0;
    let synced = 0;
    const aggregate = createSyncSummary();

    for (const rule of dailyRules) {
      if (normalizeRuleStatus(rule.status) === targetStatus) {
        continue;
      }
      const previousRule = rule;
      await requestEntry(config, RULE_ENTRY_ID, "data_update", {
        data_id: rule.id,
        data: {
          [RULE_FIELD.status]: targetStatus,
        },
      });
      const currentRule = await fetchRuleById(config, rule.id);
      const sync = await syncTasksByRuleChange(config, {
        previousRule,
        currentRule,
      });
      updated += 1;
      synced += 1;
      mergeSyncSummary(aggregate, sync);
    }

    res.json({
      ok: true,
      data: {
        updated,
        synced,
        sync: aggregate,
      },
    });
  }));

  app.post("/api/rule-config/sync-standard-tasks", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const standardId = toDisplayText(payload.standardId || payload.standard_id || payload.data_id || payload.id);
    if (!standardId) {
      res.status(400).json({ ok: false, message: "缺少点检标准ID" });
      return;
    }

    const result = await syncTasksByStandardChange(config, { standardId });
    res.json({
      ok: true,
      data: result,
    });
  }));

  startRuleScheduler(config);
}

function sortByCategoryAndCode(a, b) {
  const c1 = String(a.category || "");
  const c2 = String(b.category || "");
  if (c1 !== c2) {
    return c1.localeCompare(c2, "zh-CN");
  }
  return String(a.code || "").localeCompare(String(b.code || ""), "zh-CN");
}

function asyncHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      res.status(500).json({
        ok: false,
        message: error && error.message ? error.message : "server error",
      });
    }
  };
}

function normalizeCategory(value) {
  const text = toDisplayText(value);
  if (!text) {
    return "";
  }
  if (text.includes("定期")) {
    return PERIODIC_CATEGORY;
  }
  if (text.includes("周检")) {
    return "周检";
  }
  if (text.includes("月检")) {
    return "月检";
  }
  if (text.includes("日检")) {
    return "日检";
  }
  return text;
}

function normalizeApplicableDeviceType(value) {
  const text = toDisplayText(value);
  if (text.includes("危") || text.includes("化")) {
    return "危化品";
  }
  return "设备";
}

function normalizeYesNo(value) {
  const text = toDisplayText(value);
  if (!text) {
    return "否";
  }
  if (text === "1" || text.toLowerCase() === "true" || text.includes("是") || text.includes("纳入")) {
    return "是";
  }
  return "否";
}

function normalizePeriodicGenerationType(value) {
  const mode = detectGenerationMode(value);
  if (mode === "weekly") {
    return "按周";
  }
  if (mode === "monthly") {
    return "按月";
  }
  return "按天";
}

function bumpRuleVersion(versionText) {
  const text = toDisplayText(versionText) || DEFAULT_RULE_VERSION;
  const matched = text.match(/(\d+)(?!.*\d)/);
  if (!matched) {
    return DEFAULT_RULE_VERSION;
  }
  const index = Number(matched[1]);
  if (!Number.isFinite(index)) {
    return DEFAULT_RULE_VERSION;
  }
  return `V${index + 1}`;
}

function normalizeRuleInput(source) {
  const data = source && typeof source === "object" ? source : {};
  const category = toDisplayText(data.category || data.name);
  const name = toDisplayText(data.name || category);
  const categoryKind = normalizeCategory(category || name);
  const effectiveDate = normalizeDate(data.effectiveDate) || formatDate(startOfDay(new Date()));
  const generationType = normalizePeriodicGenerationType(data.generationType);
  const interval = Math.max(1, toIntOrDefault(data.interval, 1));

  if (categoryKind === "日检") {
    return {
      id: toDisplayText(data.id || data.data_id),
      name,
      category,
      generationType: "按天",
      interval: 1,
      status: normalizeRuleStatus(data.status),
      version: toDisplayText(data.version || DEFAULT_RULE_VERSION),
      effectiveDate,
      remark: toDisplayText(data.remark),
    };
  }

  if (categoryKind === "周检") {
    return {
      id: toDisplayText(data.id || data.data_id),
      name,
      category,
      generationType: "按周",
      interval: 1,
      status: normalizeRuleStatus(data.status),
      version: toDisplayText(data.version || DEFAULT_RULE_VERSION),
      effectiveDate,
      remark: toDisplayText(data.remark),
    };
  }

  if (categoryKind === "月检") {
    return {
      id: toDisplayText(data.id || data.data_id),
      name,
      category,
      generationType: "按月",
      interval: 1,
      status: normalizeRuleStatus(data.status),
      version: toDisplayText(data.version || DEFAULT_RULE_VERSION),
      effectiveDate,
      remark: toDisplayText(data.remark),
    };
  }

  return {
    id: toDisplayText(data.id || data.data_id),
    name,
    category,
    generationType,
    interval,
    status: normalizeRuleStatus(data.status),
    version: toDisplayText(data.version || DEFAULT_RULE_VERSION),
    effectiveDate,
    remark: toDisplayText(data.remark),
  };
}

function buildRulePayload(input, { version } = {}) {
  const normalized = normalizeRuleInput(input);
  const effectiveDate = normalizeDate(normalized.effectiveDate) || formatDate(startOfDay(new Date()));
  const ruleVersion = toDisplayText(version || normalized.version || DEFAULT_RULE_VERSION);
  const schedule = resolveRuleSchedule(normalized);
  const startTime = "00:00:00";
  const endTime = "23:59:59";
  const name = normalized.name || `${normalized.category || "点检"}任务规则`;

  return {
    [RULE_FIELD.name]: name,
    [RULE_FIELD.category]: normalized.category || "",
    [RULE_FIELD.generationType]: schedule.generationType || "按天",
    [RULE_FIELD.interval]: schedule.interval,
    [RULE_FIELD.weekdays]: "",
    [RULE_FIELD.monthDay]: schedule.monthDay,
    [RULE_FIELD.dailyStart]: `${effectiveDate} ${startTime}`,
    [RULE_FIELD.dailyEnd]: `${effectiveDate} ${endTime}`,
    [RULE_FIELD.status]: normalizeRuleStatus(normalized.status),
    [RULE_FIELD.version]: ruleVersion || DEFAULT_RULE_VERSION,
    [RULE_FIELD.effectiveDate]: `${effectiveDate} 00:00:00`,
    [RULE_FIELD.remark]: normalized.remark || "",
  };
}

async function fetchRuleById(config, dataId) {
  if (!dataId) {
    return null;
  }
  const resp = await requestEntry(config, RULE_ENTRY_ID, "data_retrieve", { data_id: dataId });
  const record = resp && resp.data ? resp.data : resp;
  return mapRuleRecord(record);
}

async function fetchStandardById(config, dataId) {
  if (!dataId) {
    return null;
  }
  const resp = await requestEntry(config, STANDARD_ENTRY_ID, "data_retrieve", { data_id: dataId });
  const record = resp && resp.data ? resp.data : resp;
  return mapStandardRecord(record);
}

async function syncTasksByRuleChange(config, { previousRule, currentRule }) {
  const summary = createSyncSummary();
  const today = formatDate(startOfDay(new Date()));

  if (previousRule && previousRule.id) {
    summary.deleted = await deleteFutureUnstartedTasksByRule(config, previousRule.id);
  }

  if (currentRule && currentRule.id && normalizeRuleStatus(currentRule.status) === RULE_STATUS_ENABLED) {
    const generated = await generateTasksByRule(config, currentRule, {
      startDate: today,
      endDate: today,
      forceIncludeToday: true,
    });
    mergeSyncSummary(summary, generated);
  }

  return summary;
}

async function syncTasksByStandardChange(config, { standardId }) {
  const summary = createSyncSummary();
  const standard = await fetchStandardById(config, standardId);

  if (!standard || !standard.id) {
    return {
      standard: null,
      rule: null,
      sync: summary,
      message: "未找到点检标准，未生成任务",
    };
  }

  if (!isEnabledStatus(standard.status)) {
    return {
      standard,
      rule: null,
      sync: summary,
      message: "点检标准未启用，未生成任务",
    };
  }

  const today = formatDate(startOfDay(new Date()));
  if (!isStandardEffectiveOnDate(standard, today)) {
    return {
      standard,
      rule: null,
      sync: summary,
      message: "点检标准不在生效日期范围内，未生成任务",
    };
  }

  if (!standard.category) {
    return {
      standard,
      rule: null,
      sync: summary,
      message: "点检标准未配置执行规则，未生成任务",
    };
  }

  const ruleRecords = await fetchEntryRecords(config, RULE_ENTRY_ID);
  const rules = ruleRecords
    .map(mapRuleRecord)
    .filter((item) => normalizeRuleStatus(item.status) === RULE_STATUS_ENABLED);
  const rule = findRuleForStandard(rules, standard);

  if (!rule) {
    return {
      standard,
      rule: null,
      sync: summary,
      message: `未找到执行规则“${standard.category}”，未生成任务`,
    };
  }

  const generated = await generateTasksByRule(config, rule, {
    startDate: today,
    endDate: today,
    forceIncludeToday: true,
    standardIds: [standard.id],
  });
  mergeSyncSummary(summary, generated);
  summary.rules = generated.dates > 0 ? 1 : 0;

  return {
    standard,
    rule,
    sync: summary,
    message: buildStandardSyncMessage(summary, standard),
  };
}

function buildStandardSyncMessage(summary, standard) {
  if (summary.created > 0) {
    return `已为“${standard.name || standard.code || standard.id}”生成今日任务 ${summary.created} 条`;
  }
  if (summary.skipped > 0) {
    return "今日任务已存在，无需重复生成";
  }
  if (summary.devices <= 0) {
    return `该标准暂无已绑定且有效的${normalizeApplicableDeviceType(standard.applicableDeviceType)}，未生成任务`;
  }
  return "未生成新的今日任务";
}

function findRuleForStandard(rules, standard) {
  const list = Array.isArray(rules) ? rules : [];
  const binding = normalizeRuleBindingText(standard && standard.category);
  if (!binding) {
    return null;
  }

  return (
    list.find((rule) => normalizeRuleBindingText(rule.name) === binding) ||
    list.find((rule) => normalizeRuleBindingText(rule.code) === binding) ||
    // 兼容历史数据：旧标准字段里存的是“日检/周检/月检/定期点检”。
    list.find((rule) => normalizeRuleBindingText(rule.category) === binding) ||
    null
  );
}

function isStandardBoundToRule(standard, rule) {
  if (!standard || !rule) {
    return false;
  }
  const binding = normalizeRuleBindingText(standard.category);
  if (!binding) {
    return false;
  }
  return (
    binding === normalizeRuleBindingText(rule.name) ||
    binding === normalizeRuleBindingText(rule.code) ||
    binding === normalizeRuleBindingText(rule.category)
  );
}

function normalizeRuleBindingText(value) {
  return toDisplayText(value).replace(/\s+/g, "").trim().toLowerCase();
}

function startRuleScheduler(config) {
  if (schedulerTimer) {
    return;
  }
  schedulerTimer = setInterval(() => {
    void runScheduledAutoGeneration(config, { force: false });
  }, AUTO_SCHEDULER.intervalMs);
  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }
  void runScheduledAutoGeneration(config, { force: true });
}

async function runScheduledAutoGeneration(config, { force = false } = {}) {
  const now = new Date();
  const today = formatDate(startOfDay(now));

  if (schedulerRunning) {
    return;
  }
  if (schedulerLastRunDate === today) {
    return;
  }
  if (!force) {
    const inMidnightWindow = now.getHours() === 0 && now.getMinutes() < AUTO_SCHEDULER.minuteWindow;
    if (!inMidnightWindow) {
      return;
    }
  }

  schedulerRunning = true;
  try {
    const sync = await runEnabledRuleGenerationForDate(config, today);
    schedulerLastRunDate = today;
    const output = `created=${sync.created}, skipped=${sync.skipped}, rules=${sync.rules}`;
    console.log(`[rule-config] auto generation(${today}) ${output}`);
  } catch (error) {
    console.error("[rule-config] auto generation failed:", error && error.message ? error.message : error);
  } finally {
    schedulerRunning = false;
  }
}

async function runEnabledRuleGenerationForDate(config, dateText) {
  const summary = createSyncSummary();

  const ruleRecords = await fetchEntryRecords(config, RULE_ENTRY_ID);
  const rules = ruleRecords
    .map(mapRuleRecord)
    .filter((rule) => normalizeRuleStatus(rule.status) === RULE_STATUS_ENABLED);

  for (const rule of rules) {
    const generated = await generateTasksByRule(config, rule, {
      startDate: dateText,
      endDate: dateText,
      forceIncludeToday: false,
    });
    if (generated.dates > 0) {
      summary.rules += 1;
    }
    mergeSyncSummary(summary, generated);
  }

  return summary;
}

function createSyncSummary() {
  return {
    deleted: 0,
    created: 0,
    skipped: 0,
    standards: 0,
    devices: 0,
    dates: 0,
    rules: 0,
  };
}

function mergeSyncSummary(target, source) {
  if (!source) {
    return target;
  }
  target.deleted += Number(source.deleted || 0);
  target.created += Number(source.created || 0);
  target.skipped += Number(source.skipped || 0);
  target.standards += Number(source.standards || 0);
  target.devices += Number(source.devices || 0);
  target.dates += Number(source.dates || 0);
  target.rules += Number(source.rules || 0);
  return target;
}

async function deleteFutureUnstartedTasksByRule(config, ruleId) {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  let besDeleted = 0;
  let dbDeleted = 0;

  if (shouldWriteTasksToBes(config)) {
    const taskRecords = await fetchEntryRecords(config, TASK_ENTRY_ID);
    const list = taskRecords
      .map(mapTaskRecord)
      .filter((item) => {
        if (String(item.ruleId || "") !== String(ruleId || "")) {
          return false;
        }
        if (!item.taskDate || item.taskDate < tomorrow) {
          return false;
        }
        return isUnstartedTaskStatus(item.taskStatus);
      });

    for (const row of list) {
      if (!row.id) {
        continue;
      }
      await requestEntry(config, TASK_ENTRY_ID, "data_delete", {
        data_id: row.id,
      });
    }
    besDeleted = list.length;
  }

  if (shouldWriteTasksToDb(config)) {
    dbDeleted = await deleteDbFutureUnstartedTasksByRule(config, ruleId, {
      fromDate: tomorrow,
      statuses: Array.from(UNSTARTED_TASK_STATUS_SET),
    });
  }

  if (shouldWriteTasksToBes(config) && shouldWriteTasksToDb(config)) {
    return Math.max(besDeleted, dbDeleted);
  }
  return besDeleted + dbDeleted;
}

async function generateTasksByRule(config, rule, { startDate, endDate, forceIncludeToday = false, standardIds = [] } = {}) {
  const summary = createSyncSummary();
  const dateList = computePlannedDateList(rule, { startDate, endDate, forceIncludeToday });
  summary.dates = dateList.length;
  if (!dateList.length) {
    return summary;
  }

  const [standardRecords, detailRecords, deviceRecords, chemicalRecords, siteRecords, relationRecords, taskRecords] = await Promise.all([
    fetchEntryRecords(config, STANDARD_ENTRY_ID),
    fetchEntryRecords(config, DETAIL_ENTRY_ID),
    fetchEntryRecords(config, DEVICE_ENTRY_ID),
    fetchEntryRecords(config, CHEMICAL_ENTRY_ID),
    fetchEntryRecords(config, SITE_ENTRY_ID),
    fetchEntryRecords(config, RELATION_ENTRY_ID),
    fetchTaskRecordsForGeneration(config, dateList),
  ]);

  const targetStandardIdSet = new Set(
    (Array.isArray(standardIds) ? standardIds : [standardIds])
      .map((item) => toDisplayText(item))
      .filter(Boolean)
  );

  const standards = standardRecords
    .map(mapStandardRecord)
    .filter((item) => isEnabledStatus(item.status))
    .filter((item) => isStandardBoundToRule(item, rule))
    .filter((item) => !targetStandardIdSet.size || targetStandardIdSet.has(String(item.id || "")));

  summary.standards = standards.length;
  if (!standards.length) {
    return summary;
  }

  const detailsByStandard = buildDetailCountMap(detailRecords);
  const devices = deviceRecords.map(mapDeviceRecord);
  const chemicals = chemicalRecords.map(mapChemicalRecord);
  const sites = siteRecords.map(mapSiteRecord);
  const relations = relationRecords.map(mapRelationRecord).filter((item) => isRelationActive(item.status));
  const batchId = `RULE_SYNC_${Date.now()}`;
  const existingTaskKeySet = new Set(taskRecords.map((record) => buildTaskKey(mapTaskRecord(record))));

  for (const standard of standards) {
    const objectType = normalizeApplicableDeviceType(standard.applicableDeviceType);
    const standardRelations = getActiveRelationsByStandard(relations, standard);
    const linkedSites = objectType === "危化品" ? resolveRelationObjects(standardRelations, sites, objectType) : [];
    const linkedDevices =
      objectType === "危化品"
        ? chemicals.filter((chemical) => {
            if (!isEnabledStatus(chemical.status) || normalizeYesNo(chemical.included) !== "是") {
              return false;
            }
            return linkedSites.some((site) => isChemicalInStore(chemical, site));
          })
        : resolveRelationObjects(standardRelations, devices, objectType);

    summary.devices += linkedDevices.length;
    if (!linkedDevices.length) {
      continue;
    }

    for (const plannedDate of dateList) {
      if (!isStandardEffectiveOnDate(standard, plannedDate)) {
        continue;
      }
      for (const device of linkedDevices) {
        const taskKey = buildTaskKey({
          ruleId: rule.id,
          standardId: standard.id,
          deviceId: device.id,
          taskDate: parseDateTime(`${plannedDate} 00:00:00`),
        });

        if (existingTaskKeySet.has(taskKey)) {
          summary.skipped += 1;
          continue;
        }

        const payload = buildTaskPayload({
          rule,
          standard,
          device,
          plannedDate,
          detailCount: getDetailCount(detailsByStandard, standard),
          batchId,
        });

        await createTaskByConfiguredStore(config, payload);
        existingTaskKeySet.add(taskKey);
        summary.created += 1;
      }
    }
  }

  return summary;
}

async function fetchTaskRecordsForGeneration(config, dateList) {
  const output = [];
  if (shouldWriteTasksToBes(config)) {
    output.push(...await fetchEntryRecords(config, TASK_ENTRY_ID));
  }
  if (shouldWriteTasksToDb(config)) {
    output.push(...await listTaskAliasRecords(config, TASK_FIELD, {
      startDate: dateList[0],
      endDate: dateList[dateList.length - 1],
    }));
  }
  return output;
}

async function createTaskByConfiguredStore(config, payload) {
  if (shouldWriteTasksToBes(config)) {
    await requestEntry(config, TASK_ENTRY_ID, "data_create", {
      data: payload,
    });
  }
  if (shouldWriteTasksToDb(config)) {
    await createTaskFromAliasPayload(config, payload, TASK_FIELD);
  }
}

function buildDetailCountMap(detailRecords) {
  const byStandardId = new Map();
  const byStandardName = new Map();

  detailRecords.forEach((record) => {
    if (!isEnabledStatus(getAliasRawValue(record, DETAIL_FIELD.enabledStatus))) {
      return;
    }
    const stdId = toDisplayText(getAliasRawValue(record, DETAIL_FIELD.standardId));
    const stdName = toDisplayText(getAliasRawValue(record, DETAIL_FIELD.standardName));
    if (stdId) {
      byStandardId.set(stdId, (byStandardId.get(stdId) || 0) + 1);
    }
    if (stdName) {
      byStandardName.set(stdName, (byStandardName.get(stdName) || 0) + 1);
    }
  });

  return { byStandardId, byStandardName };
}

function getDetailCount(detailMap, standard) {
  const byId = detailMap.byStandardId.get(String(standard.id || ""));
  if (Number.isFinite(byId)) {
    return byId;
  }
  const byName = detailMap.byStandardName.get(String(standard.name || ""));
  if (Number.isFinite(byName)) {
    return byName;
  }
  return 0;
}

function normalizeRelationObjectType(value) {
  const text = toDisplayText(value);
  if (text.includes("危") || text.includes("化")) {
    return "危化品库";
  }
  return "设备";
}

function getRelationObjectTypeValue(applicableDeviceType) {
  return normalizeApplicableDeviceType(applicableDeviceType) === "危化品" ? "危化品库" : "设备";
}

function isRelationActive(status) {
  return isEnabledStatus(status || "启用");
}

function isStandardEffectiveOnDate(standard, dateValue) {
  const date = startOfDay(parseDateTime(dateValue || new Date()));
  const effectiveDate = parseOptionalDate(standard && standard.effectiveDate);
  const expiryDate = parseOptionalDate(standard && standard.expiryDate);
  if (effectiveDate && date < effectiveDate) {
    return false;
  }
  if (expiryDate && date > expiryDate) {
    return false;
  }
  return true;
}

function parseOptionalDate(value) {
  const normalized = normalizeDate(value);
  if (!normalized) {
    return null;
  }
  const [year, month, day] = normalized.split("-").map((item) => Number(item));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function getActiveRelationsByStandard(relations, standard) {
  const standardId = String(standard?.id || "").trim();
  if (!standardId) {
    return [];
  }
  const relationObjectType = getRelationObjectTypeValue(standard.applicableDeviceType);
  return (Array.isArray(relations) ? relations : []).filter((item) => {
    return String(item.standardId || "").trim() === standardId && normalizeRelationObjectType(item.objectType) === relationObjectType;
  });
}

function resolveRelationObjects(relations, pool, objectType) {
  const normalizedType = getRelationObjectTypeValue(objectType);
  const source = Array.isArray(pool) ? pool : [];
  const seen = new Set();
  const output = [];

  (Array.isArray(relations) ? relations : []).forEach((relation) => {
    if (normalizeRelationObjectType(relation.objectType) !== normalizedType) {
      return;
    }
    const matched =
      source.find((item) => relation.objectId && String(item.id || "").trim() === String(relation.objectId || "").trim()) ||
      source.find((item) => relation.objectCode && String(item.code || "").trim() === String(relation.objectCode || "").trim()) ||
      null;
    const fallback =
      !matched && normalizedType === "危化品库" && relation.objectCode
        ? {
            id: relation.objectId || `store:${normalizeCompareText(relation.objectCode)}`,
            code: relation.objectCode,
            name: relation.objectCode,
            area: "",
            workshop: "",
            location: relation.objectCode,
            owner: "",
          }
        : null;
    const target = matched || fallback;
    if (!target) {
      return;
    }
    const key = `${String(target.id || "").trim()}|${String(target.code || "").trim()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    output.push(target);
  });

  return output;
}

function isChemicalInStore(chemical, site) {
  if (!chemical || !site) {
    return false;
  }
  const chemicalCandidates = [chemical.location, chemical.storageLocation, chemical.usageLocation, chemical.workshop];
  const siteCandidates = [site.name, site.code, site.displayName, getSiteDisplayName(site)];
  return chemicalCandidates.some((left) => siteCandidates.some((right) => isSameStoreName(left, right)));
}

function isSameStoreName(left, right) {
  const a = normalizeCompareText(left);
  const b = normalizeCompareText(right);
  return Boolean(a && b && a === b);
}

function getSiteDisplayName(site) {
  const area = toDisplayText(site?.area || site?.workshop);
  const name = toDisplayText(site?.name);
  if (!name) {
    return area || "";
  }
  return area && area !== "未配置区域" && area !== name ? `${area}-${name}` : name;
}

function normalizeCompareText(value) {
  return toDisplayText(value).replace(/\s+/g, "").replace(/[－—–]/g, "-").trim().toLowerCase();
}

function buildTaskPayload({ rule, standard, device, plannedDate, detailCount, batchId }) {
  const now = new Date();
  const generatedAt = formatDateTime(now);
  const windowStart = `${plannedDate} 00:00:00`;
  const windowEnd = `${plannedDate} 23:59:59`;

  return {
    [TASK_FIELD.taskDate]: `${plannedDate} 00:00:00`,
    [TASK_FIELD.generatedAt]: generatedAt,
    [TASK_FIELD.standardId]: standard.id || "",
    [TASK_FIELD.standardCode]: standard.code || "",
    [TASK_FIELD.standardName]: standard.name || "",
    [TASK_FIELD.standardVersion]: standard.version || "",
    [TASK_FIELD.ruleId]: rule.id || "",
    [TASK_FIELD.ruleCode]: rule.code || "",
    [TASK_FIELD.ruleName]: rule.name || "",
    [TASK_FIELD.ruleVersion]: rule.version || "",
    [TASK_FIELD.deviceId]: device.id || "",
    [TASK_FIELD.deviceCode]: device.code || "",
    [TASK_FIELD.deviceName]: device.name || "",
    [TASK_FIELD.shift]: "",
    [TASK_FIELD.windowStart]: windowStart,
    [TASK_FIELD.windowEnd]: windowEnd,
    [TASK_FIELD.taskValidity]: "有效",
    [TASK_FIELD.taskStatus]: "未执行",
    [TASK_FIELD.invalidateReason]: "",
    [TASK_FIELD.reportStatus]: "未报工",
    [TASK_FIELD.reportedCount]: 0,
    [TASK_FIELD.shouldReportCount]: Math.max(0, Number(detailCount || 0)),
    [TASK_FIELD.batchSource]: batchId,
    [TASK_FIELD.manageRemark]: `规则自动生成(${rule.name || rule.code || rule.id})`,
  };
}

function mapRuleRecord(record) {
  const normalized = normalizeRuleInput({
    id: extractRecordId(record),
    name: toDisplayText(getAliasRawValue(record, RULE_FIELD.name)),
    category: toDisplayText(getAliasRawValue(record, RULE_FIELD.category)),
    generationType: toDisplayText(getAliasRawValue(record, RULE_FIELD.generationType)),
    interval: toIntOrDefault(getAliasRawValue(record, RULE_FIELD.interval), 1),
    status: normalizeRuleStatus(getAliasRawValue(record, RULE_FIELD.status)),
    version: toDisplayText(getAliasRawValue(record, RULE_FIELD.version)),
    effectiveDate: toDisplayText(getAliasRawValue(record, RULE_FIELD.effectiveDate)),
    remark: toDisplayText(getAliasRawValue(record, RULE_FIELD.remark)),
  });
  return {
    ...normalized,
    code: toDisplayText(getAliasRawValue(record, RULE_FIELD.code)),
    weekdays: [],
    monthDay: 0,
    dailyStart: "",
    dailyEnd: "",
  };
}

function mapStandardRecord(record) {
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.name)),
    category: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.category)),
    status: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.status)),
    version: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.version)),
    effectiveDate: normalizeDate(getAliasRawValue(record, STANDARD_FIELD.effectiveDate)),
    expiryDate: normalizeDate(getAliasRawValue(record, STANDARD_FIELD.expiryDate)),
    applicableDeviceType: normalizeApplicableDeviceType(toDisplayText(getAliasRawValue(record, STANDARD_FIELD.applicableDeviceType))),
    linkedDeviceRange: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.linkedDeviceRange)),
  };
}

function mapDeviceRecord(record) {
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.name)),
    status: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.status)),
    inspectStandardId: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.inspectStandardId)),
    inspectStandardCode: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.inspectStandardCode)),
  };
}

function mapChemicalRecord(record) {
  const usageLocation = toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.usageLocation));
  const storageLocation = toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.storageLocation));
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.name)),
    status: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.status)),
    included: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.included)),
    inspectStandardId: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.inspectStandardId)),
    inspectStandardCode: "",
    type: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.packageForm)) || "危化品",
    workshop: usageLocation,
    usageLocation,
    storageLocation,
    department: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.owner)),
    qrCodeNo: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.qrCode)),
    qrContent: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.qrCode)),
    riskLevel: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.accidentType)),
    location: storageLocation || usageLocation,
  };
}

function mapSiteRecord(record) {
  const area = toDisplayText(getAliasRawValue(record, SITE_FIELD.area)) || "未配置区域";
  const name = toDisplayText(getAliasRawValue(record, SITE_FIELD.name));
  const code = toDisplayText(getAliasRawValue(record, SITE_FIELD.code));
  const displayName = getSiteDisplayName({ area, name });
  return {
    id: extractRecordId(record) || code || name,
    code,
    name,
    displayName,
    area,
    workshop: area,
    location: displayName || name,
    owner: toDisplayText(getAliasRawValue(record, SITE_FIELD.owner)),
  };
}

function mapRelationRecord(record) {
  return {
    id: extractRecordId(record),
    standardId: toDisplayText(getAliasRawValue(record, RELATION_FIELD.standardId)),
    standardCode: toDisplayText(getAliasRawValue(record, RELATION_FIELD.standardCode)),
    ruleId: toDisplayText(getAliasRawValue(record, RELATION_FIELD.ruleId)),
    objectType: normalizeRelationObjectType(getAliasRawValue(record, RELATION_FIELD.objectType)),
    objectId: toDisplayText(getAliasRawValue(record, RELATION_FIELD.objectId)),
    objectCode: toDisplayText(getAliasRawValue(record, RELATION_FIELD.objectCode)),
    status: toDisplayText(getAliasRawValue(record, RELATION_FIELD.status)) || "启用",
  };
}

function mapTaskRecord(record) {
  const rawTaskDate = toDisplayText(getAliasRawValue(record, TASK_FIELD.taskDate));
  return {
    id: extractRecordId(record),
    ruleId: toDisplayText(getAliasRawValue(record, TASK_FIELD.ruleId)),
    standardId: toDisplayText(getAliasRawValue(record, TASK_FIELD.standardId)),
    deviceId: toDisplayText(getAliasRawValue(record, TASK_FIELD.deviceId)),
    taskDate: rawTaskDate ? parseDateTime(rawTaskDate) : null,
    taskStatus: toDisplayText(getAliasRawValue(record, TASK_FIELD.taskStatus)),
  };
}

function buildTaskKey({ ruleId, standardId, deviceId, taskDate }) {
  const dateText = taskDate instanceof Date && Number.isFinite(taskDate.getTime()) ? formatDate(taskDate) : "";
  return [ruleId || "", standardId || "", deviceId || "", dateText].join("|");
}

function computePlannedDateList(rule, { startDate, endDate, forceIncludeToday = false } = {}) {
  const today = startOfDay(new Date());
  const from = startOfDay(startDate ? parseDateTime(startDate) : today);
  const to = startOfDay(endDate ? parseDateTime(endDate) : from);
  const rangeStart = from <= to ? from : to;
  const rangeEnd = from <= to ? to : from;
  const effectiveDay = startOfDay(parseDateTime(rule.effectiveDate || today));
  const schedule = resolveRuleSchedule(rule, effectiveDay);
  const output = new Set();

  for (let date = rangeStart; date <= rangeEnd; date = addDays(date, 1)) {
    if (isDateMatchedBySchedule(date, effectiveDay, schedule)) {
      output.add(formatDate(date));
    }
  }

  if (forceIncludeToday && today >= rangeStart && today <= rangeEnd) {
    output.add(formatDate(today));
  }

  return Array.from(output).sort();
}

function resolveRuleSchedule(rule, effectiveDay) {
  const category = normalizeCategory(rule.category);
  const anchorDay = effectiveDay instanceof Date && Number.isFinite(effectiveDay.getTime())
    ? effectiveDay
    : startOfDay(new Date());
  const anchorWeek = startOfIsoWeek(anchorDay);
  const anchorMonth = new Date(anchorDay.getFullYear(), anchorDay.getMonth(), 1);

  if (category === "日检") {
    return {
      category,
      mode: "daily",
      generationType: "按天",
      interval: 1,
      weekday: 0,
      monthDay: 0,
      anchorWeek,
      anchorMonth,
    };
  }

  if (category === "周检") {
    return {
      category,
      mode: "weekly",
      generationType: "按周",
      interval: 1,
      weekday: 1,
      monthDay: 0,
      anchorWeek,
      anchorMonth,
    };
  }

  if (category === "月检") {
    return {
      category,
      mode: "monthly",
      generationType: "按月",
      interval: 1,
      weekday: 0,
      monthDay: 1,
      anchorWeek,
      anchorMonth,
    };
  }

  const mode = detectGenerationMode(rule.generationType);
  const interval = Math.max(1, toIntOrDefault(rule.interval, 1));
  const weekday = mode === "weekly" ? toIsoWeekday(anchorDay) : 0;
  const monthDay = mode === "monthly" ? clampNumber(anchorDay.getDate(), 1, 31) : 0;

  return {
    category: PERIODIC_CATEGORY,
    mode,
    generationType: mode === "weekly" ? "按周" : mode === "monthly" ? "按月" : "按天",
    interval,
    weekday,
    monthDay,
    anchorWeek,
    anchorMonth,
  };
}

function isDateMatchedBySchedule(date, effectiveDay, schedule) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    return false;
  }
  if (date < effectiveDay) {
    return false;
  }

  if (schedule.mode === "daily") {
    const diffDays = daysBetween(effectiveDay, date);
    return diffDays >= 0 && diffDays % schedule.interval === 0;
  }

  if (schedule.mode === "weekly") {
    if (toIsoWeekday(date) !== schedule.weekday) {
      return false;
    }
    const diffWeeks = Math.floor(daysBetween(schedule.anchorWeek, startOfIsoWeek(date)) / 7);
    return diffWeeks >= 0 && diffWeeks % schedule.interval === 0;
  }

  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const diffMonths = monthsBetween(schedule.anchorMonth, monthStart);
  if (diffMonths < 0 || diffMonths % schedule.interval !== 0) {
    return false;
  }
  const candidate = dateInMonth(monthStart, schedule.monthDay || 1);
  return formatDate(candidate) === formatDate(date);
}

function detectGenerationMode(value) {
  const text = toDisplayText(value);
  if (text.includes("周")) {
    return "weekly";
  }
  if (text.includes("月")) {
    return "monthly";
  }
  return "daily";
}

function isEnabledStatus(value) {
  const text = toDisplayText(value);
  if (!text) {
    return true;
  }
  return !text.includes("停");
}

function isUnstartedTaskStatus(value) {
  const text = toDisplayText(value);
  return UNSTARTED_TASK_STATUS_SET.has(text);
}

function normalizeRuleStatus(value) {
  const text = toDisplayText(value);
  if (!text) {
    return RULE_STATUS_ENABLED;
  }
  return text.includes("停") ? RULE_STATUS_DISABLED : RULE_STATUS_ENABLED;
}

function dateInMonth(monthDate, dayOfMonth) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dayOfMonth, lastDay);
  return new Date(year, month, day);
}

function toIsoWeekday(date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function startOfIsoWeek(date) {
  const d = startOfDay(date);
  const weekday = toIsoWeekday(d);
  return addDays(d, 1 - weekday);
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function daysBetween(from, to) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor((startOfDay(to).getTime() - startOfDay(from).getTime()) / oneDay);
}

function monthsBetween(from, to) {
  const fromDate = from instanceof Date ? from : parseDateTime(from);
  const toDate = to instanceof Date ? to : parseDateTime(to);
  return (toDate.getFullYear() - fromDate.getFullYear()) * 12 + (toDate.getMonth() - fromDate.getMonth());
}

function startOfDay(date) {
  const d = date instanceof Date ? date : parseDateTime(date);
  if (!(d instanceof Date) || !Number.isFinite(d.getTime())) {
    return new Date();
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(date, days) {
  const d = date instanceof Date ? date : parseDateTime(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + Number(days || 0), d.getHours(), d.getMinutes(), d.getSeconds());
}

function normalizeDate(value) {
  const text = toDisplayText(value);
  if (!text) {
    return "";
  }
  const matched = text.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!matched) {
    return "";
  }
  const year = matched[1];
  const month = String(matched[2]).padStart(2, "0");
  const day = String(matched[3]).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateTime(value) {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : new Date();
  }
  const text = toDisplayText(value);
  if (!text) {
    return new Date();
  }
  const normalized = text.replace(/-/g, "/");
  const date = new Date(normalized);
  if (Number.isFinite(date.getTime())) {
    return date;
  }
  const dateOnly = normalizeDate(text);
  if (dateOnly) {
    const [y, m, d] = dateOnly.split("-").map((item) => Number(item));
    return new Date(y, m - 1, d);
  }
  return new Date();
}

function formatDate(date) {
  const d = date instanceof Date ? date : parseDateTime(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(date) {
  const d = date instanceof Date ? date : parseDateTime(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function toIntOrDefault(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }
  if (typeof value === "string" && !value.trim()) {
    return fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(n));
}

function uniqueTexts(list) {
  const output = [];
  const seen = new Set();
  list.forEach((item) => {
    const text = toDisplayText(item);
    if (!text || seen.has(text)) {
      return;
    }
    seen.add(text);
    output.push(text);
  });
  return output;
}

async function fetchEntryRecords(config, entryId) {
  const payloadCandidates = [{ page: 1, limit: 1000 }, { page_no: 1, page_size: 1000 }, { limit: 1000 }, {}];
  const actionCandidates = ["data", "data_search", "data_list"];

  let lastError = null;
  for (const action of actionCandidates) {
    for (const payload of payloadCandidates) {
      try {
        const resp = await requestEntry(config, entryId, action, payload);
        const records = extractRecordArray(resp);
        if (Array.isArray(records)) {
          return records;
        }
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error("查询数据失败");
}

async function requestEntry(config, entryId, action, body = {}, method = "POST") {
  const appId = config.defaultAppId;
  const baseUrl = stripTrailingSlash(config.baseUrl);
  const url = `${baseUrl}/app/${encodeURIComponent(appId)}/entry/${encodeURIComponent(entryId)}/${encodeURIComponent(action)}`;
  const headers = {
    "Content-Type": "application/json",
  };

  const key = String(config.apiKey || "").trim();
  if (key) {
    headers.Authorization = key.startsWith("Bearer ") ? key : `Bearer ${key}`;
    headers["X-API-Key"] = key;
    headers["API-Key"] = key;
    headers.api_key = key;
  }

  const options = {
    method,
    headers,
  };
  if (method !== "GET" && method !== "HEAD") {
    options.body = JSON.stringify(body || {});
  }

  const response = await fetch(url, options);
  const text = await response.text();
  const result = safeJsonParse(text);

  if (!response.ok) {
    const detail = extractApiMessage(result) || text || `HTTP ${response.status}`;
    throw new Error(detail);
  }

  if (!isApiSuccess(result)) {
    throw new Error(extractApiMessage(result) || "接口返回失败");
  }

  return result;
}

function extractRecordArray(result) {
  const queue = [result];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") {
      continue;
    }
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);

    if (Array.isArray(current)) {
      if (!current.length || typeof current[0] === "object") {
        return current;
      }
      continue;
    }

    const keys = ["data_list", "data", "list", "rows", "items", "entry_data_list"];
    for (const key of keys) {
      const value = current[key];
      if (Array.isArray(value) && (!value.length || typeof value[0] === "object")) {
        return value;
      }
      const fromValues = objectValuesAsObjectArray(value);
      if (fromValues) {
        return fromValues;
      }
    }

    const top = objectValuesAsObjectArray(current);
    if (top && top.length) {
      return top;
    }

    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    });
  }
  return [];
}

function objectValuesAsObjectArray(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const values = Object.values(value);
  if (!values.length) {
    return [];
  }
  return values.every((item) => item && typeof item === "object") ? values : null;
}

function extractRecordId(record) {
  if (!record || typeof record !== "object") {
    return "";
  }
  const candidates = [
    record.data_id,
    record.id,
    record._id,
    record.entry_data_id,
    record.record_id,
    record.row_id,
    record.data && record.data._id,
    record.data && record.data.id,
    record.data && record.data.data_id,
  ];
  for (const value of candidates) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function getAliasRawValue(record, alias) {
  if (!record || !alias) {
    return "";
  }

  const containers = [record, record.data, record.entry_data, record.widget_data, record.form_data];
  for (const container of containers) {
    if (container && typeof container === "object" && Object.prototype.hasOwnProperty.call(container, alias)) {
      return container[alias];
    }
  }

  const fromWidgets = findAliasInArray(record.widgets, alias);
  if (fromWidgets !== undefined) {
    return fromWidgets;
  }
  const fromData = findAliasInArray(record.data, alias);
  if (fromData !== undefined) {
    return fromData;
  }
  return "";
}

function findAliasInArray(list, alias) {
  if (!Array.isArray(list)) {
    return undefined;
  }
  for (const item of list) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const key = item.alias || item.widget_alias || item.name || item.key || item.widget_key;
    if (key === alias) {
      return item.value ?? item.widget_value ?? item.data ?? item;
    }
  }
  return undefined;
}

function toDisplayText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => toDisplayText(item))
      .filter(Boolean)
      .join(",");
  }
  if (typeof value === "object") {
    if (typeof value.display_name === "string") return value.display_name.trim();
    if (typeof value.name === "string") return value.name.trim();
    if (typeof value.label === "string") return value.label.trim();
    if (typeof value.title === "string") return value.title.trim();
    if (typeof value.value === "string" || typeof value.value === "number") return String(value.value).trim();
    return Object.values(value)
      .map((item) => toDisplayText(item))
      .filter(Boolean)
      .join(",");
  }
  return "";
}

function safeJsonParse(text) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isApiSuccess(result) {
  if (!result || typeof result !== "object") {
    return true;
  }
  const code = result.code ?? result.status ?? result.errcode ?? result.error_code;
  if (code !== undefined && code !== null && code !== "") {
    const num = Number(code);
    if ([0, 1, 200].includes(num)) {
      return true;
    }
    const text = String(code).toLowerCase().trim();
    if (["ok", "success", "true"].includes(text)) {
      return true;
    }
    return false;
  }
  if (result.success === false || result.ok === false) {
    return false;
  }
  return true;
}

function extractApiMessage(result) {
  if (!result || typeof result !== "object") {
    return "";
  }
  const candidates = [
    result.msg,
    result.message,
    result.error,
    result.error_msg,
    result.errmsg,
    result.detail,
    result.data && (result.data.msg || result.data.message || result.data.error || result.data.error_msg),
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

module.exports = {
  registerRuleConfigRoutes,
};
