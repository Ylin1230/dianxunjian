const {
  listTaskAliasRecords,
  shouldReadTasksFromDb,
  shouldWriteTasksToBes,
  shouldWriteTasksToDb,
  updateTaskReportState,
} = require("./task-store");

const DEVICE_ENTRY_ID = "38104b6c9d74ce86a7c395b6";
const CHEMICAL_ENTRY_ID = "9739459da9671a832692915d";
const SITE_ENTRY_ID = "099e47809199d1d8214a984f";
const TASK_ENTRY_ID = "c0f0448b8de02de1a78829da";
const STANDARD_DETAIL_ENTRY_ID = "99a2496eb8db1bcf9f1aae69";
const REPORT_ENTRY_ID = "3d434c07be460e11b4d27d2e";
const REPORT_DETAIL_ENTRY_ID = "51e34993af7355da52fb2fd8";
const HAZARD_ENTRY_ID = "2759402bb574ebe89f9c0ea6";

const MEMBER_FIELD = {
  user: "_widget_1711353655843",
  userId: "_widget_1711353656071",
  userName: "_widget_1713163175073",
  uniqueId: "_widget_1711353655933",
  mobile: "_widget_1711353656002",
  email: "_widget_1711353656019",
  status: "_widget_1711617327049",
  departments: "_widget_1711353655862",
  departmentsName: "_widget_1721802992098",
  mainDepartment: "_widget_1711353656122",
  mainDepartmentName: "_widget_1721802992181",
};

