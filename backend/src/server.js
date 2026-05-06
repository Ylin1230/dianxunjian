const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { registerRuleConfigRoutes } = require("./rule-config");
const { registerInspectionReportRoutes } = require("./inspection-report");
const { registerQrDecodeRoutes } = require("./qr-decode");
const { registerSafetyCheckRoutes } = require("./safety-check");

dotenv.config();

const app = express();
const PARTNER_TRAINING_ENTRY_ID = "c40d44a99118a61bd17f9325";

const config = {
  host: String(process.env.HOST || "0.0.0.0").trim() || "0.0.0.0",
  port: Number(process.env.PORT || 3001),
  baseUrl: stripTrailingSlash(process.env.BES_BASE_URL || "https://ahyg.online-office.net/openapi/v1"),
  publicBaseUrl: stripTrailingSlash(process.env.PUBLIC_BASE_URL || ""),
  defaultAppId: String(process.env.BES_APP_ID || "59b376f42fee5822c6ac906a").trim(),
  defaultEntryId: String(process.env.BES_ENTRY_ID || "38104b6c9d74ce86a7c395b6").trim(),
  memberAppId: String(process.env.BES_MEMBER_APP_ID || "5f673d49dd6c91aa61599674").trim(),
  memberEntryId: String(process.env.BES_MEMBER_ENTRY_ID || "b000000000000000000000001").trim(),
  apiKey: String(process.env.BES_API_KEY || "").trim(),
  corsOrigin: String(process.env.CORS_ORIGIN || "*").trim(),
  debugProxy: String(process.env.DEBUG_PROXY || "0").trim() === "1",
  staticRoot: resolveStaticRoot(process.env.FRONTEND_ROOT),
  taskStoreMode: normalizeTaskStoreMode(process.env.TASK_STORE_MODE || process.env.TASK_STORE || "bes"),
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

const allowAllOrigins = config.corsOrigin === "*";
const allowedOrigins = new Set(
  config.corsOrigin
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (allowAllOrigins || !origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "API-Key", "api_key", "X-Access-Token", "X-User-Id"],
  })
);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false }));
app.set("trust proxy", true);

registerRuleConfigRoutes(app, config);
registerInspectionReportRoutes(app, config);
registerQrDecodeRoutes(app, config);
registerSafetyCheckRoutes(app, config);

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mode: "proxy",
    baseUrl: config.baseUrl,
    defaultAppId: config.defaultAppId,
    defaultEntryId: config.defaultEntryId,
    taskStoreMode: config.taskStoreMode,
    taskDbConfigured: Boolean(config.taskDb.host && config.taskDb.database && config.taskDb.user),
    taskDbClient: config.taskDb.client,
    taskDbHost: maskHost(config.taskDb.host),
    taskDbName: config.taskDb.database,
    taskDbTable: config.taskDb.taskTable,
    hasApiKey: Boolean(config.apiKey),
    apiKeyMasked: maskSecret(config.apiKey),
    now: new Date().toISOString(),
  });
});

app.get("/api/public-base-url", (req, res) => {
  const requestBaseUrl = stripTrailingSlash(getPublicBaseUrl(req));
  const lanBaseUrls = getLocalNetworkBaseUrls(config.port);
  const preferredBaseUrl = stripTrailingSlash(
    config.publicBaseUrl ||
      (!isLoopbackBaseUrl(requestBaseUrl) ? requestBaseUrl : lanBaseUrls[0]) ||
      requestBaseUrl
  );

  res.json({
    ok: true,
    data: {
      baseUrl: preferredBaseUrl,
      requestBaseUrl,
      lanBaseUrls,
      source: config.publicBaseUrl
        ? "env"
        : !isLoopbackBaseUrl(requestBaseUrl)
          ? "request"
          : lanBaseUrls.length
            ? "lan"
            : "request",
    },
  });
});

