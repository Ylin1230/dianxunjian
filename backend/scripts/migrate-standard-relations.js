#!/usr/bin/env node

const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const RULE_ENTRY_ID = "a00a40d98daef7b34214eb93";
const STANDARD_ENTRY_ID = "37204bb798aefcc5156f493e";
const DEVICE_ENTRY_ID = "38104b6c9d74ce86a7c395b6";
const CHEMICAL_ENTRY_ID = "9739459da9671a832692915d";
const SITE_ENTRY_ID = "099e47809199d1d8214a984f";
const RELATION_ENTRY_ID = "f9fd4c8daab08083af9096a7";

const RULE_FIELD = {
  code: "_widget_1775878618637",
  name: "_widget_1775878618651",
  category: "_widget_1776236444214",
};

const STANDARD_FIELD = {
  code: "_widget_1775876696506",
  name: "_widget_1775876696520",
  category: "_widget_1775876696570",
  applicableDeviceType: "_widget_1776740454451",
};

const DEVICE_FIELD = {
  code: "_widget_1775562607984",
  name: "_widget_1775562608011",
  inspectStandardId: "_widget_1776079114010",
  inspectStandardCode: "_widget_1776079114066",
};

const CHEMICAL_FIELD = {
  code: "_widget_1776738897288",
  name: "_widget_1776738897302",
  usageLocation: "_widget_1776738897321",
  storageLocation: "_widget_1776738897340",
  inspectStandardId: "_widget_1776738897791",
};

const SITE_FIELD = {
  code: "_widget_1776300861592",
  area: "_widget_1776754790282",
  name: "_widget_1776300861606",
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

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

async function main() {
  const config = buildConfig();
  const [ruleRecords, standardRecords, deviceRecords, chemicalRecords, siteRecords, relationRecords] = await Promise.all([
    fetchEntryRecords(config, RULE_ENTRY_ID),
    fetchEntryRecords(config, STANDARD_ENTRY_ID),
    fetchEntryRecords(config, DEVICE_ENTRY_ID),
    fetchEntryRecords(config, CHEMICAL_ENTRY_ID),
    fetchEntryRecords(config, SITE_ENTRY_ID),
    fetchEntryRecords(config, RELATION_ENTRY_ID),
  ]);

  const rules = ruleRecords.map(mapRuleRecord);
  const standards = standardRecords.map(mapStandardRecord).filter((item) => item.id);
  const devices = deviceRecords.map(mapDeviceRecord).filter((item) => item.id);
  const chemicals = chemicalRecords.map(mapChemicalRecord).filter((item) => item.id);
  const sites = siteRecords.map(mapSiteRecord).filter((item) => item.id);
  const relations = relationRecords.map(mapRelationRecord).filter((item) => item.id || item.cloudId);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let migratedObjects = 0;

  for (const standard of standards) {
    const objectType = normalizeApplicableDeviceType(standard.applicableDeviceType);
    const relationObjectType = getRelationObjectTypeValue(objectType);
    const ruleId = resolveRuleIdForStandard(standard, rules);
    const targets =
      objectType === "危化品"
        ? deriveRelatedSites(
            chemicals.filter((item) => standard.id && String(item.inspectStandardId || "") === String(standard.id || "")),
            sites
          )
        : devices.filter((item) => {
            const byId = standard.id && String(item.inspectStandardId || "") === String(standard.id || "");
            const byCode = standard.code && String(item.inspectStandardCode || "") === String(standard.code || "");
            return byId || byCode;
          });

    for (const target of targets) {
      migratedObjects += 1;
      const payload = buildRelationPayload(standard, target, relationObjectType, ruleId);
      const existing = findExistingRelation(relations, payload);
      if (existing) {
        if (relationNeedsUpdate(existing, payload)) {
          if (!dryRun) {
            await requestEntry(config, RELATION_ENTRY_ID, "data_update", {
              data_id: existing.cloudId,
              data: payload,
            });
          }
          applyLocalRelation(relations, existing.cloudId, payload);
          updated += 1;
        } else {
          skipped += 1;
        }
        continue;
      }

      if (!dryRun) {
        const createdResult = await requestEntry(config, RELATION_ENTRY_ID, "data_create", {
          data: payload,
        });
        const createdId = extractRecordId(createdResult?.data || createdResult);
        applyLocalRelation(relations, createdId, payload);
      }
      created += 1;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    dryRun,
    standards: standards.length,
    migratedObjects,
    created,
    updated,
    skipped,
  }));
}

