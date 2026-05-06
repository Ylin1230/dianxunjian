const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const TEMPLATE_ENTRY_ID = "5eee49dd8579f06742559b67";
const ITEM_ENTRY_ID = "558b4da39a1428763e7f1c0f";
const TASK_ENTRY_ID = "7fac4dafa16b67b0180d815a";
const SUBMISSION_ENTRY_ID = "d44c450e8b584712ca6fb6e1";
const SUBMISSION_DETAIL_ENTRY_ID = "f4a04cff972b4731564f9994";
const HAZARD_ENTRY_ID = "2759402bb574ebe89f9c0ea6";

const TEMPLATE_FIELD = {
  code: "_widget_1776819425913",
  name: "_widget_1776819425927",
  category: "_widget_1776819426057",
  target: "_widget_1776819425977",
  cycle: "_widget_1776819426108",
  defaultDept: "_widget_1776819426143",
  defaultUser: "_widget_1776819426181",
  scanRequired: "_widget_1776819426275",
  enabled: "_widget_1776819426315",
  version: "_widget_1776819426366",
  effectiveDate: "_widget_1776819426385",
  remark: "_widget_1776819426409",
};

const ITEM_FIELD = {
  templateId: "_widget_1776820088432",
  templateName: "_widget_1776820088451",
  seq: "_widget_1776820088506",
  category: "_widget_1776820088591",
  item: "_widget_1776820088628",
  content: "_widget_1776820088698",
  standard: "_widget_1776820088647",
  resultType: "_widget_1776820088763",
  resultOptions: "_widget_1776820088817",
  keyItem: "_widget_1776820088883",
  abnormalDescRequired: "_widget_1776820088836",
  abnormalPhotoRequired: "_widget_1776820088958",
  riskLevel: "_widget_1776820089009",
  deadlineDays: "_widget_1776820089071",
  defaultDept: "_widget_1776820089092",
  enabled: "_widget_1776820089135",
  score: "_widget_1777281744340",
};

const TASK_FIELD = {
  code: "_widget_1776820512068",
  templateId: "_widget_1776820512095",
  templateName: "_widget_1776820512114",
  plannedDate: "_widget_1776820512133",
  deadline: "_widget_1776820512157",
  target: "_widget_1776820512191",
  ownerDept: "_widget_1776820512210",
  ownerUser: "_widget_1776820512248",
  status: "_widget_1776820512324",
  submitCount: "_widget_1776820512356",
  overdue: "_widget_1776820512377",
  source: "_widget_1776820512441",
  remark: "_widget_1776820512471",
};

const SUBMISSION_FIELD = {
  code: "_widget_1776820784168",
  taskId: "_widget_1776820784195",
  templateId: "_widget_1776820784214",
  templateName: "_widget_1776820784233",
  target: "_widget_1776820784252",
  inspector: "_widget_1776820784271",
  startTime: "_widget_1776820784290",
  endTime: "_widget_1776820784314",
  result: "_widget_1776820784361",
  abnormalCount: "_widget_1776820784401",
  photos: "_widget_1776820784422",
  location: "_widget_1776820784470",
  remark: "_widget_1776820784490",
  reviewRequired: "_widget_1776820784507",
  reviewer: "_widget_1776820784547",
  status: "_widget_1776820784566",
};

const SUBMISSION_DETAIL_FIELD = {
  submissionId: "_widget_1776821048168",
  itemId: "_widget_1776821048223",
  itemName: "_widget_1777443963606",
  seqSnapshot: "_widget_1776821048242",
  target: "_widget_1776821048284",
  result: "_widget_1776821048649",
  serialNo: "_widget_1776992212542",
  submitTime: "_widget_1776821048859",
  abnormalDesc: "_widget_1776821048668",
  handling: "_widget_1776821048685",
  abnormalPhotos: "_widget_1776821048718",
  hazardId: "_widget_1776821048840",
};

const HAZARD_FIELD = {
  code: "_widget_1776821559042",
  submissionId: "_widget_1776821559056",
  submissionDetailId: "_widget_1776821559100",
  title: "_widget_1776821861964",
  description: "_widget_1776821861983",
  riskLevel: "_widget_1776821862000",
  target: "_widget_1776821862029",
  ownerDept: "_widget_1776821862048",
  ownerUser: "_widget_1776821862067",
  deadline: "_widget_1776821862144",
  requirement: "_widget_1776821862168",
  status: "_widget_1776821862185",
  actionDesc: "_widget_1776821862240",
  beforePhotos: "_widget_1776821862257",
  afterPhotos: "_widget_1776821862305",
  verifier: "_widget_1776821862491",
  verifyComment: "_widget_1776821862528",
  closedAt: "_widget_1776821862545",
  overdue: "_widget_1776821862569",
  source: "_widget_1777338377500",
};

const DEFAULT_OPTIONS = {
  templateCategories: ["综合检查", "专项检查", "设备设施", "消防燃气", "电气", "生活后勤", "相关方"],
  cycles: ["临时", "日检", "周检", "月检", "季度", "半年", "年度", "节前", "节后"],
  resultTypes: ["正常异常", "正常异常不适用", "数值录入", "文本说明"],
  yesNo: ["是", "否"],
  enabled: ["启用", "停用"],
  riskLevels: ["一般", "较大", "重大"],
  taskStatuses: ["待检查", "检查中", "已完成", "异常待整改", "已关闭", "已取消"],
  taskSources: ["系统周期生成", "手工创建", "扫码触发", "临时检查"],
  submissionStatuses: ["草稿", "已提交", "待复核", "已复核", "已作废"],
  hazardStatuses: ["待整改", "整改中", "待验收", "已关闭", "已退回", "已延期"],
};