app.get("/api/contacts/departments", async (req, res) => {
  const deptId = toOptionalText(req.query.dept_id);
  const hasChild = toBoolean(req.query.has_child, true);

  try {
    const upstreamResult = await requestOpenApi(config, req, {
      path: "/department/department_list",
      method: "POST",
      body: {
        dept_id: deptId || "",
        has_child: hasChild,
      },
    });

    const rawRows = extractObjectArray(upstreamResult, ["departments"]);
    const departments = normalizeDepartmentRows(rawRows);

    res.json({
      ok: true,
      data: {
        departments,
        count: departments.length,
      },
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      message: "查询部门失败",
      detail: error.message,
    });
  }
});

app.get("/api/contacts/users", async (req, res) => {
  const deptIdFilter = toOptionalText(req.query.dept_id);

  try {
    const upstreamResult = await requestOpenApi(config, req, {
      path: "/user/user_list",
      method: "POST",
      body: {},
    });

    const rawRows = extractObjectArray(upstreamResult, ["users"]);
    let users = normalizeUserRows(rawRows);

    if (deptIdFilter) {
      users = users.filter((user) => {
        if (user.mainDeptId && user.mainDeptId === deptIdFilter) {
          return true;
        }
        return user.departments.some((dept) => dept.deptId === deptIdFilter);
      });
    }

    res.json({
      ok: true,
      data: {
        users,
        count: users.length,
      },
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      message: "查询成员失败",
      detail: error.message,
    });
  }
});

app.get("/api/public/entry-links/partner-training", (req, res) => {
  const base = getPublicBaseUrl(req);
  const unitId = toOptionalText(req.query.unit_id);
  const unitName = toOptionalText(req.query.unit_name);
  const mode = toOptionalText(req.query.mode) || "static";
  const url = new URL("/h5/partner-training", base);
  url.searchParams.set("from", "qr");
  url.searchParams.set("new", "1");
  url.searchParams.set("source", "wechat");
  url.searchParams.set("mode", mode === "prefill" ? "prefill" : "static");
  if (unitId) {
    url.searchParams.set("unit_id", unitId);
  }
  if (unitName) {
    url.searchParams.set("unit_name", unitName);
  }
  res.json({
    ok: true,
    data: {
      url: url.toString(),
      mode: mode === "prefill" ? "prefill" : "static",
      unitId: unitId || "",
      unitName: unitName || "",
    },
  });
});

app.post("/api/partner-training/signature-upload", async (req, res) => {
  const dataUrl = String((req.body && req.body.dataUrl) || "").trim();
  const inputName = toOptionalText(req.body && req.body.name);

  if (!dataUrl) {
    res.status(400).json({ ok: false, message: "缺少签字图片数据" });
    return;
  }

  let tempFilePath = "";

  try {
    const parsed = parseImageDataUrl(dataUrl);
    const tempDir = path.join(config.staticRoot, "__partner-training-signatures");
    fs.mkdirSync(tempDir, { recursive: true });

    const fileName = buildTempUploadFileName(inputName || "signature", parsed.ext);
    tempFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(tempFilePath, parsed.buffer);

    const publicBaseUrl = getPublicBaseUrl(req);
    if (!isExternallyReachableBaseUrl(publicBaseUrl)) {
      throw new Error(
        "当前服务器地址属于本地或内网地址，百数云无法回抓签字图片。请将系统部署到公网 HTTPS 域名，并在 backend/.env 中配置 PUBLIC_BASE_URL 后再使用手写签字。"
      );
    }

    const publicUrl = new URL(`/__partner-training-signatures/${encodeURIComponent(fileName)}`, publicBaseUrl).toString();
    const upstreamResult = await requestOpenApi(config, req, {
      path: `/app/${config.defaultAppId}/entry/${PARTNER_TRAINING_ENTRY_ID}/upload_file`,
      method: "POST",
      body: [
        {
          name: fileName,
          url: publicUrl,
        },
      ],
    });

    const files = extractObjectArray(upstreamResult, ["data"]).filter((item) => item && typeof item === "object");
    if (!files.length) {
      throw new Error("上传成功但未返回文件信息");
    }

    res.json({
      ok: true,
      data: {
        files,
        file: files[0],
        sourceUrl: publicUrl,
      },
    });
  } catch (error) {
    res.status(502).json({
      ok: false,
      message: "签字上传失败",
      detail: error.message,
    });
  } finally {
    if (tempFilePath) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // ignore cleanup errors
      }
    }
  }
});

