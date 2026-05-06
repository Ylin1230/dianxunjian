#!/usr/bin/env node

const path = require("path");
const dotenv = require("dotenv");
const { createTaskFromAliasPayload } = require("../src/task-store");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TASK_ENTRY_ID = "c0f0448b8de02de1a78829da";

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

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

async function main() {
  const config = buildConfig();
  const records = await fetchEntryRecords(config, TASK_ENTRY_ID);
  let skipped = 0;
  let written = 0;

  for (const record of records) {
    const payload = flattenTaskRecord(record);
    if (!payload[TASK_FIELD.taskDate]) {
      skipped += 1;
      continue;
    }
    if (!dryRun) {
      await createTaskFromAliasPayload(config, payload, TASK_FIELD);
    }
    written += 1;
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    total: records.length,
    written,
    skipped,
    table: config.taskDb.taskTable,
  }));
}

function buildConfig() {
  return {
    baseUrl: String(process.env.BES_BASE_URL || "https://ahyg.online-office.net/openapi/v1").trim(),
    defaultAppId: String(process.env.BES_APP_ID || "59b376f42fee5822c6ac906a").trim(),
    apiKey: String(process.env.BES_API_KEY || "").trim(),
    taskDb: {
      client: String(process.env.DB_CLIENT || "mysql").trim().toLowerCase(),
      host: String(process.env.DB_HOST || "").trim(),
      port: Number(process.env.DB_PORT || 3306),
      database: String(process.env.DB_NAME || process.env.DB_DATABASE || "").trim(),
      user: String(process.env.DB_USER || "").trim(),
      password: String(process.env.DB_PASSWORD || ""),
      poolMax: Number(process.env.DB_POOL_MAX || 10),
      taskTable: String(process.env.TASK_DB_TABLE || "inspection_task_base").trim(),
    },
  };
}

async function fetchEntryRecords(config, entryId) {
  const actionCandidates = ["data", "data_search", "data_list"];
  const pageBuilders = [
    (page, limit) => ({ page, limit }),
    (page, limit) => ({ page_no: page, page_size: limit }),
  ];
  const pageSize = 1000;
  const maxPages = 500;
  let lastError = null;

  for (const action of actionCandidates) {
    for (const buildPayload of pageBuilders) {
      const output = [];
      const seenIds = new Set();
      const seenPageFingerprints = new Set();
      let requestSucceeded = false;

      try {
        for (let page = 1; page <= maxPages; page += 1) {
          const resp = await requestEntry(config, entryId, action, buildPayload(page, pageSize));
          requestSucceeded = true;
          const records = extractRecordArray(resp);
          const fingerprint = records.map((item) => extractRecordId(item)).filter(Boolean).join("|");
          if (fingerprint && seenPageFingerprints.has(fingerprint)) {
            break;
          }
          if (fingerprint) {
            seenPageFingerprints.add(fingerprint);
          }

          for (const record of records) {
            const id = extractRecordId(record) || JSON.stringify(record);
            if (seenIds.has(id)) {
              continue;
            }
            seenIds.add(id);
            output.push(record);
          }

          if (!records.length || records.length < pageSize) {
            break;
          }
        }

        if (requestSucceeded) {
          return output;
        }
      } catch (error) {
        lastError = error;
      }
    }
  }

  throw lastError || new Error("读取百数云点检任务底表失败");
}

async function requestEntry(config, entryId, action, body = {}) {
  const url = `${stripTrailingSlash(config.baseUrl)}/app/${encodeURIComponent(config.defaultAppId)}/entry/${encodeURIComponent(entryId)}/${encodeURIComponent(action)}`;
  const headers = {
    "Content-Type": "application/json",
  };
  if (config.apiKey) {
    headers.Authorization = config.apiKey.startsWith("Bearer ") ? config.apiKey : `Bearer ${config.apiKey}`;
    headers["X-API-Key"] = config.apiKey;
    headers["API-Key"] = config.apiKey;
    headers.api_key = config.apiKey;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body || {}),
  });
  const text = await response.text();
  const result = safeJsonParse(text);
  if (!response.ok || !isApiSuccess(result)) {
    throw new Error(extractApiMessage(result) || text || `HTTP ${response.status}`);
  }
  return result;
}

function flattenTaskRecord(record) {
  const output = {};
  Object.values(TASK_FIELD).forEach((alias) => {
    output[alias] = getAliasRawValue(record, alias);
  });
  return output;
}

function extractRecordArray(result) {
  const queue = [result];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }
    visited.add(current);
    if (Array.isArray(current)) {
      return current.every((item) => !item || typeof item === "object") ? current : [];
    }
    const keys = ["data_list", "data", "list", "rows", "items", "entry_data_list"];
    for (const key of keys) {
      const value = current[key];
      if (Array.isArray(value)) {
        return value.every((item) => !item || typeof item === "object") ? value : [];
      }
      const fromValues = objectValuesAsObjectArray(value);
      if (fromValues) {
        return fromValues;
      }
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
  return findAliasInObject(record, alias);
}

function findAliasInObject(value, alias) {
  if (!value || typeof value !== "object") {
    return "";
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAliasInObject(item, alias);
      if (found !== "") {
        return found;
      }
    }
    return "";
  }
  if (Object.prototype.hasOwnProperty.call(value, alias)) {
    return value[alias];
  }
  for (const item of Object.values(value)) {
    const found = findAliasInObject(item, alias);
    if (found !== "") {
      return found;
    }
  }
  return "";
}

function isApiSuccess(result) {
  if (!result || typeof result !== "object") {
    return true;
  }
  const code = result.code !== undefined ? result.code : result.errcode;
  if (code !== undefined && code !== 0 && code !== "0" && code !== 200 && code !== "200") {
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
  return String(result.msg || result.message || result.error || result.errmsg || "").trim();
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, message: error.message || String(error) }));
  process.exit(1);
});