function registerSafetyCheckRoutes(app, config) {
  app.get("/api/safety-check/bootstrap", asyncHandler(async (req, res) => {
    const [templateRecords, itemRecords, taskRecords, submissionRecords, detailRecords] = await Promise.all([
      fetchEntryRecords(config, TEMPLATE_ENTRY_ID),
      fetchEntryRecords(config, ITEM_ENTRY_ID),
      fetchEntryRecords(config, TASK_ENTRY_ID),
      fetchEntryRecords(config, SUBMISSION_ENTRY_ID),
      fetchEntryRecords(config, SUBMISSION_DETAIL_ENTRY_ID),
    ]);

    const templates = templateRecords.map(mapTemplateRecord).sort(sortByNameAndCode);
    const items = itemRecords.map(mapItemRecord).sort(sortByTemplateAndSeq);
    const tasks = taskRecords.map(mapTaskRecord).sort(sortByDateDesc);
    const submissions = submissionRecords.map(mapSubmissionRecord).sort(sortByDateDesc);
    const submissionDetails = detailRecords.map(mapSubmissionDetailRecord).sort(sortBySubmissionAndSeq);

    res.json({
      ok: true,
      data: {
        templates,
        items,
        tasks,
        submissions,
        submissionDetails,
        hazards: [],
        options: DEFAULT_OPTIONS,
      },
    });
  }));

  app.post("/api/safety-check/template/save", asyncHandler(async (req, res) => {
    const body = req.body || {};
    const input = normalizeTemplateInput(body.template || body.data || body);
    const details = Array.isArray(body.items) ? body.items.map(normalizeItemInput) : [];

    if (!input.name) {
      res.status(400).json({ ok: false, message: "检查类型名称不能为空" });
      return;
    }

    let templateId = input.id;
    if (templateId) {
      await requestEntry(config, TEMPLATE_ENTRY_ID, "data_update", {
        data_id: templateId,
        data: buildTemplatePayload(input),
      });
    } else {
      const createResp = await requestEntry(config, TEMPLATE_ENTRY_ID, "data_create", {
        data: buildTemplatePayload(input),
      });
      templateId = extractRecordId(createResp && createResp.data ? createResp.data : createResp);
      if (!templateId) {
        throw new Error("安全检查模板保存成功但未返回记录ID");
      }
    }

    await replaceTemplateItems(config, templateId, input.name, details);
    const [templateRecord, itemRecords] = await Promise.all([
      fetchRecordById(config, TEMPLATE_ENTRY_ID, templateId),
      fetchEntryRecords(config, ITEM_ENTRY_ID),
    ]);

    res.json({
      ok: true,
      data: {
        template: mapTemplateRecord(templateRecord),
        items: itemRecords.map(mapItemRecord).filter((item) => item.templateId === templateId).sort(sortByTemplateAndSeq),
      },
    });
  }));

  app.post("/api/safety-check/template/delete", asyncHandler(async (req, res) => {
    const id = toDisplayText((req.body || {}).id || (req.body || {}).data_id);
    if (!id) {
      res.status(400).json({ ok: false, message: "缺少模板ID" });
      return;
    }

    const itemRecords = await fetchEntryRecords(config, ITEM_ENTRY_ID);
    const relatedItems = itemRecords.map(mapItemRecord).filter((item) => item.templateId === id);
    for (const item of relatedItems) {
      await requestEntry(config, ITEM_ENTRY_ID, "data_delete", { data_id: item.id });
    }
    await requestEntry(config, TEMPLATE_ENTRY_ID, "data_delete", { data_id: id });

    res.json({ ok: true, data: { deletedId: id, deletedItemCount: relatedItems.length } });
  }));

  app.post("/api/safety-check/task/save", asyncHandler(async (req, res) => {
    const input = normalizeTaskInput((req.body || {}).task || (req.body || {}).data || req.body || {});
    if (!input.templateId || !input.templateName) {
      res.status(400).json({ ok: false, message: "请选择检查模板" });
      return;
    }

    let taskId = input.id;
    if (taskId) {
      await requestEntry(config, TASK_ENTRY_ID, "data_update", {
        data_id: taskId,
        data: buildTaskPayload(input),
      });
    } else {
      const createResp = await requestEntry(config, TASK_ENTRY_ID, "data_create", {
        data: buildTaskPayload(input),
      });
      taskId = extractRecordId(createResp && createResp.data ? createResp.data : createResp);
      if (!taskId) {
        throw new Error("安全检查任务保存成功但未返回记录ID");
      }
    }

    const task = mapTaskRecord(await fetchRecordById(config, TASK_ENTRY_ID, taskId));
    res.json({ ok: true, data: { task } });
  }));

  app.post("/api/safety-check/task/delete", asyncHandler(async (req, res) => {
    const id = toDisplayText((req.body || {}).id || (req.body || {}).data_id);
    if (!id) {
      res.status(400).json({ ok: false, message: "缺少任务ID" });
      return;
    }
    await requestEntry(config, TASK_ENTRY_ID, "data_delete", { data_id: id });
    res.json({ ok: true, data: { deletedId: id } });
  }));

  app.post("/api/safety-check/submit", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const taskId = toDisplayText(payload.taskId || payload.task_id);
    const items = Array.isArray(payload.items) ? payload.items.map(normalizeSubmitItem) : [];

    if (!items.length) {
      res.status(400).json({ ok: false, message: "检查明细不能为空" });
      return;
    }
    await attachSubmitItemPhotos(config, req, items);

    let task = null;
    if (taskId) {
      try {
        task = mapTaskRecord(await fetchRecordById(config, TASK_ENTRY_ID, taskId));
      } catch {
        task = null;
      }
    }

    const templateId = toDisplayText(payload.templateId || payload.template_id || (task && task.templateId));
    const templateName = toDisplayText(payload.templateName || payload.template_name || (task && task.templateName));
    const inspector = normalizeMemberValue(payload.inspectorId || payload.inspector || payload.inspectorName);
    const target = toDisplayText(payload.target || payload.areaObject || (task && task.target));
    const startTime = normalizeDateTime(payload.startTime || payload.startedAt) || formatDateTime(new Date());
    const endTime = normalizeDateTime(payload.endTime || payload.endedAt) || formatDateTime(new Date());
    const abnormalCount = items.filter((item) => item.isAbnormal).length;
    const result = abnormalCount > 0 ? "异常" : "正常";
    const reviewRequired = abnormalCount > 0 ? "是" : "否";
    const status = abnormalCount > 0 ? "待复核" : "已提交";

    const submissionResp = await requestEntry(config, SUBMISSION_ENTRY_ID, "data_create", {
      data: {
        [SUBMISSION_FIELD.taskId]: taskId,
        [SUBMISSION_FIELD.templateId]: templateId,
        [SUBMISSION_FIELD.templateName]: templateName,
        [SUBMISSION_FIELD.target]: target,
        [SUBMISSION_FIELD.inspector]: inspector,
        [SUBMISSION_FIELD.startTime]: startTime,
        [SUBMISSION_FIELD.endTime]: endTime,
        [SUBMISSION_FIELD.result]: result,
        [SUBMISSION_FIELD.abnormalCount]: abnormalCount,
        [SUBMISSION_FIELD.photos]: normalizePhotos(payload.photos),
        [SUBMISSION_FIELD.location]: normalizeLocation(payload.location),
        [SUBMISSION_FIELD.remark]: toDisplayText(payload.remark),
        [SUBMISSION_FIELD.reviewRequired]: reviewRequired,
        [SUBMISSION_FIELD.reviewer]: normalizeMemberValue(payload.reviewerId || payload.reviewer),
        [SUBMISSION_FIELD.status]: status,
      },
    });

    const submissionId = extractRecordId(submissionResp && submissionResp.data ? submissionResp.data : submissionResp);
    if (!submissionId) {
      throw new Error("安全检查提交主表写入成功但未返回记录ID");
    }

    const submitTime = formatDateTime(new Date());
    const hazardIds = [];
    let flowStartCount = 0;
    const hazardWarnings = [];
    let detailCount = 0;
    const flowOperator = toDisplayText(payload.operator || payload.operatorUserId || payload.user_id || payload.userId || payload.webpage_user_id);

    for (const item of items) {
      const detailResp = await requestEntry(config, SUBMISSION_DETAIL_ENTRY_ID, "data_create", {
        data: buildSubmissionDetailPayload(item, submissionId, submitTime, { target }),
      });
      const detailId = extractRecordId(detailResp && detailResp.data ? detailResp.data : detailResp);
      detailCount += 1;

      if (item.isAbnormal && detailId) {
        const hazardPayload = buildHazardFromSubmitItem(item, {
            submissionId,
            detailId,
            target,
            fallbackDept: payload.ownerDeptId || payload.ownerDept,
            fallbackUser: payload.ownerUserId || payload.ownerUser,
        });
        const hazardResult = await createHazardRecord(config, hazardPayload, { operator: flowOperator });
        const hazardResp = hazardResult.response;
        const hazardId = extractRecordId(hazardResp && hazardResp.data ? hazardResp.data : hazardResp);
        flowStartCount += 1;
        if (hazardId) {
          hazardIds.push(hazardId);
        } else {
          hazardWarnings.push("整改流程已发起，但百数云未返回流程数据ID");
        }
        const detailUpdateData = {};
        if (hazardId) {
          detailUpdateData[SUBMISSION_DETAIL_FIELD.hazardId] = hazardId;
        }
        if (Object.keys(detailUpdateData).length) {
          await requestEntry(config, SUBMISSION_DETAIL_ENTRY_ID, "data_update", {
            data_id: detailId,
            data: detailUpdateData,
          });
        }
      }
    }

    if (task && task.id) {
      await requestEntry(config, TASK_ENTRY_ID, "data_update", {
        data_id: task.id,
        data: {
          [TASK_FIELD.status]: abnormalCount > 0 ? "异常待整改" : "已完成",
          [TASK_FIELD.submitCount]: Number(task.submitCount || 0) + 1,
          [TASK_FIELD.overdue]: computeOverdue(task.deadline, abnormalCount > 0 ? "异常待整改" : "已完成"),
        },
      });
    }

    res.json({
      ok: true,
      data: {
        submissionId,
        result,
        abnormalCount,
        detailCount,
        hazardIds,
        flowIds: hazardIds,
        flowStartCount,
        hazardWarning: hazardWarnings[0] || "",
        taskStatus: task ? (abnormalCount > 0 ? "异常待整改" : "已完成") : "",
      },
    });
  }));

  app.post("/api/safety-check/hazard/save", asyncHandler(async (req, res) => {
    const body = req.body || {};
    const input = normalizeHazardInput(body.hazard || body.data || body || {});
    if (!input.title) {
      res.status(400).json({ ok: false, message: "异常检查项不能为空" });
      return;
    }

    let hazardId = input.id;
    const action = toDisplayText(body.action || (body.flow && body.flow.action));
    const payload = hazardId ? buildHazardActionPayload(input, action) : buildHazardPayload(input);
    let updateResult = { response: null, flowUsed: false };
    if (hazardId) {
      updateResult = await updateHazardRecord(config, hazardId, payload, body.flow || body);
    } else {
      const createResult = await createHazardRecord(config, payload);
      const createResp = createResult.response;
      hazardId = extractRecordId(createResp && createResp.data ? createResp.data : createResp);
      if (!hazardId) {
        res.json({
          ok: true,
          data: {
            hazard: null,
            flowUsed: true,
            flowResponse: createResp,
            warning: "整改工单保存成功，但百数云未返回记录ID",
          },
        });
        return;
      }
    }

    const hazard = mapHazardRecord(await fetchRecordById(config, HAZARD_ENTRY_ID, hazardId));
    res.json({
      ok: true,
      data: {
        hazard,
        flowUsed: updateResult.flowUsed,
        flowResponse: updateResult.response,
        warning: updateResult.warning || "",
      },
    });
  }));

  app.post("/api/safety-check/hazard/flow-info", asyncHandler(async (req, res) => {
    const dataId = toDisplayText((req.body || {}).dataId || (req.body || {}).data_id || (req.body || {}).id);
    if (!dataId) {
      res.status(400).json({ ok: false, message: "缺少流程数据ID" });
      return;
    }
    const data = await requestEntry(config, HAZARD_ENTRY_ID, "flow_info", { dataId });
    res.json({ ok: true, data });
  }));

  app.post("/api/safety-check/hazard/flow-log", asyncHandler(async (req, res) => {
    const dataId = toDisplayText((req.body || {}).dataId || (req.body || {}).data_id || (req.body || {}).id);
    if (!dataId) {
      res.status(400).json({ ok: false, message: "缺少流程数据ID" });
      return;
    }
    const data = await requestEntry(config, HAZARD_ENTRY_ID, "flow_log", { dataId });
    res.json({ ok: true, data });
  }));

  app.post("/api/safety-check/hazard/flow-todo", asyncHandler(async (req, res) => {
    const body = req.body || {};
    const payload = {
      user_id: toDisplayText(body.user_id || body.userId || body.webpage_user_id),
      skip: Number(body.skip || 0),
      limit: Number(body.limit || 100),
      filter: body.filter || {},
    };
    const data = await requestEntry(config, HAZARD_ENTRY_ID, "flow_todo", payload);
    res.json({ ok: true, data });
  }));

  app.post("/api/safety-check/hazard/flow-todo-count", asyncHandler(async (req, res) => {
    const body = req.body || {};
    const payload = {
      user_id: toDisplayText(body.user_id || body.userId || body.webpage_user_id),
      skip: Number(body.skip || 0),
      limit: Number(body.limit || 300),
      filter: body.filter || {},
    };
    const data = await requestEntry(config, HAZARD_ENTRY_ID, "flow_todo_count", payload);
    res.json({ ok: true, data });
  }));

  app.post("/api/safety-check/hazard/flow-start", asyncHandler(async (req, res) => {
    const body = req.body || {};
    const input = normalizeHazardInput(body.hazard || body.data || body);
    const payload = buildHazardPayload(input);
    const result = await createHazardRecord(config, payload);
    const hazardId = extractRecordId(result.response && result.response.data ? result.response.data : result.response);
    res.json({ ok: true, data: { id: hazardId, response: result.response, warning: result.warning || "" } });
  }));

  app.post("/api/safety-check/hazard/flow-close", asyncHandler(async (req, res) => {
    const dataId = toDisplayText((req.body || {}).dataId || (req.body || {}).data_id || (req.body || {}).id);
    if (!dataId) {
      res.status(400).json({ ok: false, message: "缺少流程数据ID" });
      return;
    }
    const data = await requestEntry(config, HAZARD_ENTRY_ID, "flow_close", { dataId });
    res.json({ ok: true, data });
  }));

  app.post("/api/safety-check/hazard/flow-urge", asyncHandler(async (req, res) => {
    const dataId = toDisplayText((req.body || {}).dataId || (req.body || {}).data_id || (req.body || {}).id);
    if (!dataId) {
      res.status(400).json({ ok: false, message: "缺少流程数据ID" });
      return;
    }
    const data = await requestEntry(config, HAZARD_ENTRY_ID, "flow_urge", { dataId });
    res.json({ ok: true, data });
  }));

  app.post("/api/safety-check/hazard/delete", asyncHandler(async (req, res) => {
    res.status(410).json({ ok: false, message: "整改工单已改为百数云流程处理，请在流程表单中操作" });
  }));
}