const DEVICE_FIELD = {
  code: "_widget_1775562607984",
  name: "_widget_1775562608011",
  type: "_widget_1775803708083",
  workshop: "_widget_1775562609479",
  department: "_widget_1775562609756",
  status: "_widget_1775562609528",
  inspectStandardId: "_widget_1776079114010",
  inspectStandardCode: "_widget_1776079114066",
  qrCodeNo: "_widget_1776079114029",
  qrContent: "_widget_1776079306687",
  qrImageRef: "_widget_1776079114122",
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

const TASK_FIELD = {
  taskDate: "_widget_1776079458825",
  standardId: "_widget_1776079458873",
  standardCode: "_widget_1776079458933",
  standardName: "_widget_1776079458952",
  ruleId: "_widget_1776079458990",
  ruleName: "_widget_1776079459028",
  deviceId: "_widget_1776079459066",
  deviceCode: "_widget_1776079459085",
  deviceName: "_widget_1776079459104",
  taskStatus: "_widget_1776079459279",
  reportStatus: "_widget_1776079459327",
  reportedCount: "_widget_1776079459358",
  shouldReportCount: "_widget_1776079459379",
};

const STANDARD_DETAIL_FIELD = {
  standardId: "_widget_1775877903686",
  standardName: "_widget_1775877903705",
  seq: "_widget_1775877903724",
  pointPart: "_widget_1775877903789",
  pointItem: "_widget_1775877903808",
  checkMethod: "_widget_1775877903827",
  checkContent: "_widget_1775877903850",
  checkStandard: "_widget_1775877903867",
  standardText: "_widget_1775877904093",
  unit: "_widget_1775877904112",
  resultType: "_widget_1775877904131",
  resultOptions: "_widget_1775877904155",
  abnormalDescRequired: "_widget_1775877904219",
  abnormalPhotoRequired: "_widget_1775877904306",
  enableStatus: "_widget_1775877904398",
};

const REPORT_FIELD = {
  qrId: "_widget_1776079806864",
  scanValue: "_widget_1776079806883",
  deviceId: "_widget_1776046716626",
  deviceCode: "_widget_1776079806938",
  deviceName: "_widget_1776046716607",
  standardId: "_widget_1776046716514",
  standardCode: "_widget_1776079807011",
  standardName: "_widget_1776079807048",
  taskId: "_widget_1776046716533",
  reportDate: "_widget_1776046716755",
  reporter: "_widget_1776046716882",
  startTime: "_widget_1776079807204",
  endTime: "_widget_1776079807238",
  currentStatus: "_widget_1776046716956",
  result: "_widget_1776079807292",
  abnormalCount: "_widget_1776079807331",
  needReview: "_widget_1776079807352",
  reviewer: "_widget_1776046716901",
  remark: "_widget_1776046717046",
};

const REPORT_DETAIL_FIELD = {
  reportId: "_widget_1776047187030",
  standardDetailId: "_widget_1776047187049",
  seq: "_widget_1776047187068",
  pointPart: "_widget_1776047187089",
  pointItem: "_widget_1776047187108",
  judgeStandard: "_widget_1776080156356",
  unit: "_widget_1776080156375",
  mobileInputValue: "_widget_1776080156394",
  actualOptionValue: "_widget_1776080156413",
  actualNumericValue: "_widget_1776080156432",
  abnormal: "_widget_1776047187226",
  abnormalDesc: "_widget_1776047187262",
  abnormalPhotos: "_widget_1776047187279",
  handling: "_widget_1776047187310",
  submitTime: "_widget_1776080156486",
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

const TASK_STATUS_DONE_SET = new Set(["已完成", "完成", "异常", "已报工", "已关闭", "作废", "失效"]);
const REPORTABLE_TASK_STATUS_SET = new Set(["", "未执行", "未开始", "待执行", "待点检", "执行中", "进行中"]);

function registerInspectionReportRoutes(app, config) {
  app.get("/api/inspection-report/bootstrap", asyncHandler(async (req, res) => {
    const today = formatDate(startOfDay(new Date()));
    res.json({
      ok: true,
      data: {
        today,
        reportStatusOptions: ["已完成", "执行中"],
        reportResultOptions: ["正常", "异常"],
        needReviewOptions: ["否", "是"],
      },
    });
  }));

  app.get("/api/inspection-report/current-member", asyncHandler(async (req, res) => {
    const identity = collectMemberIdentity(req);
    let members = [];
    let lookupError = "";

    try {
      members = await fetchContactUsers(config);
    } catch (error) {
      lookupError = error && error.message ? error.message : "通讯录查询失败";
    }

    const matched = resolveCurrentMember(members, identity);
    res.json({
      ok: true,
      data: {
        member: matched || null,
        memberCount: members.length,
        identity,
        matched: Boolean(matched),
        lookupError,
        source: {
          type: "openapi",
          path: "/user/user_list",
        },
      },
    });
  }));

  app.get("/api/inspection-report/member-search", asyncHandler(async (req, res) => {
    const keyword = normalizeCompareText(req.query.q);
    const limit = clampNumber(toIntOrDefault(req.query.limit, 50), 1, 100);
    const list = (await fetchContactUsers(config))
      .filter((row) => Boolean(row.userName || row.user || row.mobile || row.userId))
      .filter((row) => isActiveMemberStatus(row.status))
      .filter((row) => {
        if (!keyword) {
          return true;
        }
        const text = [
          row.userName,
          row.user,
          row.userId,
          row.uniqueId,
          row.mobile,
          row.email,
        ]
          .map((item) => normalizeCompareText(item))
          .filter(Boolean)
          .join(" ");
        return Boolean(text && (text.includes(keyword) || keyword.includes(text)));
      })
      .sort((a, b) => String(a.userName || a.user || "").localeCompare(String(b.userName || b.user || ""), "zh-Hans-CN"))
      .slice(0, limit);

    res.json({
      ok: true,
      data: {
        list,
        count: list.length,
        keyword: toDisplayText(req.query.q),
      },
    });
  }));

  app.get("/api/inspection-report/dashboard", asyncHandler(async (req, res) => {
    const targetDate = formatDate(startOfDay(req.query.date ? req.query.date : new Date()));
    const limit = clampNumber(toIntOrDefault(req.query.limit, 120), 20, 500);
    const [taskRecords, deviceRecords, chemicalRecords] = await Promise.all([
      fetchReportTaskRecords(config, {
        dashboardDate: targetDate,
        doneStatuses: Array.from(TASK_STATUS_DONE_SET),
        limit: Math.max(limit * 5, 500),
      }),
      fetchEntryRecords(config, DEVICE_ENTRY_ID),
      fetchEntryRecords(config, CHEMICAL_ENTRY_ID),
    ]);

    const devices = [
      ...deviceRecords.map(mapDeviceRecord),
      ...chemicalRecords.map(mapChemicalRecord),
    ];
    const deviceById = new Map();
    const deviceByCode = new Map();
    devices.forEach((device) => {
      const idKey = normalizeCompareText(device.id);
      const codeKey = normalizeCompareText(device.code);
      if (idKey) {
        deviceById.set(idKey, device);
      }
      if (codeKey) {
        deviceByCode.set(codeKey, device);
      }
    });

    const list = taskRecords
      .map(mapTaskRecord)
      .map((task) => enrichDashboardTask(task, targetDate, deviceById, deviceByCode))
      .filter((task) => {
        const taskDate = task.taskDateText || "";
        if (taskDate && taskDate > targetDate) {
          return false;
        }
        if (task.done && taskDate && taskDate < targetDate) {
          return false;
        }
        return true;
      })
      .sort(compareDashboardTask)
      .slice(0, limit);

    const summary = {
      date: targetDate,
      totalCount: list.length,
      urgentCount: list.filter((item) => item.urgent).length,
      pendingCount: list.filter((item) => item.pending).length,
      doneCount: list.filter((item) => item.done).length,
    };

    res.json({
      ok: true,
      data: {
        summary,
        list,
      },
    });
  }));

  app.get("/api/inspection-report/recent", asyncHandler(async (req, res) => {
    const limit = clampNumber(toIntOrDefault(req.query.limit, 20), 1, 100);
    const reporterFilter = normalizeCompareText(req.query.reporter);
    const targetDate = normalizeDate(req.query.date) || formatDate(startOfDay(new Date()));
    const targetMonth = targetDate ? targetDate.slice(0, 7) : "";
    const reportRecords = await fetchEntryRecords(config, REPORT_ENTRY_ID);
    const filteredList = reportRecords
      .map(mapReportRecord)
      .filter((row) => {
        if (!reporterFilter) {
          return true;
        }
        const reporter = normalizeCompareText(row.reporter);
        if (!reporter) {
          return false;
        }
        return reporter === reporterFilter || reporter.includes(reporterFilter) || reporterFilter.includes(reporter);
      });
    const summary = {
      date: targetDate,
      month: targetMonth,
      dailyCount: filteredList.filter((row) => normalizeDate(row.reportDateText) === targetDate).length,
      monthlyCount: filteredList.filter((row) => {
        const reportDate = normalizeDate(row.reportDateText);
        return targetMonth && reportDate.startsWith(targetMonth);
      }).length,
      totalCount: filteredList.length,
    };
    const list = filteredList
      .sort((a, b) => (b.reportDateText || "").localeCompare(a.reportDateText || ""))
      .slice(0, limit);
    res.json({
      ok: true,
      data: {
        summary,
        list,
      },
    });
  }));

  app.get("/api/inspection-report/recent-details", asyncHandler(async (req, res) => {
    const limit = clampNumber(toIntOrDefault(req.query.limit, 30), 1, 200);
    const filterReportId = toDisplayText(req.query.reportId);
    const filterDeviceId = toDisplayText(req.query.deviceId);
    const filterDeviceCode = toDisplayText(req.query.deviceCode);

    const [reportRecords, detailRecords] = await Promise.all([
      fetchEntryRecords(config, REPORT_ENTRY_ID),
      fetchEntryRecords(config, REPORT_DETAIL_ENTRY_ID),
    ]);

    const reportList = reportRecords
      .map(mapReportRecord)
      .filter((row) => {
        if (filterReportId) {
          return normalizeCompareText(row.id) === normalizeCompareText(filterReportId);
        }
        if (!filterDeviceId && !filterDeviceCode) {
          return true;
        }
        const byId = filterDeviceId && normalizeCompareText(row.deviceId) === normalizeCompareText(filterDeviceId);
        const byCode = filterDeviceCode && normalizeCompareText(row.deviceCode) === normalizeCompareText(filterDeviceCode);
        return Boolean(byId || byCode);
      })
      .sort((a, b) => (b.reportDateText || "").localeCompare(a.reportDateText || ""));

    const latestReports = filterReportId ? reportList.slice(0, 1) : reportList.slice(0, 60);
    const reportMap = new Map(latestReports.map((row) => [row.id, row]));
    const list = detailRecords
      .map(mapReportDetailRecord)
      .filter((detail) => detail.reportId && reportMap.has(detail.reportId))
      .map((detail) => {
        const report = reportMap.get(detail.reportId) || {};
        return {
          id: detail.id,
          reportId: detail.reportId,
          reportNo: report.reportNo || "",
          reportDateText: report.reportDateText || "",
          submitTime: detail.submitTime || "",
          deviceCode: report.deviceCode || "",
          deviceName: report.deviceName || "",
          standardName: report.standardName || "",
          reporter: report.reporter || "",
          pointPart: detail.pointPart || "",
          pointItem: detail.pointItem || "",
          resultValue: detail.resultValue || "",
          abnormal: detail.abnormal || "否",
          abnormalDesc: detail.abnormalDesc || "",
        };
      })
      .sort((a, b) => {
        const ta = a.submitTime || a.reportDateText || "";
        const tb = b.submitTime || b.reportDateText || "";
        return tb.localeCompare(ta);
      })
      .slice(0, limit);

    res.json({
      ok: true,
      data: {
        report: latestReports[0] || null,
        list,
      },
    });
  }));

  app.get("/api/inspection-report/monthly-devices", asyncHandler(async (req, res) => {
    const deviceRecords = await fetchEntryRecords(config, DEVICE_ENTRY_ID);
    const devices = deviceRecords
      .map(mapDeviceRecord)
      .filter((row) => row.id || row.code || row.name)
      .sort(compareDeviceOption);

    res.json({
      ok: true,
      data: {
        month: formatMonth(new Date()),
        devices,
      },
    });
  }));

  app.get("/api/inspection-report/monthly", asyncHandler(async (req, res) => {
    const month = normalizeMonth(req.query.month) || formatMonth(new Date());
    const filterDeviceId = toDisplayText(req.query.deviceId);
    const filterDeviceCode = toDisplayText(req.query.deviceCode);
    if (!filterDeviceId && !filterDeviceCode) {
      res.status(400).json({ ok: false, message: "请选择设备" });
      return;
    }

    const [
      deviceRecords,
      standardDetailRecords,
      reportRecords,
      reportDetailRecords,
      hazardRecords,
    ] = await Promise.all([
      fetchEntryRecords(config, DEVICE_ENTRY_ID),
      fetchEntryRecords(config, STANDARD_DETAIL_ENTRY_ID),
      fetchEntryRecords(config, REPORT_ENTRY_ID),
      fetchEntryRecords(config, REPORT_DETAIL_ENTRY_ID),
      fetchEntryRecords(config, HAZARD_ENTRY_ID),
    ]);

    const devices = deviceRecords.map(mapDeviceRecord);
    const device = findMonthlyDevice(devices, { deviceId: filterDeviceId, deviceCode: filterDeviceCode });
    if (!device) {
      res.status(404).json({ ok: false, message: "未找到对应设备" });
      return;
    }

    const monthlyReports = reportRecords
      .map(mapReportRecord)
      .filter((row) => isReportForMonthlyDevice(row, device))
      .filter((row) => {
        const reportDate = normalizeDate(row.reportDateText);
        return reportDate && reportDate.startsWith(month);
      })
      .sort((a, b) => String(a.reportDateText || "").localeCompare(String(b.reportDateText || "")));

    const reportById = new Map(monthlyReports.map((row) => [row.id, row]));
    const reportIdSet = new Set(monthlyReports.map((row) => row.id).filter(Boolean));
    const standardRefs = buildMonthlyStandardRefs(device, monthlyReports);
    let details = standardDetailRecords
      .map(mapStandardDetailRecord)
      .filter((row) => isEnabledStatus(row.enableStatus))
      .filter((row) => standardRefs.some((ref) => isDetailBelongToTask(row, ref)))
      .sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));
    const monthlyDetails = reportDetailRecords
      .map(mapReportDetailRecord)
      .filter((row) => row.reportId && reportIdSet.has(row.reportId));
    if (!details.length && monthlyDetails.length) {
      details = buildMonthlyDetailFallbackRows(monthlyDetails);
    }

    const gridRows = buildMonthlyGridRows(details, monthlyReports, monthlyDetails, month);
    const hazards = hazardRecords
      .map(mapInspectionHazardRecord)
      .filter((row) => row.submissionId && reportIdSet.has(row.submissionId))
      .filter((row) => isInspectionHazardSource(row.source))
      .map((row, index) => mapMonthlyHazardRow(row, index + 1, reportById))
      .sort((a, b) => String(a.reportDate || "").localeCompare(String(b.reportDate || "")) || a.seq - b.seq);

    res.json({
      ok: true,
      data: {
        month,
        monthText: formatMonthText(month),
        days: buildMonthDays(month),
        device,
        details: gridRows,
        hazards,
        summary: {
          detailCount: gridRows.length,
          reportCount: monthlyReports.length,
          abnormalReportCount: monthlyReports.filter((row) => toDisplayText(row.result).includes("异常")).length,
          hazardCount: hazards.length,
        },
      },
    });
  }));

  app.post("/api/inspection-report/scan", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const scanValue = toDisplayText(payload.scanValue || payload.code || payload.deviceCode);
    if (!scanValue) {
      res.status(400).json({ ok: false, message: "请传入扫码码值、设备编号或库房编码" });
      return;
    }

    const [deviceRecords, chemicalRecords, siteRecords] = await Promise.all([
      fetchEntryRecords(config, DEVICE_ENTRY_ID),
      fetchEntryRecords(config, CHEMICAL_ENTRY_ID),
      fetchEntryRecords(config, SITE_ENTRY_ID),
    ]);

    const chemicals = chemicalRecords.map(mapChemicalRecord);
    const sites = siteRecords.map(mapSiteRecord);
    const devices = [
      ...deviceRecords.map(mapDeviceRecord),
      ...chemicals,
    ];
    const matchedDevice = findMatchedDevice(devices, scanValue);
    const matchedSite = matchedDevice ? null : findMatchedSite(sites, scanValue);
    if (!matchedDevice && !matchedSite) {
      res.status(404).json({ ok: false, message: `未找到检查对象：${scanValue}` });
      return;
    }

    const today = formatDate(startOfDay(new Date()));
    const targetChemicals = matchedSite
      ? chemicals.filter((chemical) => isChemicalInSite(chemical, matchedSite))
      : [];
    const scanTaskTargets = matchedDevice ? [matchedDevice] : targetChemicals;
    const taskRecords = await fetchReportTaskRecords(config, {
      startDate: today,
      endDate: today,
      deviceTargets: buildDeviceTaskTargets(scanTaskTargets),
    });
    const tasks = taskRecords
      .map(mapTaskRecord)
      .filter((task) => {
        if (matchedDevice) {
          return isTaskBoundToDevice(task, matchedDevice);
        }
        return targetChemicals.some((chemical) => isTaskBoundToDevice(task, chemical));
      })
      .filter((task) => task.taskDateText === today)
      .sort((a, b) => {
        const doneA = TASK_STATUS_DONE_SET.has(toDisplayText(a.taskStatus)) ? 1 : 0;
        const doneB = TASK_STATUS_DONE_SET.has(toDisplayText(b.taskStatus)) ? 1 : 0;
        return doneA - doneB || (a.taskDateText || "").localeCompare(b.taskDateText || "");
      });

    const selectedTask = tasks.find((task) => !TASK_STATUS_DONE_SET.has(toDisplayText(task.taskStatus))) || null;
    const scanTarget = matchedDevice || {
      id: matchedSite.id,
      code: matchedSite.code,
      name: matchedSite.name,
      type: "危化品库",
      workshop: matchedSite.area,
      department: matchedSite.owner,
      status: "启用",
      objectType: "危化品库",
      matchedChemicalCount: targetChemicals.length,
    };

    res.json({
      ok: true,
      data: {
        scanValue,
        device: scanTarget,
        tasks,
        selectedTaskId: selectedTask ? selectedTask.id : "",
      },
    });
  }));

  app.post("/api/inspection-report/task-items", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const taskId = toDisplayText(payload.taskId || payload.id);
    if (!taskId) {
      res.status(400).json({ ok: false, message: "缺少 taskId" });
      return;
    }

    const [taskRecords, detailRecords] = await Promise.all([
      fetchReportTaskRecords(config, { taskId }),
      fetchEntryRecords(config, STANDARD_DETAIL_ENTRY_ID),
    ]);

    const task = taskRecords.map(mapTaskRecord).find((item) => item.id === taskId);
    if (!task) {
      res.status(404).json({ ok: false, message: "未找到对应任务" });
      return;
    }

    const allDetails = detailRecords.map(mapStandardDetailRecord);
    const enabledDetails = allDetails.filter((row) => isEnabledStatus(row.enableStatus));
    const matchedDetails = enabledDetails.filter((row) => isDetailBelongToTask(row, task));
    const matchSource = "task-standard";
    const detailItems = matchedDetails
      .sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0))
      .map(toReportItemTemplate);

    res.json({
      ok: true,
      data: {
        task,
        items: detailItems,
        stats: {
          totalDetailCount: allDetails.length,
          enabledDetailCount: enabledDetails.length,
          matchedDetailCount: matchedDetails.length,
          returnedDetailCount: detailItems.length,
          matchSource,
          taskStandardId: task.standardId || "",
          taskStandardCode: task.standardCode || "",
          taskStandardName: task.standardName || "",
          sampleDetailRefs: enabledDetails.slice(0, 8).map((row) => ({
            standardId: row.standardId || "",
            standardName: row.standardName || "",
          })),
        },
      },
    });
  }));

  app.post("/api/inspection-report/submit", asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const taskId = toDisplayText(payload.taskId);
    const reporter = toDisplayText(payload.reporter);
    const scanValue = toDisplayText(payload.scanValue);
    const reviewer = toDisplayText(payload.reviewer);
    const remark = toDisplayText(payload.remark);
    const startedAt = normalizeDateTime(payload.startedAt);
    const endedAt = normalizeDateTime(payload.endedAt) || formatDateTime(new Date());
    const items = Array.isArray(payload.items) ? payload.items : [];

    if (!taskId) {
      res.status(400).json({ ok: false, message: "taskId 不能为空" });
      return;
    }
    if (!reporter) {
      res.status(400).json({ ok: false, message: "报工人不能为空" });
      return;
    }
    if (!items.length) {
      res.status(400).json({ ok: false, message: "报工明细不能为空" });
      return;
    }

    const [taskRecords, deviceRecords, chemicalRecords] = await Promise.all([
      fetchReportTaskRecords(config, { taskId }),
      fetchEntryRecords(config, DEVICE_ENTRY_ID),
      fetchEntryRecords(config, CHEMICAL_ENTRY_ID),
    ]);

    const task = taskRecords.map(mapTaskRecord).find((item) => item.id === taskId);
    if (!task) {
      res.status(404).json({ ok: false, message: "未找到对应任务" });
      return;
    }

    const device = [
      ...deviceRecords.map(mapDeviceRecord),
      ...chemicalRecords.map(mapChemicalRecord),
    ]
      .find((row) => isTaskBoundToDevice(task, row));

    const normalizedItems = items.map((item, index) => normalizeSubmitItem(item, index + 1));
    const abnormalItems = normalizedItems.filter((item) => item.isAbnormal);
    const pendingAbnormalItems = abnormalItems.filter((item) => !isSubmitItemHandled(item));
    const handledAbnormalItems = abnormalItems.filter((item) => isSubmitItemHandled(item));
    const abnormalCount = abnormalItems.length;
    const pendingAbnormalCount = pendingAbnormalItems.length;
    const reportResult = abnormalCount > 0 ? "异常" : "正常";
    const needReview = pendingAbnormalCount > 0 ? "是" : "否";
    const currentStatus = "已完成";
    const nowText = formatDateTime(new Date());
    const reportDateText = normalizeDateTime(payload.reportDate) || nowText;
    const startTimeText = startedAt || nowText;
    const endTimeText = endedAt || nowText;

    const reportResp = await requestEntry(config, REPORT_ENTRY_ID, "data_create", {
      data: {
        [REPORT_FIELD.qrId]: device ? device.qrCodeNo || device.qrImageRef || "" : "",
        [REPORT_FIELD.scanValue]: scanValue || (device ? device.qrContent || device.qrCodeNo || device.code : ""),
        [REPORT_FIELD.deviceId]: task.deviceId || (device ? device.id : ""),
        [REPORT_FIELD.deviceCode]: task.deviceCode || (device ? device.code : ""),
        [REPORT_FIELD.deviceName]: task.deviceName || (device ? device.name : ""),
        [REPORT_FIELD.standardId]: task.standardId || "",
        [REPORT_FIELD.standardCode]: task.standardCode || "",
        [REPORT_FIELD.standardName]: task.standardName || "",
        [REPORT_FIELD.taskId]: task.id || "",
        [REPORT_FIELD.reportDate]: reportDateText,
        [REPORT_FIELD.reporter]: reporter,
        [REPORT_FIELD.startTime]: startTimeText,
        [REPORT_FIELD.endTime]: endTimeText,
        [REPORT_FIELD.currentStatus]: currentStatus,
        [REPORT_FIELD.result]: reportResult,
        [REPORT_FIELD.abnormalCount]: abnormalCount,
        [REPORT_FIELD.needReview]: needReview,
        [REPORT_FIELD.reviewer]: reviewer,
        [REPORT_FIELD.remark]: remark,
      },
    });

    const reportId = extractRecordId(reportResp && reportResp.data ? reportResp.data : reportResp);
    if (!reportId) {
      throw new Error("报工主表写入成功但未返回 reportId");
    }

    const submitTime = formatDateTime(new Date());
    for (const item of normalizedItems) {
      await requestEntry(config, REPORT_DETAIL_ENTRY_ID, "data_create", {
        data: {
          [REPORT_DETAIL_FIELD.reportId]: reportId,
          [REPORT_DETAIL_FIELD.standardDetailId]: item.standardDetailId,
          [REPORT_DETAIL_FIELD.seq]: item.seq,
          [REPORT_DETAIL_FIELD.pointPart]: item.pointPart,
          [REPORT_DETAIL_FIELD.pointItem]: item.pointItem,
          [REPORT_DETAIL_FIELD.judgeStandard]: item.judgeStandard,
          [REPORT_DETAIL_FIELD.unit]: item.unit,
          [REPORT_DETAIL_FIELD.mobileInputValue]: item.mobileInputValue,
          [REPORT_DETAIL_FIELD.actualOptionValue]: item.actualOptionValue,
          [REPORT_DETAIL_FIELD.actualNumericValue]: item.actualNumericValue,
          [REPORT_DETAIL_FIELD.abnormal]: item.isAbnormal ? "是" : "否",
          [REPORT_DETAIL_FIELD.abnormalDesc]: item.abnormalDesc,
          [REPORT_DETAIL_FIELD.abnormalPhotos]: item.abnormalPhotos,
          [REPORT_DETAIL_FIELD.handling]: item.handling,
          [REPORT_DETAIL_FIELD.submitTime]: submitTime,
        },
      });
    }

    const hazardIds = [];
    const flowIds = [];
    const closedHazardIds = [];
    let hazardStartCount = 0;
    const hazardWarnings = [];

    const createInspectionHazard = async (groupItems, handled) => {
      if (!groupItems.length) {
        return;
      }
      const hazardPayload = buildHazardFromInspectionReport({
        task,
        device,
        reportId,
        reporter,
        reportDateText,
        remark,
        abnormalItems: groupItems,
        handled,
      });
      const hazardResult = handled
        ? await createClosedHazardRecord(config, hazardPayload, payload)
        : await createHazardRecord(config, hazardPayload, payload);
      const hazardId = extractRecordId(hazardResult.response && hazardResult.response.data ? hazardResult.response.data : hazardResult.response);
      if (hazardResult.flowUsed || !handled) {
        hazardStartCount += 1;
      }
      if (hazardId) {
        hazardIds.push(hazardId);
        if (handled && !hazardResult.flowUsed) {
          closedHazardIds.push(hazardId);
        } else {
          flowIds.push(hazardId);
        }
      } else {
        hazardWarnings.push("点检异常工单已发起，但百数云未返回工单ID");
      }
      if (hazardResult.warning) {
        hazardWarnings.push(hazardResult.warning);
      }
    };

    await createInspectionHazard(pendingAbnormalItems, false);
    await createInspectionHazard(handledAbnormalItems, true);

    const taskUpdatePayload = {
      [TASK_FIELD.taskStatus]: pendingAbnormalCount > 0 ? "异常" : "已完成",
      [TASK_FIELD.reportStatus]: "已报工",
      [TASK_FIELD.reportedCount]: task.shouldReportCount > 0 ? task.shouldReportCount : normalizedItems.length,
    };
    await updateTaskByConfiguredStore(config, task, taskUpdatePayload);

    res.json({
      ok: true,
      data: {
        reportId,
        reportResult,
        abnormalCount,
        pendingAbnormalCount,
        hazardIds,
        flowIds,
        closedHazardIds,
        flowStartCount: hazardStartCount,
        hazardWarning: hazardWarnings[0] || "",
        hazardWarnings,
        detailCount: normalizedItems.length,
        taskStatus: pendingAbnormalCount > 0 ? "异常" : "已完成",
      },
    });
  }));
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
  throw new Error(`点检异常工单发起失败：${errors.filter(Boolean).join("；") || "未知错误"}`);
}

