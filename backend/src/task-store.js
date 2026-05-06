const crypto = require("crypto");
const { execute } = require("./db");

const DB_MODE = "db";
const BES_MODE = "bes";
const DUAL_MODE = "dual";

function getTaskStoreMode(config = {}) {
  const mode = String(config.taskStoreMode || BES_MODE).trim().toLowerCase();
  if ([DB_MODE, BES_MODE, DUAL_MODE].includes(mode)) {
    return mode;
  }
  return BES_MODE;
}

function shouldReadTasksFromDb(config) {
  return getTaskStoreMode(config) === DB_MODE;
}

function shouldWriteTasksToDb(config) {
  const mode = getTaskStoreMode(config);
  return mode === DB_MODE || mode === DUAL_MODE;
}

function shouldWriteTasksToBes(config) {
  return getTaskStoreMode(config) !== DB_MODE;
}

async function listTaskAliasRecords(config, fieldMap, filters = {}) {
  if (Array.isArray(filters.deviceTargets) && filters.deviceTargets.length === 0) {
    return [];
  }

  const table = getTaskTableName(config);
  const where = ["is_deleted = 0"];
  const params = [];

  if (filters.taskId) {
    where.push("(CAST(id AS CHAR) = ? OR task_no = ?)");
    params.push(String(filters.taskId), String(filters.taskId));
  }
  if (filters.startDate) {
    where.push("task_date >= ?");
    params.push(toDateOnly(filters.startDate));
  }
  if (filters.endDate) {
    where.push("task_date <= ?");
    params.push(toDateOnly(filters.endDate));
  }
  if (filters.dashboardDate) {
    const dateText = toDateOnly(filters.dashboardDate);
    const doneStatuses = normalizeStatusArray(filters.doneStatuses);
    where.push("task_date <= ?");
    params.push(dateText);
    if (doneStatuses.length) {
      where.push(`(task_date = ? OR COALESCE(task_status, '') NOT IN (${placeholders(doneStatuses.length)}))`);
      params.push(dateText, ...doneStatuses);
    }
  }
  if (filters.reportableBeforeDate) {
    where.push("task_date <= ?");
    params.push(toDateOnly(filters.reportableBeforeDate));
  }
  if (filters.reportableStatuses && filters.reportableStatuses.length) {
    const statuses = normalizeStatusArray(filters.reportableStatuses);
    where.push(`COALESCE(task_status, '') IN (${placeholders(statuses.length)})`);
    params.push(...statuses);
  }
  if (filters.deviceIds && filters.deviceIds.length) {
    const ids = normalizeTextArray(filters.deviceIds);
    if (!ids.length) {
      return [];
    }
    where.push(`device_id IN (${placeholders(ids.length)})`);
    params.push(...ids);
  }
  if (filters.deviceNos && filters.deviceNos.length) {
    const nos = normalizeTextArray(filters.deviceNos);
    if (!nos.length) {
      return [];
    }
    where.push(`device_no IN (${placeholders(nos.length)})`);
    params.push(...nos);
  }
  if (filters.deviceTargets && filters.deviceTargets.length) {
    const targets = normalizeTextArray(filters.deviceTargets);
    if (!targets.length) {
      return [];
    }
    where.push(`(device_id IN (${placeholders(targets.length)}) OR device_no IN (${placeholders(targets.length)}))`);
    params.push(...targets, ...targets);
  }

  const limit = Number(filters.limit || 0);
  const sql = [
    `SELECT * FROM ${table}`,
    `WHERE ${where.join(" AND ")}`,
    "ORDER BY task_date ASC, id ASC",
    limit > 0 ? `LIMIT ${Math.max(1, Math.min(limit, 10000))}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rows = await execute(config, sql, params);
  return rows.map((row) => dbRowToAliasRecord(row, fieldMap));
}

async function createTaskFromAliasPayload(config, payload, fieldMap) {
  const table = getTaskTableName(config);
  const row = aliasPayloadToDbRow(payload, fieldMap);
  const columns = Object.keys(row);
  const updateColumns = columns.filter((column) => column !== "task_no" && column !== "created_by");
  const sql = `
    INSERT INTO ${table} (${columns.map((column) => `\`${column}\``).join(", ")})
    VALUES (${placeholders(columns.length)})
    ON DUPLICATE KEY UPDATE
      is_deleted = 0,
      ${updateColumns.map((column) => `\`${column}\` = VALUES(\`${column}\`)`).join(",\n      ")},
      updated_at = CURRENT_TIMESTAMP
  `;
  const result = await execute(config, sql, columns.map((column) => row[column]));
  return {
    taskNo: row.task_no,
    created: Number(result && result.affectedRows) === 1,
  };
}

async function deleteFutureUnstartedTasksByRule(config, ruleId, { fromDate, statuses = [] } = {}) {
  const table = getTaskTableName(config);
  const statusList = normalizeStatusArray(statuses);
  const params = [String(ruleId || ""), toDateOnly(fromDate || new Date())];
  const statusSql = statusList.length ? `AND COALESCE(task_status, '') IN (${placeholders(statusList.length)})` : "";
  params.push(...statusList);
  const sql = `
    UPDATE ${table}
    SET is_deleted = 1,
        invalid_reason = IFNULL(NULLIF(invalid_reason, ''), '规则变更自动清理'),
        updated_by = 'system',
        updated_at = CURRENT_TIMESTAMP
    WHERE is_deleted = 0
      AND rule_id = ?
      AND task_date >= ?
      ${statusSql}
  `;
  const result = await execute(config, sql, params);
  return Number(result && result.affectedRows) || 0;
}

async function updateTaskReportState(config, task, aliasPayload, fieldMap) {
  const table = getTaskTableName(config);
  const values = {};
  const status = getAliasValue(aliasPayload, fieldMap.taskStatus);
  const reportStatus = getAliasValue(aliasPayload, fieldMap.reportStatus);
  const reportedCount = getAliasValue(aliasPayload, fieldMap.reportedCount);

  if (status !== undefined) values.task_status = toText(status);
  if (reportStatus !== undefined) values.report_status = toText(reportStatus);
  if (reportedCount !== undefined) values.reported_count = toInt(reportedCount, 0);
  values.updated_by = "system";

  const columns = Object.keys(values);
  if (!columns.length) {
    return 0;
  }

  const params = [];
  const setSql = columns.map((column) => {
    params.push(values[column]);
    return `\`${column}\` = ?`;
  });
  setSql.push("updated_at = CURRENT_TIMESTAMP");

  const where = buildTaskWhere(task, params);
  const sql = `
    UPDATE ${table}
    SET ${setSql.join(", ")}
    WHERE is_deleted = 0 AND ${where}
  `;
  const result = await execute(config, sql, params);
  return Number(result && result.affectedRows) || 0;
}