function buildConfig() {
  return {
    baseUrl: String(process.env.BES_BASE_URL || "https://ahyg.online-office.net/openapi/v1").trim(),
    defaultAppId: String(process.env.BES_APP_ID || "59b376f42fee5822c6ac906a").trim(),
    apiKey: String(process.env.BES_API_KEY || "").trim(),
  };
}

function mapRuleRecord(record) {
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, RULE_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, RULE_FIELD.name)),
    category: toDisplayText(getAliasRawValue(record, RULE_FIELD.category)),
  };
}

function mapStandardRecord(record) {
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.name)),
    category: toDisplayText(getAliasRawValue(record, STANDARD_FIELD.category)),
    applicableDeviceType: normalizeApplicableDeviceType(toDisplayText(getAliasRawValue(record, STANDARD_FIELD.applicableDeviceType))),
  };
}

function mapDeviceRecord(record) {
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.name)),
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
    usageLocation,
    storageLocation,
    location: storageLocation || usageLocation,
    inspectStandardId: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.inspectStandardId)),
  };
}

function mapSiteRecord(record) {
  const code = toDisplayText(getAliasRawValue(record, SITE_FIELD.code));
  const name = toDisplayText(getAliasRawValue(record, SITE_FIELD.name));
  const area = toDisplayText(getAliasRawValue(record, SITE_FIELD.area));
  return {
    id: extractRecordId(record) || code || name,
    code,
    name,
    area,
    location: name,
  };
}

function mapRelationRecord(record) {
  return {
    id: extractRecordId(record),
    cloudId: extractRecordId(record),
    standardId: toDisplayText(getAliasRawValue(record, RELATION_FIELD.standardId)),
    standardCode: toDisplayText(getAliasRawValue(record, RELATION_FIELD.standardCode)),
    ruleId: toDisplayText(getAliasRawValue(record, RELATION_FIELD.ruleId)),
    objectType: normalizeRelationObjectType(getAliasRawValue(record, RELATION_FIELD.objectType)),
    objectId: toDisplayText(getAliasRawValue(record, RELATION_FIELD.objectId)),
    objectCode: toDisplayText(getAliasRawValue(record, RELATION_FIELD.objectCode)),
    status: toDisplayText(getAliasRawValue(record, RELATION_FIELD.status)) || "启用",
  };
}