async function createClosedHazardRecord(config, values, options = {}) {
  try {
    const response = await requestEntry(config, HAZARD_ENTRY_ID, "data_create", { data: values });
    return { response, flowUsed: false };
  } catch (error) {
    const fallback = await createHazardRecord(config, values, options);
    return {
      ...fallback,
      flowUsed: true,
      warning: `已处理点检异常直接归档失败，已按流程发起：${error.message}`,
    };
  }
}

function buildHazardFromInspectionReport(context) {
  const task = context.task || {};
  const device = context.device || {};
  const abnormalItems = Array.isArray(context.abnormalItems) ? context.abnormalItems : [];
  const handled = Boolean(context.handled);
  const deviceName = task.deviceName || device.name || "点检对象";
  const deviceCode = task.deviceCode || device.code || "";
  const standardName = task.standardName || "点检标准";
  const title = `${deviceName} - ${standardName}异常`;
  const target = deviceCode ? `${deviceName}（${deviceCode}）` : deviceName;
  const closedAt = handled ? formatDateTime(new Date()) : "";
  const beforePhotos = abnormalItems
    .map((item) => item.abnormalPhotos)
    .filter(Boolean)
    .join(",");

  return {
    [HAZARD_FIELD.submissionId]: context.reportId || "",
    [HAZARD_FIELD.submissionDetailId]: task.id || "",
    [HAZARD_FIELD.title]: title,
    [HAZARD_FIELD.description]: buildInspectionHazardDescription({
      task,
      device,
      reportId: context.reportId,
      reporter: context.reporter,
      reportDateText: context.reportDateText,
      remark: context.remark,
      abnormalItems,
    }),
    [HAZARD_FIELD.riskLevel]: "一般",
    [HAZARD_FIELD.target]: target,
    [HAZARD_FIELD.ownerDept]: "",
    [HAZARD_FIELD.ownerUser]: "",
    [HAZARD_FIELD.deadline]: formatDateTime(addDays(new Date(), 7)),
    [HAZARD_FIELD.requirement]: handled ? "现场已处理，留存点检异常闭环记录。" : "请根据点检异常项完成整改，并在工单中上传整改记录。",
    [HAZARD_FIELD.status]: handled ? "已关闭" : "待整改",
    [HAZARD_FIELD.actionDesc]: handled ? "现场已处理，提交点检报工时自动关闭。" : "",
    [HAZARD_FIELD.beforePhotos]: beforePhotos,
    [HAZARD_FIELD.afterPhotos]: "",
    [HAZARD_FIELD.verifier]: "",
    [HAZARD_FIELD.verifyComment]: handled ? "现场已处理，无需后续整改。" : "",
    [HAZARD_FIELD.closedAt]: closedAt,
    [HAZARD_FIELD.overdue]: "否",
    [HAZARD_FIELD.source]: "点巡检",
  };
}