// 前端透传路径：/api/app/:appId/entry/:entryId/:action
app.all("/api/app/:appId/entry/:entryId/:action", async (req, res) => {
  const appId = String(req.params.appId || "").trim() || config.defaultAppId;
  const entryId = String(req.params.entryId || "").trim() || config.defaultEntryId;
  const action = String(req.params.action || "").trim();

  if (!appId || !entryId || !action) {
    res.status(400).json({ ok: false, message: "missing appId/entryId/action" });
    return;
  }

  const upstreamUrl = buildUpstreamUrl(config.baseUrl, appId, entryId, action);
  const method = req.method.toUpperCase();

  const url = new URL(upstreamUrl);
  Object.entries(req.query || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
      return;
    }
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = buildUpstreamHeaders(req, config.apiKey);
  const requestInit = {
    method,
    headers,
  };

  if (!isBodylessMethod(method)) {
    requestInit.body = JSON.stringify(req.body || {});
  }

  if (config.debugProxy && shouldLogAction(action)) {
    console.log(`[device-ledger-backend] -> ${method} ${url.toString()}`);
    if (!isBodylessMethod(method)) {
      console.log(`[device-ledger-backend] request body: ${previewText(requestInit.body)}`);
    }
  }

  try {
    const upstreamResp = await fetch(url, requestInit);
    const contentType = upstreamResp.headers.get("content-type");
    const text = await upstreamResp.text();

    if (config.debugProxy && shouldLogAction(action)) {
      console.log(`[device-ledger-backend] <- ${upstreamResp.status} ${action}`);
      console.log(`[device-ledger-backend] response: ${previewText(text)}`);
    }

    if (contentType) {
      res.set("content-type", contentType);
    }

    res.status(upstreamResp.status).send(text);
  } catch (error) {
    res.status(502).json({
      ok: false,
      message: "proxy request failed",
      detail: error.message,
      target: `${method} ${url.toString()}`,
    });
  }
});

app.get("/", (req, res) => {
  sendStaticHtml(res, config.staticRoot, "index.html");
});

app.get("/h5/partner-training", (req, res) => {
  sendStaticHtml(res, config.staticRoot, "partner-entry-training-form.html");
});

app.get("/h5/partner-training-admin", (req, res) => {
  sendStaticHtml(res, config.staticRoot, "partner-entry-training.html");
});

app.get("/safety-check", (req, res) => {
  sendStaticHtml(res, config.staticRoot, "safety-check-template.html");
});

app.get("/safety-check-template", (req, res) => {
  sendStaticHtml(res, config.staticRoot, "safety-check-template.html");
});

app.get("/safety-check-task", (req, res) => {
  sendStaticHtml(res, config.staticRoot, "safety-check-task.html");
});

app.get("/safety-check-record", (req, res) => {
  sendStaticHtml(res, config.staticRoot, "safety-check-record.html");
});

app.get("/safety-check-hazard", (req, res) => {
  res.status(410).type("text/plain; charset=utf-8").send("隐患整改已改为百数云流程处理，请在流程中心办理。");
});

app.get("/h5/safety-check", (req, res) => {
  sendStaticHtml(res, config.staticRoot, "safety-check-mobile.html");
});

