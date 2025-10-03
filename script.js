const firebaseConfig = {
  apiKey: "AIzaSyBG87TpDWEPzjuJ4rQVQT92ITXdo4FTqbQ",
  authDomain: "loanmanager-caa23.firebaseapp.com",
  projectId: "loanmanager-caa23",
  storageBucket: "loanmanager-caa23.firebasestorage.app",
  messagingSenderId: "256544208599",
  appId: "1:256544208599:web:18de9e46a8f77f620aa292",
  measurementId: "G-QW0EKBYEBS",
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global namespace for functions that need to be shared between scripts
window.allCustomers = { active: [], settled: [] };
window.processProfitData = (allCusts) => {
  const data = [];
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  [...allCusts.active, ...allCusts.settled].forEach((customer) => {
    if (customer.loanDetails && customer.emiSchedule) {
      customer.emiSchedule.forEach((emi) => {
        if (emi.status === "Paid" && new Date(emi.dueDate) <= today) {
          data.push({ date: emi.dueDate, profit: emi.interestComponent });
        }
      });
    }
  });
  return data;
};

document.addEventListener("DOMContentLoaded", () => {
  let recentActivities = [];
  let currentUser = null;

  const getEl = (id) => document.getElementById(id);
  const showToast = (type, title, message) => {
    const toastContainer = getEl("toast-container");
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
    };
    toast.innerHTML = `<i class="fas ${icons[type]} toast-icon"></i><div><div class="toast-title">${title}</div><div class="toast-message">${message}</div></div><button class="toast-close" onclick="this.parentElement.remove()">&times;</button>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("hide");
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  };
  const toggleButtonLoading = (btn, isLoading, text = "Loading...") => {
    if (!btn) return;
    const spinner = btn.querySelector(".loading-spinner");
    const btnText = btn.querySelector(
      "span:not(.loading-spinner), .btn-text-desktop"
    );
    if (btnText && !btnText.dataset.originalText) {
      btnText.dataset.originalText = btnText.textContent;
    }
    btn.disabled = isLoading;
    if (spinner) spinner.classList.toggle("hidden", !isLoading);
    if (btnText) {
      btnText.textContent = isLoading ? text : btnText.dataset.originalText;
    }
  };
  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const calculateEMI = (p, r, n) => {
    if (p <= 0 || r < 0 || n <= 0) return 0;
    const monthlyRate = r / 12 / 100;
    if (monthlyRate === 0) return +(p / n).toFixed(2);
    const emi =
      (p * monthlyRate * Math.pow(1 + monthlyRate, n)) /
      (Math.pow(1 + monthlyRate, n) - 1);
    return +emi.toFixed(2);
  };
  const generateAmortizationSchedule = (p, r, n, startDate) => {
    const emi = calculateEMI(p, r, n);
    const schedule = [];
    let balance = p;
    const monthlyRate = r / 12 / 100;
    let currentDate = new Date(startDate);
    for (let i = 1; i <= n; i++) {
      const interest = +(balance * monthlyRate).toFixed(2);
      let principal = +(emi - interest).toFixed(2);
      if (i === n || balance - principal < 0.01)
        principal = +balance.toFixed(2);
      balance = +(balance - principal).toFixed(2);
      const dueDate = new Date(currentDate);
      dueDate.setMonth(dueDate.getMonth() + 1);
      if (dueDate.getDate() < currentDate.getDate()) dueDate.setDate(0);
      currentDate = new Date(dueDate);
      schedule.push({
        month: i,
        dueDate: dueDate.toISOString().split("T")[0],
        emi: i === n ? +(principal + interest).toFixed(2) : emi,
        principalComponent: principal,
        interestComponent: interest,
        remainingBalance: balance < 0.01 ? 0 : balance,
        status: "Due",
      });
    }
    return schedule;
  };
  const showConfirmation = (title, message, onConfirm) => {
    getEl("confirmation-title").textContent = title;
    getEl("confirmation-message").textContent = message;
    getEl("confirmation-modal").classList.add("show");
    const confirmBtn = getEl("confirmation-confirm-btn");
    const cancelBtn = getEl("confirmation-cancel-btn");
    const confirmHandler = () => {
      onConfirm();
      cleanup();
    };
    const cancelHandler = () => cleanup();
    const cleanup = () => {
      getEl("confirmation-modal").classList.remove("show");
      confirmBtn.removeEventListener("click", confirmHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
    };
    confirmBtn.addEventListener("click", confirmHandler, { once: true });
    cancelBtn.addEventListener("click", cancelHandler, { once: true });
  };
  const logActivity = async (type, details) => {
    if (!currentUser) return;
    try {
      await db.collection("activities").add({
        owner_uid: currentUser.uid,
        type: type,
        details: details,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  // The old setTheme function has been removed. theme-switcher.js now handles this.

  const calculateKeyStats = (activeLoans, settledLoans) => {
    const validActive = activeLoans.filter((c) => c.loanDetails);
    const validSettled = settledLoans.filter((c) => c.loanDetails);
    let totalPrincipal = 0,
      totalOutstanding = 0,
      totalInterest = 0;
    validActive.forEach((c) => {
      totalPrincipal += c.loanDetails.principal;
      const paid = c.emiSchedule.filter((e) => e.status === "Paid");
      totalOutstanding +=
        paid.length > 0
          ? paid[paid.length - 1].remainingBalance
          : c.loanDetails.principal;
      totalInterest += paid.reduce((s, e) => s + (e.interestComponent || 0), 0);
    });
    settledLoans.forEach((c) => {
      if (c.loanDetails) {
        totalPrincipal += c.loanDetails.principal;
        totalInterest += c.emiSchedule.reduce(
          (s, e) => s + (e.interestComponent || 0),
          0
        );
      }
    });
    return {
      activeLoanCount: validActive.length,
      settledLoanCount: validSettled.length,
      totalPrincipal,
      totalOutstanding,
      totalInterest,
    };
  };
  const updateSidebarStats = (stats) => {
    getEl("sidebar-active-loans").textContent = stats.activeLoanCount;
    getEl("sidebar-settled-loans").textContent = stats.settledLoanCount;
    getEl("sidebar-interest-earned").textContent = formatCurrency(
      stats.totalInterest
    );
    getEl("sidebar-outstanding").textContent = formatCurrency(
      stats.totalOutstanding
    );
  };

  const loadAndRenderAll = async () => {
    if (!currentUser) return;
    try {
      const [activeSnapshot, settledSnapshot, activitiesSnapshot] =
        await Promise.all([
          db
            .collection("customers")
            .where("owner", "==", currentUser.uid)
            .where("status", "==", "active")
            .orderBy("createdAt", "desc")
            .get(),
          db
            .collection("customers")
            .where("owner", "==", currentUser.uid)
            .where("status", "==", "settled")
            .orderBy("createdAt", "desc")
            .get(),
          db
            .collection("activities")
            .where("owner_uid", "==", currentUser.uid)
            .orderBy("timestamp", "desc")
            .limit(10)
            .get(),
        ]);
      window.allCustomers.active = activeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      window.allCustomers.settled = settledSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      recentActivities = activitiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const stats = calculateKeyStats(
        window.allCustomers.active,
        window.allCustomers.settled
      );
      populatePageContent(stats);
      updateSidebarStats(stats);
      const profitData = window.processProfitData(window.allCustomers);
      if (typeof renderDashboardCharts === "function")
        renderDashboardCharts(
          window.allCustomers.active,
          window.allCustomers.settled,
          profitData
        );
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("error", "Load Failed", "Could not fetch all required data.");
    }
  };

  const populatePageContent = (stats) => {
    getEl(
      "dashboard-section"
    ).innerHTML = `<div class="stats-container"><div class="stat-card"><div class="stat-title">Total Principal</div><div class="stat-value">${formatCurrency(
      stats.totalPrincipal
    )}</div></div><div class="stat-card"><div class="stat-title">Outstanding</div><div class="stat-value">${formatCurrency(
      stats.totalOutstanding
    )}</div></div><div class="stat-card"><div class="stat-title">Interest Earned</div><div class="stat-value">${formatCurrency(
      stats.totalInterest
    )}</div></div><div class="stat-card"><div class="stat-title">Active Loans</div><div class="stat-value">${
      stats.activeLoanCount
    }</div></div></div><div class="dashboard-grid"><div class="form-card chart-card"><h3 >Portfolio Overview</h3><div class="chart-container"><canvas id="portfolioChart"></canvas></div></div><div class="form-card chart-card grid-col-span-2"><h3 >Profit Over Time <div class="chart-controls" id="profit-chart-controls"><button class="btn btn-sm btn-outline active" data-frame="monthly">Month</button><button class="btn btn-sm btn-outline" data-frame="yearly">Year</button></div></h3><div class="chart-container"><canvas id="profitChart"></canvas></div></div><div class="form-card"><h3><i class="fas fa-clock" style="color:var(--primary)"></i> Upcoming EMIs</h3><div id="upcoming-emi-container" class="activity-container"></div></div><div class="form-card"><h3><i class="fas fa-exclamation-triangle" style="color:var(--danger)"></i> Overdue EMIs</h3><div id="overdue-emi-container" class="activity-container"></div></div><div class="form-card"><h3><i class="fas fa-history"></i> Recent Activity <button class="btn btn-danger btn-sm" id="clear-all-activities-btn" title="Clear all activities"><i class="fas fa-trash"></i></button></h3><div id="recent-activity-container" class="activity-container"></div></div></div>`;
    getEl(
      "calculator-section"
    ).innerHTML = `<div class="form-card"><h3><i class="fas fa-calculator"></i> EMI Calculator</h3><form id="emi-calculator-form"><div class="form-group"><label for="calc-principal">Loan Amount (₹)</label><input type="number" id="calc-principal" class="form-control" placeholder="e.g., 50000" required /></div><div class="form-row"><div class="form-group"><label for="calc-rate">Annual Interest Rate (%)</label><input type="number" id="calc-rate" class="form-control" placeholder="e.g., 12.5" step="0.01" required /></div><div class="form-group"><label for="calc-tenure">Tenure (Months)</label><input type="number" id="calc-tenure" class="form-control" placeholder="e.g., 24" required /></div></div><button type="submit" class="btn btn-primary">Calculate</button></form><div id="calculator-results" class="hidden" style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;"><h4>Calculation Result</h4><div class="calc-result-item"><span>Monthly EMI</span><span id="result-emi"></span></div><div class="calc-result-item"><span>Total Interest</span><span id="result-interest"></span></div><div class="calc-result-item"><span>Total Payment</span><span id="result-total"></span></div></div></div>`;
    getEl("settings-section").innerHTML = `<div class="settings-grid">
        <div class="form-card setting-card">
            <div class="setting-card-header">
                <i class="fas fa-shield-alt"></i>
                <h3>Security</h3>
            </div>
            <div class="setting-card-body">
                <p class="setting-description">Manage your account security settings.</p>
                <form id="change-password-form">
                    <div class="form-group">
                        <label for="current-password">Current Password</label>
                        <input type="password" id="current-password" class="form-control" required/>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="new-password">New Password</label>
                            <input type="password" id="new-password" class="form-control" required/>
                        </div>
                        <div class="form-group">
                            <label for="confirm-password">Confirm New Password</label>
                            <input type="password" id="confirm-password" class="form-control" required/>
                        </div>
                    </div>
                    <button id="change-password-btn" type="submit" class="btn btn-primary">
                        <span class="loading-spinner hidden"></span>
                        <span>Update Password</span>
                    </button>
                </form>
            </div>
        </div>

        <div class="form-card setting-card">
            <div class="setting-card-header">
                <i class="fas fa-palette"></i>
                <h3>Appearance</h3>
            </div>
            <div class="setting-card-body">
                <p class="setting-description">Customize the look and feel of the application.</p>
                <div class="setting-item">
                    <div class="setting-label">
                        <i class="fas fa-moon"></i>
                        <span>Dark Mode</span>
                    </div>
                    <div class="setting-control">
                        <label class="switch">
                            <input type="checkbox" id="dark-mode-toggle" />
                            <span class="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>
        </div>

        <div class="form-card setting-card">
            <div class="setting-card-header">
                <i class="fas fa-database"></i>
                <h3>Data Management</h3>
            </div>
            <div class="setting-card-body">
                <p class="setting-description">Backup your data or restore from a file.</p>
                <div class="setting-item">
                    <div class="setting-label">
                        <i class="fas fa-download"></i>
                        <span>Export Data</span>
                    </div>
                    <div class="setting-control">
                        <button class="btn btn-outline" id="export-backup-btn">Download Backup</button>
                    </div>
                </div>
                <hr class="form-hr">
                <div class="setting-item column">
                     <div class="setting-label">
                        <i class="fas fa-upload"></i>
                        <span>Import Data</span>
                    </div>
                    <div class="import-controls">
                        <input type="file" id="import-backup-input" accept=".json" class="hidden">
                        <label for="import-backup-input" class="btn btn-outline">
                            <i class="fas fa-file-import"></i> Choose File
                        </label>
                        <span id="file-name-display" class="file-name">No file chosen</span>
                    </div>
                     <p class="warning-text"><i class="fas fa-exclamation-triangle"></i> This will overwrite all current data.</p>
                    <button class="btn btn-danger" id="import-backup-btn">Import & Overwrite</button>
                </div>
            </div>
        </div>

        <div class="form-card setting-card">
            <div class="setting-card-header">
                <i class="fas fa-user-cog"></i>
                <h3>Account</h3>
            </div>
            <div class="setting-card-body">
                 <p class="setting-description">Log out from your current session.</p>
                <div class="setting-item">
                   <div class="setting-label">
                        <i class="fas fa-sign-out-alt"></i>
                        <span>Logout</span>
                    </div>
                    <div class="setting-control">
                        <button class="btn btn-outline" id="logout-settings-btn">Logout Now</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    populateCustomerLists();
    populateTodaysCollection();
    renderUpcomingAndOverdueEmis(window.allCustomers.active);
    renderActivityLog();
  };
  const renderActivityLog = () => {
    const container = getEl("recent-activity-container");
    if (!container) return;
    if (!recentActivities || recentActivities.length === 0) {
      container.innerHTML = `<ul class="activity-list"><li class="activity-item" style="cursor:default;">No recent activities found.</li></ul>`;
      return;
    }
    const activityHTML = recentActivities
      .map((act) => {
        let icon = "fa-info-circle";
        let text = "New activity";
        const customerName = act.details.customerName
          ? `<strong>${act.details.customerName}</strong>`
          : "";
        const amount = act.details.amount
          ? formatCurrency(act.details.amount)
          : "";
        switch (act.type) {
          case "NEW_LOAN":
            icon = "fa-user-plus text-success";
            text = `New loan for ${customerName} of ${amount}`;
            break;
          case "EMI_PAID":
            icon = "fa-check-circle text-success";
            text = `EMI paid by ${customerName} of ${amount}`;
            break;
          case "LOAN_SETTLED":
            icon = "fa-flag-checkered text-primary";
            text = `Loan settled for ${customerName}`;
            break;
          case "LOAN_REFINANCED":
            icon = "fa-sync-alt text-warning";
            text = `Loan for ${customerName} refinanced to ${amount}`;
            break;
        }
        const timestamp = act.timestamp
          ? new Date(act.timestamp.seconds * 1000).toLocaleString()
          : "Just now";
        return `<li class="activity-item" id="activity-${act.id}"><div class="activity-info"><i class="fas ${icon} activity-icon"></i><div class="activity-text"><span class="activity-name">${text}</span><span class="activity-date">${timestamp}</span></div></div><div class="activity-actions"><button class="delete-activity-btn" data-id="${act.id}" title="Delete Activity"><i class="fas fa-trash-alt"></i></button></div></li>`;
      })
      .join("");
    container.innerHTML = `<ul class="activity-list">${activityHTML}</ul>`;
  };
  const populateCustomerLists = () => {
    const renderList = (element, data, type) => {
      if (!element) return;
      element.innerHTML = "";
      if (data.length === 0) {
        element.innerHTML = `<li class="activity-item" style="cursor:default; justify-content:center;"><p>No customers found.</p></li>`;
        return;
      }
      data.forEach((c) => {
        const li = document.createElement("li");
        li.className = "customer-item";
        const detailsHtml =
          c.status === "settled"
            ? `<span>Principal: ${formatCurrency(
                c.loanDetails.principal
              )}</span><span class="list-profit-display success">Interest: ${formatCurrency(
                c.emiSchedule.reduce(
                  (s, e) => s + (e.interestComponent || 0),
                  0
                )
              )}</span>`
            : `<span>EMI: ${formatCurrency(
                c.loanDetails.emiAmount
              )}</span><span>Paid: ${
                c.emiSchedule.filter((e) => e.status === "Paid").length
              }/${c.emiSchedule.length}</span>`;
        const deleteButton =
          type === "settled"
            ? `<button class="btn btn-danger btn-sm delete-customer-btn" data-id="${c.id}" title="Delete Customer"><i class="fas fa-trash-alt"></i></button>`
            : "";
        li.innerHTML = `<div class="customer-info" data-id="${c.id}"><div class="customer-name">${c.name}</div><div class="customer-details">${detailsHtml}</div></div><div class="customer-actions">${deleteButton}<span class="view-details-prompt" data-id="${c.id}">View Details</span></div>`;
        element.appendChild(li);
      });
    };
    getEl(
      "active-accounts-section"
    ).innerHTML = `<div class="form-card"><div class="card-header"><h3>Active Accounts (${window.allCustomers.active.length})</h3><button class="btn btn-outline" id="export-active-btn"><i class="fas fa-file-excel"></i> Export to Excel</button></div><div class="form-group"><input type="text" id="search-customers" class="form-control" placeholder="Search active customers..." /></div><ul id="customers-list" class="customer-list"></ul></div>`;
    renderList(getEl("customers-list"), window.allCustomers.active, "active");
    getEl(
      "settled-accounts-section"
    ).innerHTML = `<div class="form-card"><div class="card-header"><h3>Settled Accounts (${window.allCustomers.settled.length})</h3><button class="btn btn-outline" id="export-settled-btn"><i class="fas fa-file-excel"></i> Export to Excel</button></div><ul id="settled-customers-list" class="customer-list"></ul></div>`;
    renderList(
      getEl("settled-customers-list"),
      window.allCustomers.settled,
      "settled"
    );
  };
  const renderUpcomingAndOverdueEmis = (activeLoans) => {
    const upcomingContainer = getEl("upcoming-emi-container");
    const overdueContainer = getEl("overdue-emi-container");
    if (!upcomingContainer || !overdueContainer) return;
    let upcoming = [],
      overdue = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    activeLoans
      .filter((c) => c.loanDetails)
      .forEach((customer) => {
        const nextDueEmi = customer.emiSchedule.find((e) => e.status === "Due");
        if (nextDueEmi) {
          const dueDate = new Date(nextDueEmi.dueDate);
          const entry = {
            name: customer.name,
            amount: nextDueEmi.emi,
            date: nextDueEmi.dueDate,
            customerId: customer.id,
          };
          if (dueDate < today) overdue.push(entry);
          else upcoming.push(entry);
        }
      });
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    overdue.sort((a, b) => new Date(a.date) - new Date(b.date));
    const renderEmiList = (items) => {
      if (items.length === 0)
        return `<ul class="activity-list"><li class="activity-item" style="cursor:default; justify-content:center;">No EMIs found.</li></ul>`;
      return `<ul class="activity-list">${items
        .slice(0, 5)
        .map(
          (item) =>
            `<li class="activity-item" data-id="${
              item.customerId
            }"><div class="activity-info"><span class="activity-name">${
              item.name
            }</span><span class="activity-date">${
              item.date
            }</span></div><div class="activity-value"><span class="activity-amount">${formatCurrency(
              item.amount
            )}</span></div></li>`
        )
        .join("")}</ul>`;
    };
    upcomingContainer.innerHTML = renderEmiList(upcoming);
    overdueContainer.innerHTML = renderEmiList(overdue);
  };
  const populateTodaysCollection = () => {
    const container = getEl("todays-collection-section");
    if (!container) return;
    const today = new Date().toISOString().split("T")[0];
    const dueToday = window.allCustomers.active
      .map((cust) => {
        const dueEmi = cust.emiSchedule.find(
          (emi) => emi.dueDate === today && emi.status === "Due"
        );
        return dueEmi ? { ...cust, dueEmi } : null;
      })
      .filter(Boolean);
    const totalDue = dueToday.reduce((sum, item) => sum + item.dueEmi.emi, 0);
    let listHtml = "";
    if (dueToday.length > 0) {
      listHtml = dueToday
        .map(
          (item) =>
            `<li class="activity-item" data-id="${
              item.id
            }"><div class="activity-info"><span class="activity-name">${
              item.name
            }</span><span class="activity-details">EMI #${
              item.dueEmi.month
            }</span></div><div class="activity-value"><span class="activity-amount">${formatCurrency(
              item.dueEmi.emi
            )}</span></div></li>`
        )
        .join("");
    } else {
      listHtml = `<li class="activity-item" style="cursor:default; justify-content:center;">No collections due today.</li>`;
    }
    container.innerHTML = `<div class="form-card"><div class="card-header"><h3>Due Today (${
      dueToday.length
    })</h3><div class="stat-card" style="padding: 0.5rem 1rem; text-align: right;"><div class="stat-title">Total Due Today</div><div class="stat-value" style="font-size: 1.5rem;">${formatCurrency(
      totalDue
    )}</div></div></div><ul class="activity-list">${listHtml}</ul></div>`;
  };
  const showCustomerDetails = (customerId) => {
    const customer = [
      ...window.allCustomers.active,
      ...window.allCustomers.settled,
    ].find((c) => c.id === customerId);
    if (!customer) return;
    const modalBody = getEl("details-modal-body");
    getEl("details-modal-title").textContent = `Loan Details: ${customer.name}`;
    if (!customer.loanDetails || !customer.emiSchedule) {
      modalBody.innerHTML = `<p style="padding: 2rem; text-align: center;">This customer uses an outdated data format.</p>`;
      getEl("customer-details-modal").classList.add("show");
      return;
    }
    const { emiSchedule: schedule, loanDetails: details } = customer;
    const paidEmis = schedule.filter((e) => e.status === "Paid");
    const totalPaid = paidEmis.reduce((sum, emi) => sum + emi.emi, 0);
    const remainingToCollect = schedule
      .filter((e) => e.status !== "Paid")
      .reduce((sum, emi) => sum + emi.emi, 0);
    const progress = (paidEmis.length / schedule.length) * 100;
    const outstanding =
      paidEmis.length > 0
        ? paidEmis[paidEmis.length - 1].remainingBalance
        : details.principal;
    const nextDueEmi = schedule.find((e) => e.status === "Due");
    const totalInterestPaid = paidEmis.reduce(
      (sum, emi) => sum + emi.interestComponent,
      0
    );
    const settleButton =
      customer.status === "active"
        ? `<button class="btn btn-success" id="settle-loan-btn" data-id="${customer.id}"><i class="fas fa-check-circle"></i> Settle Loan</button>`
        : "";
    const hasHistory = customer.history && customer.history.length > 0;
    const historyButton = `<button class="btn btn-outline" id="view-history-btn" data-id="${
      customer.id
    }" ${!hasHistory ? "disabled" : ""}><i class="fas fa-history"></i> ${
      hasHistory ? "View History" : "No History"
    }</button>`;
    modalBody.innerHTML = `<div class="details-view-grid"><div class="customer-profile-panel"><div class="profile-header"><div class="profile-avatar">${customer.name
      .charAt(0)
      .toUpperCase()}</div><h3 class="profile-name">${
      customer.name
    }</h3><p class="profile-contact">${
      customer.phone || "N/A"
    }</p></div><div class="profile-section"><h4>Personal Details</h4><div class="profile-stat"><span class="label">Father's Name</span><span class="value">${
      customer.fatherName || "N/A"
    }</span></div><div class="profile-stat"><span class="label">Address</span><span class="value">${
      customer.address || "N/A"
    }</span></div></div><div class="profile-section"><h4>KYC Details</h4><div class="profile-stat"><span class="label">Aadhar</span><span class="value">${
      customer.aadhar || "N/A"
    }</span></div><div class="profile-stat"><span class="label">PAN</span><span class="value">${
      customer.pan || "N/A"
    }</span></div></div><div class="loan-progress-section"><h4>Loan Progress (${
      paidEmis.length
    } of ${
      schedule.length
    } Paid)</h4><div class="progress-bar"><div class="progress-bar-inner" style="width: ${progress}%;"></div></div></div><div class="loan-actions"><button class="btn btn-outline" id="edit-customer-info-btn" data-id="${
      customer.id
    }"><i class="fas fa-edit"></i> Edit Info</button>${
      customer.status === "active"
        ? `<button class="btn btn-primary" id="refinance-loan-btn" data-id="${customer.id}"><i class="fas fa-plus-circle"></i> Refinance</button>`
        : ""
    }${settleButton}${historyButton}</div></div><div class="emi-schedule-panel"><div class="emi-table-container"><table class="emi-table"><thead><tr><th>#</th><th>Due Date</th><th>Amount</th><th>Status</th><th class="no-pdf">Action</th></tr></thead><tbody id="emi-schedule-body-details"></tbody></table></div><div class="loan-summary-box"><h4>Loan Summary</h4><div class="calc-result-item"><span>Principal Amount</span><span>${formatCurrency(
      details.principal
    )}</span></div><div class="calc-result-item"><span>Total Interest Paid</span><span>${formatCurrency(
      totalInterestPaid
    )}</span></div><div class="calc-result-item"><span>Outstanding Balance</span><span>${formatCurrency(
      outstanding
    )}</span></div><div class="calc-result-item"><span>Next EMI Due</span><span>${
      nextDueEmi ? nextDueEmi.dueDate : "N/A"
    }</span></div></div><div class="modal-summary-stats"><div class="summary-stat-item"><span class="label">Amount Received</span><span class="value received">${formatCurrency(
      totalPaid
    )}</span></div><div class="summary-stat-item"><span class="label">Amount Remaining</span><span class="value remaining">${formatCurrency(
      remainingToCollect
    )}</span></div></div></div></div>`;
    const emiTableBody = modalBody.querySelector("#emi-schedule-body-details");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    schedule.forEach((emi) => {
      const tr = document.createElement("tr");
      if (emi.status === "Paid") tr.classList.add("emi-paid-row");
      const isOverdue = new Date(emi.dueDate) < today && emi.status === "Due";
      const statusClass = isOverdue ? "overdue" : emi.status.toLowerCase();
      const statusText = isOverdue ? "OVERDUE" : emi.status.toUpperCase();
      tr.innerHTML = `<td>${emi.month}</td><td>${
        emi.dueDate
      }</td><td>${formatCurrency(
        emi.emi
      )}</td><td><span class="emi-status status-${statusClass}">${statusText}</span></td><td class="no-pdf">${
        customer.status === "active" && emi.status === "Due"
          ? `<button class="btn btn-success btn-sm emi-pay-btn" data-month="${emi.month}" data-id="${customer.id}">Paid</button>`
          : ""
      }${
        customer.status === "active" && emi.status === "Paid"
          ? `<button class="btn btn-outline btn-sm emi-pay-btn" data-month="${emi.month}" data-id="${customer.id}">Unpaid</button>`
          : ""
      }</td>`;
      emiTableBody.appendChild(tr);
    });
    getEl("customer-details-modal").classList.add("show");
  };

  auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      getEl("auth-container").classList.add("hidden");
      getEl("admin-dashboard").classList.remove("hidden");
      loadAndRenderAll();
    } else {
      window.allCustomers = { active: [], settled: [] };
      recentActivities = [];
      getEl("auth-container").classList.remove("hidden");
      getEl("admin-dashboard").classList.add("hidden");
    }
  });

  function initializeEventListeners() {
    getEl("login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = getEl("login-btn");
      toggleButtonLoading(btn, true, "Logging In...");
      try {
        await auth.signInWithEmailAndPassword(
          getEl("login-email").value,
          getEl("login-password").value
        );
      } catch (error) {
        showToast("error", "Login Failed", error.message);
        toggleButtonLoading(btn, false);
      }
    });

    document.body.addEventListener("click", async (e) => {
      const target = e.target;
      const button = target.closest("button");
      if (target.id === "forgot-password-link") {
        e.preventDefault();
        const email = prompt(
          "Please enter your email to receive a password reset link:"
        );
        if (email) {
          try {
            await auth.sendPasswordResetEmail(email);
            showToast(
              "success",
              "Email Sent",
              "Password reset link sent to your email."
            );
          } catch (error) {
            showToast("error", "Error", error.message);
          }
        }
      }
      if (
        target.closest("#mobile-menu-btn") ||
        target.closest("#sidebar-overlay")
      ) {
        getEl("sidebar")?.classList.toggle("show");
        getEl("sidebar-overlay")?.classList.toggle("show");
        getEl("mobile-menu-btn")?.classList.toggle("is-hidden");
      }

      const menuItem = target.closest(".menu-item:not(#change-theme-btn)");
      if (menuItem) {
        e.preventDefault();
        document
          .querySelectorAll(".menu-item")
          .forEach((i) => i.classList.remove("active"));
        menuItem.classList.add("active");
        const sectionId = `${menuItem.dataset.section}-section`;
        document
          .querySelectorAll(".section-content")
          .forEach((s) => s.classList.remove("is-active"));
        getEl(sectionId)?.classList.add("is-active");
        getEl("section-title").textContent =
          menuItem.querySelector("span").textContent;
        if (getEl("sidebar")?.classList.contains("show")) {
          getEl("sidebar")?.classList.remove("show");
          getEl("sidebar-overlay")?.classList.remove("show");
        }
      }
      const customerItemInfo = target.closest(
        ".customer-info, .view-details-prompt, .activity-item[data-id]"
      );
      if (customerItemInfo && customerItemInfo.dataset.id) {
        showCustomerDetails(customerItemInfo.dataset.id);
      }
      if (target.closest(".modal-close, [data-close-modal]")) {
        target.closest(".modal").classList.remove("show");
      }
      if (button) {
        if (button.classList.contains("emi-pay-btn")) {
          const customerId = button.dataset.id;
          const month = parseInt(button.dataset.month, 10);
          toggleButtonLoading(button, true, "...");
          const customer = window.allCustomers.active.find(
            (c) => c.id === customerId
          );
          if (!customer) {
            showToast("error", "Error", "Customer not found.");
            toggleButtonLoading(button, false);
            return;
          }
          const emiIndex = customer.emiSchedule.findIndex(
            (e) => e.month === month
          );
          const newStatus =
            customer.emiSchedule[emiIndex].status === "Paid" ? "Due" : "Paid";
          if (
            newStatus === "Paid" &&
            emiIndex > 0 &&
            customer.emiSchedule[emiIndex - 1].status !== "Paid"
          ) {
            showToast(
              "error",
              "Action Denied",
              "Please pay previous EMIs first."
            );
            toggleButtonLoading(button, false);
            return;
          }
          if (
            newStatus === "Due" &&
            emiIndex < customer.emiSchedule.length - 1 &&
            customer.emiSchedule[emiIndex + 1].status === "Paid"
          ) {
            showToast(
              "error",
              "Action Denied",
              "Please mark later EMIs as unpaid first."
            );
            toggleButtonLoading(button, false);
            return;
          }
          const updatedSchedule = JSON.parse(
            JSON.stringify(customer.emiSchedule)
          );
          updatedSchedule[emiIndex].status = newStatus;
          try {
            await db
              .collection("customers")
              .doc(customerId)
              .update({ emiSchedule: updatedSchedule });
            showToast(
              "success",
              "Status Updated",
              `EMI for month ${month} marked as ${newStatus}.`
            );
            if (newStatus === "Paid") {
              logActivity("EMI_PAID", {
                customerName: customer.name,
                amount: updatedSchedule[emiIndex].emi,
              });
            }
            await loadAndRenderAll();
            showCustomerDetails(customerId);
          } catch (error) {
            showToast("error", "Update Failed", error.message);
            toggleButtonLoading(button, false);
          }
        } else if (button.classList.contains("delete-activity-btn")) {
          const activityId = button.dataset.id;
          showConfirmation(
            "Delete Activity?",
            "Are you sure you want to delete this activity log?",
            async () => {
              try {
                await db.collection("activities").doc(activityId).delete();
                getEl(`activity-${activityId}`).remove();
                showToast("success", "Deleted", "Activity log removed.");
              } catch (error) {
                showToast("error", "Delete Failed", error.message);
              }
            }
          );
        } else if (button.classList.contains("delete-customer-btn")) {
          const customerId = button.dataset.id;
          showConfirmation(
            "Delete Customer?",
            "This will permanently delete this customer and all their loan data. This action cannot be undone.",
            async () => {
              try {
                await db.collection("customers").doc(customerId).delete();
                showToast(
                  "success",
                  "Customer Deleted",
                  "The customer record has been permanently removed."
                );
                await loadAndRenderAll();
              } catch (e) {
                showToast("error", "Delete Failed", e.message);
              }
            }
          );
        } else if (button.id === "view-history-btn") {
          const customer = [
            ...window.allCustomers.active,
            ...window.allCustomers.settled,
          ].find((c) => c.id === button.dataset.id);
          if (customer && customer.history) {
            const historyBody = getEl("history-modal-body");
            historyBody.innerHTML =
              customer.history
                .map((record, index) => {
                  const details = record.loanDetails;
                  const paidOnThisLoan = record.emiSchedule
                    .filter((e) => e.status === "Paid")
                    .reduce((sum, emi) => sum + emi.emi, 0);
                  return `<div class="history-card"><div class="history-card-header"><h3>Previous Loan #${
                    customer.history.length - index
                  }</h3><span class="date">Refinanced on: ${
                    record.settledDate
                  }</span></div><div class="history-card-body"><div class="history-stat"><span class="label">Principal</span><span class="value">${formatCurrency(
                    details.principal
                  )}</span></div><div class="history-stat"><span class="label">Interest Rate</span><span class="value">${
                    details.annualRate
                  }%</span></div><div class="history-stat"><span class="label">Tenure</span><span class="value">${
                    details.tenureMonths
                  } Months</span></div><div class="history-stat"><span class="label">Monthly EMI</span><span class="value">${formatCurrency(
                    details.emiAmount
                  )}</span></div></div><div class="history-card-footer"><div class="history-stat"><span class="label">Total Paid on this Loan</span><span class="value">${formatCurrency(
                    paidOnThisLoan
                  )} (${
                    record.emiSchedule.filter((e) => e.status === "Paid").length
                  }/${
                    record.emiSchedule.length
                  } EMIs)</span></div></div></div>`;
                })
                .join("") || "<p>No history found.</p>";
            getEl("history-modal").classList.add("show");
          }
        } else if (button.id === "clear-all-activities-btn") {
          showConfirmation(
            "Clear All Activities?",
            "This will delete all activity logs permanently. Are you sure?",
            async () => {
              const snapshot = await db
                .collection("activities")
                .where("owner_uid", "==", currentUser.uid)
                .get();
              const batch = db.batch();
              snapshot.docs.forEach((doc) => batch.delete(doc.ref));
              await batch.commit();
              recentActivities = [];
              renderActivityLog();
              showToast(
                "success",
                "All Cleared",
                "All activity logs have been deleted."
              );
            }
          );
        } else if (
          button.id === "logout-btn" ||
          button.id === "logout-settings-btn"
        ) {
          auth.signOut();
        } else if (button.id === "theme-toggle-btn") {
          // MODIFIED: Use the new global toggle function
          if (window.toggleDarkMode) {
            window.toggleDarkMode();
          }
        } else if (button.id === "main-add-customer-btn") {
          getEl("customer-form").reset();
          getEl("customer-id").value = "";
          getEl("customer-form-modal-title").textContent = "Add New Customer";
          getEl("loan-date").value = new Date().toISOString().split("T")[0];
          getEl("loan-details-fields").style.display = "block";
          getEl("customer-form-modal").classList.add("show");
        } else if (button.id === "edit-customer-info-btn") {
          const customer = [
            ...window.allCustomers.active,
            ...window.allCustomers.settled,
          ].find((c) => c.id === button.dataset.id);
          if (!customer) return;
          getEl("customer-form").reset();
          getEl("customer-id").value = customer.id;
          getEl("customer-name").value = customer.name;
          getEl("customer-phone").value = customer.phone || "";
          getEl("customer-father-name").value = customer.fatherName || "";
          getEl("customer-mother-name").value = customer.motherName || "";
          getEl("customer-address").value = customer.address || "";
          getEl("customer-aadhar").value = customer.aadhar || "";
          getEl("customer-pan").value = customer.pan || "";
          getEl("loan-details-fields").style.display = "none";
          getEl("customer-form-modal-title").textContent = "Edit Customer Info";
          getEl("customer-details-modal").classList.remove("show");
          getEl("customer-form-modal").classList.add("show");
        } else if (button.id === "settle-loan-btn") {
          const customer = window.allCustomers.active.find(
            (c) => c.id === button.dataset.id
          );
          if (!customer) return;
          showConfirmation(
            "Settle Loan?",
            "This will move the account to 'Settled'. Are you sure?",
            async () => {
              try {
                await db
                  .collection("customers")
                  .doc(button.dataset.id)
                  .update({ status: "settled" });
                await logActivity("LOAN_SETTLED", {
                  customerName: customer.name,
                });
                showToast(
                  "success",
                  "Loan Settled",
                  "Account moved to settled."
                );
                getEl("customer-details-modal").classList.remove("show");
                await loadAndRenderAll();
              } catch (error) {
                showToast("error", "Settle Failed", error.message);
              }
            }
          );
        } else if (button.id === "refinance-loan-btn") {
          const customer = window.allCustomers.active.find(
            (c) => c.id === button.dataset.id
          );
          if (!customer) return;
          const paid = customer.emiSchedule.filter((e) => e.status === "Paid");
          const outstanding =
            paid.length > 0
              ? paid[paid.length - 1].remainingBalance
              : customer.loanDetails.principal;
          getEl("refinance-customer-id").value = customer.id;
          getEl("refinance-outstanding").textContent =
            formatCurrency(outstanding);
          getEl("refinance-form").reset();
          getEl("refinance-new-principal").textContent =
            formatCurrency(outstanding);
          getEl("refinance-new-amount").value = 0;
          getEl("refinance-modal").classList.add("show");
        } else if (button.id === "export-active-btn") {
          exportToExcel(
            window.allCustomers.active,
            "Active_Customers_Report.xlsx"
          );
        } else if (button.id === "export-settled-btn") {
          exportToExcel(
            window.allCustomers.settled,
            "Settled_Customers_Report.xlsx"
          );
        } else if (button.id === "export-backup-btn") {
          try {
            const backupData = {
              version: "1.0.0",
              exportedAt: new Date().toISOString(),
              customers: window.allCustomers,
            };
            const dataStr = JSON.stringify(backupData, null, 2);
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `loan-manager-backup-${
              new Date().toISOString().split("T")[0]
            }.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(
              "success",
              "Export Successful",
              "Your data has been downloaded."
            );
          } catch (e) {
            showToast("error", "Export Failed", e.message);
          }
        } else if (button.id === "import-backup-btn") {
          const fileInput = getEl("import-backup-input");
          const file = fileInput.files[0];
          if (!file) {
            showToast(
              "error",
              "No File",
              "Please choose a backup file to import."
            );
            return;
          }
          showConfirmation(
            "Overwrite All Data?",
            "Importing this file will permanently delete ALL your current customers and activities, replacing them with the data from the backup. This cannot be undone. Are you sure you want to proceed?",
            () => {
              const reader = new FileReader();
              reader.onload = async (event) => {
                try {
                  const backup = JSON.parse(event.target.result);
                  if (
                    !backup.customers ||
                    !backup.customers.active ||
                    !backup.customers.settled
                  ) {
                    throw new Error("Invalid backup file format.");
                  }
                  toggleButtonLoading(button, true, "Importing...");

                  const batch = db.batch();

                  const existingActive = await db
                    .collection("customers")
                    .where("owner", "==", currentUser.uid)
                    .where("status", "==", "active")
                    .get();
                  const existingSettled = await db
                    .collection("customers")
                    .where("owner", "==", currentUser.uid)
                    .where("status", "==", "settled")
                    .get();
                  existingActive.docs.forEach((doc) => batch.delete(doc.ref));
                  existingSettled.docs.forEach((doc) => batch.delete(doc.ref));

                  [
                    ...backup.customers.active,
                    ...backup.customers.settled,
                  ].forEach((cust) => {
                    const newDocRef = db.collection("customers").doc();
                    const newCustData = {
                      ...cust,
                      owner: currentUser.uid,
                      createdAt: new Date(),
                    };
                    delete newCustData.id;
                    batch.set(newDocRef, newCustData);
                  });

                  await batch.commit();

                  showToast(
                    "success",
                    "Import Complete",
                    "Your data has been restored. Refreshing..."
                  );
                  await loadAndRenderAll();
                } catch (e) {
                  showToast("error", "Import Failed", e.message);
                } finally {
                  toggleButtonLoading(button, false);
                }
              };
              reader.onerror = () => {
                showToast(
                  "error",
                  "Read Error",
                  "Could not read the selected file."
                );
              };
              reader.readAsText(file);
            }
          );
        }
      }
    });
    document.body.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      if (form.id === "customer-form") {
        const id = getEl("customer-id").value;
        const saveBtn = getEl("customer-modal-save");
        toggleButtonLoading(saveBtn, true, id ? "Updating..." : "Saving...");
        try {
          const data = {
            name: getEl("customer-name").value,
            phone: getEl("customer-phone").value,
            fatherName: getEl("customer-father-name").value,
            motherName: getEl("customer-mother-name").value,
            address: getEl("customer-address").value,
            aadhar: getEl("customer-aadhar").value,
            pan: getEl("customer-pan").value,
          };
          if (id) {
            await db.collection("customers").doc(id).update(data);
            showToast("success", "Customer Updated", "Details saved.");
          } else {
            const p = parseFloat(getEl("principal-amount").value),
              r = parseFloat(getEl("interest-rate-modal").value),
              n = parseInt(getEl("loan-tenure").value, 10),
              d = getEl("loan-date").value;
            if (isNaN(p) || isNaN(r) || isNaN(n) || !d)
              throw new Error("Please fill all loan fields correctly.");
            data.loanDetails = {
              principal: p,
              annualRate: r,
              tenureMonths: n,
              emiAmount: calculateEMI(p, r, n),
              loanDate: d,
            };
            data.emiSchedule = generateAmortizationSchedule(p, r, n, d);
            data.owner = currentUser.uid;
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            data.status = "active";
            await db.collection("customers").add(data);
            await logActivity("NEW_LOAN", {
              customerName: data.name,
              amount: p,
            });
            showToast("success", "Customer Added", "New loan account created.");
          }
          getEl("customer-form-modal").classList.remove("show");
          await loadAndRenderAll();
        } catch (error) {
          showToast("error", "Save Failed", error.message);
        } finally {
          toggleButtonLoading(saveBtn, false);
        }
      } else if (form.id === "emi-calculator-form") {
        const p = parseFloat(getEl("calc-principal").value),
          r = parseFloat(getEl("calc-rate").value),
          n = parseInt(getEl("calc-tenure").value, 10);
        if (isNaN(p) || isNaN(r) || isNaN(n)) {
          showToast("error", "Invalid Input", "Please enter valid numbers.");
          return;
        }
        const emi = calculateEMI(p, r, n);
        const totalPayment = emi * n;
        const totalInterest = totalPayment - p;
        getEl("result-emi").textContent = formatCurrency(emi);
        getEl("result-interest").textContent = formatCurrency(totalInterest);
        getEl("result-total").textContent = formatCurrency(totalPayment);
        getEl("calculator-results").classList.remove("hidden");
      } else if (form.id === "refinance-form") {
        const saveBtn = getEl("refinance-modal-save");
        toggleButtonLoading(saveBtn, true, "Processing...");
        try {
          const customerId = getEl("refinance-customer-id").value;
          const customerRef = db.collection("customers").doc(customerId);
          const doc = await customerRef.get();
          if (!doc.exists) throw new Error("Customer not found");
          const data = doc.data();
          const newAmount = parseFloat(getEl("refinance-new-amount").value);
          const newRate = parseFloat(getEl("refinance-new-rate").value);
          const newTenure = parseInt(getEl("refinance-new-tenure").value, 10);
          const paid = data.emiSchedule.filter((e) => e.status === "Paid");
          const outstanding =
            paid.length > 0
              ? paid[paid.length - 1].remainingBalance
              : data.loanDetails.principal;
          const newPrincipal = outstanding + newAmount;
          const newStartDate = new Date().toISOString().split("T")[0];
          const newSchedule = generateAmortizationSchedule(
            newPrincipal,
            newRate,
            newTenure,
            newStartDate
          );
          const newEmiAmount = calculateEMI(newPrincipal, newRate, newTenure);
          const history = data.history || [];
          history.push({
            loanDetails: data.loanDetails,
            emiSchedule: data.emiSchedule,
            settledDate: newStartDate,
            reason: "Refinanced",
          });
          await customerRef.update({
            loanDetails: {
              principal: newPrincipal,
              annualRate: newRate,
              tenureMonths: newTenure,
              emiAmount: newEmiAmount,
              loanDate: newStartDate,
            },
            emiSchedule: newSchedule,
            history,
          });
          await logActivity("LOAN_REFINANCED", {
            customerName: data.name,
            amount: newPrincipal,
          });
          showToast("success", "Loan Refinanced", "New schedule created.");
          getEl("refinance-modal").classList.remove("show");
          getEl("customer-details-modal").classList.remove("show");
          await loadAndRenderAll();
        } catch (error) {
          showToast("error", "Refinance Failed", error.message);
        } finally {
          toggleButtonLoading(saveBtn, false);
        }
      } else if (form.id === "change-password-form") {
        const btn = getEl("change-password-btn");
        toggleButtonLoading(btn, true, "Updating...");
        const currentPass = getEl("current-password").value;
        const newPass = getEl("new-password").value;
        const confirmPass = getEl("confirm-password").value;
        if (newPass !== confirmPass) {
          showToast("error", "Mismatch", "New passwords do not match.");
          toggleButtonLoading(btn, false);
          return;
        }
        if (newPass.length < 6) {
          showToast(
            "error",
            "Too Weak",
            "Password should be at least 6 characters long."
          );
          toggleButtonLoading(btn, false);
          return;
        }
        try {
          const user = auth.currentUser;
          const credential = firebase.auth.EmailAuthProvider.credential(
            user.email,
            currentPass
          );
          await user.reauthenticateWithCredential(credential);
          await user.updatePassword(newPass);
          showToast("success", "Success", "Password updated successfully.");
          form.reset();
        } catch (error) {
          showToast(
            "error",
            "Authentication Failed",
            "Incorrect current password or other error."
          );
          console.error("Password change error:", error);
        } finally {
          toggleButtonLoading(btn, false);
        }
      }
    });
    document.body.addEventListener("change", (e) => {
      if (e.target.id === "dark-mode-toggle") {
        // MODIFIED: Use the new global toggle function
        if (window.toggleDarkMode) {
          window.toggleDarkMode();
        }
      } else if (e.target.id === "import-backup-input") {
        const fileName = e.target.files[0]
          ? e.target.files[0].name
          : "No file chosen";
        getEl("file-name-display").textContent = fileName;
      }
    });
    document.body.addEventListener("input", (e) => {
      if (e.target.closest("#refinance-form")) {
        const out =
          parseFloat(
            getEl("refinance-outstanding").textContent.replace(/[^0-9.-]+/g, "")
          ) || 0;
        const newAmt = parseFloat(getEl("refinance-new-amount").value) || 0;
        getEl("refinance-new-principal").textContent = formatCurrency(
          out + newAmt
        );
      } else if (e.target.id === "search-customers") {
        const term = e.target.value.toLowerCase();
        const filtered = window.allCustomers.active.filter((c) =>
          c.name.toLowerCase().includes(term)
        );
        const listEl = getEl("customers-list");
        if (listEl) {
          const renderList = (element, data, type) => {
            if (!element) return;
            element.innerHTML = "";
            if (data.length === 0) {
              element.innerHTML = `<li class="activity-item" style="cursor:default;"><p>No customers found.</p></li>`;
              return;
            }
            data.forEach((c) => {
              const li = document.createElement("li");
              li.className = "customer-item";
              const detailsHtml = `<span>EMI: ${formatCurrency(
                c.loanDetails.emiAmount
              )}</span><span>Paid: ${
                c.emiSchedule.filter((e) => e.status === "Paid").length
              }/${c.emiSchedule.length}</span>`;
              const deleteButton =
                type === "settled"
                  ? `<button class="btn btn-danger btn-sm delete-customer-btn" data-id="${c.id}" title="Delete Customer"><i class="fas fa-trash-alt"></i></button>`
                  : "";
              li.innerHTML = `<div class="customer-info" data-id="${c.id}"><div class="customer-name">${c.name}</div><div class="customer-details">${detailsHtml}</div></div><div class="customer-actions">${deleteButton}<span class="view-details-prompt" data-id="${c.id}">View Details</span></div>`;
              element.appendChild(li);
            });
          };
          renderList(listEl, filtered, "active");
        }
      }
    });
  }

  initializeEventListeners();
});