function buildInspectionHazardDescription(input) {
  const abnormalItems = Array.isArray(input.abnormalItems) ? input.abnormalItems : [];
  const lines = [
    `异常项数：${abnormalItems.length}`,
    "异常明细：",
  ];
  abnormalItems.forEach((item, index) => {
    lines.push(formatInspectionAbnormalLine(item, index + 1));
  });
  return lines.join("\n");
}

function formatInspectionAbnormalLine(item, index) {
  const desc = item.abnormalDesc || "-";
  const handling = item.handling || "-";
  const handlingStatus = normalizeHandlingStatus(item.handlingStatus);
  return `${index}. 异常描述：${desc}；处理措施：${handling}；处理情况：${handlingStatus}`;
}

async function fetchReportTaskRecords(config, filters = {}) {
  if (shouldReadTasksFromDb(config)) {
    return listTaskAliasRecords(config, TASK_FIELD, filters);
  }
  return fetchEntryRecords(config, TASK_ENTRY_ID);
}

async function updateTaskByConfiguredStore(config, task, data) {
  if (shouldWriteTasksToBes(config)) {
    await requestEntry(config, TASK_ENTRY_ID, "data_update", {
      data_id: task.id,
      data,
    });
  }
  if (shouldWriteTasksToDb(config)) {
    await updateTaskReportState(config, task, data, TASK_FIELD);
  }
}

function buildDeviceTaskTargets(devices) {
  const output = new Set();
  (Array.isArray(devices) ? devices : [devices]).forEach((device) => {
    if (!device) {
      return;
    }
    [device.id, device.code, device.qrCodeNo, device.qrContent, device.qrCode]
      .map((item) => toDisplayText(item))
      .filter(Boolean)
      .forEach((item) => output.add(item));
  });
  return Array.from(output);
}

function findMatchedDevice(devices, scanValue) {
  const text = toDisplayText(scanValue);
  if (!text) {
    return null;
  }
  const exact = devices.find((item) => {
    const candidates = [item.id, item.code, item.qrCodeNo, item.qrContent, item.qrImageRef, item.qrCode];
    return candidates.some((value) => String(value || "") === text);
  });
  if (exact) {
    return exact;
  }
  return devices.find((item) => {
    const candidates = [item.code, item.qrCodeNo, item.qrContent, item.qrCode];
    return candidates.some((value) => {
      const v = String(value || "");
      return v && (v.includes(text) || text.includes(v));
    });
  }) || null;
}

function findMatchedSite(sites, scanValue) {
  const text = toDisplayText(scanValue);
  if (!text) {
    return null;
  }
  const exact = sites.find((item) => {
    const candidates = [item.id, item.code, item.name, item.displayName, getSiteDisplayName(item)];
    return candidates.some((value) => String(value || "") === text);
  });
  if (exact) {
    return exact;
  }
  const normalized = normalizeCompareText(text);
  return sites.find((item) => {
    const candidates = [item.code, item.name, item.displayName, getSiteDisplayName(item)];
    return candidates.some((value) => {
      const v = normalizeCompareText(value);
      return v && (v.includes(normalized) || normalized.includes(v));
    });
  }) || null;
}

function isChemicalInSite(chemical, site) {
  if (!chemical || !site) {
    return false;
  }
  const chemicalCandidates = [chemical.storageLocation, chemical.location, chemical.usageLocation, chemical.workshop];
  const siteCandidates = [site.name, site.code, site.displayName, getSiteDisplayName(site)];
  return chemicalCandidates.some((left) =>
    siteCandidates.some((right) => {
      const a = normalizeCompareText(left);
      const b = normalizeCompareText(right);
      return Boolean(a && b && a === b);
    })
  );
}

function enrichDashboardTask(task, todayText, deviceById, deviceByCode) {
  const idKey = normalizeCompareText(task.deviceId);
  const codeKey = normalizeCompareText(task.deviceCode);
  const device = (idKey && deviceById.get(idKey)) || (codeKey && deviceByCode.get(codeKey)) || null;
  const done = TASK_STATUS_DONE_SET.has(toDisplayText(task.taskStatus));
  const taskDate = task.taskDateText || "";
  const urgent = Boolean(taskDate && taskDate < todayText && !done);
  const pending = !done && (!taskDate || taskDate <= todayText);
  const category = inferTaskCategory(task);
  const level = urgent ? "urgent" : done ? "done" : "todo";
  const statusText = urgent ? "超期未执行" : done ? "已完成" : "待执行";

  return {
    ...task,
    urgent,
    pending,
    done,
    level,
    statusText,
    category,
    deviceType: device ? device.type || "" : "",
    workshop: device ? device.workshop || "" : "",
    department: device ? device.department || "" : "",
    deviceStatus: device ? device.status || "" : "",
  };
}