app.use(
  express.static(config.staticRoot, {
    index: false,
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (String(filePath || "").endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  })
);

app.use((err, req, res, next) => {
  if (!err) {
    next();
    return;
  }
  res.status(500).json({ ok: false, message: err.message || "internal server error" });
});

app.listen(config.port, config.host, () => {
  console.log(`[device-ledger-backend] running on http://${config.host}:${config.port}`);
  console.log(`[device-ledger-backend] local check http://127.0.0.1:${config.port}`);
  console.log(`[device-ledger-backend] proxy target ${config.baseUrl}`);
  console.log(`[device-ledger-backend] default app/entry ${config.defaultAppId}/${config.defaultEntryId}`);
  console.log(`[device-ledger-backend] static root ${config.staticRoot}`);
  if (config.debugProxy) {
    console.log("[device-ledger-backend] debug proxy logging enabled");
  }
});

function resolveStaticRoot(value) {
  const raw = String(value || "").trim();
  if (raw) {
    return path.resolve(raw);
  }
  return path.resolve(__dirname, "../../");
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function maskSecret(secret) {
  const text = String(secret || "");
  if (!text) {
    return "";
  }
  if (text.length <= 8) {
    return `${text.slice(0, 1)}***${text.slice(-1)}`;
  }
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
}

function maskHost(host) {
  const text = String(host || "").trim();
  if (!text) {
    return "";
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(text)) {
    return text.replace(/\.\d{1,3}$/, ".*");
  }
  const parts = text.split(".");
  if (parts.length <= 2) {
    return text;
  }
  return `${parts[0]}.***.${parts.slice(-1)[0]}`;
}

function normalizeTaskStoreMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return ["bes", "dual", "db"].includes(mode) ? mode : "bes";
}

function buildUpstreamUrl(baseUrl, appId, entryId, action) {
  return `${stripTrailingSlash(baseUrl)}/app/${encodeURIComponent(appId)}/entry/${encodeURIComponent(entryId)}/${encodeURIComponent(action)}`;
}

function isBodylessMethod(method) {
  return method === "GET" || method === "HEAD";
}

function buildUpstreamHeaders(req, apiKey) {
  const headers = {
    "Content-Type": "application/json",
  };

  const key = String(apiKey || "").trim();
  if (key) {
    headers.Authorization = key.startsWith("Bearer ") ? key : `Bearer ${key}`;
    headers["X-API-Key"] = key;
    headers["API-Key"] = key;
    headers.api_key = key;
  }

  const passthroughHeaders = ["x-access-token", "x-user-id", "x-tenant-id"];
  passthroughHeaders.forEach((name) => {
    const value = req.headers[name];
    if (value) {
      headers[name] = Array.isArray(value) ? value.join(",") : String(value);
    }
  });

  return headers;
}

function shouldLogAction(action) {
  return ["data", "data_create", "data_update", "data_delete"].includes(String(action || "").trim());
}

function previewText(value, maxLength = 500) {
  const text = String(value || "");
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}...`;
}

function sendStaticHtml(res, staticRoot, fileName) {
  const root = path.resolve(staticRoot);
  const target = path.resolve(root, String(fileName || ""));
  if (!target.startsWith(root + path.sep) && target !== root) {
    res.status(400).send("invalid path");
    return;
  }
  if (!fs.existsSync(target)) {
    res.status(404).send("not found");
    return;
  }
  res.sendFile(target);
}

function getPublicBaseUrl(req) {
  if (config.publicBaseUrl) {
    return config.publicBaseUrl;
  }
  const protoHeader = req.get("x-forwarded-proto");
  const hostHeader = req.get("x-forwarded-host") || req.get("host");
  const protocol = protoHeader ? String(protoHeader).split(",")[0].trim() : req.protocol || "http";
  const host = String(hostHeader || `localhost:${config.port}`).split(",")[0].trim();
  return `${protocol}://${host}`;
}

function getLocalNetworkBaseUrls(port) {
  const urls = [];
  const seen = new Set();
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach((entries) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.internal || entry.family !== "IPv4") {
        return;
      }
      const address = String(entry.address || "").trim();
      if (!address || address.startsWith("127.") || address.startsWith("169.254.")) {
        return;
      }
      const url = `http://${address}:${port}`;
      if (!seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    });
  });
  return urls;
}

function isLoopbackBaseUrl(value) {
  try {
    const url = new URL(String(value || ""));
    const hostname = String(url.hostname || "").trim().toLowerCase();
    return ["localhost", "0.0.0.0", "::1", "[::1]"].includes(hostname) || hostname.startsWith("127.");
  } catch {
    return true;
  }
}

function isExternallyReachableBaseUrl(value) {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return false;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return false;
  }

  const hostname = String(parsed.hostname || "").trim().toLowerCase();
  if (!hostname) {
    return false;
  }

  return !isLocalOrPrivateHost(hostname);
}