function dbRowToAliasRecord(row, fieldMap) {
  const record = {
    id: String(row.id || ""),
    data_id: String(row.id || ""),
    _id: String(row.id || ""),
    task_no: toText(row.task_no),
  };
  setAlias(record, fieldMap.taskDate, toDateTimeText(row.task_date));
  setAlias(record, fieldMap.generatedAt, toDateTimeText(row.generated_time));
  setAlias(record, fieldMap.standardId, toText(row.standard_main_id));
  setAlias(record, fieldMap.standardCode, toText(row.standard_no));
  setAlias(record, fieldMap.standardName, toText(row.standard_name));
  setAlias(record, fieldMap.standardVersion, toText(row.standard_version));
  setAlias(record, fieldMap.ruleId, toText(row.rule_id));
  setAlias(record, fieldMap.ruleCode, toText(row.rule_no));
  setAlias(record, fieldMap.ruleName, toText(row.rule_name));
  setAlias(record, fieldMap.ruleVersion, toText(row.rule_version));
  setAlias(record, fieldMap.deviceId, toText(row.device_id));
  setAlias(record, fieldMap.deviceCode, toText(row.device_no));
  setAlias(record, fieldMap.deviceName, toText(row.device_name));
  setAlias(record, fieldMap.shift, toText(row.shift_name));
  setAlias(record, fieldMap.windowStart, toDateTimeText(row.execute_window_start));
  setAlias(record, fieldMap.windowEnd, toDateTimeText(row.execute_window_end));
  setAlias(record, fieldMap.taskValidity, toText(row.task_validity));
  setAlias(record, fieldMap.taskStatus, toText(row.task_status));
  setAlias(record, fieldMap.invalidateReason, toText(row.invalid_reason));
  setAlias(record, fieldMap.reportStatus, toText(row.report_status));
  setAlias(record, fieldMap.reportedCount, Number(row.reported_count || 0));
  setAlias(record, fieldMap.shouldReportCount, Number(row.should_report_count || 0));
  setAlias(record, fieldMap.batchSource, toText(row.regenerate_source_shift));
  setAlias(record, fieldMap.manageRemark, toText(row.manage_remark));
  return record;
}