function compareDashboardTask(a, b) {
  const weight = (task) => {
    if (task.urgent) return 0;
    if (task.pending) return 1;
    return 2;
  };
  const wa = weight(a);
  const wb = weight(b);
  if (wa !== wb) {
    return wa - wb;
  }
  const da = a.taskDateText || "";
  const db = b.taskDateText || "";
  if (da !== db) {
    return da.localeCompare(db);
  }
  return String(a.standardName || "").localeCompare(String(b.standardName || ""));
}

function compareDeviceOption(a, b) {
  const left = `${a.code || ""}${a.name || ""}`;
  const right = `${b.code || ""}${b.name || ""}`;
  return left.localeCompare(right, "zh-Hans-CN");
}

function inferTaskCategory(task) {
  const text = `${toDisplayText(task.ruleName)} ${toDisplayText(task.standardName)} ${toDisplayText(task.standardCode)}`.toLowerCase();
  if (text.includes("周")) return "周检";
  if (text.includes("月")) return "月检";
  if (text.includes("定期")) return "定期点检";
  return "日检";
}

function isTaskBoundToDevice(task, device) {
  if (!task || !device) {
    return false;
  }
  const byId = task.deviceId && device.id && String(task.deviceId) === String(device.id);
  const byCode = task.deviceCode && device.code && String(task.deviceCode) === String(device.code);
  return Boolean(byId || byCode);
}

function findMonthlyDevice(devices, filters) {
  const deviceId = normalizeCompareText(filters && filters.deviceId);
  const deviceCode = normalizeCompareText(filters && filters.deviceCode);
  return (Array.isArray(devices) ? devices : []).find((device) => {
    const byId = deviceId && normalizeCompareText(device.id) === deviceId;
    const byCode = deviceCode && normalizeCompareText(device.code) === deviceCode;
    return Boolean(byId || byCode);
  }) || null;
}

function isReportForMonthlyDevice(report, device) {
  if (!report || !device) {
    return false;
  }
  const byId = report.deviceId && device.id && normalizeCompareText(report.deviceId) === normalizeCompareText(device.id);
  const byCode = report.deviceCode && device.code && normalizeCompareText(report.deviceCode) === normalizeCompareText(device.code);
  return Boolean(byId || byCode);
}

function isDetailBelongToMonthlyDevice(detail, device) {
  if (!detail || !device) {
    return false;
  }
  return isDetailBelongToTask(detail, {
    standardId: device.inspectStandardId || "",
    standardCode: device.inspectStandardCode || "",
    standardName: "",
  });
}

function buildMonthlyStandardRefs(device, reports) {
  const refs = [];
  const addRef = (source) => {
    const ref = {
      standardId: toDisplayText(source && source.standardId),
      standardCode: toDisplayText(source && source.standardCode),
      standardName: toDisplayText(source && source.standardName),
    };
    const key = [ref.standardId, ref.standardCode, ref.standardName]
      .map((item) => normalizeCompareText(item))
      .filter(Boolean)
      .join("|");
    if (!key || refs.some((item) => item.key === key)) {
      return;
    }
    refs.push({ ...ref, key });
  };

  (Array.isArray(reports) ? reports : []).forEach(addRef);
  if (!refs.length) {
    addRef({
      standardId: device && device.inspectStandardId,
      standardCode: device && device.inspectStandardCode,
      standardName: "",
    });
  }
  return refs.map(({ key, ...ref }) => ref);
}

function isTaskReportable(task, todayText) {
  if (!task || !task.id) {
    return false;
  }
  const status = toDisplayText(task.taskStatus);
  if (TASK_STATUS_DONE_SET.has(status)) {
    return false;
  }
  if (REPORTABLE_TASK_STATUS_SET.size && status && !REPORTABLE_TASK_STATUS_SET.has(status)) {
    return false;
  }
  const taskDateText = task.taskDateText || "";
  if (!taskDateText) {
    return true;
  }
  return taskDateText <= todayText;
}

function isDetailBelongToTask(detail, task) {
  if (!detail || !task) {
    return false;
  }
  const detailStandardId = normalizeCompareText(detail.standardId);
  const detailStandardName = normalizeCompareText(detail.standardName);
  const taskStandardKeys = [
    task.standardId,
    task.standardCode,
    task.standardName,
  ]
    .map((item) => normalizeCompareText(item))
    .filter(Boolean);

  if (!taskStandardKeys.length) {
    return false;
  }
  if (detailStandardId && taskStandardKeys.includes(detailStandardId)) {
    return true;
  }
  if (detailStandardName && taskStandardKeys.includes(detailStandardName)) {
    return true;
  }
  return false;
}

function toReportItemTemplate(row) {
  const options = parseOptionList(row.resultOptions || row.standardText || row.checkStandard || "");
  const judgeStandard = row.standardText || row.checkStandard || row.checkContent || "";
  const inputType = detectInputType(row.resultType, options, judgeStandard);
  const executeMode = detectExecuteMode(row.checkMethod, inputType, options, judgeStandard);
  return {
    standardDetailId: row.id,
    seq: Number(row.seq || 0),
    pointPart: row.pointPart || "",
    pointItem: row.pointItem || "",
    judgeStandard,
    unit: row.unit || "",
    checkMethod: row.checkMethod || "",
    inputType,
    executeMode,
    options,
    requireDescOnAbnormal: toYesNo(row.abnormalDescRequired) === "是",
    requirePhotoOnAbnormal: toYesNo(row.abnormalPhotoRequired) === "是",
  };
}

function detectInputType(resultType, options, judgeStandard) {
  const type = toDisplayText(resultType);
  if (type.includes("数值") || type.includes("数字") || type.includes("抄表")) {
    return "number";
  }
  if (looksLikeNumericJudgeStandard(judgeStandard)) {
    return "number";
  }
  if (type.includes("状态") || type.includes("选项")) {
    return "select";
  }
  if (type.includes("文本")) {
    return "text";
  }
  return Array.isArray(options) && options.length > 1 ? "select" : "text";
}

function detectExecuteMode(checkMethod, inputType, options, judgeStandard) {
  const method = toDisplayText(checkMethod);
  if (method.includes("抄表") || inputType === "number") {
    return "meter";
  }
  if (looksLikeNumericJudgeStandard(judgeStandard)) {
    return "meter";
  }
  if (method.includes("状态")) {
    return "status";
  }
  if (method.includes("普通")) {
    return "normal_abnormal";
  }
  if (inputType === "select") {
    return isBinaryNormalAbnormalOptions(options) ? "normal_abnormal" : "status";
  }
  if (inputType === "text") {
    return "text";
  }
  return "normal_abnormal";
}

function isBinaryNormalAbnormalOptions(options) {
  const list = Array.isArray(options) ? options.map((item) => toDisplayText(item)).filter(Boolean) : [];
  if (!list.length || list.length > 2) {
    return false;
  }
  return list.every((item) => item === "正常" || item === "异常");
}

function looksLikeNumericJudgeStandard(value) {
  const text = toDisplayText(value).replace(/\s+/g, "");
  if (!text) {
    return false;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    return true;
  }

  if (/(>=|<=|>|<|≥|≤)\s*-?\d+(?:\.\d+)?/.test(text)) {
    return true;
  }

  if (/-?\d+(?:\.\d+)?\s*(?:~|～|—|–|-|至|到)\s*-?\d+(?:\.\d+)?/.test(text)) {
    return true;
  }

  return false;
}

function parseOptionList(value) {
  const text = toDisplayText(value);
  if (!text) {
    return [];
  }
  const list = text
    .split(/[,\n，、|/；;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const unique = [];
  const seen = new Set();
  list.forEach((item) => {
    if (!seen.has(item)) {
      seen.add(item);
      unique.push(item);
    }
  });
  return unique;
}

function normalizeSubmitItem(source, fallbackSeq) {
  const item = source && typeof source === "object" ? source : {};
  const isAbnormal = toYesNo(item.isAbnormal) === "是";
  return {
    standardDetailId: toDisplayText(item.standardDetailId || item.id),
    seq: toIntOrDefault(item.seq, fallbackSeq),
    pointPart: toDisplayText(item.pointPart),
    pointItem: toDisplayText(item.pointItem),
    judgeStandard: toDisplayText(item.judgeStandard),
    unit: toDisplayText(item.unit),
    mobileInputValue: toDisplayText(item.mobileInputValue || item.inputValue),
    actualOptionValue: toDisplayText(item.actualOptionValue || item.optionValue),
    actualNumericValue: toNumberOrEmpty(item.actualNumericValue ?? item.numericValue),
    isAbnormal,
    abnormalDesc: toDisplayText(item.abnormalDesc),
    abnormalPhotos: normalizePhotos(item.photos || item.abnormalPhotos),
    handling: toDisplayText(item.handling),
    handlingStatus: isAbnormal ? normalizeHandlingStatus(item.handlingStatus || item.processStatus || item.disposalStatus) : "",
  };
}

function normalizePhotos(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => toDisplayText(item))
      .filter(Boolean)
      .join(",");
  }
  return toDisplayText(value);
}

