(function () {
  const instances = new Set();

  function normalizeDateInput(value) {
    const match = String(value || "").trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (!match) {
      return "";
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
      return "";
    }
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function normalizeTimeInput(value) {
    const match = String(value || "").trim().match(/(?:^|[ T])(\d{1,2}):(\d{1,2})(?::\d{1,2})?/);
    if (!match) {
      return "";
    }
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return "";
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  function normalizeDateTimeInput(value, fallbackTime) {
    const dateText = normalizeDateInput(value);
    if (!dateText) {
      return "";
    }
    const timeText = normalizeTimeInput(value) || normalizeTimeInput(fallbackTime) || "00:00";
    return `${dateText}T${timeText}`;
  }

  function parsePickerDateValue(value) {
    const normalized = normalizeDateInput(value);
    if (!normalized) {
      return null;
    }
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) {
      return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const date = new Date(year, month, day);
    if (
      Number.isNaN(date.getTime()) ||
      date.getFullYear() !== year ||
      date.getMonth() !== month ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  function formatDateTag(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function formatDateTimeTag(date) {
    return `${formatDateTag(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function shiftDate(date, days) {
    const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    next.setDate(next.getDate() + days);
    return next;
  }

  function closeDetachedInstances() {
    for (const instance of Array.from(instances)) {
      if (!(instance.field instanceof HTMLElement) || !document.documentElement.contains(instance.field)) {
        instances.delete(instance);
      }
    }
  }

  function closeAllExcept(activeInstance) {
    closeDetachedInstances();
    for (const instance of instances) {
      if (instance !== activeInstance) {
        instance.close();
      }
    }
  }

  function ensureTriggerButton(field) {
    let button = field.querySelector(".date-trigger-button");
    if (button instanceof HTMLButtonElement) {
      return button;
    }
    button = document.createElement("button");
    button.type = "button";
    button.className = "date-trigger-button";
    button.setAttribute("aria-label", "选择日期");
    field.appendChild(button);
    return button;
  }

  function ensurePanel(field, includeTime) {
    let panel = field.querySelector(".date-panel");
    if (!(panel instanceof HTMLElement)) {
      panel = document.createElement("div");
      panel.className = "date-panel hidden";
      panel.innerHTML = [
        '<div class="date-panel-head">',
        '<button class="date-nav-btn" type="button" data-role="prev" aria-label="上一个月">‹</button>',
        '<div class="date-panel-title" data-role="month"></div>',
        '<button class="date-nav-btn" type="button" data-role="next" aria-label="下一个月">›</button>',
        "</div>",
        '<div class="date-weekdays"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>',
        '<div class="date-days" data-role="days"></div>',
        includeTime ? '<div class="date-time-row"><label>时间</label><input class="date-time-input" type="time" step="60" data-role="time" /></div>' : "",
        '<div class="date-panel-foot"><button class="text-btn" type="button" data-role="clear">清空</button><button class="text-btn" type="button" data-role="today">今天</button></div>',
      ].join("");
      field.appendChild(panel);
    }
    return {
      panel,
      monthLabel: panel.querySelector('[data-role="month"]'),
      days: panel.querySelector('[data-role="days"]'),
      prevBtn: panel.querySelector('[data-role="prev"]'),
      nextBtn: panel.querySelector('[data-role="next"]'),
      clearBtn: panel.querySelector('[data-role="clear"]'),
      todayBtn: panel.querySelector('[data-role="today"]'),
      timeInput: panel.querySelector('[data-role="time"]'),
    };
  }

  function positionDatePanel(field, panel) {
    if (!(field instanceof HTMLElement) || !(panel instanceof HTMLElement)) {
      return;
    }
    const rect = field.getBoundingClientRect();
    const gap = 6;
    const margin = 8;
    const viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const width = panel.classList.contains("has-time") || field.classList.contains("has-time") ? 260 : 236;
    const naturalHeight = Math.ceil(panel.scrollHeight || panel.offsetHeight || 0);
    const maxHeight = Math.min(naturalHeight || viewportHeight - margin * 2, viewportHeight - margin * 2);
    const availableBelow = viewportHeight - rect.bottom - margin;
    const availableAbove = rect.top - margin;
    let top;
    if (availableBelow >= maxHeight) {
      top = rect.bottom + gap;
    } else if (availableAbove >= maxHeight) {
      top = rect.top - maxHeight - gap;
    } else {
      top = Math.min(Math.max(margin, rect.bottom + gap), viewportHeight - maxHeight - margin);
    }
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - width - margin));

    panel.style.position = "fixed";
    panel.style.left = `${left}px`;
    panel.style.right = "auto";
    panel.style.top = `${top}px`;
    panel.style.bottom = "auto";
    panel.style.width = `${width}px`;
    panel.style.maxHeight = `${maxHeight}px`;
    panel.style.overflowY = naturalHeight > maxHeight ? "auto" : "";
  }

  function resetDatePanelPosition(panel) {
    if (!(panel instanceof HTMLElement)) {
      return;
    }
    panel.style.position = "";
    panel.style.left = "";
    panel.style.right = "";
    panel.style.top = "";
    panel.style.bottom = "";
    panel.style.width = "";
    panel.style.maxHeight = "";
    panel.style.overflowY = "";
  }

  function attach(config) {
    const field = config?.field;
    const displayInput = config?.displayInput;
    const valueInput = config?.valueInput;
    if (!(field instanceof HTMLElement) || !(displayInput instanceof HTMLInputElement) || !(valueInput instanceof HTMLInputElement)) {
      return null;
    }

    if (field.dataset.compactDatePickerBound === "1") {
      return field.__compactDatePickerInstance || null;
    }

    const includeTime = Boolean(config?.includeTime || config?.mode === "datetime");
    field.dataset.compactDatePickerBound = "1";
    field.classList.toggle("has-time", includeTime);
    displayInput.readOnly = true;

    const triggerButton = ensureTriggerButton(field);
    const panelRefs = ensurePanel(field, includeTime);
    let panelMonth = null;

    function syncTimeInput(value = valueInput.value) {
      if (!includeTime || !(panelRefs.timeInput instanceof HTMLInputElement)) {
        return;
      }
      panelRefs.timeInput.value = normalizeTimeInput(value) || "00:00";
    }

    function sync() {
      if (includeTime) {
        const normalized = normalizeDateTimeInput(valueInput.value);
        displayInput.value = normalized ? normalized.replace("T", " ") : "";
        syncTimeInput(normalized);
      } else {
        displayInput.value = normalizeDateInput(valueInput.value) || "";
      }
      field.classList.toggle("has-value", Boolean(displayInput.value));
    }

    function render() {
      if (!(panelRefs.monthLabel instanceof HTMLElement) || !(panelRefs.days instanceof HTMLElement)) {
        return;
      }
      const selectedText = normalizeDateInput(valueInput.value);
      const selectedDate = parsePickerDateValue(selectedText);
      const monthBase =
        panelMonth instanceof Date && !Number.isNaN(panelMonth.getTime())
          ? panelMonth
          : selectedDate || new Date();
      const currentMonth = new Date(monthBase.getFullYear(), monthBase.getMonth(), 1);
      const firstWeekday = (currentMonth.getDay() + 6) % 7;
      const gridStart = shiftDate(currentMonth, -firstWeekday);
      const monthLastDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
      const lastWeekday = (monthLastDate.getDay() + 6) % 7;
      const visibleCount = firstWeekday + monthLastDate.getDate() + (6 - lastWeekday);
      const totalCells = visibleCount <= 35 ? 35 : 42;
      const todayText = formatDateTag(new Date());

      panelRefs.monthLabel.textContent = `${currentMonth.getFullYear()}年${String(currentMonth.getMonth() + 1).padStart(2, "0")}月`;
      panelRefs.days.innerHTML = "";

      for (let index = 0; index < totalCells; index += 1) {
        const date = shiftDate(gridStart, index);
        const dateText = formatDateTag(date);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "date-day-btn";
        if (date.getMonth() !== currentMonth.getMonth()) {
          button.classList.add("is-outside");
        }
        if (dateText === todayText) {
          button.classList.add("is-today");
        }
        if (dateText === selectedText) {
          button.classList.add("is-selected");
        }
        button.textContent = String(date.getDate());
        button.addEventListener("click", (event) => {
          event.preventDefault();
          setValue(dateText);
          if (!includeTime) {
            close();
          }
        });
        panelRefs.days.appendChild(button);
      }
    }

    function open() {
      closeAllExcept(instance);
      syncTimeInput();
      const selected = parsePickerDateValue(valueInput.value) || new Date();
      panelMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
      render();
      panelRefs.panel.classList.remove("hidden");
      field.classList.add("is-open");
      positionDatePanel(field, panelRefs.panel);
    }

    function close() {
      panelRefs.panel.classList.add("hidden");
      field.classList.remove("is-open");
      resetDatePanelPosition(panelRefs.panel);
    }

    function setValue(value) {
      if (includeTime) {
        const timeText =
          normalizeTimeInput(value) ||
          (panelRefs.timeInput instanceof HTMLInputElement ? normalizeTimeInput(panelRefs.timeInput.value) : "") ||
          normalizeTimeInput(valueInput.value) ||
          "00:00";
        valueInput.value = normalizeDateTimeInput(value, timeText);
      } else {
        valueInput.value = normalizeDateInput(value);
      }
      sync();
      if (typeof config?.onChange === "function") {
        config.onChange(valueInput.value);
      }
    }

    function getValue() {
      return includeTime ? normalizeDateTimeInput(valueInput.value) : normalizeDateInput(valueInput.value);
    }

    function shiftMonth(step) {
      const base =
        panelMonth instanceof Date && !Number.isNaN(panelMonth.getTime())
          ? panelMonth
          : parsePickerDateValue(valueInput.value) || new Date();
      panelMonth = new Date(base.getFullYear(), base.getMonth() + step, 1);
      render();
      if (!panelRefs.panel.classList.contains("hidden")) {
        positionDatePanel(field, panelRefs.panel);
      }
    }

    const triggerOpen = (event) => {
      event?.preventDefault();
      open();
    };

    triggerButton.addEventListener("click", triggerOpen);
    triggerButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        open();
      }
    });

    displayInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
        event.preventDefault();
        open();
      }
    });

    panelRefs.prevBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      shiftMonth(-1);
    });

    panelRefs.nextBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      shiftMonth(1);
    });

    panelRefs.todayBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      const today = new Date();
      setValue(includeTime ? formatDateTimeTag(today) : formatDateTag(today));
      close();
    });

    panelRefs.clearBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      setValue("");
      close();
    });

    panelRefs.timeInput?.addEventListener("input", () => {
      const dateText = normalizeDateInput(valueInput.value);
      if (!dateText) {
        return;
      }
      setValue(`${dateText}T${normalizeTimeInput(panelRefs.timeInput.value) || "00:00"}`);
    });

    const instance = {
      field,
      displayInput,
      valueInput,
      open,
      close,
      sync,
      render,
      setValue,
      getValue,
    };

    field.__compactDatePickerInstance = instance;
    instances.add(instance);
    sync();
    return instance;
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) {
      return;
    }
    closeDetachedInstances();
    for (const instance of instances) {
      if (!instance.field.contains(event.target)) {
        instance.close();
      }
    }
  });

  window.CompactDatePicker = {
    attach,
    normalizeDateInput,
    parsePickerDateValue,
    formatDateTag,
    normalizeDateTimeInput,
  };
})();