async function createHazardRecord(config, values, options = {}) {
  const operator = toDisplayText(options.operator || options.operatorUserId || options.user_id || options.userId || options.webpage_user_id);
  const payloads = [
    { requiredValidation: false, values },
    { requiredValidation: false, data: values },
  ].map((payload) => {
    if (operator) {
      payload.operator = operator;
    }
    return payload;
  });
  const errors = [];
  for (const payload of payloads) {
    try {
      const response = await requestEntry(config, HAZARD_ENTRY_ID, "flow_start", payload);
      return { response };
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(`整改流程发起失败：${errors.filter(Boolean).join("；") || "未知错误"}`);
}

async function attachSubmitItemPhotos(config, req, items) {
  for (const item of items) {
    if (!item.isAbnormal) {
      item.uploadedPhotos = [];
      continue;
    }
    const photos = normalizeInputPhotoList(item.abnormalPhotos || item.photos);
    if (!photos.length) {
      item.uploadedPhotos = [];
      continue;
    }

    const existingFiles = photos.filter(isUploadFileObject);
    const uploadablePhotos = photos.filter((photo) => {
      if (!photo || typeof photo !== "object" || isUploadFileObject(photo)) {
        return false;
      }
      const dataUrl = String(photo.dataUrl || photo.url || "").trim();
      return /^data:image\//i.test(dataUrl);
    });

    const uploadedFiles = uploadablePhotos.length ? await uploadSafetyCheckPhotos(config, req, uploadablePhotos) : [];
    const legacyValues = photos
      .filter((photo) => typeof photo === "string")
      .map((photo) => photo.trim())
      .filter(Boolean);

    item.uploadedPhotos = [...existingFiles, ...uploadedFiles, ...legacyValues];
  }
}

async function uploadSafetyCheckPhotos(config, req, photos) {
  const publicBaseUrl = getPublicBaseUrl(config, req);
  if (!isExternallyReachableBaseUrl(publicBaseUrl)) {
    throw new Error("当前服务器未配置公网 HTTPS 域名，异常照片无法上传到百数云。");
  }

  const tempDir = path.join(config.staticRoot, "__safety-check-photos");
  fs.mkdirSync(tempDir, { recursive: true });

  const uploadItems = photos.map((photo, index) => {
    const dataUrl = String(photo.dataUrl || photo.url || "").trim();
    const parsed = parseImageDataUrl(dataUrl, "异常照片");
    const fileName = buildTempUploadFileName(photo.name || `safety-check-photo-${index + 1}`, parsed.ext);
    fs.writeFileSync(path.join(tempDir, fileName), parsed.buffer);
    return {
      name: fileName,
      url: new URL(`/__safety-check-photos/${encodeURIComponent(fileName)}`, publicBaseUrl).toString(),
    };
  });

  const uploadResp = await requestEntry(config, HAZARD_ENTRY_ID, "upload_file", uploadItems);
  const files = extractObjectArray(uploadResp, ["data"]).filter((item) => item && typeof item === "object");
  if (!files.length) {
    throw new Error("异常照片上传成功但百数云未返回文件信息");
  }
  return files;
}

async function updateHazardRecord(config, hazardId, data, flowOptions = {}) {
  const flowPayload = buildFlowUpdatePayload(hazardId, data, flowOptions);
  if (flowPayload) {
    const response = await requestEntry(config, HAZARD_ENTRY_ID, "flow_update", flowPayload);
    return { response, flowUsed: true };
  }

  throw new Error("整改工单已改为百数云流程处理，缺少流程操作参数");
}

function buildFlowUpdatePayload(dataId, values, flowOptions = {}) {
  const operator = toDisplayText(flowOptions.operator || flowOptions.operatorUserId || flowOptions.user_id || flowOptions.userId || flowOptions.webpage_user_id);
  const flowId = toFiniteNumber(flowOptions.flowId || flowOptions.flow_id);
  const flowAction = toDisplayText(flowOptions.flowAction || flowOptions.action);
  if (!operator || !flowId || !flowAction) {
    return null;
  }

  const payload = {
    requiredValidation: toBoolean(flowOptions.requiredValidation),
    dataId,
    operator,
    flowId,
    flowAction,
    values: values || {},
  };
  const backFlowId = toFiniteNumber(flowOptions.backFlowId || flowOptions.back_flow_id);
  const candidateId = toDisplayText(flowOptions.candidateId || flowOptions.candidate_id);
  if (backFlowId) {
    payload.backFlowId = backFlowId;
  }
  if (candidateId) {
    payload.candidateId = candidateId;
  }
  return payload;
}

async function replaceTemplateItems(config, templateId, templateName, inputItems) {
  const itemRecords = await fetchEntryRecords(config, ITEM_ENTRY_ID);
  const existing = itemRecords.map(mapItemRecord).filter((item) => item.templateId === templateId);
  const keepIds = new Set();

  for (let index = 0; index < inputItems.length; index += 1) {
    const item = {
      ...inputItems[index],
      seq: inputItems[index].seq || index + 1,
      templateId,
      templateName,
    };
    const payload = buildItemPayload(item);
    if (item.id) {
      keepIds.add(item.id);
      await requestEntry(config, ITEM_ENTRY_ID, "data_update", {
        data_id: item.id,
        data: payload,
      });
    } else {
      const createResp = await requestEntry(config, ITEM_ENTRY_ID, "data_create", {
        data: payload,
      });
      const createdId = extractRecordId(createResp && createResp.data ? createResp.data : createResp);
      if (createdId) {
        keepIds.add(createdId);
      }
    }
  }

  for (const item of existing) {
    if (!keepIds.has(item.id)) {
      await requestEntry(config, ITEM_ENTRY_ID, "data_delete", { data_id: item.id });
    }
  }
}

function buildTemplatePayload(input) {
  return {
    [TEMPLATE_FIELD.name]: input.name || "",
    [TEMPLATE_FIELD.category]: input.category || "",
    [TEMPLATE_FIELD.target]: input.target || "",
    [TEMPLATE_FIELD.cycle]: input.cycle || "临时",
    [TEMPLATE_FIELD.defaultDept]: normalizeDeptValue(input.defaultDeptId || input.defaultDept),
    [TEMPLATE_FIELD.defaultUser]: normalizeMemberValue(input.defaultUserId || input.defaultUser),
    [TEMPLATE_FIELD.scanRequired]: input.scanRequired || "否",
    [TEMPLATE_FIELD.enabled]: input.enabled || "启用",
    [TEMPLATE_FIELD.version]: input.version || "",
    [TEMPLATE_FIELD.effectiveDate]: normalizeDateTime(input.effectiveDate),
    [TEMPLATE_FIELD.remark]: input.remark || "",
  };
}

function buildItemPayload(input) {
  const payload = {
    [ITEM_FIELD.templateId]: input.templateId || "",
    [ITEM_FIELD.templateName]: input.templateName || "",
    [ITEM_FIELD.seq]: toNumberOrEmpty(input.seq),
    [ITEM_FIELD.category]: input.category || "",
    [ITEM_FIELD.item]: input.item || "",
    [ITEM_FIELD.content]: input.content || "",
    [ITEM_FIELD.standard]: input.standard || "",
    [ITEM_FIELD.resultType]: input.resultType || "正常异常",
    [ITEM_FIELD.resultOptions]: input.resultOptions || defaultResultOptions(input.resultType),
    [ITEM_FIELD.keyItem]: input.keyItem || "否",
    [ITEM_FIELD.abnormalDescRequired]: input.abnormalDescRequired || "否",
    [ITEM_FIELD.abnormalPhotoRequired]: input.abnormalPhotoRequired || "否",
    [ITEM_FIELD.deadlineDays]: toNumberOrEmpty(input.deadlineDays || 7),
    [ITEM_FIELD.defaultDept]: normalizeDeptValue(input.defaultDeptId || input.defaultDept),
    [ITEM_FIELD.enabled]: input.enabled || "启用",
  };
  setPayloadValue(payload, ITEM_FIELD.riskLevel, input.riskLevel);
  if (ITEM_FIELD.score) {
    payload[ITEM_FIELD.score] = toNumberOrEmpty(input.score);
  }
  return payload;
}

function buildTaskPayload(input) {
  const nextStatus = input.status || "待检查";
  return {
    [TASK_FIELD.templateId]: input.templateId || "",
    [TASK_FIELD.templateName]: input.templateName || "",
    [TASK_FIELD.plannedDate]: normalizeDateTime(input.plannedDate),
    [TASK_FIELD.deadline]: normalizeDateTime(input.deadline),
    [TASK_FIELD.target]: input.target || "",
    [TASK_FIELD.ownerDept]: normalizeDeptValue(input.ownerDeptId || input.ownerDept),
    [TASK_FIELD.ownerUser]: normalizeMemberValue(input.ownerUserId || input.ownerUser),
    [TASK_FIELD.status]: nextStatus,
    [TASK_FIELD.submitCount]: toNumberOrEmpty(input.submitCount || 0),
    [TASK_FIELD.overdue]: input.overdue || computeOverdue(input.deadline, nextStatus),
    [TASK_FIELD.source]: input.source || "手工创建",
    [TASK_FIELD.remark]: input.remark || "",
  };
}

function buildSubmissionDetailPayload(item, submissionId, submitTime, context = {}) {
  const payload = {
    [SUBMISSION_DETAIL_FIELD.submissionId]: submissionId,
    [SUBMISSION_DETAIL_FIELD.itemId]: item.itemId || "",
    [SUBMISSION_DETAIL_FIELD.itemName]: item.item || item.content || "",
    [SUBMISSION_DETAIL_FIELD.seqSnapshot]: toNumberOrEmpty(item.seq),
    [SUBMISSION_DETAIL_FIELD.result]: buildDetailResultValue(item),
    [SUBMISSION_DETAIL_FIELD.submitTime]: submitTime,
    [SUBMISSION_DETAIL_FIELD.abnormalDesc]: item.abnormalDesc || "",
    [SUBMISSION_DETAIL_FIELD.handling]: item.handling || "",
    [SUBMISSION_DETAIL_FIELD.abnormalPhotos]: normalizePhotos(item.uploadedPhotos || item.abnormalPhotos || item.photos),
    [SUBMISSION_DETAIL_FIELD.hazardId]: "",
  };
  setNumberPayloadValue(payload, SUBMISSION_DETAIL_FIELD.target, context.target || item.target || item.areaObject);
  return payload;
}

function buildDetailResultValue(item) {
  const result = toDisplayText(item.result);
  const inputValue = toDisplayText(item.inputValue);
  if (inputValue && result) {
    return `${inputValue}（${result}）`;
  }
  return inputValue || result;
}

function buildHazardFromSubmitItem(item, context) {
  const deadline = addDays(new Date(), Number(item.deadlineDays || 7));
  const title = item.item || item.content || "安全检查异常";
  const description = item.abnormalDesc || item.content || item.standard || title;
  const payload = {
    [HAZARD_FIELD.submissionId]: context.submissionId || "",
    [HAZARD_FIELD.submissionDetailId]: context.detailId || "",
    [HAZARD_FIELD.title]: title,
    [HAZARD_FIELD.description]: description,
    [HAZARD_FIELD.target]: context.target || "",
    [HAZARD_FIELD.ownerDept]: normalizeDeptValue(item.defaultDeptId || item.defaultDept || context.fallbackDept),
    [HAZARD_FIELD.ownerUser]: normalizeMemberValue(item.ownerUserId || item.ownerUser || context.fallbackUser),
    [HAZARD_FIELD.deadline]: formatDateTime(deadline),
    [HAZARD_FIELD.requirement]: item.handling || "请按检查标准完成整改，并上传整改后照片。",
    [HAZARD_FIELD.status]: "待整改",
    [HAZARD_FIELD.actionDesc]: "",
    [HAZARD_FIELD.beforePhotos]: normalizePhotos(item.uploadedPhotos || item.abnormalPhotos || item.photos),
    [HAZARD_FIELD.afterPhotos]: "",
    [HAZARD_FIELD.verifier]: normalizeMemberValue(item.verifierId || item.verifier),
    [HAZARD_FIELD.verifyComment]: "",
    [HAZARD_FIELD.closedAt]: "",
    [HAZARD_FIELD.overdue]: "否",
    [HAZARD_FIELD.source]: "安全检查",
  };
  setPayloadValue(payload, HAZARD_FIELD.riskLevel, item.riskLevel);
  return payload;
}

function buildHazardPayload(input) {
  const status = input.status || "待整改";
  const closedAt = status === "已关闭" ? normalizeDateTime(input.closedAt) || formatDateTime(new Date()) : normalizeDateTime(input.closedAt);
  const payload = {
    [HAZARD_FIELD.submissionId]: input.submissionId || "",
    [HAZARD_FIELD.submissionDetailId]: input.submissionDetailId || "",
    [HAZARD_FIELD.title]: input.title || "",
    [HAZARD_FIELD.description]: input.description || "",
    [HAZARD_FIELD.target]: input.target || "",
    [HAZARD_FIELD.ownerDept]: normalizeDeptValue(input.ownerDeptId || input.ownerDept),
    [HAZARD_FIELD.ownerUser]: normalizeMemberValue(input.ownerUserId || input.ownerUser),
    [HAZARD_FIELD.deadline]: normalizeDateTime(input.deadline),
    [HAZARD_FIELD.requirement]: input.requirement || "",
    [HAZARD_FIELD.status]: status,
    [HAZARD_FIELD.actionDesc]: input.actionDesc || "",
    [HAZARD_FIELD.beforePhotos]: normalizePhotos(input.beforePhotos),
    [HAZARD_FIELD.afterPhotos]: normalizePhotos(input.afterPhotos),
    [HAZARD_FIELD.verifier]: normalizeMemberValue(input.verifierId || input.verifier),
    [HAZARD_FIELD.verifyComment]: input.verifyComment || "",
    [HAZARD_FIELD.closedAt]: closedAt,
    [HAZARD_FIELD.overdue]: input.overdue || computeOverdue(input.deadline, status),
    [HAZARD_FIELD.source]: input.source || "安全检查",
  };
  setPayloadValue(payload, HAZARD_FIELD.riskLevel, input.riskLevel);
  return payload;
}

function buildHazardActionPayload(input, action) {
  const status = input.status || "待整改";
  const payload = {
    [HAZARD_FIELD.status]: status,
    [HAZARD_FIELD.overdue]: input.overdue || computeOverdue(input.deadline, status),
  };
  if (action === "draft" || action === "submit") {
    payload[HAZARD_FIELD.actionDesc] = input.actionDesc || "";
    payload[HAZARD_FIELD.afterPhotos] = normalizePhotos(input.afterPhotos);
    payload[HAZARD_FIELD.verifier] = normalizeMemberValue(input.verifierId || input.verifier);
    return payload;
  }
  if (action === "approve" || action === "reject") {
    payload[HAZARD_FIELD.verifyComment] = input.verifyComment || "";
    payload[HAZARD_FIELD.closedAt] = status === "已关闭" ? normalizeDateTime(input.closedAt) || formatDateTime(new Date()) : "";
    return payload;
  }
  return buildHazardPayload(input);
}

function normalizeTemplateInput(input) {
  return {
    id: toDisplayText(input.id || input.cloudId || input.data_id),
    name: toDisplayText(input.name),
    category: toDisplayText(input.category),
    target: toDisplayText(input.target),
    cycle: toDisplayText(input.cycle),
    defaultDept: toDisplayText(input.defaultDept),
    defaultDeptId: toDisplayText(input.defaultDeptId),
    defaultUser: toDisplayText(input.defaultUser),
    defaultUserId: toDisplayText(input.defaultUserId),
    scanRequired: toDisplayText(input.scanRequired),
    enabled: toDisplayText(input.enabled),
    version: toDisplayText(input.version),
    effectiveDate: toDisplayText(input.effectiveDate),
    remark: toDisplayText(input.remark),
  };
}

function normalizeItemInput(input) {
  return {
    id: toDisplayText(input.id || input.cloudId || input.data_id),
    templateId: toDisplayText(input.templateId),
    templateName: toDisplayText(input.templateName),
    seq: toNumberOrEmpty(input.seq),
    category: toDisplayText(input.category),
    item: toDisplayText(input.item),
    content: toDisplayText(input.content),
    standard: toDisplayText(input.standard),
    resultType: toDisplayText(input.resultType),
    resultOptions: toDisplayText(input.resultOptions),
    keyItem: toDisplayText(input.keyItem),
    abnormalDescRequired: toDisplayText(input.abnormalDescRequired),
    abnormalPhotoRequired: toDisplayText(input.abnormalPhotoRequired),
    riskLevel: toDisplayText(input.riskLevel),
    deadlineDays: toNumberOrEmpty(input.deadlineDays),
    defaultDept: toDisplayText(input.defaultDept),
    defaultDeptId: toDisplayText(input.defaultDeptId),
    enabled: toDisplayText(input.enabled),
    score: toNumberOrEmpty(input.score),
  };
}

function normalizeTaskInput(input) {
  return {
    id: toDisplayText(input.id || input.cloudId || input.data_id),
    templateId: toDisplayText(input.templateId),
    templateName: toDisplayText(input.templateName),
    plannedDate: toDisplayText(input.plannedDate),
    deadline: toDisplayText(input.deadline),
    target: toDisplayText(input.target),
    ownerDept: toDisplayText(input.ownerDept),
    ownerDeptId: toDisplayText(input.ownerDeptId),
    ownerUser: toDisplayText(input.ownerUser),
    ownerUserId: toDisplayText(input.ownerUserId),
    status: toDisplayText(input.status),
    submitCount: toNumberOrEmpty(input.submitCount),
    overdue: toDisplayText(input.overdue),
    source: toDisplayText(input.source),
    remark: toDisplayText(input.remark),
  };
}

function normalizeSubmitItem(input) {
  const result = toDisplayText(input.result || input.checkResult || input.status);
  return {
    itemId: toDisplayText(input.itemId || input.id),
    seq: toNumberOrEmpty(input.seq),
    category: toDisplayText(input.category),
    item: toDisplayText(input.item),
    content: toDisplayText(input.content),
    standard: toDisplayText(input.standard),
    result: result || (toYesNo(input.isAbnormal) === "是" ? "异常" : "正常"),
    inputValue: toDisplayText(input.inputValue || input.value),
    isAbnormal: result === "异常" || toYesNo(input.isAbnormal) === "是",
    abnormalDesc: toDisplayText(input.abnormalDesc),
    abnormalPhotos: input.abnormalPhotos || input.photos,
    handling: toDisplayText(input.handling),
    riskLevel: toDisplayText(input.riskLevel),
    deadlineDays: toNumberOrEmpty(input.deadlineDays),
    defaultDept: toDisplayText(input.defaultDept),
    defaultDeptId: toDisplayText(input.defaultDeptId),
    ownerUser: toDisplayText(input.ownerUser),
    ownerUserId: toDisplayText(input.ownerUserId),
  };
}

function normalizeHazardInput(input) {
  return {
    id: toDisplayText(input.id || input.cloudId || input.data_id),
    submissionId: toDisplayText(input.submissionId),
    submissionDetailId: toDisplayText(input.submissionDetailId),
    title: toDisplayText(input.title),
    description: toDisplayText(input.description),
    riskLevel: toDisplayText(input.riskLevel),
    target: toDisplayText(input.target),
    ownerDept: toDisplayText(input.ownerDept),
    ownerDeptId: toDisplayText(input.ownerDeptId),
    ownerUser: toDisplayText(input.ownerUser),
    ownerUserId: toDisplayText(input.ownerUserId),
    deadline: toDisplayText(input.deadline),
    requirement: toDisplayText(input.requirement),
    status: toDisplayText(input.status),
    actionDesc: toDisplayText(input.actionDesc),
    beforePhotos: input.beforePhotos,
    afterPhotos: input.afterPhotos,
    verifier: toDisplayText(input.verifier),
    verifierId: toDisplayText(input.verifierId),
    verifyComment: toDisplayText(input.verifyComment),
    closedAt: toDisplayText(input.closedAt),
    overdue: toDisplayText(input.overdue),
  };
}

function mapTemplateRecord(record) {
  const rawDept = getAliasRawValue(record, TEMPLATE_FIELD.defaultDept);
  const rawUser = getAliasRawValue(record, TEMPLATE_FIELD.defaultUser);
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.name)),
    category: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.category)),
    target: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.target)),
    cycle: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.cycle)),
    defaultDept: toDisplayText(rawDept),
    defaultDeptId: extractComplexId(rawDept),
    defaultUser: toDisplayText(rawUser),
    defaultUserId: extractComplexId(rawUser),
    scanRequired: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.scanRequired)) || "否",
    enabled: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.enabled)) || "启用",
    version: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.version)),
    effectiveDate: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.effectiveDate)),
    remark: toDisplayText(getAliasRawValue(record, TEMPLATE_FIELD.remark)),
  };
}