function toYesNo(value) {
  const text = toDisplayText(value);
  if (!text) {
    return "否";
  }
  if (text === "1" || text === "true") {
    return "是";
  }
  if (text.includes("是") || text.includes("需") || text.includes("异常")) {
    return "是";
  }
  return "否";
}

function normalizeHandlingStatus(value) {
  const text = toDisplayText(value);
  if (text.includes("已")) {
    return "已处理";
  }
  return "待处理";
}

function isSubmitItemHandled(item) {
  return normalizeHandlingStatus(item && item.handlingStatus) === "已处理";
}

function mapDeviceRecord(record) {
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.name)),
    type: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.type)),
    workshop: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.workshop)),
    department: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.department)),
    status: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.status)),
    inspectStandardId: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.inspectStandardId)),
    inspectStandardCode: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.inspectStandardCode)),
    qrCodeNo: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.qrCodeNo)),
    qrContent: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.qrContent)),
    qrImageRef: toDisplayText(getAliasRawValue(record, DEVICE_FIELD.qrImageRef)),
  };
}

function mapChemicalRecord(record) {
  const usageLocation = toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.usageLocation));
  const storageLocation = toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.storageLocation));
  const qrCode = toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.qrCode));
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.code)),
    name: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.name)),
    type: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.packageForm)) || "危化品",
    workshop: usageLocation,
    department: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.owner)),
    status: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.status)),
    included: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.included)),
    inspectStandardId: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.inspectStandardId)),
    inspectStandardCode: "",
    qrCodeNo: qrCode,
    qrContent: qrCode,
    qrImageRef: "",
    qrCode,
    objectType: "危化品",
    usageLocation,
    storageLocation,
    location: storageLocation || usageLocation,
    riskLevel: toDisplayText(getAliasRawValue(record, CHEMICAL_FIELD.accidentType)),
  };
}

function mapSiteRecord(record) {
  const code = toDisplayText(getAliasRawValue(record, SITE_FIELD.code));
  const name = toDisplayText(getAliasRawValue(record, SITE_FIELD.name));
  const area = toDisplayText(getAliasRawValue(record, SITE_FIELD.area)) || "未配置区域";
  const displayName = getSiteDisplayName({ area, name });
  return {
    id: extractRecordId(record) || code || name,
    code,
    name,
    displayName,
    area,
    owner: toDisplayText(getAliasRawValue(record, SITE_FIELD.owner)),
  };
}

function getSiteDisplayName(site) {
  const area = toDisplayText(site?.area);
  const name = toDisplayText(site?.name);
  if (!name) {
    return area || "";
  }
  return area && area !== "未配置区域" && area !== name ? `${area}-${name}` : name;
}

function mapTaskRecord(record) {
  const taskDateRaw = toDisplayText(getAliasRawValue(record, TASK_FIELD.taskDate));
  const taskDate = parseDateTimeOrNull(taskDateRaw);
  return {
    id: extractRecordId(record),
    taskDate,
    taskDateText: taskDate ? formatDate(taskDate) : "",
    standardId: toDisplayText(getAliasRawValue(record, TASK_FIELD.standardId)),
    standardCode: toDisplayText(getAliasRawValue(record, TASK_FIELD.standardCode)),
    standardName: toDisplayText(getAliasRawValue(record, TASK_FIELD.standardName)),
    ruleId: toDisplayText(getAliasRawValue(record, TASK_FIELD.ruleId)),
    ruleName: toDisplayText(getAliasRawValue(record, TASK_FIELD.ruleName)),
    deviceId: toDisplayText(getAliasRawValue(record, TASK_FIELD.deviceId)),
    deviceCode: toDisplayText(getAliasRawValue(record, TASK_FIELD.deviceCode)),
    deviceName: toDisplayText(getAliasRawValue(record, TASK_FIELD.deviceName)),
    taskStatus: toDisplayText(getAliasRawValue(record, TASK_FIELD.taskStatus)),
    reportStatus: toDisplayText(getAliasRawValue(record, TASK_FIELD.reportStatus)),
    reportedCount: toIntOrDefault(getAliasRawValue(record, TASK_FIELD.reportedCount), 0),
    shouldReportCount: toIntOrDefault(getAliasRawValue(record, TASK_FIELD.shouldReportCount), 0),
  };
}

function mapStandardDetailRecord(record) {
  return {
    id: extractRecordId(record),
    standardId: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.standardId)),
    standardName: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.standardName)),
    seq: toIntOrDefault(getAliasRawValue(record, STANDARD_DETAIL_FIELD.seq), 0),
    pointPart: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.pointPart)),
    pointItem: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.pointItem)),
    checkMethod: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.checkMethod)),
    checkContent: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.checkContent)),
    checkStandard: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.checkStandard)),
    standardText: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.standardText)),
    unit: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.unit)),
    resultType: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.resultType)),
    resultOptions: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.resultOptions)),
    abnormalDescRequired: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.abnormalDescRequired)),
    abnormalPhotoRequired: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.abnormalPhotoRequired)),
    enableStatus: toDisplayText(getAliasRawValue(record, STANDARD_DETAIL_FIELD.enableStatus)),
  };
}

function mapReportRecord(record) {
  const reportDateRaw = toDisplayText(getAliasRawValue(record, REPORT_FIELD.reportDate));
  return {
    id: extractRecordId(record),
    reportNo: toDisplayText(getAliasRawValue(record, "_widget_1776046716481")),
    deviceId: toDisplayText(getAliasRawValue(record, REPORT_FIELD.deviceId)),
    deviceCode: toDisplayText(getAliasRawValue(record, REPORT_FIELD.deviceCode)),
    deviceName: toDisplayText(getAliasRawValue(record, REPORT_FIELD.deviceName)),
    standardId: toDisplayText(getAliasRawValue(record, REPORT_FIELD.standardId)),
    standardCode: toDisplayText(getAliasRawValue(record, REPORT_FIELD.standardCode)),
    standardName: toDisplayText(getAliasRawValue(record, REPORT_FIELD.standardName)),
    taskId: toDisplayText(getAliasRawValue(record, REPORT_FIELD.taskId)),
    reporter: toDisplayText(getAliasRawValue(record, REPORT_FIELD.reporter)),
    reportDateText: reportDateRaw,
    currentStatus: toDisplayText(getAliasRawValue(record, REPORT_FIELD.currentStatus)),
    result: toDisplayText(getAliasRawValue(record, REPORT_FIELD.result)),
    abnormalCount: toIntOrDefault(getAliasRawValue(record, REPORT_FIELD.abnormalCount), 0),
    remark: toDisplayText(getAliasRawValue(record, REPORT_FIELD.remark)),
  };
}

function mapReportDetailRecord(record) {
  const mobileInputValue = toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.mobileInputValue));
  const actualOptionValue = toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.actualOptionValue));
  const actualNumericValue = toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.actualNumericValue));
  return {
    id: extractRecordId(record),
    reportId: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.reportId)),
    standardDetailId: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.standardDetailId)),
    seq: toIntOrDefault(getAliasRawValue(record, REPORT_DETAIL_FIELD.seq), 0),
    pointPart: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.pointPart)),
    pointItem: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.pointItem)),
    judgeStandard: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.judgeStandard)),
    submitTime: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.submitTime)),
    mobileInputValue,
    actualOptionValue,
    actualNumericValue,
    abnormal: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.abnormal)) || "否",
    abnormalDesc: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.abnormalDesc)),
    handling: toDisplayText(getAliasRawValue(record, REPORT_DETAIL_FIELD.handling)),
    resultValue: actualOptionValue || actualNumericValue || mobileInputValue || "",
  };
}

function mapInspectionHazardRecord(record) {
  return {
    id: extractRecordId(record),
    code: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.code)),
    submissionId: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.submissionId)),
    submissionDetailId: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.submissionDetailId)),
    title: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.title)),
    description: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.description)),
    riskLevel: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.riskLevel)),
    target: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.target)),
    deadline: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.deadline)),
    requirement: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.requirement)),
    status: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.status)) || "待整改",
    actionDesc: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.actionDesc)),
    verifyComment: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.verifyComment)),
    closedAt: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.closedAt)),
    overdue: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.overdue)),
    source: toDisplayText(getAliasRawValue(record, HAZARD_FIELD.source)),
  };
}

