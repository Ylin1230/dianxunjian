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
      <div class="toolbar action-left">
        <div class="actions">
          <button id="addTemplateBtn" class="btn primary">新增</button>
          <button id="editTemplateBtn" class="btn">编辑</button>
          <button id="deleteTemplateBtn" class="btn danger">删除</button>
        </div>
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
      <div class="toolbar">
        <input id="recordKeyword" class="input" placeholder="提交编号/检查类型/检查人/区域对象" />
        <select id="recordTemplateFilter" class="select"></select>
        <select id="recordResultFilter" class="select">
          <option value="">全部结果</option>
          <option value="正常">正常</option>
          <option value="异常">异常</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:130px">提交编号</th>
              <th>检查类型</th>
              <th style="width:170px">区域/对象</th>
              <th style="width:120px">检查人</th>
              <th style="width:150px">结束时间</th>
              <th style="width:90px">结果</th>
              <th style="width:90px">异常数</th>
              <th style="width:100px">状态</th>
              <th style="width:90px">操作</th>
            </tr>
          </thead>
          <tbody id="recordTableBody"></tbody>
        </table>
      </div>
    `;
    fillSelect(id("recordTemplateFilter"), ["", ...state.templates.map((item) => item.id)], "全部模板", templateLabelById);
    restoreFilterValues(["recordKeyword", "recordTemplateFilter", "recordResultFilter"]);
    ["recordKeyword", "recordTemplateFilter", "recordResultFilter"].forEach((filterId) => bindFilter(filterId, renderRecordTable));
    renderRecordTable();
  }

  function renderRecordTable() {
    syncFilterValues(["recordKeyword", "recordTemplateFilter", "recordResultFilter"]);
    const keyword = valueOf("recordKeyword").toLowerCase();
    const templateId = valueOf("recordTemplateFilter");
    const result = valueOf("recordResultFilter");
    const rows = state.submissions.filter((item) => {
      const text = [item.code, item.templateName, item.target, item.inspector].join(" ").toLowerCase();
      return (!keyword || text.includes(keyword)) && (!templateId || item.templateId === templateId) && (!result || item.result === result);
    });
    id("recordTableBody").innerHTML = rows.length ? rows.map((item) => `
      <tr class="${item.id === state.selectedRecordId ? "selected" : ""}" data-id="${escapeHtml(item.id)}">
        <td>${escapeHtml(item.code || "-")}</td>
        <td>${escapeHtml(item.templateName || "-")}</td>
        <td>${escapeHtml(item.target || "-")}</td>
        <td>${escapeHtml(item.inspector || "-")}</td>
        <td>${escapeHtml(shortDateTime(item.endTime))}</td>
        <td>${renderResultTag(item.result)}</td>
        <td>${escapeHtml(item.abnormalCount || 0)}</td>
        <td>${escapeHtml(item.status || "-")}</td>
        <td><button class="btn link" type="button" data-record-detail="${escapeHtml(item.id)}">详情</button></td>
      </tr>
    `).join("") : `<tr><td colspan="9"><div class="empty">暂无检查记录</div></td></tr>`;
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

  function openRecordModal(record) {
    if (!record) {
      showToast("请先选择检查记录");
      return;
    }
    const rows = state.submissionDetails.filter((item) => item.submissionId === record.id);
    refs.modalRoot.innerHTML = `
      <div class="modal-mask">
        <div class="modal">
          <div class="modal-head">
            <h2>${escapeHtml(record.code || "检查记录")} · ${escapeHtml(record.templateName || "")}</h2>
            <button class="btn" type="button" data-close>关闭</button>
          </div>
          <div class="modal-body">
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
                      <td>${escapeHtml(item.hazardId || "-")}</td>
                    </tr>
                  `).join("") : `<tr><td colspan="7"><div class="empty">暂无明细</div></td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn primary" type="button" data-close>确定</button>
          </div>
        </div>
      </div>
    `;
    bindCloseButtons();
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

  function nowDateTimeText() {
    const d = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }
})();