function mapItemRecord(record) {
  const rawDept = getAliasRawValue(record, ITEM_FIELD.defaultDept);
  return {
    id: extractRecordId(record),
    templateId: toDisplayText(getAliasRawValue(record, ITEM_FIELD.templateId)),
    templateName: toDisplayText(getAliasRawValue(record, ITEM_FIELD.templateName)),
    seq: toNumber(getAliasRawValue(record, ITEM_FIELD.seq)),
    category: toDisplayText(getAliasRawValue(record, ITEM_FIELD.category)),
    item: toDisplayText(getAliasRawValue(record, ITEM_FIELD.item)),
    content: toDisplayText(getAliasRawValue(record, ITEM_FIELD.content)),
    standard: toDisplayText(getAliasRawValue(record, ITEM_FIELD.standard)),
    resultType: toDisplayText(getAliasRawValue(record, ITEM_FIELD.resultType)) || "正常异常",
    resultOptions: toDisplayText(getAliasRawValue(record, ITEM_FIELD.resultOptions)) || "正常,异常",
    keyItem: toDisplayText(getAliasRawValue(record, ITEM_FIELD.keyItem)) || "否",
    abnormalDescRequired: toDisplayText(getAliasRawValue(record, ITEM_FIELD.abnormalDescRequired)) || "否",
    abnormalPhotoRequired: toDisplayText(getAliasRawValue(record, ITEM_FIELD.abnormalPhotoRequired)) || "否",
    riskLevel: toDisplayText(getAliasRawValue(record, ITEM_FIELD.riskLevel)),
    deadlineDays: toNumber(getAliasRawValue(record, ITEM_FIELD.deadlineDays)) || 7,
    defaultDept: toDisplayText(rawDept),
    defaultDeptId: extractComplexId(rawDept),
    enabled: toDisplayText(getAliasRawValue(record, ITEM_FIELD.enabled)) || "启用",
    score: ITEM_FIELD.score ? toNumberOrEmpty(getAliasRawValue(record, ITEM_FIELD.score)) : "",
  };
}