function buildMonthlyGridRows(standardDetails, reports, reportDetails, month) {
  const days = buildMonthDays(month);
  const reportsByDay = new Map();
  (Array.isArray(reports) ? reports : []).forEach((report) => {
    const day = getDayNumber(report.reportDateText);
    if (!day) {
      return;
    }
    if (!reportsByDay.has(day)) {
      reportsByDay.set(day, []);
    }
    reportsByDay.get(day).push(report);
  });

  const detailsByReportId = new Map();
  (Array.isArray(reportDetails) ? reportDetails : []).forEach((detail) => {
    if (!detail.reportId) {
      return;
    }
    if (!detailsByReportId.has(detail.reportId)) {
      detailsByReportId.set(detail.reportId, []);
    }
    detailsByReportId.get(detail.reportId).push(detail);
  });

  return (Array.isArray(standardDetails) ? standardDetails : []).map((detail, index) => {
    const standardKey = getMonthlyDetailKey(detail);
    const cells = days.map((day) => {
      const dayReports = reportsByDay.get(day) || [];
      const matchedDetails = dayReports.flatMap((report) => {
        const items = detailsByReportId.get(report.id) || [];
        return items
          .filter((item) => isSameMonthlyDetail(item, detail, standardKey))
          .map((item) => ({ report, item }));
      });
      return buildMonthlyGridCell(day, matchedDetails);
    });

    return {
      id: detail.id || "",
      seq: Number(detail.seq || index + 1),
      content: getMonthlyDetailContent(detail),
      pointPart: detail.pointPart || "",
      pointItem: detail.pointItem || "",
      checkStandard: detail.checkStandard || detail.standardText || "",
      cells,
    };
  });
}

function buildMonthlyDetailFallbackRows(reportDetails) {
  const byKey = new Map();
  (Array.isArray(reportDetails) ? reportDetails : []).forEach((detail) => {
    const key = getMonthlyDetailKey(detail);
    if (!key || byKey.has(key)) {
      return;
    }
    byKey.set(key, {
      id: detail.standardDetailId || detail.id || "",
      seq: Number(detail.seq || 0),
      pointPart: detail.pointPart || "",
      pointItem: detail.pointItem || "",
      checkContent: detail.pointItem || detail.pointPart || "",
      checkStandard: detail.judgeStandard || "",
      standardText: detail.judgeStandard || "",
      enableStatus: "启用",
    });
  });
  return Array.from(byKey.values()).sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));
}

function buildMonthlyGridCell(day, matchedDetails) {
  const matches = Array.isArray(matchedDetails) ? matchedDetails : [];
  if (!matches.length) {
    return { day, mark: "", status: "none", title: "" };
  }
  const abnormal = matches.find(({ item }) => toYesNo(item.abnormal) === "是");
  if (abnormal) {
    const item = abnormal.item || {};
    const title = [
      "异常",
      item.resultValue ? `结果：${item.resultValue}` : "",
      item.abnormalDesc ? `说明：${item.abnormalDesc}` : "",
      item.handling ? `处理：${item.handling}` : "",
    ].filter(Boolean).join("；");
    return { day, mark: "×", status: "abnormal", title };
  }
  const latest = matches[matches.length - 1] || {};
  const item = latest.item || {};
  const title = item.resultValue ? `正常：${item.resultValue}` : "正常";
  return { day, mark: "√", status: "normal", title };
}

function getMonthlyDetailKey(detail) {
  if (!detail) {
    return "";
  }
  const id = toDisplayText(detail.id || detail.standardDetailId);
  if (id) {
    return `id:${normalizeCompareText(id)}`;
  }
  return [
    "fallback",
    normalizeCompareText(detail.seq),
    normalizeCompareText(detail.pointPart),
    normalizeCompareText(detail.pointItem),
  ].join(":");
}

function isSameMonthlyDetail(reportDetail, standardDetail, standardKey) {
  if (!reportDetail || !standardDetail) {
    return false;
  }
  if (reportDetail.standardDetailId && standardDetail.id) {
    return normalizeCompareText(reportDetail.standardDetailId) === normalizeCompareText(standardDetail.id);
  }
  return getMonthlyDetailKey(reportDetail) === standardKey;
}

function getMonthlyDetailContent(detail) {
  return toDisplayText(detail.pointItem)
    || toDisplayText(detail.pointPart)
    || toDisplayText(detail.checkContent)
    || toDisplayText(detail.standardText)
    || toDisplayText(detail.checkStandard)
    || "未命名点检内容";
}

function mapMonthlyHazardRow(hazard, seq, reportById) {
  const report = reportById.get(hazard.submissionId) || {};
  const action = toDisplayText(hazard.actionDesc);
  const requirement = toDisplayText(hazard.requirement);
  const description = toDisplayText(hazard.description);
  const handlingText = [
    hazard.status || "",
    action || requirement || description || hazard.title || "",
  ].filter(Boolean).join("：");

  return {
    id: hazard.id || "",
    seq,
    code: hazard.code || "",
    reportId: hazard.submissionId || "",
    reportDate: normalizeDate(report.reportDateText) || "",
    title: hazard.title || "",
    handlingText,
    status: hazard.status || "",
    dateText: normalizeDate(hazard.closedAt) || "",
  };
}

function isInspectionHazardSource(value) {
  const text = toDisplayText(value);
  if (!text) {
    return true;
  }
  return text.includes("点巡检") || text.includes("点检");
}

function mapMemberRecord(record) {
  const rawDepartments = getAliasRawValue(record, MEMBER_FIELD.departments);
  const rawMainDepartment = getAliasRawValue(record, MEMBER_FIELD.mainDepartment);
  return {
    id: extractRecordId(record),
    user: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.user)),
    userId: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.userId)),
    userName: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.userName)),
    uniqueId: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.uniqueId)),
    mobile: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.mobile)),
    email: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.email)),
    status: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.status)),
    departmentsId: extractPrimaryObjectId(rawDepartments),
    departmentsName: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.departmentsName)),
    mainDepartmentId: extractPrimaryObjectId(rawMainDepartment),
    mainDepartmentName: toDisplayText(getAliasRawValue(record, MEMBER_FIELD.mainDepartmentName)),
  };
}

function collectMemberIdentity(req) {
  const headers = req && req.headers ? req.headers : {};
  const query = req && req.query ? req.query : {};
  const read = (...keys) => {
    for (const key of keys) {
      const value = query[key] ?? query[String(key).toLowerCase()] ?? headers[String(key).toLowerCase()];
      const text = toDisplayText(value);
      if (text) {
        return text;
      }
    }
    return "";
  };

  return {
    userId: read("userId", "user_id", "webpage_user_id", "x-user-id", "x-uid"),
    userName: read("userName", "user_name", "name", "webpage_user_name", "x-user-name"),
    uniqueId: read("uniqueid", "uniqueId", "webpage_corp_user_id", "x-unique-id"),
    mobile: read("mobile", "phone", "webpage_phone", "x-user-mobile"),
    email: read("email", "webpage_email", "x-user-email"),
    account: read("account", "webpage_account", "login_name", "loginName"),
  };
}

function isActiveMemberStatus(value) {
  const text = normalizeCompareText(value);
  if (!text) {
    return true;
  }
  if (text.includes("禁用") || text.includes("离职") || text.includes("停用") || text.includes("无效")) {
    return false;
  }
  return true;
}

function resolveCurrentMember(members, identity) {
  if (!Array.isArray(members) || !members.length) {
    return null;
  }
  const activeMembers = members.filter((row) => isActiveMemberStatus(row.status));
  const source = activeMembers.length ? activeMembers : members;
  const normalizedIdentity = {
    userId: normalizeCompareText(identity.userId),
    userName: normalizeCompareText(identity.userName),
    uniqueId: normalizeCompareText(identity.uniqueId),
    mobile: normalizeCompareText(identity.mobile),
    email: normalizeCompareText(identity.email),
    account: normalizeCompareText(identity.account),
  };

  const hasIdentity = Object.values(normalizedIdentity).some(Boolean);
  if (hasIdentity) {
    let best = null;
    let bestScore = -1;
    source.forEach((member) => {
      const score = scoreMemberIdentity(member, normalizedIdentity);
      if (score > bestScore) {
        bestScore = score;
        best = member;
      }
    });
    if (best && bestScore > 0) {
      return best;
    }
  }

  if (source.length === 1) {
    return source[0];
  }
  return null;
}

function scoreMemberIdentity(member, identity) {
  if (!member || !identity) {
    return 0;
  }
  const normalizedMember = {
    userId: normalizeCompareText(member.userId),
    userName: normalizeCompareText(member.userName || member.user),
    uniqueId: normalizeCompareText(member.uniqueId),
    mobile: normalizeCompareText(member.mobile),
    email: normalizeCompareText(member.email),
    account: normalizeCompareText(member.user),
  };

  let score = 0;
  score += matchScore(normalizedMember.userId, identity.userId, 90);
  score += matchScore(normalizedMember.uniqueId, identity.uniqueId, 90);
  score += matchScore(normalizedMember.mobile, identity.mobile, 70);
  score += matchScore(normalizedMember.email, identity.email, 70);
  score += matchScore(normalizedMember.account, identity.account, 65);
  score += matchScore(normalizedMember.userName, identity.userName, 50);
  return score;
}

async function fetchContactUsers(config) {
  const result = await requestOpenApiPath(config, "/user/user_list", {});
  const rows = extractObjectArrayByKeys(result, ["users"]);
  return rows
    .map(mapContactUser)
    .filter((row) => Boolean(row.userName || row.user || row.userId))
    .sort((a, b) => String(a.userName || a.user || "").localeCompare(String(b.userName || b.user || ""), "zh-Hans-CN"));
}