function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host) {
    return true;
  }

  if (["localhost", "0.0.0.0", "::1", "[::1]"].includes(host)) {
    return true;
  }
  if (host.endsWith(".local")) {
    return true;
  }
  if (host.startsWith("127.")) {
    return true;
  }
  if (host.startsWith("10.")) {
    return true;
  }
  if (host.startsWith("192.168.")) {
    return true;
  }
  if (host.startsWith("169.254.")) {
    return true;
  }

  const parts = host.split(".");
  if (parts.length === 4 && parts.every((item) => /^\d+$/.test(item))) {
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    if (first === 172 && second >= 16 && second <= 31) {
      return true;
    }
  }

  return false;
}

async function requestOpenApi(config, req, { path, method = "POST", body = {}, query = {} }) {
  const cleanPath = String(path || "").replace(/^\/+/, "");
  const upstreamUrl = `${stripTrailingSlash(config.baseUrl)}/${cleanPath}`;
  const url = new URL(upstreamUrl);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  const httpMethod = String(method || "POST").toUpperCase();
  const requestInit = {
    method: httpMethod,
    headers: buildUpstreamHeaders(req, config.apiKey),
  };

  if (!isBodylessMethod(httpMethod)) {
    requestInit.body = JSON.stringify(body || {});
  }

  const response = await fetch(url.toString(), requestInit);
  const text = await response.text();
  const parsed = safeJsonParse(text);

  if (!response.ok) {
    throw new Error(extractErrorMessage(parsed) || text || `HTTP ${response.status}`);
  }

  if (parsed && typeof parsed === "object") {
    const code = String(parsed.code ?? parsed.errcode ?? parsed.status ?? "").trim().toLowerCase();
    if (code && !["0", "200", "ok", "success", "true"].includes(code)) {
      throw new Error(extractErrorMessage(parsed) || "上游接口返回失败");
    }
  }

  return parsed && typeof parsed === "object" ? parsed : { raw: text };
}

function extractObjectArray(source, preferredKeys = []) {
  const queue = [source];
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

    const keys = [...preferredKeys, "data", "list", "rows", "items", "result", "entry_data_list"];
    for (const key of keys) {
      const value = current[key];
      if (Array.isArray(value) && (!value.length || typeof value[0] === "object")) {
        return value;
      }
      if (value && typeof value === "object") {
        queue.push(value);
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

function normalizeDepartmentRows(rows) {
  const output = [];
  const seen = new Set();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }

    const deptId = readFirstText(row, ["dept_id", "deptId", "id", "_id", "value", "key"]);
    const name = readFirstText(row, ["name", "dept_name", "label", "title"]);
    if (!deptId && !name) {
      return;
    }

    const key = deptId || name;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);

    output.push({
      deptId,
      name,
      parentId: readFirstText(row, ["parent_id", "parentId", "parent_dept_id"]),
      parentNo: readFirstText(row, ["parent_no", "parentNo"]),
      deptNo: readFirstText(row, ["dept_no", "deptNo"]),
    });
  });

  return sortDepartmentsByHierarchy(output);
}

function sortDepartmentsByHierarchy(list) {
  const rows = Array.isArray(list) ? list.filter((item) => item && typeof item === "object") : [];
  if (!rows.length) {
    return [];
  }

  const compareDept = (a, b) => {
    const aNo = Number(a?.deptNo);
    const bNo = Number(b?.deptNo);
    const hasANo = Number.isFinite(aNo);
    const hasBNo = Number.isFinite(bNo);
    if (hasANo && hasBNo && aNo !== bNo) {
      return aNo - bNo;
    }
    if (hasANo !== hasBNo) {
      return hasANo ? -1 : 1;
    }
    return String(a?.name || a?.deptId || "").localeCompare(String(b?.name || b?.deptId || ""), "zh-Hans-CN");
  };

  const idSet = new Set(rows.map((item) => String(item.deptId || "").trim()).filter(Boolean));
  const childrenMap = new Map();
  const keyOf = (item) => String(item.deptId || item.name || "").trim();
  const normalizeParentId = (item) => {
    const parentId = String(item.parentId || "").trim();
    if (!parentId) {
      return "";
    }
    return idSet.has(parentId) ? parentId : "";
  };

  rows.forEach((item) => {
    const parentId = normalizeParentId(item);
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId).push(item);
  });
  childrenMap.forEach((items) => items.sort(compareDept));

  const ordered = [];
  const visited = new Set();
  const walk = (parentId) => {
    const children = childrenMap.get(parentId) || [];
    children.forEach((item) => {
      const key = keyOf(item);
      if (!key || visited.has(key)) {
        return;
      }
      visited.add(key);
      ordered.push(item);
      const id = String(item.deptId || "").trim();
      if (id) {
        walk(id);
      }
    });
  };

  walk("");

  rows
    .filter((item) => {
      const key = keyOf(item);
      return key && !visited.has(key);
    })
    .sort(compareDept)
    .forEach((item) => ordered.push(item));

  return ordered;
}