function mapTaskRecord(record) {
  const rawDept = getAliasRawValue(record, TASK_FIELD.ownerDept);
  const rawUser = getAliasRawValue(record, TASK_FIELD.ownerUser);
  const deadline = toDisplayText(getAliasRawValue(record, TASK_FIELD.deadline));
  const status = toDisplayText(getAliasRawValue(record, TASK_FIELD.status)) || "待检查";
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, TASK_FIELD.code)),
    templateId: toDisplayText(getAliasRawValue(record, TASK_FIELD.templateId)),
    templateName: toDisplayText(getAliasRawValue(record, TASK_FIELD.templateName)),
    plannedDate: toDisplayText(getAliasRawValue(record, TASK_FIELD.plannedDate)),
    deadline,
    target: toDisplayText(getAliasRawValue(record, TASK_FIELD.target)),
    ownerDept: toDisplayText(rawDept),
    ownerDeptId: extractComplexId(rawDept),
    ownerUser: toDisplayText(rawUser),
    ownerUserId: extractComplexId(rawUser),
    status,
    submitCount: toNumber(getAliasRawValue(record, TASK_FIELD.submitCount)),
    overdue: toDisplayText(getAliasRawValue(record, TASK_FIELD.overdue)) || computeOverdue(deadline, status),
    source: toDisplayText(getAliasRawValue(record, TASK_FIELD.source)),
    remark: toDisplayText(getAliasRawValue(record, TASK_FIELD.remark)),
  };
}