function deriveRelatedSites(chemicals, sites) {
  const seen = new Set();
  const output = [];
  (Array.isArray(chemicals) ? chemicals : []).forEach((chemical) => {
    const site = getSiteForChemical(chemical, sites);
    if (!site) {
      return;
    }
    const key = `${String(site.id || "").trim()}|${String(site.code || "").trim()}|${String(site.name || "").trim()}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    output.push(site);
  });
  return output;
}

function getSiteForChemical(chemical, sites) {
  const storage = String(chemical?.location || chemical?.storageLocation || "").trim();
  const matched = (Array.isArray(sites) ? sites : []).find((site) => {
    return isSameStoreName(site.name, storage) || isSameStoreName(site.code, storage);
  });
  if (matched) {
    return matched;
  }
  if (!storage) {
    return null;
  }
  return {
    id: `store:${normalizeCompareText(storage)}`,
    code: storage,
    name: storage,
    area: chemical?.usageLocation || "",
    location: storage,
  };
}

function buildRelationPayload(standard, target, relationObjectType, ruleId) {
  return {
    [RELATION_FIELD.standardId]: standard.id || "",
    [RELATION_FIELD.standardCode]: standard.code || "",
    [RELATION_FIELD.ruleId]: ruleId || "",
    [RELATION_FIELD.objectType]: normalizeRelationObjectType(relationObjectType),
    [RELATION_FIELD.objectId]: target.id || "",
    [RELATION_FIELD.objectCode]: target.code || target.name || "",
    [RELATION_FIELD.status]: "启用",
  };
}

function resolveRuleIdForStandard(standard, rules) {
  const binding = normalizeRuleBindingText(standard?.category);
  if (!binding) {
    return "";
  }
  const matched = (Array.isArray(rules) ? rules : []).find((rule) => {
    return (
      binding === normalizeRuleBindingText(rule.name) ||
      binding === normalizeRuleBindingText(rule.code) ||
      binding === normalizeRuleBindingText(rule.category)
    );
  });
  return matched?.id || "";
}

function findExistingRelation(relations, payload) {
  const standardId = toDisplayText(payload[RELATION_FIELD.standardId]);
  const objectType = normalizeRelationObjectType(payload[RELATION_FIELD.objectType]);
  const objectId = toDisplayText(payload[RELATION_FIELD.objectId]);
  const objectCode = toDisplayText(payload[RELATION_FIELD.objectCode]);
  return (Array.isArray(relations) ? relations : []).find((item) => {
    const sameStandard = String(item.standardId || "") === standardId;
    const sameType = normalizeRelationObjectType(item.objectType) === objectType;
    const sameId = objectId && String(item.objectId || "") === objectId;
    const sameCode = objectCode && String(item.objectCode || "") === objectCode;
    return sameStandard && sameType && (sameId || sameCode);
  }) || null;
}

function relationNeedsUpdate(existing, payload) {
  return (
    toDisplayText(existing.standardCode) !== toDisplayText(payload[RELATION_FIELD.standardCode]) ||
    toDisplayText(existing.ruleId) !== toDisplayText(payload[RELATION_FIELD.ruleId]) ||
    normalizeRelationObjectType(existing.objectType) !== normalizeRelationObjectType(payload[RELATION_FIELD.objectType]) ||
    toDisplayText(existing.objectId) !== toDisplayText(payload[RELATION_FIELD.objectId]) ||
    toDisplayText(existing.objectCode) !== toDisplayText(payload[RELATION_FIELD.objectCode]) ||
    toDisplayText(existing.status || "启用") !== toDisplayText(payload[RELATION_FIELD.status] || "启用")
  );
}

function applyLocalRelation(relations, cloudId, payload) {
  const normalized = {
    id: cloudId || "",
    cloudId: cloudId || "",
    standardId: toDisplayText(payload[RELATION_FIELD.standardId]),
    standardCode: toDisplayText(payload[RELATION_FIELD.standardCode]),
    ruleId: toDisplayText(payload[RELATION_FIELD.ruleId]),
    objectType: normalizeRelationObjectType(payload[RELATION_FIELD.objectType]),
    objectId: toDisplayText(payload[RELATION_FIELD.objectId]),
    objectCode: toDisplayText(payload[RELATION_FIELD.objectCode]),
    status: toDisplayText(payload[RELATION_FIELD.status]) || "启用",
  };
  const index = relations.findIndex((item) => item.cloudId && cloudId && item.cloudId === cloudId);
  if (index >= 0) {
    relations.splice(index, 1, normalized);
    return;
  }
  relations.push(normalized);
}

function normalizeApplicableDeviceType(value) {
  const text = toDisplayText(value);
  if (text.includes("危") || text.includes("化")) {
    return "危化品";
  }
  return "设备";
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

function normalizeRuleBindingText(value) {
  return toDisplayText(value).replace(/\s+/g, "").trim().toLowerCase();
}

function isSameStoreName(left, right) {
  const a = normalizeCompareText(left);
  const b = normalizeCompareText(right);
  return Boolean(a && b && a === b);
}

function normalizeCompareText(value) {
  return toDisplayText(value).replace(/\s+/g, "").trim().toLowerCase();
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

  throw lastError || new Error(`读取百数云表单失败：${entryId}`);
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
      if (found !== "" && found !== undefined && found !== null) {
        return found;
      }
    }
    return "";
  }
  if (Object.prototype.hasOwnProperty.call(value, alias)) {
    return value[alias];
  }
  for (const child of Object.values(value)) {
    const found = findAliasInObject(child, alias);
    if (found !== "" && found !== undefined && found !== null) {
      return found;
    }
  }
  return "";
}

function toDisplayText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (Array.isArray(value)) {
    return value.map((item) => toDisplayText(item)).filter(Boolean).join("、");
  }
  if (typeof value === "object") {
    const candidates = [value.name, value.text, value.label, value.value, value.code, value._id, value.id];
    for (const item of candidates) {
      if (item !== undefined && item !== null && String(item).trim()) {
        return String(item).trim();
      }
    }
    return "";
  }
  return String(value).trim();
}

function safeJsonParse(text) {
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function isApiSuccess(result) {
  if (!result || typeof result !== "object") {
    return false;
  }
  if (result.code !== undefined) {
    return Number(result.code) === 200;
  }
  if (result.errcode !== undefined) {
    return Number(result.errcode) === 0;
  }
  if (result.status !== undefined) {
    return Number(result.status) === 1 || Number(result.status) === 200;
  }
  return true;
}

function extractApiMessage(result) {
  if (!result || typeof result !== "object") {
    return "";
  }
  return (
    result.msg ||
    result.message ||
    result.error ||
    result.errmsg ||
    (result.data && result.data.error_message) ||
    ""
  );
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    message: error?.message || String(error),
  }));
  process.exitCode = 1;
});