function setAlias(record, alias, value) {
  if (alias) {
    record[alias] = value;
  }
}

function aliasPayloadToDbRow(payload, fieldMap) {
  const taskDate = toDateOnly(getAliasValue(payload, fieldMap.taskDate));
  const generatedTime = toDateTimeText(getAliasValue(payload, fieldMap.generatedAt)) || toDateTimeText(new Date());
  const row = {
    task_no: buildTaskNo(payload, fieldMap),
    task_date: taskDate,
    generated_time: generatedTime,
    standard_main_id: toNullableText(getAliasValue(payload, fieldMap.standardId)),
    standard_no: toNullableText(getAliasValue(payload, fieldMap.standardCode)),
    standard_name: toNullableText(getAliasValue(payload, fieldMap.standardName)),
    standard_version: toNullableText(getAliasValue(payload, fieldMap.standardVersion)),
    rule_id: toNullableText(getAliasValue(payload, fieldMap.ruleId)),
    rule_no: toNullableText(getAliasValue(payload, fieldMap.ruleCode)),
    rule_name: toNullableText(getAliasValue(payload, fieldMap.ruleName)),
    rule_version: toNullableText(getAliasValue(payload, fieldMap.ruleVersion)),
    device_id: toNullableText(getAliasValue(payload, fieldMap.deviceId)),
    device_no: toNullableText(getAliasValue(payload, fieldMap.deviceCode)),
    device_name: toNullableText(getAliasValue(payload, fieldMap.deviceName)),
    shift_name: toNullableText(getAliasValue(payload, fieldMap.shift)),
    execute_window_start: toNullableDateTime(getAliasValue(payload, fieldMap.windowStart)),
    execute_window_end: toNullableDateTime(getAliasValue(payload, fieldMap.windowEnd)),
    task_validity: toNullableText(getAliasValue(payload, fieldMap.taskValidity)) || "有效",
    task_status: toNullableText(getAliasValue(payload, fieldMap.taskStatus)) || "未执行",
    invalid_reason: toNullableText(getAliasValue(payload, fieldMap.invalidateReason)),
    report_status: toNullableText(getAliasValue(payload, fieldMap.reportStatus)) || "未报工",
    reported_count: toInt(getAliasValue(payload, fieldMap.reportedCount), 0),
    should_report_count: toInt(getAliasValue(payload, fieldMap.shouldReportCount), 0),
    regenerate_source_shift: toNullableText(getAliasValue(payload, fieldMap.batchSource)),
    manage_remark: toNullableText(getAliasValue(payload, fieldMap.manageRemark)),
    created_by: "system",
    updated_by: "system",
  };
  return row;
}

function buildTaskNo(payload, fieldMap) {
  const date = toDateOnly(getAliasValue(payload, fieldMap.taskDate)).replace(/-/g, "");
  const key = [
    getAliasValue(payload, fieldMap.ruleId),
    getAliasValue(payload, fieldMap.standardId),
    getAliasValue(payload, fieldMap.deviceId),
    toDateOnly(getAliasValue(payload, fieldMap.taskDate)),
  ]
    .map((item) => toText(item))
    .join("|");
  const hash = crypto.createHash("sha1").update(key).digest("hex").slice(0, 12).toUpperCase();
  return `DJRW${date}${hash}`.slice(0, 50);
}