function normalizeUserRows(rows) {
  const output = [];
  const seen = new Set();

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== "object") {
      return;
    }

    const userId = readFirstText(row, ["user_id", "userId", "id", "_id", "uniqueid", "uniqueId"]);
    const name = readFirstText(row, ["name", "user_name", "userName", "nickname", "title"]);
    if (!userId && !name) {
      return;
    }

    const key = userId || name;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);

    const rawDepartments = Array.isArray(row.departments) ? row.departments : [];
    const departments = normalizeDepartmentRows(rawDepartments);

    const mainDeptId =
      readFirstText(row, ["main_department_id", "mainDeptId", "mainDepartmentId", "dept_id"]) ||
      (departments[0] ? departments[0].deptId : "");
    const mainDeptName =
      readFirstText(row, ["main_department_name", "mainDeptName", "mainDepartmentName", "dept_name"]) ||
      (departments[0] ? departments[0].name : "");

    output.push({
      userId,
      name,
      account: readFirstText(row, ["account", "username", "login_name", "loginName"]),
      mobile: readFirstText(row, ["mobile", "phone", "tel"]),
      email: readFirstText(row, ["email", "mail"]),
      category: readFirstText(row, ["category", "status"]),
      mainDeptId,
      mainDeptName,
      departments,
    });
  });

  return output.sort((a, b) => (a.name || a.userId).localeCompare(b.name || b.userId, "zh-Hans-CN"));
}

function readFirstText(source, keys) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }
    const text = String(source[key] || "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function toOptionalText(value) {
  return String(value || "").trim();
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  const text = String(value || "").trim().toLowerCase();
  if (!text) {
    return fallback;
  }
  if (["1", "true", "yes", "y", "on"].includes(text)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(text)) {
    return false;
  }
  return fallback;
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

function extractErrorMessage(payload) {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const candidates = [
    payload.message,
    payload.msg,
    payload.error,
    payload.errmsg,
    payload.detail,
    payload.error_msg,
    payload.errorMsg,
    payload.data && payload.data.message,
    payload.data && payload.data.msg,
  ];
  for (const value of candidates) {
    const text = String(value || "").trim();
    if (text) {
      return text;
    }
  }
  return "";
}

function parseImageDataUrl(value) {
  const text = String(value || "").trim();
  const match = text.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([\s\S]+)$/i);
  if (!match) {
    throw new Error("签字图片格式不正确");
  }

  const mime = String(match[1] || "").toLowerCase();
  const base64 = String(match[2] || "").trim();
  if (!base64) {
    throw new Error("签字图片数据为空");
  }

  return {
    mime,
    ext: getImageExtensionByMime(mime),
    buffer: Buffer.from(base64, "base64"),
  };
}

function getImageExtensionByMime(mime) {
  const value = String(mime || "").toLowerCase();
  if (value === "image/jpeg") {
    return "jpg";
  }
  if (value === "image/webp") {
    return "webp";
  }
  return "png";
}

function buildTempUploadFileName(baseName, ext) {
  const safeBase = String(baseName || "signature")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "signature";
  const suffix = crypto.randomBytes(6).toString("hex");
  return `${safeBase}_${Date.now()}_${suffix}.${String(ext || "png").replace(/[^a-z0-9]+/gi, "") || "png"}`;
}