function mapSubmissionRecord(record) {
  const rawInspector = getAliasRawValue(record, SUBMISSION_FIELD.inspector);
  const rawReviewer = getAliasRawValue(record, SUBMISSION_FIELD.reviewer);
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.code)),
    taskId: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.taskId)),
    templateId: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.templateId)),
    templateName: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.templateName)),
    target: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.target)),
    inspector: toDisplayText(rawInspector),
    inspectorId: extractComplexId(rawInspector),
    startTime: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.startTime)),
    endTime: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.endTime)),
    result: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.result)),
    abnormalCount: toNumber(getAliasRawValue(record, SUBMISSION_FIELD.abnormalCount)),
    photos: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.photos)),
    location: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.location)),
    remark: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.remark)),
    reviewRequired: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.reviewRequired)),
    reviewer: toDisplayText(rawReviewer),
    reviewerId: extractComplexId(rawReviewer),
    status: toDisplayText(getAliasRawValue(record, SUBMISSION_FIELD.status)),
  };
}

function mapSubmissionDetailRecord(record) {
  const itemName = toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.itemName));
  const result = toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.result));
  return {
    id: extractRecordId(record),
    submissionId: toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.submissionId)),
    itemId: toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.itemId)),
    seq: toNumber(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.seqSnapshot)),
    category: "",
    item: itemName,
    content: itemName,
    standard: "",
    target: toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.target)),
    result,
    inputValue: result,
    abnormalDesc: toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.abnormalDesc)),
    abnormalPhotos: toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.abnormalPhotos)),
    handling: toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.handling)),
    hazardId: toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.hazardId)),
    submitTime: toDisplayText(getAliasRawValue(record, SUBMISSION_DETAIL_FIELD.submitTime)),
  };
}