function buildTaskWhere(task, params) {
  const id = toText(task && task.id);
  const ruleId = toText(task && task.ruleId);
  const standardId = toText(task && task.standardId);
  const deviceId = toText(task && task.deviceId);
  const taskDate = toDateOnly(task && (task.taskDateText || task.taskDate));
  if (/^\d+$/.test(id)) {
    params.push(id);
    return "id = ?";
  }
  if (id) {
    if (ruleId && standardId && deviceId && taskDate) {
      params.push(id, ruleId, standardId, deviceId, taskDate);
      return "(task_no = ? OR (rule_id = ? AND standard_main_id = ? AND device_id = ? AND task_date = ?))";
    }
    params.push(id);
    return "task_no = ?";
  }

  if (ruleId && standardId && deviceId && taskDate) {
    params.push(ruleId, standardId, deviceId, taskDate);
    return "rule_id = ? AND standard_main_id = ? AND device_id = ? AND task_date = ?";
  }
  throw new Error("缺少可用于更新数据库任务的标识");
}

function getTaskTableName(config = {}) {
  const table = String(config.taskDb && config.taskDb.taskTable || "inspection_task_base").trim();
  if (!/^[a-zA-Z0-9_]+$/.test(table)) {
    throw new Error(`非法任务表名：${table}`);
  }
  return `\`${table}\``;
}

function getAliasValue(payload, alias) {
  if (!alias || !payload || typeof payload !== "object") {
    return undefined;
  }
  return payload[alias];
}

function placeholders(count) {
  return Array.from({ length: count }, () => "?").join(", ");
}

function normalizeTextArray(values) {
  return (Array.isArray(values) ? values : [values])
    .map((item) => toText(item))
    .filter(Boolean);
}

function normalizeStatusArray(values) {
  return (Array.isArray(values) ? values : [values]).map((item) => toText(item));
}

function toNullableText(value) {
  const text = toText(value);
  return text || null;
}

function toText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (value instanceof Date) {
    return toDateTimeText(value);
  }
  return String(value).trim();
}

function toInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function toNullableDateTime(value) {
  const text = toDateTimeText(value);
  return text || null;
}

function toDateOnly(value) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }
  const text = toText(value);
  if (!text) {
    return toDateOnly(new Date());
  }
  const match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) {
    return [match[1], match[2].padStart(2, "0"), match[3].padStart(2, "0")].join("-");
  }
  const parsed = new Date(text);
  if (Number.isFinite(parsed.getTime())) {
    return toDateOnly(parsed);
  }
  return toDateOnly(new Date());
}

function toDateTimeText(value) {
  if (!value && value !== 0) {
    return "";
  }
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return `${toDateOnly(value)} ${[
      String(value.getHours()).padStart(2, "0"),
      String(value.getMinutes()).padStart(2, "0"),
      String(value.getSeconds()).padStart(2, "0"),
    ].join(":")}`;
  }
  const text = toText(value);
  if (!text) {
    return "";
  }
  const normalized = text.replace("T", " ").replace(/\.\d+Z?$/, "").replace(/Z$/, "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return `${normalized} 00:00:00`;
  }
  const match = normalized.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})(?:\s+(\d{1,2}:\d{1,2}(?::\d{1,2})?))?/);
  if (!match) {
    return "";
  }
  const date = toDateOnly(match[1]);
  const timeParts = String(match[2] || "00:00:00").split(":");
  return `${date} ${[
    String(timeParts[0] || "00").padStart(2, "0"),
    String(timeParts[1] || "00").padStart(2, "0"),
    String(timeParts[2] || "00").padStart(2, "0"),
  ].join(":")}`;
}

module.exports = {
  createTaskFromAliasPayload,
  deleteFutureUnstartedTasksByRule,
  getTaskStoreMode,
  listTaskAliasRecords,
  shouldReadTasksFromDb,
  shouldWriteTasksToBes,
  shouldWriteTasksToDb,
  updateTaskReportState,
};
