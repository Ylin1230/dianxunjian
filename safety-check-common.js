(function () {
  const API_BASE = resolveApiBaseUrl();
  const PAGE = window.SAFETY_CHECK_PAGE || "templates";
  const PAGE_TITLES = {
    templates: "检查模板",
    tasks: "检查任务",
    records: "检查记录",
    hazards: "隐患整改",
  };

  const state = {
    templates: [],
    items: [],
    tasks: [],
    submissions: [],
    submissionDetails: [],
    hazards: [],
    options: {},
    contacts: { departments: [], users: [] },
    selectedTemplateId: "",
    selectedTaskId: "",
    selectedRecordId: "",
    selectedRecordIds: [],
    recordPage: 1,
    recordPageSize: 10,
    selectedHazardId: "",
    editingTemplateId: "",
    templateDraftItems: [],
    draftItemIndex: -1,
    editingTaskId: "",
    editingHazardId: "",
    currentHazardFlowInfo: null,
    currentUserId: "",
    currentCorpId: "",
    filters: {},
  };

  const refs = {};

  document.addEventListener("DOMContentLoaded", () => {
    collectExternalContext();
    collectRefs();
    bindShell();
    loadAll();
  });

  function collectExternalContext() {
    const params = new URLSearchParams(window.location.search || "");
    state.currentUserId = params.get("webpage_user_id") || params.get("user_id") || "";
    state.currentCorpId = params.get("webpage_crop_id") || params.get("crop_id") || "";
  }

  function collectRefs() {
    ["pageTitle", "headActions", "content", "statusBar", "modalRoot", "toast", "refreshBtn"].forEach((id) => {
      refs[id] = document.getElementById(id);
    });
  }

  function bindShell() {
    document.title = PAGE_TITLES[PAGE] || "安全检查";
    refs.pageTitle.textContent = PAGE_TITLES[PAGE] || "安全检查";
    if (refs.refreshBtn) {
      refs.refreshBtn.addEventListener("click", loadAll);
    }
    document.addEventListener("click", (event) => {
      if (!(event.target instanceof HTMLElement) || !event.target.closest(".select-proxy")) {
        closeSelectProxies();
      }
    });
  }

  async function loadAll() {
    setStatus("正在加载安全检查数据...");
    try {
      const [bootstrap, deptResult, userResult] = await Promise.allSettled([
        requestApi("/safety-check/bootstrap"),
        requestApi("/contacts/departments"),
        requestApi("/contacts/users"),
      ]);
      if (bootstrap.status !== "fulfilled") {
        throw bootstrap.reason;
      }
      const data = bootstrap.value.data || {};
      state.templates = data.templates || [];
      state.items = data.items || [];
      state.tasks = data.tasks || [];
      state.submissions = data.submissions || [];
      state.submissionDetails = data.submissionDetails || [];
      state.hazards = data.hazards || [];
      state.options = data.options || {};
      if (deptResult.status === "fulfilled") {
        state.contacts.departments = deptResult.value.data?.departments || [];
      }
      if (userResult.status === "fulfilled") {
        state.contacts.users = userResult.value.data?.users || [];
      }
      ensureSelections();
      renderPage();
      setStatus("准备就绪");
    } catch (error) {
      setStatus(`加载失败：${error.message}`, true);
      showToast(`加载失败：${error.message}`);
    }
  }

  function renderPage() {
    if (PAGE === "tasks") {
      renderTasksPage();
      return;
    }
    if (PAGE === "records") {
      renderRecordsPage();
      return;
    }
    if (PAGE === "hazards") {
      renderHazardsPage();
      return;
    }
    renderTemplatesPage();
  }

  function renderTemplatesPage() {
    refs.content.innerHTML = `
      <div class="toolbar template-filter-toolbar">
        <input id="templateKeyword" class="input" placeholder="检查类型名称/编号/对象" />
        <select id="templateCategoryFilter" class="select"></select>
        <select id="templateStatusFilter" class="select"></select>
      </div>
      <div class="template-workspace">
        <aside class="template-sidebar">
          <div class="section-head">
            <h2>检查模板</h2>
            <span id="templateListCount" class="tag">0 个</span>
          </div>
          <div id="templateListBody" class="template-list"></div>
        </aside>
        <section class="template-detail">
          <div class="template-detail-actions actions">
            <button id="addTemplateBtn" class="btn primary">新增</button>
            <button id="editTemplateBtn" class="btn">编辑</button>
            <button id="deleteTemplateBtn" class="btn danger">删除</button>
          </div>
          <div id="templateSummary" class="template-summary"></div>
          <div class="section-head">
            <h2 id="templateItemTitle">检查项明细</h2>
            <span id="templateItemFoot" class="tag">0 项</span>
          </div>
          <div class="table-wrap template-item-wrap">
            <table>
              <thead>
                <tr>
                  <th style="width:60px">序号</th>
                  <th style="width:110px">一级分类</th>
                  <th style="width:180px">检查项目</th>
                  <th style="width:220px">检查内容</th>
                  <th>检查标准/要求</th>
                  <th style="width:110px">结果类型</th>
                  <th style="width:110px">整改期限天数</th>
                  <th style="width:100px">考核分值</th>
                </tr>
              </thead>
              <tbody id="templateItemTableBody"></tbody>
            </table>
          </div>
        </section>
      </div>
    `;
    fillSelect(id("templateCategoryFilter"), ["", ...(state.options.templateCategories || [])], "全部大类");
    fillSelect(id("templateStatusFilter"), ["", ...(state.options.enabled || [])], "全部状态");
    restoreFilterValues(["templateKeyword", "templateCategoryFilter", "templateStatusFilter"]);
    bindFilter("templateKeyword", renderTemplateTables);
    bindFilter("templateCategoryFilter", renderTemplateTables);
    bindFilter("templateStatusFilter", renderTemplateTables);
    id("addTemplateBtn").addEventListener("click", () => openTemplateModal(null));
    id("editTemplateBtn").addEventListener("click", () => {
      const template = getSelectedTemplate();
      if (!template) {
        showToast("请先选择模板");
        return;
      }
      openTemplateModal(template);
    });
    id("deleteTemplateBtn").addEventListener("click", deleteSelectedTemplate);
    renderTemplateTables();
  }

  function renderTemplateTables() {
    syncFilterValues(["templateKeyword", "templateCategoryFilter", "templateStatusFilter"]);
    const keyword = valueOf("templateKeyword").toLowerCase();
    const category = valueOf("templateCategoryFilter");
    const enabled = valueOf("templateStatusFilter");
    const rows = state.templates.filter((item) => {
      const text = [item.code, item.name, item.target, item.category].join(" ").toLowerCase();
      return (!keyword || text.includes(keyword)) && (!category || item.category === category) && (!enabled || item.enabled === enabled);
    });
    if (rows.length && !rows.some((item) => item.id === state.selectedTemplateId)) {
      state.selectedTemplateId = rows[0].id;
    }
    if (!rows.length) {
      state.selectedTemplateId = "";
    }
    id("templateListCount").textContent = `${rows.length} 个`;
    id("templateListBody").innerHTML = rows.length ? rows.map((item) => {
      const itemCount = getTemplateItems(item.id).length;
      return `
        <button class="template-list-item ${item.id === state.selectedTemplateId ? "selected" : ""}" type="button" data-id="${escapeHtml(item.id)}">
          <span class="template-list-title">${escapeHtml(item.name || "-")}</span>
          <span class="template-list-meta">
            <span>${escapeHtml(item.category || "-")}</span>
            ${renderStatusTag(item.enabled)}
          </span>
          <span class="template-list-sub">${escapeHtml(item.target || item.code || "未设置适用区域/对象")}</span>
          <span class="template-list-foot">
            <span>${escapeHtml(item.code || "自动生成")}</span>
            <span>${itemCount} 项</span>
          </span>
        </button>
      `;
    }).join("") : `<div class="empty">暂无检查模板</div>`;
    id("templateListBody").querySelectorAll("[data-id]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedTemplateId = button.dataset.id;
        renderTemplateTables();
      });
    });
    renderTemplateItems();
  }

  function renderTemplateItems() {
    const template = getSelectedTemplate();
    const rows = getTemplateItems(template?.id || "");
    id("templateSummary").innerHTML = renderTemplateSummary(template);
    id("templateItemTitle").textContent = template ? "检查项明细" : "检查项明细";
    id("templateItemFoot").textContent = `${rows.length} 项`;
    id("editTemplateBtn").disabled = !template;
    id("deleteTemplateBtn").disabled = !template;
    id("templateItemTableBody").innerHTML = rows.length ? rows.map((item) => `
      <tr>
        <td>${escapeHtml(item.seq || "")}</td>
        <td>${escapeHtml(item.category || "-")}</td>
        <td>${escapeHtml(item.item || "-")}</td>
        <td>${escapeHtml(item.content || "-")}</td>
        <td>${escapeHtml(item.standard || "-")}</td>
        <td>${escapeHtml(item.resultType || "正常异常")}</td>
        <td>${escapeHtml(item.deadlineDays || "-")}</td>
        <td>${escapeHtml(item.score || "-")}</td>
      </tr>
    `).join("") : `<tr><td colspan="8"><div class="empty">${template ? "暂无检查项，请点击编辑模板维护明细" : "请先选择模板"}</div></td></tr>`;
  }

  function renderTemplateSummary(template) {
    if (!template) {
      return `<div class="empty">请选择左侧检查模板查看主表详情</div>`;
    }
    return `
      <div class="template-summary-head">
        <h2>${escapeHtml(template.name || "-")}</h2>
      </div>
      <div class="template-summary-grid">
        ${renderSummaryItem("编号", template.code || "自动生成")}
        ${renderSummaryItem("适用区域/对象", template.target || "-")}
        ${renderSummaryItem("生效日期", shortDate(template.effectiveDate) || "-")}
        ${renderSummaryItem("状态", template.enabled || "-")}
        ${renderSummaryItem("默认检查部门", template.defaultDept || "-")}
        ${renderSummaryItem("默认检查人", template.defaultUser || "-")}
        ${renderSummaryItem("备注", template.remark || "-")}
      </div>
    `;
  }

  function renderSummaryItem(label, value, full = false) {
    return `
      <div class="summary-item ${full ? "full" : ""}">
        <span>${escapeHtml(label)}</span>
        <strong title="${escapeHtml(value || "-")}">${escapeHtml(value || "-")}</strong>
      </div>
    `;
  }

  function renderTasksPage() {
    refs.content.innerHTML = `
      <div class="toolbar wide action-left">
        <div class="actions">
          <button id="addTaskBtn" class="btn primary">新增</button>
          <button id="editTaskBtn" class="btn">编辑</button>
          <button id="deleteTaskBtn" class="btn danger">删除</button>
        </div>
        <input id="taskKeyword" class="input" placeholder="任务编号/检查类型/区域对象" />
        <select id="taskTemplateFilter" class="select"></select>
        <select id="taskStatusFilter" class="select"></select>
        <select id="taskOverdueFilter" class="select">
          <option value="">全部数据</option>
          <option value="是">已逾期</option>
          <option value="否">未逾期</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:130px">任务编号</th>
              <th>检查类型</th>
              <th style="width:170px">区域/对象</th>
              <th style="width:150px">计划时间</th>
              <th style="width:150px">截止时间</th>
              <th style="width:120px">责任人</th>
              <th style="width:110px">状态</th>
              <th style="width:80px">逾期</th>
            </tr>
          </thead>
          <tbody id="taskTableBody"></tbody>
        </table>
      </div>
    `;
    fillSelect(id("taskTemplateFilter"), ["", ...state.templates.map((item) => item.id)], "全部模板", templateLabelById);
    fillSelect(id("taskStatusFilter"), ["", ...(state.options.taskStatuses || [])], "全部状态");
    restoreFilterValues(["taskKeyword", "taskTemplateFilter", "taskStatusFilter", "taskOverdueFilter"]);
    ["taskKeyword", "taskTemplateFilter", "taskStatusFilter", "taskOverdueFilter"].forEach((filterId) => bindFilter(filterId, renderTaskTable));
    id("addTaskBtn").addEventListener("click", () => openTaskModal(null));
    id("editTaskBtn").addEventListener("click", () => {
      const task = getSelectedTask();
      if (!task) {
        showToast("请先选择任务");
        return;
      }
      openTaskModal(task);
    });
    id("deleteTaskBtn").addEventListener("click", deleteSelectedTask);
    enhanceSelectProxies(refs.content);
    renderTaskTable();
  }

  function renderTaskTable() {
    syncFilterValues(["taskKeyword", "taskTemplateFilter", "taskStatusFilter", "taskOverdueFilter"]);
    const keyword = valueOf("taskKeyword").toLowerCase();
    const templateId = valueOf("taskTemplateFilter");
    const status = valueOf("taskStatusFilter");
    const overdue = valueOf("taskOverdueFilter");
    const rows = state.tasks.filter((item) => {
      const text = [item.code, item.templateName, item.target, item.ownerUser, item.ownerDept].join(" ").toLowerCase();
      return (!keyword || text.includes(keyword)) && (!templateId || item.templateId === templateId) && (!status || item.status === status) && (!overdue || item.overdue === overdue);
    });
    id("taskTableBody").innerHTML = rows.length ? rows.map((item) => `
      <tr class="${item.id === state.selectedTaskId ? "selected" : ""}" data-id="${escapeHtml(item.id)}">
        <td>${escapeHtml(item.code || "-")}</td>
        <td>${escapeHtml(item.templateName || "-")}</td>
        <td>${escapeHtml(item.target || "-")}</td>
        <td>${escapeHtml(shortDateTime(item.plannedDate))}</td>
        <td>${escapeHtml(shortDateTime(item.deadline))}</td>
        <td>${escapeHtml(item.ownerUser || item.ownerDept || "-")}</td>
        <td>${renderTaskStatusTag(item.status)}</td>
        <td>${renderOverdueTag(item.overdue)}</td>
      </tr>
    `).join("") : `<tr><td colspan="8"><div class="empty">暂无检查任务</div></td></tr>`;
    id("taskTableBody").querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        state.selectedTaskId = tr.dataset.id;
        renderTaskTable();
      });
    });
  }

  function renderRecordsPage() {
    refs.content.innerHTML = `
      <div class="record-menu-bar">
        <div class="actions">
          <button id="recordBatchPrintBtn" class="btn" type="button">打印</button>
          <button id="recordBatchExportBtn" class="btn" type="button">导出</button>
        </div>
        <span id="recordSelectionHint" class="record-selection-hint">未选择记录</span>
      </div>
      <div class="toolbar records-toolbar">
        <input id="recordKeyword" class="input" placeholder="提交编号/检查类型/检查人/区域对象" />
        <select id="recordTemplateFilter" class="select"></select>
        <select id="recordResultFilter" class="select">
          <option value="">全部结果</option>
          <option value="正常">正常</option>
          <option value="异常">异常</option>
        </select>
        <select id="recordPrintTemplateSelect" class="select">
          <option value="auto">打印模板（自动）</option>
          <option value="standard">结果检查表</option>
          <option value="detail">记录检查表</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="records-table">
          <thead>
            <tr>
              <th style="width:42px"><input id="recordCheckAll" type="checkbox" aria-label="全选当前记录" /></th>
              <th style="width:130px">提交编号</th>
              <th>检查类型</th>
              <th style="width:170px">区域/对象</th>
              <th style="width:120px">检查人</th>
              <th style="width:150px">检查时间</th>
              <th style="width:90px">结果</th>
              <th style="width:90px">异常数</th>
              <th style="width:100px">状态</th>
              <th style="width:90px">操作</th>
            </tr>
          </thead>
          <tbody id="recordTableBody"></tbody>
        </table>
      </div>
      <div class="record-pagination-bar">
        <div id="recordPaginationInfo" class="record-pagination-info">共 0 条</div>
        <div class="record-pagination-actions">
          <select id="recordPageSizeSelect" class="select record-pagination-size" aria-label="每页记录数量">
            <option value="10">10 条/页</option>
            <option value="20">20 条/页</option>
            <option value="50">50 条/页</option>
          </select>
          <button id="recordPrevPageBtn" class="btn" type="button">上一页</button>
          <div id="recordPageButtons" class="record-page-buttons" aria-label="检查记录分页"></div>
          <button id="recordNextPageBtn" class="btn" type="button">下一页</button>
        </div>
      </div>
    `;
    fillSelect(id("recordTemplateFilter"), ["", ...state.templates.map((item) => item.id)], "全部模板", templateLabelById);
    restoreFilterValues(["recordKeyword", "recordTemplateFilter", "recordResultFilter", "recordPrintTemplateSelect"]);
    bindRecordFilter("recordKeyword");
    bindRecordFilter("recordTemplateFilter");
    bindRecordFilter("recordResultFilter");
    bindRecordFilter("recordPrintTemplateSelect", false);
    id("recordPageSizeSelect").value = String(state.recordPageSize || 10);
    id("recordPageSizeSelect").addEventListener("change", () => {
      state.recordPageSize = Number(valueOf("recordPageSizeSelect")) || 10;
      state.recordPage = 1;
      renderRecordTable();
    });
    id("recordBatchPrintBtn").addEventListener("click", () => printSafetyRecords(getRecordsForBatchAction()));
    id("recordBatchExportBtn").addEventListener("click", () => exportSafetyRecords(getRecordsForBatchAction()));
    enhanceSelectProxies(refs.content);
    renderRecordTable();
  }

  function bindRecordFilter(elementId, resetPage = true) {
    const element = id(elementId);
    if (!element) return;
    const handler = () => {
      if (resetPage) {
        state.recordPage = 1;
      }
      renderRecordTable();
    };
    element.addEventListener("input", handler);
    element.addEventListener("change", handler);
  }

  function getFilteredRecords() {
    syncFilterValues(["recordKeyword", "recordTemplateFilter", "recordResultFilter", "recordPrintTemplateSelect"]);
    const keyword = valueOf("recordKeyword").toLowerCase();
    const templateId = valueOf("recordTemplateFilter");
    const result = valueOf("recordResultFilter");
    return state.submissions.filter((item) => {
      const text = [item.code, item.templateName, item.target, item.inspector].join(" ").toLowerCase();
      return (!keyword || text.includes(keyword)) && (!templateId || item.templateId === templateId) && (!result || item.result === result);
    });
  }

  function renderRecordTable() {
    const rows = getFilteredRecords();
    const pageState = getRecordPageState(rows);
    const pageRows = rows.slice(pageState.startIndex, pageState.endIndex);
    const visibleIds = new Set(rows.map((item) => item.id));
    if (state.selectedRecordId && !visibleIds.has(state.selectedRecordId)) {
      state.selectedRecordId = "";
    }
    state.selectedRecordIds = state.selectedRecordIds.filter((recordId) => visibleIds.has(recordId));
    id("recordTableBody").innerHTML = pageRows.length ? pageRows.map((item) => `
      <tr class="${item.id === state.selectedRecordId ? "selected" : ""}" data-id="${escapeHtml(item.id)}">
        <td class="record-check-cell"><input type="checkbox" data-record-check="${escapeHtml(item.id)}" ${state.selectedRecordIds.includes(item.id) ? "checked" : ""} aria-label="选择 ${escapeHtml(item.code || "检查记录")}" /></td>
        <td>${escapeHtml(item.code || "-")}</td>
        <td>${escapeHtml(item.templateName || "-")}</td>
        <td>${escapeHtml(item.target || "-")}</td>
        <td>${escapeHtml(item.inspector || "-")}</td>
        <td>${escapeHtml(shortDateTime(item.endTime))}</td>
        <td>${renderResultTag(item.result)}</td>
        <td>${escapeHtml(item.abnormalCount || 0)}</td>
        <td>${escapeHtml(item.status || "-")}</td>
        <td class="record-action-cell">
          <button class="btn link" type="button" data-record-detail="${escapeHtml(item.id)}">详情</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="10"><div class="empty">暂无检查记录</div></td></tr>`;
    const checkAll = id("recordCheckAll");
    if (checkAll) {
      checkAll.checked = Boolean(pageRows.length) && pageRows.every((item) => state.selectedRecordIds.includes(item.id));
      checkAll.indeterminate = pageRows.some((item) => state.selectedRecordIds.includes(item.id)) && !checkAll.checked;
      checkAll.disabled = !pageRows.length;
      checkAll.onchange = () => {
        const ids = new Set(state.selectedRecordIds);
        pageRows.forEach((item) => {
          if (checkAll.checked) {
            ids.add(item.id);
          } else {
            ids.delete(item.id);
          }
        });
        state.selectedRecordIds = [...ids];
        renderRecordTable();
      };
    }
    id("recordTableBody").querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        state.selectedRecordId = tr.dataset.id;
        renderRecordTable();
      });
      tr.addEventListener("dblclick", () => openRecordModal(getSelectedRecord()));
    });
    id("recordTableBody").querySelectorAll("[data-record-detail]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        state.selectedRecordId = btn.dataset.recordDetail;
        openRecordModal(getSelectedRecord());
      });
    });
    id("recordTableBody").querySelectorAll("[data-record-check]").forEach((checkbox) => {
      checkbox.addEventListener("click", (event) => {
        event.stopPropagation();
      });
      checkbox.addEventListener("change", () => {
        toggleRecordSelection(checkbox.dataset.recordCheck, checkbox.checked);
        renderRecordTable();
      });
    });
    renderRecordPagination(pageState);
    updateRecordActionState(rows.length);
  }

  function getRecordPageState(rows) {
    const total = rows.length;
    const pageSize = Math.max(1, Number(state.recordPageSize) || 10);
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(1, Number(state.recordPage) || 1), pageCount);
    state.recordPage = page;
    const startIndex = total ? (page - 1) * pageSize : 0;
    const endIndex = total ? Math.min(total, startIndex + pageSize) : 0;
    return { total, pageSize, pageCount, page, startIndex, endIndex };
  }

  function renderRecordPagination(pageState) {
    const info = pageState.total
      ? `共 ${pageState.total} 条，显示 ${pageState.startIndex + 1}-${pageState.endIndex} 条，第 ${pageState.page} / ${pageState.pageCount} 页`
      : "共 0 条";
    const infoNode = id("recordPaginationInfo");
    if (infoNode) infoNode.textContent = info;
    const sizeSelect = id("recordPageSizeSelect");
    if (sizeSelect) sizeSelect.value = String(pageState.pageSize);
    const prevBtn = id("recordPrevPageBtn");
    const nextBtn = id("recordNextPageBtn");
    if (prevBtn) {
      prevBtn.disabled = pageState.page <= 1;
      prevBtn.onclick = () => {
        state.recordPage = Math.max(1, pageState.page - 1);
        renderRecordTable();
      };
    }
    if (nextBtn) {
      nextBtn.disabled = pageState.page >= pageState.pageCount;
      nextBtn.onclick = () => {
        state.recordPage = Math.min(pageState.pageCount, pageState.page + 1);
        renderRecordTable();
      };
    }
    const pageButtons = id("recordPageButtons");
    if (pageButtons) {
      pageButtons.innerHTML = buildRecordPageNumbers(pageState).map((page) => (
        page === "..."
          ? `<span class="record-page-ellipsis">...</span>`
          : `<button class="btn record-page-btn ${page === pageState.page ? "is-current" : ""}" type="button" data-record-page="${page}">${page}</button>`
      )).join("");
      pageButtons.querySelectorAll("[data-record-page]").forEach((button) => {
        button.addEventListener("click", () => {
          state.recordPage = Number(button.dataset.recordPage) || 1;
          renderRecordTable();
        });
      });
    }
  }

  function buildRecordPageNumbers(pageState) {
    const total = pageState.pageCount;
    const current = pageState.page;
    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index + 1);
    }
    const pages = new Set([1, total, current, current - 1, current + 1]);
    const sorted = [...pages].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
    const result = [];
    sorted.forEach((page, index) => {
      if (index > 0 && page - sorted[index - 1] > 1) {
        result.push("...");
      }
      result.push(page);
    });
    return result;
  }

  function toggleRecordSelection(recordId, checked) {
    const ids = new Set(state.selectedRecordIds);
    if (checked) {
      ids.add(recordId);
      state.selectedRecordId = recordId;
    } else {
      ids.delete(recordId);
    }
    state.selectedRecordIds = [...ids].filter(Boolean);
  }

  function getRecordsForBatchAction(showEmptyToast = true) {
    const selected = state.selectedRecordIds
      .map((recordId) => state.submissions.find((item) => item.id === recordId))
      .filter(Boolean);
    if (selected.length) {
      return selected;
    }
    const current = getSelectedRecord();
    if (current) {
      return [current];
    }
    if (showEmptyToast) {
      showToast("请先勾选或选择检查记录");
    }
    return [];
  }

  function updateRecordActionState(rowCount) {
    const selectedCount = state.selectedRecordIds.length;
    const hasActionTarget = selectedCount > 0 || Boolean(getSelectedRecord());
    const printBtn = id("recordBatchPrintBtn");
    const exportBtn = id("recordBatchExportBtn");
    if (printBtn) printBtn.disabled = !hasActionTarget || !rowCount;
    if (exportBtn) exportBtn.disabled = !hasActionTarget || !rowCount;
    const hint = id("recordSelectionHint");
    if (hint) {
      hint.textContent = selectedCount ? `已选择 ${selectedCount} 条` : (getSelectedRecord() ? "已选择当前行" : "未选择记录");
    }
  }

  function renderHazardsPage() {
    refs.content.innerHTML = `
      <div class="toolbar wide">
        <input id="hazardKeyword" class="input" placeholder="隐患编号/检查项/描述/区域/责任人" />
        <select id="hazardStatusFilter" class="select"></select>
        <select id="hazardRiskFilter" class="select"></select>
        <select id="hazardOverdueFilter" class="select">
          <option value="">全部数据</option>
          <option value="是">已逾期</option>
          <option value="否">未逾期</option>
        </select>
      </div>
      <div class="table-wrap">
        <table class="hazard-table">
          <thead>
            <tr>
              <th style="width:130px">隐患编号</th>
              <th style="width:190px">异常检查项</th>
              <th style="width:260px">隐患描述</th>
              <th style="width:120px">风险等级</th>
              <th style="width:210px">区域/对象</th>
              <th style="width:180px">责任人</th>
              <th style="width:170px">整改期限</th>
              <th style="width:120px">状态</th>
              <th style="width:90px">逾期</th>
              <th style="width:150px">操作</th>
            </tr>
          </thead>
          <tbody id="hazardTableBody"></tbody>
        </table>
      </div>
    `;
    fillSelect(id("hazardStatusFilter"), ["", ...(state.options.hazardStatuses || [])], "全部状态");
    fillSelect(id("hazardRiskFilter"), ["", ...(state.options.riskLevels || [])], "全部风险");
    restoreFilterValues(["hazardKeyword", "hazardStatusFilter", "hazardRiskFilter", "hazardOverdueFilter"]);
    ["hazardKeyword", "hazardStatusFilter", "hazardRiskFilter", "hazardOverdueFilter"].forEach((filterId) => bindFilter(filterId, renderHazardTable));
    renderHazardTable();
  }

  function renderHazardTable() {
    syncFilterValues(["hazardKeyword", "hazardStatusFilter", "hazardRiskFilter", "hazardOverdueFilter"]);
    const keyword = valueOf("hazardKeyword").toLowerCase();
    const status = valueOf("hazardStatusFilter");
    const risk = valueOf("hazardRiskFilter");
    const overdue = valueOf("hazardOverdueFilter");
    const rows = state.hazards.filter((item) => {
      const text = [item.code, getHazardCheckItemName(item), getHazardDescription(item), item.target, item.ownerUser, item.ownerDept].join(" ").toLowerCase();
      return (!keyword || text.includes(keyword)) && (!status || item.status === status) && (!risk || item.riskLevel === risk) && (!overdue || item.overdue === overdue);
    });
    id("hazardTableBody").innerHTML = rows.length ? rows.map((item) => `
      <tr class="${item.id === state.selectedHazardId ? "selected" : ""}" data-id="${escapeHtml(item.id)}">
        <td>${escapeHtml(item.code || "-")}</td>
        <td>${escapeHtml(getHazardCheckItemName(item))}</td>
        <td>${escapeHtml(getHazardDescription(item))}</td>
        <td>${renderRiskTag(item.riskLevel)}</td>
        <td>${escapeHtml(item.target || "-")}</td>
        <td>${escapeHtml(item.ownerUser || item.ownerDept || "-")}</td>
        <td>${escapeHtml(shortDateTime(item.deadline))}</td>
        <td>${renderHazardStatusTag(item.status)}</td>
        <td>${renderOverdueTag(item.overdue)}</td>
        <td>
          <button class="btn link" type="button" data-hazard-edit="${escapeHtml(item.id)}">处理验收</button>
          <button class="btn link danger-text" type="button" data-hazard-delete="${escapeHtml(item.id)}">删除</button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="10"><div class="empty">暂无整改工单</div></td></tr>`;
    id("hazardTableBody").querySelectorAll("tr[data-id]").forEach((tr) => {
      tr.addEventListener("click", () => {
        state.selectedHazardId = tr.dataset.id;
        renderHazardTable();
      });
      tr.addEventListener("dblclick", () => openHazardModal(getSelectedHazard()));
    });
    id("hazardTableBody").querySelectorAll("[data-hazard-edit]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        state.selectedHazardId = btn.dataset.hazardEdit;
        openHazardModal(getSelectedHazard());
      });
    });
    id("hazardTableBody").querySelectorAll("[data-hazard-delete]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        state.selectedHazardId = btn.dataset.hazardDelete;
        deleteSelectedHazard();
      });
    });
  }

  function getHazardSourceDetail(hazard) {
    if (!hazard) return null;
    return state.submissionDetails.find((item) => item.id === hazard.submissionDetailId || item.hazardId === hazard.id) || null;
  }

  function getHazardCheckItemName(hazard) {
    const detail = getHazardSourceDetail(hazard);
    return detail?.item || hazard?.title || "-";
  }

  function getHazardDescription(hazard) {
    const detail = getHazardSourceDetail(hazard);
    return hazard?.description || detail?.abnormalDesc || "-";
  }

  function openTemplateModal(template) {
    if (template === null) {
      state.editingTemplateId = "";
      state.templateDraftItems = [];
    } else if (!template) {
      showToast("请先选择模板");
      return;
    } else {
      state.editingTemplateId = template.id;
      state.templateDraftItems = getTemplateItems(template.id).map((item) => ({ ...item }));
    }
    state.draftItemIndex = -1;
    refs.modalRoot.innerHTML = `
      <div class="modal-mask" id="templateModal">
        <div class="modal template-modal">
          <div class="modal-head">
            <h2>${template ? "编辑检查模板" : "新增检查模板"}</h2>
            <button class="btn" type="button" data-close>关闭</button>
          </div>
          <form id="templateForm">
            <div class="modal-body">
              <div class="subsection">
                <div class="section-head"><h3>模板主表</h3></div>
                <div class="subsection-body">
                  <div class="form-grid">
                    <div class="field"><label>检查类型编号</label><input id="templateCodeInput" class="input" readonly /></div>
                    <div class="field"><label><span class="required">*</span>检查类型名称</label><input id="templateNameInput" class="input" required /></div>
                    <div class="field"><label>大类</label><select id="templateCategoryInput" class="select"></select></div>
                    <div class="field"><label>状态</label><select id="templateEnabledInput" class="select"></select></div>
                    <div class="field"><label>适用区域/对象</label><input id="templateTargetInput" class="input" /></div>
                    <div class="field"><label>默认检查部门</label><select id="templateDeptInput" class="select"></select></div>
                    <div class="field"><label>默认检查人</label><select id="templateUserInput" class="select"></select></div>
                    <div class="field"><label>备注</label><input id="templateRemarkInput" class="input" /></div>
                    <div class="field">
                      <label>生效日期</label>
                      <div id="templateEffectiveField" class="date-field">
                        <input id="templateEffectiveDisplayInput" class="input date-display-input" type="text" placeholder="YYYY-MM-DD" readonly />
                        <input id="templateEffectiveInput" type="hidden" />
                        <span class="date-field-icon" aria-hidden="true">
                          <svg viewBox="0 0 24 24">
                            <rect x="3" y="4" width="18" height="17" rx="2"></rect>
                            <path d="M8 2v4M16 2v4M3 10h18"></path>
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="subsection">
                <div class="section-head">
                  <h3>检查项明细</h3>
                  <div class="actions">
                    <button id="addDraftItemBtn" class="btn primary" type="button">新增</button>
                  </div>
                </div>
                <div class="table-wrap draft-item-wrap">
                  <table class="draft-item-table">
                    <thead>
                      <tr>
                        <th style="width:58px">序号</th>
                        <th style="width:120px">一级分类</th>
                        <th style="width:190px">检查项目</th>
                        <th style="width:190px">检查内容</th>
                        <th style="width:210px">检查标准/要求</th>
                        <th style="width:110px">结果类型</th>
                        <th style="width:110px">整改期限天数</th>
                        <th style="width:100px">考核分值</th>
                        <th style="width:78px">操作</th>
                      </tr>
                    </thead>
                    <tbody id="templateDraftItemBody"></tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn" type="button" data-close>取消</button>
              <button class="btn primary" type="submit">保存</button>
            </div>
          </form>
        </div>
      </div>
    `;
    bindCloseButtons();
    fillTemplateModalOptions();
    const currentUser = template ? null : getCurrentContactUser();
    const currentDeptId = currentUser?.mainDeptId || "";
    setValue("templateCodeInput", template?.code || "自动生成");
    setValue("templateNameInput", template?.name || "");
    setValue("templateCategoryInput", template?.category || "专项检查");
    setValue("templateTargetInput", template?.target || "");
    setValue("templateDeptInput", template?.defaultDeptId || currentDeptId || "");
    setValue("templateUserInput", template?.defaultUserId || currentUser?.userId || state.currentUserId || "");
    setValue("templateEnabledInput", template?.enabled || "启用");
    setValue("templateEffectiveInput", toDateInput(template?.effectiveDate || ""));
    const templateDatePicker = window.CompactDatePicker?.attach({
      field: id("templateEffectiveField"),
      displayInput: id("templateEffectiveDisplayInput"),
      valueInput: id("templateEffectiveInput"),
    });
    templateDatePicker?.sync();
    setValue("templateRemarkInput", template?.remark || "");
    enhanceSelectProxies(id("templateForm"));
    renderTemplateDraftItems();
    id("templateForm").addEventListener("submit", saveTemplate);
    id("addDraftItemBtn").addEventListener("click", addDraftItemRow);
  }

  function fillTemplateModalOptions() {
    fillSelect(id("templateCategoryInput"), state.options.templateCategories || [], "");
    fillSelect(id("templateEnabledInput"), state.options.enabled || [], "");
    fillDeptSelect(id("templateDeptInput"));
    fillUserSelect(id("templateUserInput"));
  }

  function renderTemplateDraftItems() {
    const body = id("templateDraftItemBody");
    body.innerHTML = state.templateDraftItems.length ? state.templateDraftItems.map((item, index) => `
      <tr>
        <td><input class="input table-input" type="number" min="1" step="1" data-draft-index="${index}" data-draft-field="seq" value="${escapeHtml(item.seq || index + 1)}" /></td>
        <td>
          <select class="select table-select" data-draft-index="${index}" data-draft-field="category">
            ${renderOptions(["人员", "设备", "环境", "综合"], item.category || "")}
          </select>
        </td>
        <td><input class="input table-input" data-draft-index="${index}" data-draft-field="item" value="${escapeHtml(item.item || "")}" placeholder="请输入检查项目" /></td>
        <td><input class="input table-input" data-draft-index="${index}" data-draft-field="content" value="${escapeHtml(item.content || "")}" placeholder="请输入检查内容" /></td>
        <td><input class="input table-input" data-draft-index="${index}" data-draft-field="standard" value="${escapeHtml(item.standard || "")}" placeholder="请输入标准/要求" /></td>
        <td>
          <select class="select table-select" data-draft-index="${index}" data-draft-field="resultType">
            ${renderOptions(state.options.resultTypes || [], item.resultType || "正常异常")}
          </select>
        </td>
        <td><input class="input table-input" type="number" min="1" step="1" data-draft-index="${index}" data-draft-field="deadlineDays" value="${escapeHtml(item.deadlineDays || 7)}" /></td>
        <td><input class="input table-input" type="number" min="0" step="0.1" data-draft-index="${index}" data-draft-field="score" value="${escapeHtml(item.score || "")}" placeholder="分值" /></td>
        <td><button class="btn link danger-text" type="button" data-delete-item="${index}">删除</button></td>
      </tr>
    `).join("") : `<tr><td colspan="9"><div class="empty">暂无明细，请点击右上角新增</div></td></tr>`;
    body.querySelectorAll("[data-draft-field]").forEach((control) => {
      control.addEventListener("input", updateDraftItemField);
      control.addEventListener("change", updateDraftItemField);
    });
    body.querySelectorAll("[data-delete-item]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.templateDraftItems.splice(Number(btn.dataset.deleteItem), 1);
        renderTemplateDraftItems();
      });
    });
    enhanceSelectProxies(body);
  }

  function renderOptions(values, selectedValue) {
    return values.map((value) => `<option value="${escapeHtml(value)}" ${String(value) === String(selectedValue) ? "selected" : ""}>${escapeHtml(value)}</option>`).join("");
  }

  function addDraftItemRow() {
    state.templateDraftItems.push(defaultDraftItem());
    renderTemplateDraftItems();
  }

  function defaultDraftItem() {
    return {
      seq: state.templateDraftItems.length + 1,
      category: "人员",
      item: "",
      content: "",
      standard: "",
      resultType: "正常异常",
      resultOptions: resultOptionsByType("正常异常"),
      keyItem: "否",
      abnormalDescRequired: "否",
      abnormalPhotoRequired: "否",
      riskLevel: "",
      deadlineDays: 7,
      defaultDept: "",
      defaultDeptId: "",
      enabled: "启用",
      score: "",
    };
  }

  function updateDraftItemField(event) {
    const control = event.target;
    const index = Number(control.dataset.draftIndex);
    const field = control.dataset.draftField;
    const item = state.templateDraftItems[index];
    if (!item || !field) return;
    if (["seq", "deadlineDays"].includes(field)) {
      item[field] = Number(control.value || 0) || "";
    } else {
      item[field] = control.value;
    }
    if (field === "resultType") {
      item.resultOptions = resultOptionsByType(item.resultType || "正常异常");
    }
  }

  async function saveTemplate(event) {
    event.preventDefault();
    const dept = selectedOptionData(id("templateDeptInput"));
    const user = selectedOptionData(id("templateUserInput"));
    const template = {
      id: state.editingTemplateId,
      name: valueOf("templateNameInput"),
      category: valueOf("templateCategoryInput"),
      target: valueOf("templateTargetInput"),
      cycle: "临时",
      defaultDept: dept.label || "",
      defaultDeptId: valueOf("templateDeptInput"),
      defaultUser: user.label || "",
      defaultUserId: valueOf("templateUserInput"),
      scanRequired: "否",
      enabled: valueOf("templateEnabledInput"),
      version: "",
      effectiveDate: valueOf("templateEffectiveInput"),
      remark: valueOf("templateRemarkInput"),
    };
    if (!template.name) {
      showToast("请填写检查类型名称");
      return;
    }
    const emptyItemIndex = state.templateDraftItems.findIndex((item) => !String(item.item || "").trim());
    if (emptyItemIndex >= 0) {
      showToast(`第 ${emptyItemIndex + 1} 行检查项目不能为空`);
      return;
    }
    try {
      await requestApi("/safety-check/template/save", "POST", { template, items: state.templateDraftItems });
      closeModal();
      await loadAll();
      showToast("模板已保存");
    } catch (error) {
      showToast(`保存失败：${error.message}`);
    }
  }

  async function deleteSelectedTemplate() {
    const template = getSelectedTemplate();
    if (!template) {
      showToast("请先选择模板");
      return;
    }
    if (!window.confirm(`确认删除“${template.name}”？`)) return;
    try {
      await requestApi("/safety-check/template/delete", "POST", { id: template.id });
      state.selectedTemplateId = "";
      await loadAll();
      showToast("模板已删除");
    } catch (error) {
      showToast(`删除失败：${error.message}`);
    }
  }

  function openTaskModal(task) {
    if (task === null) {
      state.editingTaskId = "";
    } else if (!task) {
      showToast("请先选择任务");
      return;
    } else {
      state.editingTaskId = task.id;
    }
    refs.modalRoot.innerHTML = `
      <div class="modal-mask">
        <div class="modal small">
          <div class="modal-head">
            <h2>${task ? "编辑任务" : "新增任务"}</h2>
            <button class="btn" type="button" data-close>关闭</button>
          </div>
          <form id="taskForm">
            <div class="modal-body">
              <div class="form-grid cols-3">
                <div class="field full"><label><span class="required">*</span>检查模板</label><select id="taskTemplateInput" class="select" required></select></div>
                <div class="field full"><label>检查区域/对象</label><input id="taskTargetInput" class="input" /></div>
                <div class="field">
                  <label>计划时间</label>
                  <div id="taskPlannedField" class="date-field">
                    <input id="taskPlannedDisplayInput" class="input date-display-input" type="text" placeholder="YYYY-MM-DD HH:mm" readonly />
                    <input id="taskPlannedInput" type="hidden" />
                    <span class="date-field-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="17" rx="2"></rect>
                        <path d="M8 2v4M16 2v4M3 10h18"></path>
                      </svg>
                    </span>
                  </div>
                </div>
                <div class="field">
                  <label>截止时间</label>
                  <div id="taskDeadlineField" class="date-field">
                    <input id="taskDeadlineDisplayInput" class="input date-display-input" type="text" placeholder="YYYY-MM-DD HH:mm" readonly />
                    <input id="taskDeadlineInput" type="hidden" />
                    <span class="date-field-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="17" rx="2"></rect>
                        <path d="M8 2v4M16 2v4M3 10h18"></path>
                      </svg>
                    </span>
                  </div>
                </div>
                <div class="field"><label>任务状态</label><select id="taskStatusInput" class="select"></select></div>
                <div class="field"><label>责任部门</label><select id="taskDeptInput" class="select"></select></div>
                <div class="field"><label>责任人</label><select id="taskUserInput" class="select"></select></div>
                <div class="field full"><label>备注</label><textarea id="taskRemarkInput" class="textarea"></textarea></div>
              </div>
            </div>
            <div class="modal-foot">
              <button class="btn" type="button" data-close>取消</button>
              <button class="btn primary" type="submit">保存</button>
            </div>
          </form>
        </div>
      </div>
    `;
    bindCloseButtons();
    fillSelect(id("taskTemplateInput"), ["", ...state.templates.map((item) => item.id)], "请选择检查模板", templateLabelById);
    fillSelect(id("taskStatusInput"), state.options.taskStatuses || [], "");
    fillDeptSelect(id("taskDeptInput"));
    fillUserSelect(id("taskUserInput"));
    setValue("taskTemplateInput", task?.templateId || state.selectedTemplateId || "");
    setValue("taskTargetInput", task?.target || getSelectedTemplate()?.target || "");
    setValue("taskPlannedInput", toDateTimeInput(task?.plannedDate || ""));
    setValue("taskDeadlineInput", toDateTimeInput(task?.deadline || ""));
    setValue("taskStatusInput", task?.status || "待检查");
    id("taskStatusInput").disabled = !task;
    setValue("taskDeptInput", task?.ownerDeptId || "");
    setValue("taskUserInput", task?.ownerUserId || "");
    setValue("taskRemarkInput", task?.remark || "");
    const plannedDateTimePicker = window.CompactDatePicker?.attach({
      field: id("taskPlannedField"),
      displayInput: id("taskPlannedDisplayInput"),
      valueInput: id("taskPlannedInput"),
      includeTime: true,
    });
    const deadlineDateTimePicker = window.CompactDatePicker?.attach({
      field: id("taskDeadlineField"),
      displayInput: id("taskDeadlineDisplayInput"),
      valueInput: id("taskDeadlineInput"),
      includeTime: true,
    });
    plannedDateTimePicker?.sync();
    deadlineDateTimePicker?.sync();
    enhanceSelectProxies(id("taskForm"));
    id("taskTemplateInput").addEventListener("change", applyTaskTemplateDefaults);
    id("taskForm").addEventListener("submit", saveTask);
  }

  function applyTaskTemplateDefaults() {
    const tpl = state.templates.find((item) => item.id === valueOf("taskTemplateInput"));
    if (!tpl) return;
    if (!valueOf("taskTargetInput")) setValue("taskTargetInput", tpl.target || "");
    if (!valueOf("taskDeptInput")) setValue("taskDeptInput", tpl.defaultDeptId || "");
    if (!valueOf("taskUserInput")) setValue("taskUserInput", tpl.defaultUserId || "");
  }

  async function saveTask(event) {
    event.preventDefault();
    const tpl = state.templates.find((item) => item.id === valueOf("taskTemplateInput"));
    if (!tpl) {
      showToast("请选择检查模板");
      return;
    }
    const dept = selectedOptionData(id("taskDeptInput"));
    const user = selectedOptionData(id("taskUserInput"));
    const existingTask = state.editingTaskId ? state.tasks.find((item) => item.id === state.editingTaskId) : null;
    const task = {
      id: state.editingTaskId,
      templateId: tpl.id,
      templateName: tpl.name,
      target: valueOf("taskTargetInput"),
      plannedDate: valueOf("taskPlannedInput"),
      deadline: valueOf("taskDeadlineInput"),
      status: valueOf("taskStatusInput"),
      ownerDept: dept.label || "",
      ownerDeptId: valueOf("taskDeptInput"),
      ownerUser: user.label || "",
      ownerUserId: valueOf("taskUserInput"),
      source: existingTask?.source || "手工创建",
      remark: valueOf("taskRemarkInput"),
    };
    try {
      await requestApi("/safety-check/task/save", "POST", { task });
      closeModal();
      await loadAll();
      showToast("任务已保存");
    } catch (error) {
      showToast(`保存失败：${error.message}`);
    }
  }

  async function deleteSelectedTask() {
    const task = getSelectedTask();
    if (!task) {
      showToast("请先选择任务");
      return;
    }
    if (!window.confirm(`确认删除任务“${task.code || task.templateName}”？`)) return;
    try {
      await requestApi("/safety-check/task/delete", "POST", { id: task.id });
      state.selectedTaskId = "";
      await loadAll();
      showToast("任务已删除");
    } catch (error) {
      showToast(`删除失败：${error.message}`);
    }
  }

  function openRecordModal(record, options = {}) {
    if (!record) {
      showToast("请先选择检查记录");
      return;
    }
    const editingTime = Boolean(options.editingTime);
    const rows = state.submissionDetails.filter((item) => item.submissionId === record.id);
    const signatureMarks = renderRecordSignatureMarks(record);
    const principalSignatureMarks = renderPrincipalSignatureMarks(record);
    const inspectionTimeValue = record.endTime || record.startTime || "";
    refs.modalRoot.innerHTML = `
      <div class="modal-mask">
        <div class="modal">
          <div class="modal-head">
            <h2>${escapeHtml(record.code || "检查记录")} · ${escapeHtml(record.templateName || "")}</h2>
            <button class="btn" type="button" data-close>关闭</button>
          </div>
          <div class="modal-body">
            <div class="record-summary-grid">
              <div class="record-summary-item">
                <span>提交编号</span>
                <strong>${escapeHtml(record.code || "-")}</strong>
              </div>
              <div class="record-summary-item">
                <span>检查类型</span>
                <strong>${escapeHtml(record.templateName || "-")}</strong>
              </div>
              <div class="record-summary-item">
                <span>区域/对象</span>
                <strong>${escapeHtml(record.target || "-")}</strong>
              </div>
              <div class="record-summary-item">
                <span>检查人员</span>
                <strong>${signatureMarks}</strong>
              </div>
              <div class="record-summary-item">
                <span>主要负责人签字</span>
                <strong>${principalSignatureMarks}</strong>
              </div>
              <div class="record-summary-item">
                <span>检查时间</span>
                <strong class="${editingTime ? "is-hidden" : ""}" data-record-time-text>${escapeHtml(shortDateTime(inspectionTimeValue))}</strong>
                <input
                  id="recordInspectionTimeInlineInput"
                  class="input record-time-input ${editingTime ? "" : "is-hidden"}"
                  type="datetime-local"
                  value="${escapeHtml(toDateTimeInput(inspectionTimeValue))}"
                  ${editingTime ? "" : "disabled"}
                  required
                />
              </div>
              <div class="record-summary-item">
                <span>结果</span>
                <strong>${renderResultTag(record.result)}</strong>
              </div>
              <div class="record-summary-item">
                <span>异常数</span>
                <strong>${escapeHtml(record.abnormalCount || 0)}</strong>
              </div>
              <div class="record-summary-item">
                <span>状态</span>
                <strong>${escapeHtml(record.status || "-")}</strong>
              </div>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:60px">序号</th>
                    <th style="width:120px">分类</th>
                    <th>检查项目</th>
                    <th style="width:100px">结果</th>
                    <th>异常说明</th>
                    <th>处理措施</th>
                    <th style="width:90px">处理情况</th>
                    <th style="width:130px">异常照片</th>
                    <th style="width:140px">整改流程</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.length ? rows.map((item) => `
                    <tr>
                      <td>${escapeHtml(item.seq || "")}</td>
                      <td>${escapeHtml(item.category || "-")}</td>
                      <td>${escapeHtml(item.item || "-")}<div class="muted">${escapeHtml(item.standard || "")}</div></td>
                      <td>${renderResultTag(item.result)}</td>
                      <td>${escapeHtml(item.abnormalDesc || "-")}</td>
                      <td>${escapeHtml(item.handling || "-")}</td>
                      <td>${escapeHtml(item.handlingStatus || "-")}</td>
                      <td>${renderRecordFilePreviews(getDetailPhotoFiles(item))}</td>
                      <td>${escapeHtml(item.hazardId || "-")}</td>
                    </tr>
                  `).join("") : `<tr><td colspan="9"><div class="empty">暂无明细</div></td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-foot">
            ${editingTime ? `
              <button class="btn" type="button" data-record-modal-cancel-edit>取消</button>
              <button class="btn primary" type="button" data-record-modal-save-time>保存</button>
            ` : `
              <button class="btn" type="button" data-record-modal-edit>编辑</button>
              <button class="btn" type="button" data-record-modal-print>打印</button>
              <button class="btn" type="button" data-record-modal-export>导出</button>
              <button class="btn primary" type="button" data-close>确定</button>
            `}
          </div>
        </div>
      </div>
    `;
    bindCloseButtons();
    if (editingTime) {
      const input = id("recordInspectionTimeInlineInput");
      input?.focus();
      refs.modalRoot.querySelector("[data-record-modal-cancel-edit]")?.addEventListener("click", () => openRecordModal(record));
      refs.modalRoot.querySelector("[data-record-modal-save-time]")?.addEventListener("click", () => {
        void saveRecordInspectionTimeInline(record);
      });
    } else {
      refs.modalRoot.querySelector("[data-record-modal-edit]")?.addEventListener("click", () => {
        state.selectedRecordId = record.id;
        openRecordModal(record, { editingTime: true });
      });
      refs.modalRoot.querySelector("[data-record-modal-print]")?.addEventListener("click", () => printSafetyRecord(record));
      refs.modalRoot.querySelector("[data-record-modal-export]")?.addEventListener("click", () => exportSafetyRecord(record));
    }
  }

  async function saveRecordInspectionTimeInline(record) {
    const inspectionTime = valueOf("recordInspectionTimeInlineInput");
    if (!inspectionTime) {
      showToast("请填写检查时间");
      return;
    }
    const saveBtn = refs.modalRoot.querySelector("[data-record-modal-save-time]");
    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = "保存中...";
      }
      await requestApi("/safety-check/submission/update-time", "POST", {
        id: record.id,
        inspectionTime,
      });
      state.selectedRecordId = record.id;
      await loadAll();
      openRecordModal(getSelectedRecord() || { ...record, endTime: inspectionTime });
      showToast("检查时间已保存");
    } catch (error) {
      showToast(`保存失败：${error.message}`);
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = "保存";
      }
    }
  }

  function printSafetyRecord(record) {
    if (!record) {
      showToast("请先选择检查记录");
      return;
    }
    const html = buildSafetyRecordPrintHtml(record, resolveRecordPrintTemplate(record));
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("浏览器拦截了打印窗口，请允许弹窗后重试");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    showToast("已打开打印页");
  }

  function exportSafetyRecord(record) {
    if (!record) {
      showToast("请先选择检查记录");
      return;
    }
    const html = buildSafetyRecordPrintHtml(record, resolveRecordPrintTemplate(record), true);
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileBase = sanitizeFilename(`${record.code || record.templateName || "安全检查记录"}_${shortDate(record.endTime) || ""}`);
    link.href = url;
    link.download = `${fileBase || "安全检查记录"}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("检查记录已导出");
  }

  function printSafetyRecords(records) {
    if (!records.length) {
      return;
    }
    if (records.length === 1) {
      printSafetyRecord(records[0]);
      return;
    }
    const html = buildSafetyRecordsBatchHtml(records, false);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("浏览器拦截了打印窗口，请允许弹窗后重试");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    showToast(`已打开 ${records.length} 条记录的打印页`);
  }

  function exportSafetyRecords(records) {
    if (!records.length) {
      return;
    }
    if (records.length === 1) {
      exportSafetyRecord(records[0]);
      return;
    }
    const html = buildSafetyRecordsBatchHtml(records, true);
    const blob = new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `安全检查记录_批量_${shortDate(new Date().toISOString())}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`已导出 ${records.length} 条检查记录`);
  }

  function buildSafetyRecordsBatchHtml(records, exportMode = false) {
    const parser = new DOMParser();
    const firstHtml = buildSafetyRecordPrintHtml(records[0], resolveRecordPrintTemplate(records[0]), true);
    const firstDoc = parser.parseFromString(firstHtml, "text/html");
    const baseStyle = firstDoc.querySelector("style")?.textContent || "";
    const pages = records.map((record) => {
      const doc = parser.parseFromString(buildSafetyRecordPrintHtml(record, resolveRecordPrintTemplate(record), true), "text/html");
      const shell = doc.querySelector(".print-shell");
      return shell ? shell.outerHTML : "";
    }).filter(Boolean).join("");
    return `
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <title>安全检查记录批量${exportMode ? "导出" : "打印"}</title>
          <style>
            ${baseStyle}
            .print-shell + .print-shell { page-break-before: always; }
          </style>
        </head>
        <body>
          ${exportMode ? "" : '<div class="print-actions"><button type="button" onclick="window.print()">打印</button><button type="button" onclick="window.close()">关闭</button></div>'}
          ${pages}
          ${exportMode ? "" : "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });<\/script>"}
        </body>
      </html>
    `;
  }

  function resolveRecordPrintTemplate(record) {
    const picked = valueOf("recordPrintTemplateSelect") || state.filters.recordPrintTemplateSelect || "auto";
    if (picked && picked !== "auto") {
      return picked;
    }
    const template = state.templates.find((item) => item.id === record?.templateId) || {};
    const text = [record?.templateName, template.name, template.category, template.target].join(" ");
    return /压力容器|专项|设备|电气|消防|燃气|节假日|节前|节后|春节/.test(text) ? "detail" : "standard";
  }

  function buildSafetyRecordPrintHtml(record, templateType, exportMode = false) {
    const template = state.templates.find((item) => item.id === record.templateId) || {};
    const rows = buildRecordPrintRows(record);
    const title = buildPrintTitle(record.templateName || template.name, templateType);
    const bodyRows = templateType === "detail" ? buildDetailPrintRows(rows) : buildStandardPrintRows(rows);
    const detailColgroup = '<col style="width:11%" /><col style="width:15%" /><col style="width:50%" /><col style="width:24%" />';
    const colgroup = templateType === "detail"
      ? detailColgroup
      : '<col style="width:13%" /><col style="width:43%" /><col style="width:8%" /><col style="width:9%" /><col style="width:27%" />';
    const header = templateType === "detail" ? `
      <tr>
        <th>序号</th>
        <th>检查项目</th>
        <th>检查内容提示</th>
        <th>检查情况记录</th>
      </tr>
    ` : `
      <tr>
        <th rowspan="2">检查项目</th>
        <th rowspan="2">检查要求</th>
        <th colspan="2">检查结果</th>
        <th rowspan="2">如不符合，存在的主要问题及整改措施</th>
      </tr>
      <tr>
        <th>符合</th>
        <th>不符合</th>
      </tr>
    `;
    const metaTable = templateType === "detail" ? renderDetailPrintMeta(record, detailColgroup) : "";
    const footer = templateType === "detail" ? "" : renderPrintFooter(record);
    return `
      <!doctype html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            body { margin: 0; color: #000; background: #fff; font-family: "SimSun", "Songti SC", "Microsoft YaHei", sans-serif; }
            .print-shell { width: 186mm; margin: 0 auto; padding: 12mm 8mm 14mm; }
            h1 { margin: 0 0 8mm; text-align: center; font-size: 22pt; line-height: 1.2; font-weight: 700; }
            .print-actions { margin-bottom: 12px; display: flex; justify-content: flex-end; gap: 8px; font-family: "Microsoft YaHei", sans-serif; }
            .print-actions button { min-height: 30px; padding: 0 12px; border: 1px solid #999; background: #fff; cursor: pointer; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 6px 7px; font-size: 12pt; line-height: 1.6; vertical-align: middle; word-break: break-word; }
            th { text-align: center; font-weight: 400; }
            .detail-meta { margin-bottom: -1px; }
            .detail-meta td { height: 28px; padding: 3px 6px; font-size: 11pt; }
            .detail-meta-pair { display: flex; align-items: center; gap: 4px; min-width: 0; white-space: nowrap; }
            .detail-meta-label { flex: 0 0 auto; font-weight: 700; }
            .detail-meta-value { min-width: 0; font-weight: 400; overflow-wrap: anywhere; }
            .detail-meta-pair.compact { font-size: 10.5pt; gap: 2px; }
            .meta-label { width: 78px; font-weight: 700; white-space: nowrap; }
            .center { text-align: center; }
            .muted { color: #333; font-size: 12px; }
            .issue { white-space: pre-wrap; }
            .bottom-lines { margin-top: 5mm; display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; font-size: 12pt; }
            .bottom-line-label { margin-bottom: 2mm; }
            .bottom-line-value { height: 10mm; border-bottom: 1px solid #000; display: flex; align-items: center; gap: 6px; padding: 0; overflow: hidden; }
            .sign-img { max-width: 30mm; max-height: 8mm; object-fit: contain; vertical-align: middle; }
            .detail-meta .sign-img { max-width: 30mm; max-height: 8mm; }
            .sign-separator { display: inline-block; margin: 0 2mm; }
            .remark { margin-top: 5mm; font-size: 11pt; line-height: 1.5; }
            @page { size: A4 portrait; margin: 10mm; }
            @media print {
              .print-actions { display: none; }
              .print-shell { width: auto; margin: 0; padding: 0; }
              h1 { page-break-after: avoid; }
              tr { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="print-shell">
            ${exportMode ? "" : '<div class="print-actions"><button type="button" onclick="window.print()">打印</button><button type="button" onclick="window.close()">关闭</button></div>'}
            <h1>${escapeHtml(title)}</h1>
            ${metaTable}
            <table>
              <colgroup>${colgroup}</colgroup>
              <thead>${header}</thead>
              <tbody>${bodyRows || `<tr><td colspan="${templateType === "detail" ? 4 : 5}" class="center">暂无检查明细</td></tr>`}</tbody>
            </table>
            ${footer}
            ${record.remark ? `<div class="remark">备注：${escapeHtml(record.remark)}</div>` : ""}
          </div>
          ${exportMode ? "" : "<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 300); });<\/script>"}
        </body>
      </html>
    `;
  }

  function buildPrintTitle(source, templateType) {
    let text = String(source || "").trim();
    text = text.replace(/[（(]?\d+[）)]?$/g, "").trim();
    if (!text) {
      text = templateType === "detail" ? "安全检查" : "综合性安全检查";
    }
    if (/检查表$/.test(text)) {
      return text;
    }
    if (/检查$/.test(text)) {
      return `${text}表`;
    }
    return `${text}检查表`;
  }

  function renderDetailPrintMeta(record, colgroup) {
    const date = shortDate(record.endTime || record.startTime) || "-";
    return `
      <table class="detail-meta">
        <colgroup>${colgroup}</colgroup>
        <tbody>
          <tr>
            <td colspan="2"><span class="detail-meta-pair"><span class="detail-meta-label">检查日期：</span><span class="detail-meta-value">${escapeHtml(date)}</span></span></td>
            <td colspan="2"><span class="detail-meta-pair compact"><span class="detail-meta-label">检查人员签字：</span><span class="detail-meta-value">${renderPrintSignatureMarks(record)}</span></span></td>
          </tr>
        </tbody>
      </table>
    `;
  }

  function renderPrintFooter(record) {
    return `
      <div class="bottom-lines">
        <div>
          <div class="bottom-line-label">检查人员：</div>
          <div class="bottom-line-value">${renderPrintSignatureMarks(record)}</div>
        </div>
        <div>
          <div class="bottom-line-label">检查日期：</div>
          <div class="bottom-line-value">${escapeHtml(shortDate(record.endTime || record.startTime) || "")}</div>
        </div>
      </div>
    `;
  }

  function buildRecordPrintRows(record) {
    const details = state.submissionDetails.filter((item) => item.submissionId === record.id);
    const detailByItemId = new Map(details.map((item) => [item.itemId, item]));
    const usedDetailIds = new Set();
    const templateRows = getTemplateItems(record.templateId).map((item) => {
      const detail = detailByItemId.get(item.id) || details.find((row) => !usedDetailIds.has(row.id) && Number(row.seq || 0) === Number(item.seq || 0));
      if (detail?.id) {
        usedDetailIds.add(detail.id);
      }
      return mergePrintRow(item, detail);
    });
    const extraRows = details
      .filter((item) => !usedDetailIds.has(item.id))
      .map((item) => mergePrintRow(null, item));
    return [...templateRows, ...extraRows].sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));
  }

  function mergePrintRow(templateItem, detail) {
    return {
      seq: templateItem?.seq || detail?.seq || "",
      category: templateItem?.category || detail?.category || "检查项",
      item: templateItem?.item || detail?.item || "检查项",
      content: templateItem?.content || detail?.content || detail?.item || "",
      standard: templateItem?.standard || detail?.standard || "",
      result: detail?.result || "",
      abnormalDesc: detail?.abnormalDesc || "",
      abnormalPhotos: detail?.abnormalPhotos || "",
      abnormalPhotoFiles: getDetailPhotoFiles(detail || {}),
      handling: detail?.handling || "",
      handlingStatus: detail?.handlingStatus || "",
      hazardId: detail?.hazardId || "",
      detailId: detail?.id || "",
      submitTime: detail?.submitTime || "",
    };
  }

  function buildStandardPrintRows(rows) {
    const groups = [];
    rows.forEach((row) => {
      const category = row.category || "检查项";
      let group = groups.find((item) => item.category === category);
      if (!group) {
        group = { category, rows: [] };
        groups.push(group);
      }
      group.rows.push(row);
    });
    return groups.map((group) => group.rows.map((row, index) => `
      <tr>
        ${index === 0 ? `<td rowspan="${group.rows.length}" class="center">${escapeHtml(group.category)}</td>` : ""}
        <td>${escapeHtml(formatRequirementText(row))}</td>
        <td class="center">${isNormalPrintResult(row.result) ? "√" : ""}</td>
        <td class="center">${isAbnormalPrintResult(row.result) ? "√" : ""}</td>
        <td class="issue">${escapeHtml(formatIssueText(row))}</td>
      </tr>
    `).join("")).join("");
  }

  function buildDetailPrintRows(rows) {
    return rows.map((row, index) => `
      <tr>
        <td class="center">${escapeHtml(row.seq || index + 1)}</td>
        <td class="center">${escapeHtml(row.item || "-")}</td>
        <td>${escapeHtml(formatContentPrompt(row))}</td>
        <td class="issue">${escapeHtml(formatRecordText(row))}</td>
      </tr>
    `).join("");
  }

  function formatRequirementText(row) {
    const seq = row.seq ? `${row.seq}.` : "";
    const main = [row.item, row.content].filter(Boolean).join("：");
    const standard = row.standard ? `\n${row.standard}` : "";
    return `${seq}${main || row.standard || "-"}${standard}`;
  }

  function formatContentPrompt(row) {
    const parts = [row.content || row.item, row.standard].filter(Boolean);
    return parts.length ? parts.join("\n") : "-";
  }

  function formatRecordText(row) {
    const parts = [];
    if (row.result) parts.push(`结果：${row.result}`);
    const issue = formatIssueText(row);
    if (issue) parts.push(issue);
    return parts.join("\n") || "-";
  }

  function formatIssueText(row) {
    if (row.result && isNormalPrintResult(row.result)) {
      return "";
    }
    const hazard = findLinkedHazard(row);
    const rectification = row.handling || hazard?.requirement || hazard?.actionDesc || "";
    const parts = [];
    if (row.abnormalDesc) parts.push(row.abnormalDesc);
    if (rectification) parts.push(`整改措施：${rectification}`);
    return parts.join("\n");
  }

  function findLinkedHazard(row) {
    return state.hazards.find((item) => {
      const values = [item.id, item.code, item.submissionDetailId].map((value) => String(value || "").trim()).filter(Boolean);
      return values.includes(String(row.hazardId || "").trim()) || values.includes(String(row.detailId || "").trim());
    }) || null;
  }

  function getDetailPhotoFiles(detail) {
    return normalizeDisplayFiles(preferNonEmptyFiles(detail?.abnormalPhotoFiles, detail?.abnormalPhotos), "__safety-check-photos");
  }

  function getSignatureFiles(record) {
    return (Array.isArray(record?.signatures) ? record.signatures : [])
      .flatMap((row) => normalizeDisplayFiles(row?.files, "__safety-check-submission-signatures"));
  }

  function getPrincipalSignatureFiles(record) {
    return normalizeDisplayFiles(record?.principalSignatureFiles, "__safety-check-submission-signatures");
  }

  function preferNonEmptyFiles(primary, fallback) {
    if (Array.isArray(primary)) {
      return primary.length ? primary : fallback;
    }
    return primary || fallback;
  }

  function normalizeDisplayFiles(value, preferredDirectory = "") {
    if (!value) {
      return [];
    }
    const list = Array.isArray(value) ? value.flatMap((item) => normalizeDisplayFiles(item, preferredDirectory)) : [value];
    return list.map((item) => {
      if (item && typeof item === "object") {
        const url = resolveFileUrl(item, preferredDirectory);
        const name = String(item.name || item.fileName || item.filename || item.title || fileNameFromUrl(url) || "附件").trim();
        return { name, url };
      }
      const text = String(item || "").trim();
      if (!text) return null;
      const isUrl = /^(https?:|data:)/i.test(text) || text.startsWith("/");
      return {
        name: fileNameFromUrl(text) || text,
        url: isUrl ? resolveFileUrl(text, preferredDirectory) : buildSafetyCheckFileUrl(preferredDirectory, text),
      };
    }).filter((item) => item && (item.name || item.url));
  }

  function renderRecordFileLinks(value) {
    const files = normalizeDisplayFiles(value);
    if (!files.length) {
      return "-";
    }
    return `<span class="record-file-list">${files.map((file, index) => {
      const label = escapeHtml(file.name || `附件${index + 1}`);
      return file.url
        ? `<a href="${escapeHtml(file.url)}" target="_blank" rel="noopener">${label}</a>`
        : `<span>${label}</span>`;
    }).join("")}</span>`;
  }

  function renderRecordSignatureMarks(record) {
    const files = getSignatureFiles(record);
    if (!files.length) {
      return "-";
    }
    return `<span class="record-signature-list">${files.map((file, index) => {
      const separator = index > 0 ? `<span class="record-signature-separator">、</span>` : "";
      if (file.url) {
        return `${separator}<img class="record-signature-img" src="${escapeHtml(file.url)}" alt="签名" />`;
      }
      return `${separator}<span>${escapeHtml(file.name || "签名")}</span>`;
    }).join("")}</span>`;
  }

  function renderPrincipalSignatureMarks(record) {
    const files = getPrincipalSignatureFiles(record);
    if (!files.length) {
      return "-";
    }
    return `<span class="record-signature-list">${files.map((file) => {
      if (file.url) {
        return `<img class="record-signature-img" src="${escapeHtml(file.url)}" alt="主要负责人签字" />`;
      }
      return `<span>${escapeHtml(file.name || "主要负责人签字")}</span>`;
    }).join("")}</span>`;
  }

  function renderRecordFilePreviews(value) {
    const files = normalizeDisplayFiles(value);
    if (!files.length) {
      return "-";
    }
    return `<span class="record-photo-list">${files.map((file, index) => {
      const label = escapeHtml(file.name || `图片${index + 1}`);
      if (file.url && isImageFile(file)) {
        return `<a href="${escapeHtml(file.url)}" target="_blank" rel="noopener"><img class="record-photo-img" src="${escapeHtml(file.url)}" alt="${label}" /></a>`;
      }
      return file.url
        ? `<a href="${escapeHtml(file.url)}" target="_blank" rel="noopener">${label}</a>`
        : `<span>${label}</span>`;
    }).join("")}</span>`;
  }

  function renderPrintSignatureMarks(record, emptyText = "") {
    const files = getSignatureFiles(record);
    if (!files.length) {
      return escapeHtml(emptyText);
    }
    return files.map((file, index) => {
      const separator = index > 0 ? `<span class="sign-separator">、</span>` : "";
      if (file.url) {
        return `${separator}<img class="sign-img" src="${escapeHtml(file.url)}" alt="签名" />`;
      }
      return `${separator}${escapeHtml(file.name || "签名")}`;
    }).join("");
  }

  function fileNameFromUrl(value) {
    const text = String(value || "").trim();
    if (!text || /^data:/i.test(text)) return "";
    try {
      const parsed = new URL(text, window.location.origin);
      const name = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
      return name;
    } catch {
      return text.includes("/") ? decodeURIComponent(text.split("/").pop() || "") : "";
    }
  }

  function isImageFile(file) {
    const text = `${file?.name || ""} ${file?.url || ""}`.toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|#|$)/.test(text) || /^data:image\//i.test(String(file?.url || ""));
  }

  function isNormalPrintResult(value) {
    const text = String(value || "");
    return /(正常|符合|合格|是)/.test(text) && !/(异常|不符合|不合格|否)/.test(text);
  }

  function isAbnormalPrintResult(value) {
    return /(异常|不符合|不合格|否)/.test(String(value || ""));
  }

  function renderPrintSignatures(record) {
    return renderPrintSignatureMarks(record);
  }

  function resolveFileUrl(file, preferredDirectory = "") {
    if (!file || typeof file !== "object") {
      const text = String(file || "").trim();
      return buildSafetyCheckFileUrl(preferredDirectory, fileNameFromUrl(text) || text) || text;
    }
    const url = String(file.url || file.download_url || file.downloadUrl || file.link || file.href || file.preview_url || file.previewUrl || file.dataUrl || "").trim();
    const name = String(file.name || file.fileName || file.filename || file.title || fileNameFromUrl(url) || "").trim();
    const localUrl = buildSafetyCheckFileUrl(preferredDirectory, name);
    if (localUrl) return localUrl;
    if (!url) return "";
    if (/^(https?:|data:)/i.test(url)) return url;
    if (url.startsWith("/")) return `${window.location.origin}${url}`;
    return url;
  }

  function buildSafetyCheckFileUrl(directory, fileName) {
    const dir = String(directory || "").trim();
    const name = String(fileName || "").trim();
    if (!dir || !name || name.includes("/") || name.includes("\\")) {
      return "";
    }
    return `${window.location.origin}/api/safety-check/file/${encodeURIComponent(dir)}/${encodeURIComponent(name)}`;
  }

  async function openHazardModal(hazard) {
    if (!hazard) {
      showToast("请先选择整改工单");
      return;
    }
    state.editingHazardId = hazard.id;
    state.currentHazardFlowInfo = await fetchHazardFlowInfo(hazard.id);
    const status = hazard.status || "待整改";
    const rectificationEditable = isHazardRectificationEditable(status);
    const verificationEditable = status === "待验收";
    const closed = status === "已关闭";
    const flowInfo = state.currentHazardFlowInfo || {};
    const flowNotice = buildHazardFlowNotice(flowInfo, closed);
    refs.modalRoot.innerHTML = `
      <div class="modal-mask">
        <div class="modal small">
          <div class="modal-head">
            <h2>${escapeHtml(hazard.code ? `处理整改工单 ${hazard.code}` : "处理整改工单")}</h2>
            <button class="btn" type="button" data-close>关闭</button>
          </div>
          <form id="hazardForm">
            <div class="modal-body">
              <div class="form-grid cols-3">
                <div class="field"><label>当前状态</label><input id="hazardStatusInput" class="input readonly" readonly /></div>
                <div class="field"><label>当前节点</label><input id="hazardFlowNodeInput" class="input readonly" readonly /></div>
                <div class="field"><label>风险等级</label><input id="hazardRiskInput" class="input readonly" readonly /></div>
                <div class="field"><label>整改期限</label><input id="hazardDeadlineInput" class="input readonly" readonly /></div>
                <div class="field full"><div id="hazardFlowNotice" class="flow-notice ${flowNotice.className}">${escapeHtml(flowNotice.text)}</div></div>
                <div class="field full"><label>异常检查项</label><input id="hazardTitleInput" class="input readonly" readonly /></div>
                <div class="field full"><label>隐患描述</label><textarea id="hazardDescInput" class="textarea readonly" readonly></textarea></div>
                <div class="field full"><label>区域/对象</label><input id="hazardTargetInput" class="input readonly" readonly /></div>
                <div class="field"><label>责任部门</label><input id="hazardDeptInput" class="input readonly" readonly /></div>
                <div class="field"><label>责任人</label><input id="hazardUserInput" class="input readonly" readonly /></div>
                <div class="field"><label>验收人</label><select id="hazardVerifierInput" class="select" ${rectificationEditable ? "" : "disabled"}></select></div>
                <div class="field full"><label>整改要求</label><textarea id="hazardRequirementInput" class="textarea readonly" readonly></textarea></div>
                <div class="field full"><label>${rectificationEditable ? '<span class="required">*</span>' : ""}整改说明</label><textarea id="hazardActionInput" class="textarea ${rectificationEditable ? "" : "readonly"}" ${rectificationEditable ? "" : "readonly"}></textarea></div>
                <div class="field"><label>整改后照片</label><input id="hazardAfterPhotoInput" class="input" type="file" accept="image/*" multiple ${rectificationEditable ? "" : "disabled"} /><div id="hazardAfterPhotoText" class="muted"></div></div>
                <div class="field full"><label>${verificationEditable ? '<span class="required">*</span>' : ""}验收意见</label><textarea id="hazardVerifyInput" class="textarea ${verificationEditable ? "" : "readonly"}" ${verificationEditable ? "" : "readonly"}></textarea></div>
              </div>
            </div>
            ${renderHazardActionFooter(status)}
          </form>
        </div>
      </div>
    `;
    bindCloseButtons();
    fillUserSelect(id("hazardVerifierInput"));
    setValue("hazardTitleInput", getHazardCheckItemName(hazard));
    setValue("hazardDescInput", getHazardDescription(hazard));
    setValue("hazardRiskInput", hazard.riskLevel || "-");
    setValue("hazardStatusInput", status);
    setValue("hazardFlowNodeInput", flowInfo.flowName || (flowInfo.flowId ? `节点 ${flowInfo.flowId}` : "未获取"));
    setValue("hazardDeadlineInput", shortDateTime(hazard.deadline || ""));
    setValue("hazardTargetInput", hazard.target || "");
    setValue("hazardDeptInput", hazard.ownerDept || "-");
    setValue("hazardUserInput", hazard.ownerUser || "-");
    setValue("hazardVerifierInput", hazard.verifierId || "");
    setValue("hazardRequirementInput", hazard.requirement || "");
    setValue("hazardActionInput", hazard.actionDesc || "");
    setValue("hazardVerifyInput", hazard.verifyComment || "");
    id("hazardAfterPhotoText").textContent = hazard.afterPhotos ? `已上传：${hazard.afterPhotos}` : "";
    id("hazardForm").addEventListener("submit", (event) => event.preventDefault());
    refs.modalRoot.querySelectorAll("[data-hazard-action]").forEach((btn) => {
      btn.addEventListener("click", () => saveHazard(btn.dataset.hazardAction));
      if (!closed && (!flowInfo.flowId || !state.currentUserId)) {
        btn.disabled = true;
      }
    });
  }

  async function fetchHazardFlowInfo(hazardId) {
    if (!hazardId) {
      return { dataId: "", flowId: 0, flowName: "", error: "缺少流程数据ID" };
    }
    try {
      const resp = await requestApi("/safety-check/hazard/flow-info", "POST", { dataId: hazardId });
      return { ...normalizeHazardFlowInfo(resp.data), dataId: hazardId };
    } catch (error) {
      return { dataId: hazardId, flowId: 0, flowName: "", error: error.message };
    }
  }

  function normalizeHazardFlowInfo(source) {
    const data = unwrapFlowInfo(source);
    const node = data.node || data.currentNode || data.flowNode || {};
    const flowId = Number(node.flowId || node.id || data.flowId || data.flow_id || 0);
    return {
      flowId: Number.isFinite(flowId) ? flowId : 0,
      flowName: node.flowName || node.name || data.flowName || data.nodeName || "",
      flowState: data.flowState ?? data.state ?? "",
      chargers: data.chargers || node.chargers || [],
    };
  }

  function unwrapFlowInfo(source) {
    const candidates = [
      source,
      source?.data,
      source?.result,
      source?.data?.data,
      source?.data?.result,
      source?.result?.data,
    ];
    return candidates.find((item) => item && typeof item === "object" && (item.node || item.currentNode || item.flowNode || item.flowId || item.flow_id || item.flowState || item.chargers)) || {};
  }

  function buildHazardFlowNotice(flowInfo, closed) {
    if (closed) {
      return { className: "ok", text: "流程已关闭" };
    }
    if (flowInfo.error) {
      return { className: "warn", text: `流程信息读取失败：${flowInfo.error}` };
    }
    if (!state.currentUserId) {
      return { className: "warn", text: "当前链接未传入登录人，不能提交流程" };
    }
    if (!flowInfo.flowId) {
      return { className: "warn", text: "未读取到当前流程节点，不能提交流程" };
    }
    return { className: "ok", text: "提交后由百数云按当前节点负责人校验" };
  }

  function hazardFlowAction(action) {
    if (action === "draft") return "save";
    if (action === "reject") return "back";
    return "forward";
  }

  function renderHazardActionFooter(status) {
    if (status === "已关闭") {
      return `
        <div class="modal-foot">
          <button class="btn primary" type="button" data-close>关闭</button>
        </div>
      `;
    }
    if (status === "待验收") {
      return `
        <div class="modal-foot">
          <button class="btn" type="button" data-close>取消</button>
          <button class="btn danger" type="button" data-hazard-action="reject">退回整改</button>
          <button class="btn primary" type="button" data-hazard-action="approve">验收通过</button>
        </div>
      `;
    }
    return `
      <div class="modal-foot">
        <button class="btn" type="button" data-close>取消</button>
        <button class="btn" type="button" data-hazard-action="draft">保存草稿</button>
        <button class="btn primary" type="button" data-hazard-action="submit">提交验收</button>
      </div>
    `;
  }

  function isHazardRectificationEditable(status) {
    return ["待整改", "整改中", "已退回", "已延期"].includes(status || "待整改");
  }

  async function saveHazard(action = "draft") {
    const source = getSelectedHazard();
    if (!source) {
      showToast("请先选择整改工单");
      return;
    }
    const flowInfo = state.currentHazardFlowInfo?.dataId === source.id ? state.currentHazardFlowInfo : await fetchHazardFlowInfo(source.id);
    state.currentHazardFlowInfo = flowInfo;
    const flowAction = hazardFlowAction(action);
    if (!state.currentUserId) {
      showToast("未获取当前登录人，无法提交流程");
      return;
    }
    if (!flowInfo.flowId) {
      showToast("未获取当前流程节点，无法提交流程");
      return;
    }
    const verifierId = valueOf("hazardVerifierInput");
    const verifier = selectedOptionData(id("hazardVerifierInput"));
    const files = id("hazardAfterPhotoInput").files ? Array.from(id("hazardAfterPhotoInput").files).map((file) => file.name) : [];
    const actionDesc = valueOf("hazardActionInput");
    const verifyComment = valueOf("hazardVerifyInput");
    let nextStatus = source.status || "待整改";
    let successMessage = "整改工单已保存";

    if (action === "draft") {
      nextStatus = actionDesc ? "整改中" : nextStatus;
      successMessage = "整改草稿已保存";
    } else if (action === "submit") {
      if (!actionDesc) {
        showToast("请填写整改说明");
        return;
      }
      nextStatus = "待验收";
      successMessage = "已提交验收";
    } else if (action === "approve") {
      if (!verifyComment) {
        showToast("请填写验收意见");
        return;
      }
      nextStatus = "已关闭";
      successMessage = "整改工单已关闭";
    } else if (action === "reject") {
      if (!verifyComment) {
        showToast("请填写退回原因");
        return;
      }
      nextStatus = "已退回";
      successMessage = "已退回整改";
    }

    const hazard = {
      ...(source || {}),
      id: state.editingHazardId,
      title: source.title || getHazardCheckItemName(source) || "安全检查异常",
      description: source.description || getHazardDescription(source),
      riskLevel: source.riskLevel || "",
      status: nextStatus,
      deadline: source.deadline || "",
      target: source.target || "",
      ownerDept: source.ownerDept || "",
      ownerDeptId: source.ownerDeptId || "",
      ownerUser: source.ownerUser || "",
      ownerUserId: source.ownerUserId || "",
      verifier: verifierId ? verifier.label : source.verifier || "",
      verifierId: verifierId || source.verifierId || "",
      requirement: source.requirement || "",
      actionDesc,
      verifyComment,
      afterPhotos: files.length ? files : source?.afterPhotos || "",
      closedAt: nextStatus === "已关闭" ? nowDateTimeText() : nextStatus === "已退回" ? "" : source.closedAt || "",
    };
    try {
      await requestApi("/safety-check/hazard/save", "POST", {
        hazard,
        action,
        flow: {
          operator: state.currentUserId,
          flowId: flowInfo.flowId,
          flowAction,
          requiredValidation: false,
          requireFlow: true,
        },
        corpId: state.currentCorpId,
      });
      closeModal();
      await loadAll();
      showToast(successMessage);
    } catch (error) {
      showToast(`保存失败：${error.message}`);
    }
  }

  async function deleteSelectedHazard() {
    const hazard = getSelectedHazard();
    if (!hazard) {
      showToast("请先选择整改工单");
      return;
    }
    if (!window.confirm(`确认删除整改工单“${hazard.code || hazard.title}”？`)) return;
    try {
      await requestApi("/safety-check/hazard/delete", "POST", { id: hazard.id });
      state.selectedHazardId = "";
      await loadAll();
      showToast("整改工单已删除");
    } catch (error) {
      showToast(`删除失败：${error.message}`);
    }
  }

  function ensureSelections() {
    if (!state.templates.some((item) => item.id === state.selectedTemplateId)) {
      state.selectedTemplateId = state.templates[0]?.id || "";
    }
    if (!state.tasks.some((item) => item.id === state.selectedTaskId)) {
      state.selectedTaskId = state.tasks[0]?.id || "";
    }
    if (!state.submissions.some((item) => item.id === state.selectedRecordId)) {
      state.selectedRecordId = state.submissions[0]?.id || "";
    }
    if (!state.hazards.some((item) => item.id === state.selectedHazardId)) {
      state.selectedHazardId = state.hazards[0]?.id || "";
    }
  }

  function getTemplateItems(templateId) {
    return state.items.filter((item) => item.templateId === templateId && item.enabled !== "停用").sort((a, b) => Number(a.seq || 0) - Number(b.seq || 0));
  }

  function getSelectedTemplate() {
    return state.templates.find((item) => item.id === state.selectedTemplateId) || null;
  }

  function getSelectedTask() {
    return state.tasks.find((item) => item.id === state.selectedTaskId) || null;
  }

  function getSelectedRecord() {
    return state.submissions.find((item) => item.id === state.selectedRecordId) || null;
  }

  function getSelectedHazard() {
    return state.hazards.find((item) => item.id === state.selectedHazardId) || null;
  }

  function fillSelect(select, values, emptyLabel, labelFn) {
    select.innerHTML = "";
    values.forEach((value, index) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = index === 0 && value === "" ? emptyLabel || "全部" : (labelFn ? labelFn(value) : value);
      select.appendChild(option);
    });
  }

  function enhanceSelectProxies(scope) {
    if (!scope) return;
    scope.querySelectorAll("select.select").forEach((select) => enhanceSelectProxy(select));
  }

  function enhanceSelectProxy(select) {
    const next = select.nextElementSibling;
    if (next && next.classList.contains("select-proxy")) {
      next.remove();
    }
    select.classList.add("native-select-hidden");

    const proxy = document.createElement("div");
    proxy.className = "select-proxy";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "select-proxy-button";
    const text = document.createElement("span");
    button.appendChild(text);
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "select-proxy-clear";
    clear.setAttribute("aria-label", "清空选择");

    const panel = document.createElement("div");
    panel.className = "select-proxy-panel hidden";
    const isSearchable = ["templateDeptInput", "templateUserInput", "itemDeptInput", "taskDeptInput", "taskUserInput"].includes(select.id);
    let searchInput = null;
    const list = document.createElement("div");
    list.className = "select-proxy-list";
    if (isSearchable) {
      panel.classList.add("is-searchable");
      const searchWrap = document.createElement("div");
      searchWrap.className = "select-proxy-search-wrap";
      searchInput = document.createElement("input");
      searchInput.type = "search";
      searchInput.className = "select-proxy-search";
      searchInput.placeholder = select.id.toLowerCase().includes("user") ? "输入姓名/账号搜索" : "输入部门名称搜索";
      searchWrap.appendChild(searchInput);
      panel.appendChild(searchWrap);
    }
    panel.appendChild(list);

    proxy.appendChild(button);
    proxy.appendChild(clear);
    proxy.appendChild(panel);
    select.insertAdjacentElement("afterend", proxy);

    const render = () => {
      const selected = select.selectedOptions && select.selectedOptions[0];
      text.textContent = selected?.textContent || "请选择";
      const hasEmptyOption = Array.from(select.options).some((option) => option.value === "");
      proxy.classList.toggle("has-value", Boolean(select.value) && hasEmptyOption && !select.disabled);
      proxy.classList.toggle("is-disabled", select.disabled);
      button.disabled = select.disabled;
      renderSelectProxyOptions(select, list, searchInput ? searchInput.value : "");
    };

    clear.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (select.disabled) return;
      const hasEmptyOption = Array.from(select.options).some((option) => option.value === "");
      if (!hasEmptyOption) return;
      select.value = "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      closeSelectProxies();
    });

    if (searchInput) {
      searchInput.addEventListener("click", (event) => event.stopPropagation());
      searchInput.addEventListener("input", render);
      searchInput.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          closeSelectProxies();
        }
      });
    }

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (select.disabled) return;
      const willOpen = panel.classList.contains("hidden");
      closeSelectProxies();
      if (willOpen) {
        proxy.classList.add("is-open");
        panel.classList.remove("hidden");
        if (searchInput) {
          searchInput.value = "";
          render();
        }
        positionSelectProxyPanel(button, panel);
        if (searchInput) {
          window.setTimeout(() => searchInput.focus(), 0);
        }
      }
    });
    select.addEventListener("change", render);
    render();
  }

  function renderSelectProxyOptions(select, list, keyword = "") {
    const text = normalizeSearchKeyword(keyword);
    list.innerHTML = "";
    const options = Array.from(select.options).filter((option) => {
      if (!text) return true;
      return normalizeSearchKeyword(`${option.textContent || ""} ${option.value || ""}`).includes(text);
    });
    if (!options.length) {
      list.innerHTML = '<div class="select-proxy-empty">未找到匹配项</div>';
      return;
    }
    options.forEach((option) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = `select-proxy-option${option.value === select.value ? " is-selected" : ""}`;
        item.textContent = option.textContent || "请选择";
        item.dataset.value = option.value;
        item.addEventListener("click", () => {
          select.value = option.value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          closeSelectProxies();
        });
        list.appendChild(item);
      });
  }

  function closeSelectProxies() {
    document.querySelectorAll(".select-proxy.is-open").forEach((proxy) => proxy.classList.remove("is-open"));
    document.querySelectorAll(".select-proxy-panel:not(.hidden)").forEach((panel) => {
      panel.classList.add("hidden");
      resetSelectProxyPanelPosition(panel);
    });
  }

  function positionSelectProxyPanel(button, panel) {
    if (!(button instanceof HTMLElement) || !(panel instanceof HTMLElement)) return;
    const rect = button.getBoundingClientRect();
    const gap = 4;
    const margin = 8;
    const panelMaxHeight = panel.classList.contains("is-searchable") ? 320 : 260;
    const minHeight = 150;
    const availableBelow = window.innerHeight - rect.bottom - margin;
    const availableAbove = rect.top - margin;
    const openUp = availableBelow < minHeight && availableAbove > availableBelow;
    const availableHeight = Math.max(minHeight, openUp ? availableAbove : availableBelow);
    const maxHeight = Math.min(panelMaxHeight, availableHeight);
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const width = rect.width;
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - width - margin));
    const top = openUp ? Math.max(margin, rect.top - maxHeight - gap) : Math.min(rect.bottom + gap, window.innerHeight - maxHeight - margin);

    panel.style.position = "fixed";
    panel.style.left = `${left}px`;
    panel.style.right = "auto";
    panel.style.top = `${top}px`;
    panel.style.bottom = "auto";
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${maxHeight}px`;
  }

  function resetSelectProxyPanelPosition(panel) {
    if (!(panel instanceof HTMLElement)) return;
    panel.style.position = "";
    panel.style.left = "";
    panel.style.right = "";
    panel.style.top = "";
    panel.style.bottom = "";
    panel.style.width = "";
    panel.style.maxHeight = "";
  }

  function normalizeSearchKeyword(value) {
    return String(value || "").trim().toLowerCase();
  }

  function fillDeptSelect(select) {
    select.innerHTML = `<option value="">请选择部门</option>`;
    state.contacts.departments.forEach((dept) => {
      const option = document.createElement("option");
      option.value = dept.deptId || dept.name || "";
      option.textContent = dept.name || dept.deptId || "";
      option.dataset.label = option.textContent;
      select.appendChild(option);
    });
    const currentUser = getCurrentContactUser();
    if (currentUser?.mainDeptId && ![...select.options].some((option) => option.value === currentUser.mainDeptId)) {
      const option = document.createElement("option");
      option.value = currentUser.mainDeptId;
      option.textContent = currentUser.mainDeptName || currentUser.mainDeptId;
      option.dataset.label = option.textContent;
      select.appendChild(option);
    }
  }

  function fillUserSelect(select) {
    select.innerHTML = `<option value="">请选择成员</option>`;
    state.contacts.users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.userId || user.name || "";
      option.textContent = user.mainDeptName ? `${user.name || user.userId}（${user.mainDeptName}）` : (user.name || user.userId || "");
      option.dataset.label = user.name || user.userId || "";
      select.appendChild(option);
    });
    if (state.currentUserId && ![...select.options].some((option) => option.value === state.currentUserId)) {
      const option = document.createElement("option");
      option.value = state.currentUserId;
      option.textContent = state.currentUserId;
      option.dataset.label = state.currentUserId;
      select.appendChild(option);
    }
  }

  function selectedOptionData(select) {
    const option = select?.selectedOptions && select.selectedOptions[0];
    return { label: option?.dataset?.label || option?.textContent || "" };
  }

  function getCurrentContactUser() {
    const current = String(state.currentUserId || "").trim();
    if (!current) return null;
    return state.contacts.users.find((user) => {
      const values = [user.userId, user.id, user._id, user.uniqueId, user.name].map((item) => String(item || "").trim()).filter(Boolean);
      return values.includes(current);
    }) || null;
  }

  function templateLabelById(idValue) {
    if (!idValue) return "全部模板";
    const tpl = state.templates.find((item) => item.id === idValue);
    return tpl ? `${tpl.name}${tpl.code ? `（${tpl.code}）` : ""}` : idValue;
  }

  function resultOptionsByType(type) {
    if (type === "正常异常不适用") return "正常,异常,不适用";
    if (type === "数值录入" || type === "文本说明") return "";
    return "正常,异常";
  }

  function restoreFilterValues(keys) {
    keys.forEach((key) => {
      if (state.filters[key] !== undefined && id(key)) {
        id(key).value = state.filters[key];
      }
    });
  }

  function syncFilterValues(keys) {
    keys.forEach((key) => {
      if (id(key)) state.filters[key] = id(key).value;
    });
  }

  function bindFilter(elementId, renderFn) {
    id(elementId).addEventListener("input", renderFn);
    id(elementId).addEventListener("change", renderFn);
  }

  function renderStatusTag(value) {
    return `<span class="tag ${value === "启用" ? "ok" : ""}">${escapeHtml(value || "-")}</span>`;
  }

  function renderTaskStatusTag(value) {
    const cls = value === "异常待整改" ? "warn" : value === "已完成" || value === "已关闭" ? "ok" : "";
    return `<span class="tag ${cls}">${escapeHtml(value || "-")}</span>`;
  }

  function renderHazardStatusTag(value) {
    const cls = value === "已关闭" ? "ok" : value === "待验收" ? "warn" : "";
    return `<span class="tag ${cls}">${escapeHtml(value || "-")}</span>`;
  }

  function renderRiskTag(value) {
    const cls = value === "重大" ? "danger" : value === "较大" ? "warn" : value ? "ok" : "";
    return `<span class="tag ${cls}">${escapeHtml(value || "-")}</span>`;
  }

  function formatAbnormalRequirement(item) {
    const parts = [];
    if ((item?.abnormalDescRequired || "是") === "是") {
      parts.push("说明");
    }
    if (item?.abnormalPhotoRequired === "是") {
      parts.push("照片");
    }
    return parts.length ? parts.join("+") : "无";
  }

  function renderYesNoTag(value) {
    return `<span class="tag ${value === "是" ? "warn" : ""}">${escapeHtml(value || "否")}</span>`;
  }

  function renderOverdueTag(value) {
    return `<span class="tag ${value === "是" ? "danger" : "ok"}">${escapeHtml(value || "否")}</span>`;
  }

  function renderResultTag(value) {
    return `<span class="tag ${value === "异常" ? "danger" : "ok"}">${escapeHtml(value || "-")}</span>`;
  }

  function bindCloseButtons() {
    refs.modalRoot.querySelectorAll("[data-close]").forEach((btn) => btn.addEventListener("click", closeModal));
  }

  function closeModal() {
    refs.modalRoot.innerHTML = "";
  }

  async function requestApi(path, method = "GET", body = null) {
    const resp = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(method === "GET" ? {} : { body: JSON.stringify(body || {}) }),
    });
    const text = await resp.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!resp.ok || data?.ok === false) {
      throw new Error(data?.message || data?.detail || text || `HTTP ${resp.status}`);
    }
    return data || {};
  }

  function resolveApiBaseUrl() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      return `${window.location.origin}/api`;
    }
    return "http://localhost:3001/api";
  }

  function setStatus(message, isError = false) {
    if (!refs.statusBar) {
      return;
    }
    refs.statusBar.textContent = message;
    refs.statusBar.style.color = isError ? "var(--danger)" : "var(--muted)";
  }

  function showToast(message) {
    refs.toast.textContent = message;
    refs.toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => refs.toast.classList.remove("show"), 2200);
  }

  function id(name) {
    return document.getElementById(name);
  }

  function valueOf(name) {
    return String(id(name)?.value || "").trim();
  }

  function setValue(name, value) {
    const element = id(name);
    if (element) {
      element.value = value ?? "";
    }
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  }

  function shortDate(value) {
    return String(value || "").slice(0, 10) || "-";
  }

  function shortDateTime(value) {
    return String(value || "").replace("T", " ").slice(0, 16) || "-";
  }

  function toDateInput(value) {
    return String(value || "").slice(0, 10);
  }

  function toDateTimeInput(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    return text.replace(" ", "T").slice(0, 16);
  }

  function sanitizeFilename(value) {
    return String(value || "")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
  }

  function nowDateTimeText() {
    const d = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
})();