function mapHazardRecord(record) {
  const rawDept = getAliasRawValue(record, HAZARD_FIELD.ownerDept);
  const rawUser = getAliasRawValue(record, HAZARD_FIELD.ownerUser);
  const rawVerifier = getAliasRawValue(record, HAZARD_FIELD.verifier);
  const deadline = toDisplayText(getAliasRawValue(record, HAZARD_FIELD.deadline));
  const status = toDisplayText(getAliasRawValue(record, HAZARD_FIELD.status)) || "待整改";
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.code)),
    submissionId: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.submissionId)),
    submissionDetailId: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.submissionDetailId)),
    title: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.title)),
    description: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.description)),
    riskLevel: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.riskLevel)),
    target: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.target)),
    ownerDept: toDisplayText(rawDept),
    ownerDeptId: extractComplexId(rawDept),
    ownerUser: toDisplayText(rawUser),
    ownerUserId: extractComplexId(rawUser),
    deadline,
    requirement: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.requirement)),
    status,
    actionDesc: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.actionDesc)),
    beforePhotos: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.beforePhotos)),
    afterPhotos: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.afterPhotos)),
    verifier: toDisplayText(rawVerifier),
    verifierId: extractComplexId(rawVerifier),
    verifyComment: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.verifyComment)),
    closedAt: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.closedAt)),
    overdue: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.overdue)) || computeOverdue(deadline, status),
    source: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.source)) || "安全检查",
  };
}

async function fetchRecordById(config, entryId, dataId) {
  const resp = await requestEntry(config, entryId, "data_retrieve", { data_id: dataId });
  const data = resp && resp.data ? resp.data : resp;
  if (Array.isArray(data)) {
    return data[0] || {};
  }
  return data || {};
}

async function fetchEntryRecords(config, entryId, options = {}) {
  const actions = options.actions || ["data", "data_search", "data_list"];
  const payloads = options.payloads || [
    { page: 1, limit: 1000 },
    { page_no: 1, page_size: 1000 },
    { limit: 1000 },
    {},
  ];
  const errors = [];

  for (const action of actions) {
    for (const payload of payloads) {
      try {
        const resp = await requestEntry(config, entryId, action, payload);
        const records = extractRecordArray(resp);
        if (Array.isArray(records)) {
          return records;
        }
      } catch (error) {
        errors.push(`${action}: ${error.message}`);
      }
    }
  }

  throw new Error(errors[errors.length - 1] || "未能获取列表数据");
}

async function requestEntry(config, entryId, action, body = {}, method = "POST") {
  const appId = config.defaultAppId;
  const url = `${stripTrailingSlash(config.baseUrl)}/app/${encodeURIComponent(appId)}/entry/${encodeURIComponent(entryId)}/${encodeURIComponent(action)}`;
  const httpMethod = String(method || "POST").toUpperCase();
  const init = {
    method: httpMethod,
    headers: buildUpstreamHeaders(config.apiKey),
  };
  if (httpMethod !== "GET" && httpMethod !== "HEAD") {
    init.body = JSON.stringify(body || {});
  }

  const response = await fetch(url, init);
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

function buildUpstreamHeaders(apiKey) {
  const headers = { "Content-Type": "application/json" };
  const key = String(apiKey || "").trim();
  if (key) {
    headers.Authorization = key.startsWith("Bearer ") ? key : `Bearer ${key}`;
    headers["X-API-Key"] = key;
    headers["API-Key"] = key;
    headers.api_key = key;
  }
  return headers;
}

function extractRecordArray(source) {
  const queue = [source];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
      continue;
    }
    visited.add(current);
    if (Array.isArray(current)) {
      if (!current.length || typeof current[0] === "object") {
        return current;
      }
      continue;
    }
    const keys = ["data", "list", "rows", "items", "result", "records", "entry_data_list"];
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

function getAliasRawValue(record, alias) {
  if (!record || typeof record !== "object" || !alias) {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(record, alias)) {
    return record[alias];
  }
  const containers = [record.data, record.entry_data, record.widget_data, record.form_data];
  for (const container of containers) {
    if (container && typeof container === "object" && Object.prototype.hasOwnProperty.call(container, alias)) {
      return container[alias];
    }
  }
  const fromWidgets = findAliasInArray(record.widgets, alias) || findAliasInArray(record.entry_data_list, alias);
  if (fromWidgets !== undefined) {
    return fromWidgets;
  }
  return undefined;
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

function extractRecordId(record) {
  if (!record || typeof record !== "object") {
    return "";
  }
  const candidates = [
    record._id,
    record.id,
    record.dataId,
    record.dataID,
    record.data_id,
    record.entry_data_id,
    record.record_id,
    record.data && record.data._id,
    record.data && record.data.id,
    record.data && record.data.dataId,
    record.data && record.data.data_id,
  ];
  for (const value of candidates) {
    const text = toDisplayText(value);
    if (text) {
      return text;
    }
  }
  return "";
}

function extractComplexId(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value || "").trim();
    const parsed = safeJsonParse(text);
    if (parsed && parsed !== value) {
      return extractComplexId(parsed);
    }
    return text;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const id = extractComplexId(item);
      if (id) {
        return id;
      }
    }
    return "";
  }
  if (typeof value === "object") {
    const keys = ["id", "_id", "value", "key", "user_id", "userId", "dept_id", "deptId", "uniqueid", "uniqueId"];
    for (const key of keys) {
      const text = toDisplayText(value[key]);
      if (text) {
        return text;
      }
    }
  }
  return "";
}

function toDisplayText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(toDisplayText).filter(Boolean).join("、");
  }
  if (typeof value === "object") {
    const preferred = [
      value.name,
      value.label,
      value.title,
      value.user_name,
      value.userName,
      value.dept_name,
      value.deptName,
      value.text,
      value.value,
    ];
    for (const item of preferred) {
      const text = toDisplayText(item);
      if (text) {
        return text;
      }
    }
    return "";
  }
  return "";
}

function normalizeDeptValue(value) {
  const id = extractComplexId(value);
  return isLikelyControlId(id) ? id : null;
}

function normalizeMemberValue(value) {
  const id = extractComplexId(value);
  return isLikelyControlId(id) ? id : null;
}

function isLikelyControlId(value) {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }
  return /^[A-Za-z0-9_-]{8,}$/.test(text);
}

function normalizeLocation(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object") {
    const lng = value.lng ?? value.longitude;
    const lat = value.lat ?? value.latitude;
    if (lng !== undefined && lat !== undefined) {
      return `${lng},${lat}`;
    }
  }
  return toDisplayText(value);
}