function mapContactUser(row) {
  const source = row && typeof row === "object" ? row : {};
  const departments = normalizeContactDepartments(source.departments);
  const primaryDepartment = departments[0] || null;

  return {
    id: readFirstText(source, ["user_id", "userId", "id", "_id", "uniqueid", "uniqueId"]),
    user: readFirstText(source, ["account", "username", "login_name", "loginName"]),
    userId: readFirstText(source, ["user_id", "userId", "id", "_id"]),
    userName: readFirstText(source, ["name", "user_name", "userName", "nickname", "title"]),
    uniqueId: readFirstText(source, ["uniqueid", "uniqueId"]),
    mobile: readFirstText(source, ["mobile", "phone", "tel"]),
    email: readFirstText(source, ["email", "mail"]),
    status: readFirstText(source, ["category", "status"]),
    departmentsId: readFirstText(source, ["main_department_id", "mainDeptId", "mainDepartmentId", "dept_id"]) || (primaryDepartment ? primaryDepartment.id : ""),
    departmentsName: readFirstText(source, ["main_department_name", "mainDeptName", "mainDepartmentName", "dept_name"]) || (primaryDepartment ? primaryDepartment.name : ""),
    mainDepartmentId: readFirstText(source, ["main_department_id", "mainDeptId", "mainDepartmentId", "dept_id"]) || (primaryDepartment ? primaryDepartment.id : ""),
    mainDepartmentName: readFirstText(source, ["main_department_name", "mainDeptName", "mainDepartmentName", "dept_name"]) || (primaryDepartment ? primaryDepartment.name : ""),
  };
}

function normalizeContactDepartments(value) {
  return (Array.isArray(value) ? value : [])
    .map((item) => {
      const row = item && typeof item === "object" ? item : {};
      const id = readFirstText(row, ["dept_id", "deptId", "id", "_id"]);
      const name = readFirstText(row, ["name", "dept_name", "deptName", "title"]);
      if (!id && !name) {
        return null;
      }
      return { id, name };
    })
    .filter(Boolean);
}

async function requestOpenApiPath(config, path, body = {}, method = "POST") {
  const baseUrl = stripTrailingSlash(config.baseUrl);
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
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

  const response = await fetch(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : JSON.stringify(body || {}),
  });
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

function extractObjectArrayByKeys(source, keys) {
  if (!source || typeof source !== "object") {
    return [];
  }
  for (const key of Array.isArray(keys) ? keys : []) {
    const value = source[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  if (source.data && typeof source.data === "object") {
    return extractObjectArrayByKeys(source.data, keys);
  }
  return [];
}

function readFirstText(source, keys) {
  const row = source && typeof source === "object" ? source : {};
  for (const key of Array.isArray(keys) ? keys : []) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) {
      continue;
    }
    const text = toDisplayText(row[key]);
    if (text) {
      return text;
    }
  }
  return "";
}

function matchScore(left, right, exactScore) {
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return exactScore;
  }
  if (left.includes(right) || right.includes(left)) {
    return Math.floor(exactScore * 0.7);
  }
  return 0;
}

function isEnabledStatus(value) {
  const text = toDisplayText(value);
  if (!text) {
    return true;
  }
  return !text.includes("停");
}

async function fetchEntryRecords(config, entryId, options = {}) {
  const appId = toDisplayText(options.appId) || config.defaultAppId;
  const skipRecords = await fetchEntryRecordsBySkip(config, entryId, appId).catch((error) => {
    console.warn("fetch entry records by skip failed:", error);
    return null;
  });
  if (skipRecords) {
    return skipRecords;
  }

  const payloadCandidates = [
    { limit: 300, skip: 0 },
    { page: 1, limit: 300 },
    { page_no: 1, page_size: 300 },
    { pageNum: 1, pageSize: 300 },
    {},
  ];
  const actionCandidates = ["data", "data_search", "data_list"];

  let lastError = null;
  for (const action of actionCandidates) {
    for (const payload of payloadCandidates) {
      try {
        const resp = await requestEntry(config, entryId, action, payload, "POST", appId);
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

async function fetchEntryRecordsBySkip(config, entryId, appId) {
  const pageSize = 300;
  const maxPages = 200;
  const totalResult = await requestEntry(config, entryId, "data_count", {}, "POST", appId);
  const total = extractPossibleTotal(totalResult);
  if (!Number.isFinite(total) || total < 0) {
    return null;
  }
  if (total === 0) {
    return [];
  }

  const output = [];
  const seenIds = new Set();
  const seenFingerprints = new Set();
  for (let skip = 0, page = 1; skip < total && page <= maxPages; skip += pageSize, page += 1) {
    const resp = await requestEntry(config, entryId, "data", { limit: pageSize, skip }, "POST", appId);
    const records = extractRecordArray(resp);
    if (!Array.isArray(records)) {
      throw new Error(`data 返回结构无法识别：${previewPayload(resp)}`);
    }
    if (!records.length) {
      break;
    }

    const fingerprint = records.map((item) => extractRecordId(item)).filter(Boolean).join("|");
    if (fingerprint && seenFingerprints.has(fingerprint)) {
      break;
    }
    if (fingerprint) {
      seenFingerprints.add(fingerprint);
    }

    records.forEach((record) => {
      const id = extractRecordId(record) || JSON.stringify(record);
      if (seenIds.has(id)) {
        return;
      }
      seenIds.add(id);
      output.push(record);
    });

    if (records.length < pageSize) {
      break;
    }
  }
  return output;
}

async function requestEntry(config, entryId, action, body = {}, method = "POST", appIdOverride = "") {
  const appId = toDisplayText(appIdOverride) || config.defaultAppId;
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

function extractPossibleTotal(result) {
  const keys = ["total", "total_count", "totalCount", "count", "data_count", "rows_count", "records_total", "size", "data"];
  const queue = [result];
  const visited = new Set();
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object" || Array.isArray(current) || visited.has(current)) {
      continue;
    }
    visited.add(current);

    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        continue;
      }
      const raw = Number(current[key]);
      if (Number.isFinite(raw)) {
        return raw;
      }
    }

    Object.values(current).forEach((value) => {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        queue.push(value);
      }
    });
  }
  return null;
}

function previewPayload(value, maxLength = 260) {
  try {
    const text = JSON.stringify(value);
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
  } catch {
    const text = String(value ?? "");
    return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
  }
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

function extractPrimaryObjectId(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const id = extractPrimaryObjectId(item);
      if (id) {
        return id;
      }
    }
    return "";
  }
  if (typeof value === "object") {
    const keys = ["_id", "id", "value", "key", "code"];
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const id = String(value[key] || "").trim();
        if (id) {
          return id;
        }
      }
    }
  }
  return "";
}

function normalizeCompareText(value) {
  return toDisplayText(value)
    .replace(/\s+/g, "")
    .replace(/[－—–]/g, "-")
    .replace(/[()（）【】\[\]{}<>《》]/g, "")
    .toLowerCase();
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

function toNumberOrEmpty(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" && !value.trim()) {
    return "";
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : "";
}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseDateTimeOrNull(value) {
  const text = toDisplayText(value);
  if (!text) {
    return null;
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
  return null;
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

function normalizeMonth(value) {
  const text = toDisplayText(value);
  if (!text) {
    return "";
  }
  const matched = text.match(/(\d{4})[-/.年](\d{1,2})/);
  if (!matched) {
    return "";
  }
  return `${matched[1]}-${String(matched[2]).padStart(2, "0")}`;
}

function normalizeDateTime(value) {
  const text = toDisplayText(value);
  if (!text) {
    return "";
  }
  const date = parseDateTimeOrNull(text);
  if (!date) {
    return "";
  }
  return formatDateTime(date);
}

function formatMonth(date) {
  const d = date instanceof Date ? date : parseDateTimeOrNull(date);
  if (!(d instanceof Date) || !Number.isFinite(d.getTime())) {
    return "";
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthText(month) {
  const text = normalizeMonth(month);
  if (!text) {
    return "";
  }
  const [year, monthText] = text.split("-");
  return `${year}年${Number(monthText)}月`;
}

function buildMonthDays(month) {
  const text = normalizeMonth(month) || formatMonth(new Date());
  const [year, monthText] = text.split("-").map((item) => Number(item));
  const daysInMonth = new Date(year, monthText, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => index + 1);
}

function getDayNumber(value) {
  const dateText = normalizeDate(value);
  if (!dateText) {
    return 0;
  }
  return Number(dateText.slice(8, 10)) || 0;
}

function startOfDay(date) {
  const d = date instanceof Date ? date : parseDateTimeOrNull(date);
  if (!(d instanceof Date) || !Number.isFinite(d.getTime())) {
    return new Date();
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatDate(date) {
  const d = date instanceof Date ? date : parseDateTimeOrNull(date);
  if (!(d instanceof Date) || !Number.isFinite(d.getTime())) {
    return "";
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateTime(date) {
  const d = date instanceof Date ? date : parseDateTimeOrNull(date);
  if (!(d instanceof Date) || !Number.isFinite(d.getTime())) {
    return "";
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function addDays(date, days) {
  const d = date instanceof Date ? new Date(date.getTime()) : parseDateTimeOrNull(date);
  if (!(d instanceof Date) || !Number.isFinite(d.getTime())) {
    return new Date();
  }
  const n = Number(days);
  d.setDate(d.getDate() + (Number.isFinite(n) ? n : 7));
  return d;
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
  registerInspectionReportRoutes,
};
