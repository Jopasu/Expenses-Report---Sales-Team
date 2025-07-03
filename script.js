document.addEventListener("DOMContentLoaded", () => {
  const expenseTypes = [{ label: "BUS (बस)", value: "Bus" },
  { label: "TRAIN (ट्रेन)", value: "Train" },
  { label: "FLIGHT (फ्लाइट)", value: "Flight" },
  { label: "HOTEL (होटल)", value: "Hotel" },
  { label: "FOOD (भोजन)", value: "Food" },
  { label: "CAB/AUTO (कैब/ऑटो)", value: "CabAuto" },
  { label: "BIKE/CAR (बाइक/कार)", value: "BikeCar" },
  { label: "MISC (विविध)", value: "Misc" },
  { label: "OTHERS (अन्य)", value: "Others" }];
  const today = new Date();
  const currentYearStart = new Date(today.getFullYear(), 0, 1);
  const minDateStr = currentYearStart.toISOString().split("T")[0];
  const maxDateStr = today.toISOString().split("T")[0];

  document.getElementById("empId").addEventListener("input", e => {
    document.getElementById("summary-empId").textContent = "JIPL" + e.target.value;
  });
  document.getElementById("empName").addEventListener("input", e => {
    document.getElementById("summary-empName").textContent = e.target.value;
  });
  document.getElementById("managerName").addEventListener("input", e => {
    document.getElementById("summary-manager").textContent = e.target.value;
  });

  window.fetchEmployeeDetails = function (idValue) {
    const empNameInput = document.getElementById("empName");
    const managerInput = document.getElementById("managerName");
    const numericId = idValue.replace(/\D/g, '');
    if (numericId.length >= 3) {
      fetch(`/api/employees/JIPL${numericId}`)
        .then(res => res.json())
        .then(data => {
          empNameInput.value = data.name || '';
          managerInput.value = data.manager || '';
          empNameInput.dispatchEvent(new Event("input"));
          managerInput.dispatchEvent(new Event("input"));
        })
        .catch(() => {
          empNameInput.value = '';
          managerInput.value = '';
        });
    } else {
      empNameInput.value = '';
      managerInput.value = '';
    }
  };

  window.addExpenseRow = function () {
    const container = document.getElementById('expense-entries');
    const rowId = `row-${Date.now()}`;
    const row = document.createElement('div');
    row.className = 'expense-row';
    row.id = rowId;

    row.innerHTML = `
      <label>DATE</label>
      <input type="date" id="date-${rowId}" style="max-width: 300px;" required min="${minDateStr}" max="${maxDateStr}" />
      <div class="type-heading">EXPENSE TYPES</div>
      ${expenseTypes.map(type => `
        <div class="type-option" id="${type.value}-option-${rowId}">
          <label for="${type.value}-${rowId}">${type.label}</label>
          <input type="checkbox" id="${type.value}-${rowId}" />
          <button class="bin-icon" onclick="removeExpenseType('${type.value}-option-${rowId}', '${type.value}-fields-${rowId}', '${type.value}-summary-${rowId}', '${rowId}')">🗑</button>
        </div>
        <div id="${type.value}-fields-${rowId}" class="type-fields" style="display: none;">
          <input type="number" placeholder="Amount for ${type.label}" style="max-width: 140px;" oninput="updateExpenseSummary('${type.value}-summary-${rowId}', this.value, '${rowId}')" />
          <input type="file" multiple onchange="handleFiles(this, '${type.value}-preview-${rowId}', '${type.value}-summary-${rowId}', '${rowId}')">
          <div class="file-preview" id="${type.value}-preview-${rowId}"></div>
        </div>
      `).join('')}
      <div class="button-row">
        <button type="button" onclick="removeRow('${rowId}')">🗑 REMOVE EXPENSE</button>
      </div>
    `;
    container.appendChild(row);

    expenseTypes.forEach(type => {
      const cb = document.getElementById(`${type.value}-${rowId}`);
      const fields = document.getElementById(`${type.value}-fields-${rowId}`);
      cb.addEventListener('change', () => {
        const dateVal = document.getElementById(`date-${rowId}`)?.value || "Undated";
        fields.style.display = cb.checked ? 'flex' : 'none';
        if (cb.checked) {
          window.addExpenseSummary(`${type.value}-summary-${rowId}`, type.label, 0, 0, dateVal, rowId);
        } else {
          window.removeExpenseSummary(`${type.value}-summary-${rowId}`);
        }
      });
    });
  };

  window.addExpenseSummary = function (summaryId, label, amount = 0, fileCount = 0, date, rowId) {
    const list = document.getElementById("summary-expense-list");
    const dateId = `summary-date-${date}-${rowId}`;
    let dateGroup = document.getElementById(dateId);

    if (!dateGroup) {
      dateGroup = document.createElement("li");
      dateGroup.id = dateId;
      dateGroup.innerHTML = `<strong>🗓️ ${date}</strong><ul class="date-expense-list"></ul><div class="date-total" id="total-${dateId}">Total: ₹0</div>`;
      list.appendChild(dateGroup);
    }

    const subList = dateGroup.querySelector(".date-expense-list");
    const item = document.createElement("li");
    item.id = summaryId;
    item.className = "filled";
    item.innerHTML = `
      <strong>${label}</strong>: ₹<span class="amount">${amount}</span> | 📎 <span class="files">${fileCount}</span> attachments
    `;
    subList.appendChild(item);
    updateDateTotal(dateId);
  };

  window.updateExpenseSummary = function (summaryId, amount, rowId) {
    const item = document.getElementById(summaryId);
    if (item) {
      item.querySelector(".amount").textContent = amount || 0;
    }
    const date = document.getElementById(`date-${rowId}`)?.value || "Undated";
    const dateId = `summary-date-${date}-${rowId}`;
    updateDateTotal(dateId);
  };

  window.updateAttachmentCount = function (summaryId, count) {
    const item = document.getElementById(summaryId);
    if (item) {
      item.querySelector(".files").textContent = count || 0;
    }
  };

  window.removeExpenseSummary = function (summaryId) {
    const item = document.getElementById(summaryId);
    if (item?.parentElement) {
      const dateGroup = item.closest("li[id^='summary-date-']");
      item.remove();
      updateDateTotal(dateGroup.id);
    }
  };

  function updateDateTotal(dateId) {
  const group = document.getElementById(dateId);
  if (!group) return;
  const expenses = group.querySelectorAll(".date-expense-list .amount");
  let total = 0;
  expenses.forEach(span => {
    const value = parseFloat(span.textContent) || 0;
    total += value;
  });

  const totalEl = document.getElementById(`total-${dateId}`);
  if (totalEl) {
    const currentVal = parseInt(totalEl.textContent.replace(/\D/g, '')) || 0;
    animateTotalUpdate(totalEl, currentVal, Math.round(total));
  }
}

  window.handleFiles = function (input, previewId, summaryId, rowId) {
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    const files = Array.from(input.files);
    files.forEach(file => {
      const pill = document.createElement('div');
      pill.innerHTML = `
        📎 <span>${file.name}</span>
        <button type="button" onclick="removeFile(this)">✖</button>
      `;
      preview.appendChild(pill);
    });
    window.updateAttachmentCount(summaryId, files.length);
  };

  window.removeFile = function (btn) {
    const pill = btn.parentElement;
    const preview = pill.parentElement;
    pill.remove();
    const summaryId = preview.id.replace('-preview-', '-summary-');
    const count = preview.children.length;
    window.updateAttachmentCount(summaryId, count);
  };

    window.removeRow = function (rowId) {
    document.getElementById(rowId)?.remove();
    const summaryList = document.getElementById("summary-expense-list");

    // Remove related preview items
    Array.from(summaryList.children).forEach(group => {
      if (group.id.includes(rowId)) {
        group.remove();
      }
    });
  };

  window.removeExpenseType = function (optionId, fieldId, summaryId, rowId) {
    document.getElementById(optionId)?.remove();
    document.getElementById(fieldId)?.remove();
    window.removeExpenseSummary(summaryId);
    const dateVal = document.getElementById(`date-${rowId}`)?.value || "Undated";
    const dateId = `summary-date-${dateVal}-${rowId}`;
    updateDateTotal(dateId);
  };

  window.addExpenseSummary = function (summaryId, label, amount = 0, fileCount = 0, date, rowId) {
    const list = document.getElementById("summary-expense-list");
    const dateId = `summary-date-${date}-${rowId}`;
    let dateGroup = document.getElementById(dateId);

    if (!dateGroup) {
      dateGroup = document.createElement("li");
      dateGroup.id = dateId;
      dateGroup.innerHTML = `<strong>🗓️ ${date}</strong><ul class="date-expense-list"></ul><div class="date-total" id="total-${dateId}">Total: ₹0</div>`;
      list.appendChild(dateGroup);
    }

    const subList = dateGroup.querySelector(".date-expense-list");
    const item = document.createElement("li");
    item.id = summaryId;
    item.className = "filled";
    item.innerHTML = `
      <strong>${label}</strong>: ₹<span class="amount">${amount}</span> | 📎 <span class="files">${fileCount}</span> attachments
    `;
    subList.appendChild(item);
    updateDateTotal(dateId);
  };

  window.updateExpenseSummary = function (summaryId, amount, rowId) {
    const item = document.getElementById(summaryId);
    if (item) {
      item.querySelector(".amount").textContent = amount || 0;
    }

    const dateVal = document.getElementById(`date-${rowId}`)?.value || "Undated";
    const dateId = `summary-date-${dateVal}-${rowId}`;
    updateDateTotal(dateId);
  };

  window.updateAttachmentCount = function (summaryId, count) {
    const item = document.getElementById(summaryId);
    if (item) {
      item.querySelector(".files").textContent = count || 0;
    }
  };

  window.removeExpenseSummary = function (summaryId) {
    const item = document.getElementById(summaryId);
    if (item) {
      const dateGroup = item.closest("li[id^='summary-date-']");
      item.remove();
      updateDateTotal(dateGroup?.id);
    }
  };

  function updateDateTotal(dateId) {
    const group = document.getElementById(dateId);
    if (!group) return;
    const expenses = group.querySelectorAll(".date-expense-list .amount");
    let total = 0;
    expenses.forEach(span => {
      const value = parseFloat(span.textContent) || 0;
      total += value;
    });
    const totalEl = document.getElementById(`total-${dateId}`);
    if (totalEl) totalEl.textContent = `Total: ₹${total}`;
  }

  window.handleFiles = function (input, previewId, summaryId, rowId) {
    const preview = document.getElementById(previewId);
    preview.innerHTML = '';
    const files = Array.from(input.files);
    files.forEach(file => {
      const pill = document.createElement('div');
      pill.innerHTML = `
        📎 <span>${file.name}</span>
        <button type="button" onclick="removeFile(this)">✖</button>
      `;
      preview.appendChild(pill);
    });
    window.updateAttachmentCount(summaryId, files.length);
  };

  window.removeFile = function (btn) {
    const pill = btn.parentElement;
    const preview = pill.parentElement;
    pill.remove();
    const summaryId = preview.id.replace('-preview-', '-summary-');
    const count = preview.children.length;
    window.updateAttachmentCount(summaryId, count);
  };

  document.getElementById("expense-form").addEventListener("submit", e => {
    e.preventDefault();
    document.getElementById("loader").style.display = "flex";
    setTimeout(() => {
      document.getElementById("loader").style.display = "none";
      alert("Form submitted! (Google Drive upload handled by backend)");
    }, 2000);
  });
});
function animateTotalUpdate(element, start, end, duration = 800) {
  const range = end - start;
  const stepTime = Math.abs(Math.floor(duration / range));
  let current = start;
  const increment = end > start ? 1 : -1;

  const timer = setInterval(() => {
    current += increment;
    element.textContent = `Total: ₹${current}`;
    if (current === end) clearInterval(timer);
  }, stepTime);
}