function normalizePhotos(value) {
  const photos = normalizeInputPhotoList(value);
  if (!photos.length) {
    return "";
  }
  if (photos.some((item) => item && typeof item === "object")) {
    return photos;
  }
  return photos.map(toDisplayText).filter(Boolean).join(",");
}

function normalizeInputPhotoList(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(normalizeInputPhotoList).filter(Boolean);
  }
  if (typeof value === "object") {
    if (isUploadFileObject(value)) {
      return [value];
    }
    const rawUrl = String(value.url || value.previewUrl || "").trim();
    const dataUrl = String(value.dataUrl || (/^data:image\//i.test(rawUrl) ? rawUrl : "")).trim();
    const url = dataUrl ? "" : rawUrl;
    const name = toDisplayText(value.name || value.fileName || value.filename || value.title || "异常照片");
    if (!dataUrl && !url) {
      return name ? [name] : [];
    }
    return [{ name, url, dataUrl }];
  }
  const text = toDisplayText(value);
  return text ? [text] : [];
}

function isUploadFileObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const dataUrl = String(value.dataUrl || "").trim();
  const url = String(value.url || value.previewUrl || "").trim();
  if (dataUrl || /^data:image\//i.test(url)) {
    return false;
  }
  return Boolean(
    toDisplayText(value.fileId || value.file_id || value.id || value._id || value.key || value.name) &&
      (url || toDisplayText(value.fileId || value.file_id || value.id || value._id || value.key))
  );
}

function parseImageDataUrl(value, label = "图片") {
  const text = String(value || "").trim();
  const match = text.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([\s\S]+)$/i);
  if (!match) {
    throw new Error(`${label}格式不正确`);
  }

  const mime = String(match[1] || "").toLowerCase();
  const base64 = String(match[2] || "").trim();
  if (!base64) {
    throw new Error(`${label}数据为空`);
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
  const safeBase = String(baseName || "safety-check-photo")
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32) || "safety-check-photo";
  const suffix = crypto.randomBytes(6).toString("hex");
  return `${safeBase}_${Date.now()}_${suffix}.${String(ext || "jpg").replace(/[^a-z0-9]+/gi, "") || "jpg"}`;
}

function getPublicBaseUrl(config, req) {
  if (config.publicBaseUrl) {
    return stripTrailingSlash(config.publicBaseUrl);
  }
  const protoHeader = req && typeof req.get === "function" ? req.get("x-forwarded-proto") : "";
  const hostHeader = req && typeof req.get === "function" ? (req.get("x-forwarded-host") || req.get("host")) : "";
  const protocol = protoHeader ? String(protoHeader).split(",")[0].trim() : (req && req.protocol) || "http";
  const host = String(hostHeader || `localhost:${config.port || 3001}`).split(",")[0].trim();
  return stripTrailingSlash(`${protocol}://${host}`);
}

function isExternallyReachableBaseUrl(value) {
  let parsed;
  try {
    parsed = new URL(String(value || "").trim());
  } catch {
    return false;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return false;
  }
  return !isLocalOrPrivateHost(parsed.hostname);
}

function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase();
  if (!host || ["localhost", "0.0.0.0", "::1", "[::1]"].includes(host) || host.endsWith(".local")) {
    return true;
  }
  if (host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) {
    return true;
  }
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((item) => /^\d+$/.test(item))) {
    const first = Number(parts[0]);
    const second = Number(parts[1]);
    return first === 172 && second >= 16 && second <= 31;
  }
  return false;
}

function setPayloadValue(payload, field, value) {
  const text = toDisplayText(value);
  if (field && text) {
    payload[field] = text;
  }
}

function setNumberPayloadValue(payload, field, value) {
  const text = toDisplayText(value);
  if (!field || !text) {
    return;
  }
  const numberValue = Number(text);
  if (Number.isFinite(numberValue)) {
    payload[field] = numberValue;
  }
}

function extractObjectArray(source, preferredKeys = []) {
  const queue = [source];
  const visited = new Set();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || visited.has(current)) {
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
      const next = current[key];
      if (Array.isArray(next) && (!next.length || typeof next[0] === "object")) {
        return next;
      }
      if (next && typeof next === "object") {
        queue.push(next);
      }
    }

    Object.values(current).forEach((next) => {
      if (next && typeof next === "object") {
        queue.push(next);
      }
    });
  }

  return [];
}

function normalizeDateTime(value) {
  const text = toDisplayText(value);
  if (!text) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text} 00:00:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text)) {
    return text.replace("T", " ").slice(0, 19);
  }
  return text;
}

function formatDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + (Number.isFinite(days) ? days : 7));
  return d;
}

function computeOverdue(deadline, status) {
  const closedStatuses = new Set(["已完成", "已关闭", "已取消", "已作废"]);
  if (closedStatuses.has(toDisplayText(status))) {
    return "否";
  }
  const text = normalizeDateTime(deadline);
  if (!text) {
    return "否";
  }
  const d = new Date(text.replace(/-/g, "/"));
  if (Number.isNaN(d.getTime())) {
    return "否";
  }
  return d.getTime() < Date.now() ? "是" : "否";
}

function defaultResultOptions(resultType) {
  const type = toDisplayText(resultType);
  if (type === "正常异常不适用") {
    return "正常,异常,不适用";
  }
  if (type === "数值录入") {
    return "";
  }
  if (type === "文本说明") {
    return "";
  }
  return "正常,异常";
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toNumberOrEmpty(value) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function toFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  const text = toDisplayText(value).toLowerCase();
  return text === "true" || text === "1" || text === "是" || text === "yes";
}

function toYesNo(value) {
  const text = toDisplayText(value);
  if (!text) {
    return "否";
  }
  if (text === "1" || text.toLowerCase() === "true") {
    return "是";
  }
  if (text.includes("是") || text.includes("需") || text.includes("异常")) {
    return "是";
  }
  return "否";
}

function sortByNameAndCode(a, b) {
  return String(a.name || a.code || "").localeCompare(String(b.name || b.code || ""), "zh-Hans-CN");
}

function sortByTemplateAndSeq(a, b) {
  const templateCompare = String(a.templateName || a.templateId || "").localeCompare(String(b.templateName || b.templateId || ""), "zh-Hans-CN");
  if (templateCompare) {
    return templateCompare;
  }
  return Number(a.seq || 0) - Number(b.seq || 0);
}

function sortBySubmissionAndSeq(a, b) {
  const submissionCompare = String(a.submissionId || "").localeCompare(String(b.submissionId || ""), "zh-Hans-CN");
  if (submissionCompare) {
    return submissionCompare;
  }
  return Number(a.seq || 0) - Number(b.seq || 0);
}

function sortByDateDesc(a, b) {
  return String(b.endTime || b.plannedDate || b.deadline || "").localeCompare(String(a.endTime || a.plannedDate || a.deadline || ""));
}

function sortHazards(a, b) {
  const statusRank = { 待整改: 1, 整改中: 2, 已退回: 3, 已延期: 4, 待验收: 5, 已关闭: 9 };
  const rankA = statusRank[a.status] || 6;
  const rankB = statusRank[b.status] || 6;
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return String(a.deadline || "").localeCompare(String(b.deadline || ""));
}

function stripTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function safeJsonParse(text) {
  if (!text || typeof text !== "string") {
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
    const text = toDisplayText(value);
    if (text) {
      return text;
    }
  }
  return "";
}

function asyncHandler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (error) {
      res.status(500).json({
        ok: false,
        message: error.message || "安全检查接口异常",
      });
    }
  };
}

module.exports = {
  registerSafetyCheckRoutes,
};
