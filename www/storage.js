let state = {
  customers: [], 
  sales: [], 
  purchases: [], 
  settings: {},
  activityLog: [],
  currentSalesFilter: 'all', 
  customerListFilter: 'all', 
  customerHistoryFilter: 'all',
  selectedCustomerIdForDetail: null, 
  currentReportCustomerId: null, 
  currentPurchaseDetailId: null,
  activeColorMode: 'light',
  dialogCallback: null,
  currentTab: 'dashboard',
  activeSubPage: null,
  openModalStack: [],
  pdfIncludeRepayments: true,
  pdfIncludeCustomerNotes: true,
  returnToSaleModalAfterCustomer: false
};

function isDebtMode() {
  return state.settings && state.settings.simplifiedDebtMode === true;
}

/* ============================================================
   DEFAULT CURRENCIES
   ============================================================ */
const DEFAULT_CURRENCIES = [
  { id: 'د.ع', name: 'دينار عراقي',     symbol: 'د.ع', format: 'comma', isDefault: true },
  { id: '$',   name: 'دولار أمريكي',   symbol: '$',   format: 'comma', isDefault: true },
  { id: 'ر.س', name: 'ريال سعودي',      symbol: 'ر.س', format: 'comma', isDefault: true },
  { id: 'د.إ', name: 'درهم إماراتي',   symbol: 'د.إ', format: 'comma', isDefault: true },
  { id: 'د.ك', name: 'دينار كويتي',    symbol: 'د.ك', format: 'comma', isDefault: true },
  { id: 'د.أ', name: 'دينار أردني',    symbol: 'د.أ', format: 'comma', isDefault: true }
];
    function rawNum(val) {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      const clean = String(val).replace(/[^0-9.]/g, '');
      return Number(clean) || 0;
    }

    function formatNumberWithCommas(num) {
      const parts = String(num).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return parts.join('.');
    }

    function handleFormattedInput(inputEl, callback) {
      const raw = rawNum(inputEl.value);
      if (raw === 0 && inputEl.value.trim() === '') {
        inputEl.value = '';
      } else {
        inputEl.value = formatNumberWithCommas(raw);
      }
      if (typeof callback === 'function') callback();
    }
const StorageService = {
  KEYS: {
    NOTEBOOKS: 'store_notebooks_index_v1',
    GLOBAL_SETTINGS: 'store_global_settings_v1',
    USER_SESSION: 'store_user_session',
    // legacy keys (للترحيل فقط)
    LEGACY_CUSTOMERS: 'store_customers_v1',
    LEGACY_SALES: 'store_sales_v1',
    LEGACY_PURCHASES: 'store_purchases_v1',
    LEGACY_SETTINGS: 'store_settings_v1',
    LEGACY_ACTIVITY_LOG: 'store_activity_log_v1'
  },

  // ==================== NOTEBOOKS MANAGEMENT ====================
  getNotebooksIndex() {
    let idx = null;
    try { idx = JSON.parse(localStorage.getItem(this.KEYS.NOTEBOOKS)); } catch(e) {}
    if (!idx || !Array.isArray(idx.notebooks) || idx.notebooks.length === 0) {
      idx = this._migrateOrCreateDefault();
    }
    if (!idx.activeId || !idx.notebooks.some(n => n.id === idx.activeId)) {
      idx.activeId = idx.notebooks[0].id;
      localStorage.setItem(this.KEYS.NOTEBOOKS, JSON.stringify(idx));
    }
    return idx;
  },

  _saveIndex(idx) {
    localStorage.setItem(this.KEYS.NOTEBOOKS, JSON.stringify(idx));
  },

  _migrateOrCreateDefault() {
    const defaultId = 'nb_' + Date.now();
    let legacyCustomers, legacySales, legacyPurchases, legacyActivity, legacySettings;
    try { legacyCustomers = JSON.parse(localStorage.getItem(this.KEYS.LEGACY_CUSTOMERS)); } catch(e) {}
    try { legacySales = JSON.parse(localStorage.getItem(this.KEYS.LEGACY_SALES)); } catch(e) {}
    try { legacyPurchases = JSON.parse(localStorage.getItem(this.KEYS.LEGACY_PURCHASES)); } catch(e) {}
    try { legacyActivity = JSON.parse(localStorage.getItem(this.KEYS.LEGACY_ACTIVITY_LOG)); } catch(e) {}
    try { legacySettings = JSON.parse(localStorage.getItem(this.KEYS.LEGACY_SETTINGS)); } catch(e) {}

    const name = (legacySettings && legacySettings.projectName) || 'دفتر المبيعات';
    const theme = (legacySettings && legacySettings.theme) || 'light';

    const nbData = {
      customers: legacyCustomers || [],
      sales: legacySales || [],
      purchases: legacyPurchases || [],
      activityLog: legacyActivity || [],
      settings: {
        projectName: name,
        currency: (legacySettings && legacySettings.currency) || 'د.ع',
        simplifiedDebtMode: !!(legacySettings && legacySettings.simplifiedDebtMode),
        customerViewMode: (legacySettings && legacySettings.customerViewMode) || 'cards'
      }
    };

    this._saveNotebookData(defaultId, nbData);
    this.saveGlobalSettings({ theme: theme });

    const idx = {
      notebooks: [{ id: defaultId, name: name, createdAt: new Date().toISOString() }],
      activeId: defaultId
    };
    localStorage.setItem(this.KEYS.NOTEBOOKS, JSON.stringify(idx));

    // تنظيف المفاتيح القديمة بعد الترحيل
    localStorage.removeItem(this.KEYS.LEGACY_CUSTOMERS);
    localStorage.removeItem(this.KEYS.LEGACY_SALES);
    localStorage.removeItem(this.KEYS.LEGACY_PURCHASES);
    localStorage.removeItem(this.KEYS.LEGACY_ACTIVITY_LOG);
    localStorage.removeItem(this.KEYS.LEGACY_SETTINGS);

    return idx;
  },

  _notebookDataKey(id) { return 'store_nb_data_v1_' + id; },

  _getNotebookData(id) {
    try {
      const raw = localStorage.getItem(this._notebookDataKey(id));
      return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
  },

  _saveNotebookData(id, data) {
    localStorage.setItem(this._notebookDataKey(id), JSON.stringify(data));
  },

  _ensureActiveData() {
    const idx = this.getNotebooksIndex();
    let d = this._getNotebookData(idx.activeId);
    if (!d) {
      d = {
        customers: [],
        sales: [],
        purchases: [],
        activityLog: [],
        settings: { projectName: 'دفتر المبيعات', currency: 'د.ع', simplifiedDebtMode: false, customerViewMode: 'cards' }
      };
      this._saveNotebookData(idx.activeId, d);
    }
    return d;
  },

  getActiveNotebookId() { return this.getNotebooksIndex().activeId; },
  getActiveNotebook() {
    const idx = this.getNotebooksIndex();
    return idx.notebooks.find(n => n.id === idx.activeId) || idx.notebooks[0];
  },
  getAllNotebooks() { return this.getNotebooksIndex().notebooks; },

  createNotebook(name) {
    const trimmed = (name || '').trim() || 'دفتر جديد';
    const idx = this.getNotebooksIndex();
    const id = 'nb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const nb = { id, name: trimmed, createdAt: new Date().toISOString() };
    idx.notebooks.push(nb);
    idx.activeId = id;
    this._saveIndex(idx);
    this._saveNotebookData(id, {
      customers: [],
      sales: [],
      purchases: [],
      activityLog: [],
      settings: { projectName: trimmed, currency: 'د.ع', simplifiedDebtMode: false, customerViewMode: 'cards' }
    });
    return nb;
  },

  switchNotebook(id) {
    const idx = this.getNotebooksIndex();
    if (!idx.notebooks.some(n => n.id === id)) return false;
    idx.activeId = id;
    this._saveIndex(idx);
    return true;
  },

  deleteNotebook(id) {
    const idx = this.getNotebooksIndex();
    if (idx.notebooks.length <= 1) return false;
    const filtered = idx.notebooks.filter(n => n.id !== id);
    if (filtered.length === idx.notebooks.length) return false;
    idx.notebooks = filtered;
    if (idx.activeId === id) idx.activeId = filtered[0].id;
    this._saveIndex(idx);
    localStorage.removeItem(this._notebookDataKey(id));
    return true;
  },

  renameNotebook(id, newName) {
    const idx = this.getNotebooksIndex();
    const nb = idx.notebooks.find(n => n.id === id);
    if (!nb) return false;
    nb.name = (newName || '').trim() || nb.name;
    this._saveIndex(idx);
    const d = this._getNotebookData(id);
    if (d) {
      d.settings = d.settings || {};
      d.settings.projectName = nb.name;
      this._saveNotebookData(id, d);
    }
    return true;
  },

  // ==================== GLOBAL SETTINGS (theme) ====================
  getGlobalSettings() {
    try { return JSON.parse(localStorage.getItem(this.KEYS.GLOBAL_SETTINGS)) || { theme: 'light' }; }
    catch(e) { return { theme: 'light' }; }
  },
  saveGlobalSettings(s) {
    localStorage.setItem(this.KEYS.GLOBAL_SETTINGS, JSON.stringify(s));
  },

  // ==================== EXISTING API (notebook-aware) ====================
  getCustomers() {
    try { return this._ensureActiveData().customers || []; } catch(e) { return []; }
  },
  saveCustomers(customers) {
    const d = this._ensureActiveData();
    d.customers = customers || [];
    this._saveNotebookData(this.getActiveNotebookId(), d);
    FirebaseService.scheduleAutoSync();
  },

  getSales() {
    try {
      const d = this._ensureActiveData();
      let list = d.sales || [];
      const customers = d.customers || [];
      const custIds = new Set(customers.map(c => c.id));
      list = list.filter(item => !item.customerId || custIds.has(item.customerId));
      return list.map(item => {
        const desc = item.description || '';
        if (!item.type) {
          if (item.price === 0 && (desc.includes('تسديد') || Number(item.paid) > 0)) {
            item.type = 'repayment'; item.amount = Number(item.paid) || 0;
          } else { item.type = 'sale'; }
        }
        if (item.type === 'repayment' && (!item.amount || item.amount === 0)) {
          item.amount = Number(item.paid) || 0;
        }
        if (item.type === 'sale' && item.upfrontPaid === undefined) {
          item.upfrontPaid = Number(item.paid) || 0;
        }
        return item;
      });
    } catch(e) { return []; }
  },
  saveSales(sales) {
    const d = this._ensureActiveData();
    d.sales = sales || [];
    this._saveNotebookData(this.getActiveNotebookId(), d);
    FirebaseService.scheduleAutoSync();
  },

  getPurchases() {
    try {
      const d = this._ensureActiveData();
      let list = d.purchases || [];
      return list.map(p => {
        if (!Array.isArray(p.items)) {
          p.category = p.category || p.description || 'بضاعة عامة';
          p.items = Number(p.cost) > 0 ? [{ name: p.description || 'بضاعة', price: Number(p.cost) || 0 }] : [];
        }
        if (Array.isArray(p.items) && p.items.length > 0) {
          const computedTotal = p.items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
          if (computedTotal > 0) p.cost = computedTotal;
        }
        return p;
      });
    } catch(e) { return []; }
  },
  savePurchases(purchases) {
    const d = this._ensureActiveData();
    d.purchases = purchases || [];
    this._saveNotebookData(this.getActiveNotebookId(), d);
    FirebaseService.scheduleAutoSync();
  },

  getSettings() {
  try {
    const d = this._ensureActiveData();
    const s = d.settings || {};
    const gs = this.getGlobalSettings();
    return {
      projectName: s.projectName || 'دفتر المبيعات',
      currency: s.currency || 'د.ع',
      theme: gs.theme || 'light',
      simplifiedDebtMode: s.simplifiedDebtMode === true,
      customerViewMode: s.customerViewMode || 'cards'
    };
  } catch(e) {
    return { projectName: 'دفتر المبيعات', currency: 'د.ع', theme: 'light', simplifiedDebtMode: false, customerViewMode: 'cards' };
  }
},
  saveSettings(settings) {
    const d = this._ensureActiveData();
    d.settings = Object.assign({}, d.settings, settings);
    if (settings.projectName) {
      const idx = this.getNotebooksIndex();
      const nb = idx.notebooks.find(n => n.id === idx.activeId);
      if (nb && nb.name !== settings.projectName) {
        nb.name = settings.projectName;
        this._saveIndex(idx);
      }
    }
    this._saveNotebookData(this.getActiveNotebookId(), d);
    if (settings.theme) {
      const gs = this.getGlobalSettings();
      gs.theme = settings.theme;
      this.saveGlobalSettings(gs);
    }
    FirebaseService.scheduleAutoSync();
  },

  getActivityLog() {
    try { return this._ensureActiveData().activityLog || []; } catch(e) { return []; }
  },
  saveActivityLog(log) {
    const d = this._ensureActiveData();
    d.activityLog = log || [];
    this._saveNotebookData(this.getActiveNotebookId(), d);
    FirebaseService.scheduleAutoSync();
  },
// ==================== CURRENCIES ====================
getCustomCurrencies() {
  const gs = this.getGlobalSettings();
  return Array.isArray(gs.customCurrencies) ? gs.customCurrencies : [];
},

getAllCurrencies() {
  return [...DEFAULT_CURRENCIES, ...this.getCustomCurrencies()];
},

getCurrencyById(id) {
  if (!id) return DEFAULT_CURRENCIES[0];
  const all = this.getAllCurrencies();
  return all.find(c => c.id === id) || DEFAULT_CURRENCIES[0];
},

getCurrentCurrency() {
  const d = this._ensureActiveData();
  const s = d.settings || {};
  return this.getCurrencyById(s.currency);
},

setCurrentCurrency(id) {
  const c = this.getCurrencyById(id);
  const d = this._ensureActiveData();
  d.settings = d.settings || {};
  d.settings.currency = c.id;
  this._saveNotebookData(this.getActiveNotebookId(), d);
  FirebaseService.scheduleAutoSync();
},

addCustomCurrency({ name, symbol, format }) {
  const gs = this.getGlobalSettings();
  if (!Array.isArray(gs.customCurrencies)) gs.customCurrencies = [];
  const id = 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
  const newC = {
    id: id,
    name: (name || '').trim(),
    symbol: (symbol || '').trim(),
    format: format === 'dot' ? 'dot' : 'comma',
    isDefault: false
  };
  gs.customCurrencies.push(newC);
  this.saveGlobalSettings(gs);
  FirebaseService.scheduleAutoSync();
  return newC;
},

deleteCustomCurrency(id) {
  const gs = this.getGlobalSettings();
  if (!Array.isArray(gs.customCurrencies)) return false;
  const target = gs.customCurrencies.find(c => c.id === id);
  if (!target || target.isDefault) return false;
  gs.customCurrencies = gs.customCurrencies.filter(c => c.id !== id);
  this.saveGlobalSettings(gs);
  const d = this._ensureActiveData();
  if (d.settings && d.settings.currency === id) {
  d.settings.currency = 'د.ع';
    this._saveNotebookData(this.getActiveNotebookId(), d);
  }
  FirebaseService.scheduleAutoSync();
  return true;
},

// ==================== LAST SYNC TIME ====================
getLastSyncTime() {
  const gs = this.getGlobalSettings();
  return gs.lastSyncTime || null;
},

saveLastSyncTime(iso) {
  const gs = this.getGlobalSettings();
  gs.lastSyncTime = iso || new Date().toISOString();
  this.saveGlobalSettings(gs);
},

  // ==================== USER SESSION ====================
  getUserSession() {
    try {
      const s = JSON.parse(localStorage.getItem(this.KEYS.USER_SESSION));
      return (s && s.isLoggedIn && s.uid) ? s : null;
    } catch(e) { return null; }
  },
  saveUserSession(user) {
    if (!user || !user.uid) return;
    const session = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email || '',
      isLoggedIn: true,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(this.KEYS.USER_SESSION, JSON.stringify(session));
  },
  clearUserSession() {
    localStorage.removeItem(this.KEYS.USER_SESSION);
  },

  // ==================== CLEAR ====================
  clearActiveNotebookData() {
    const id = this.getActiveNotebookId();
    const old = this._getNotebookData(id) || {};
    const name = (old.settings && old.settings.projectName) || 'دفتر المبيعات';
    this._saveNotebookData(id, {
      customers: [],
      sales: [],
      purchases: [],
      activityLog: [],
      settings: { projectName: name, currency: 'د.ع', simplifiedDebtMode: false, customerViewMode: 'cards' }
    });
  },

  clearAll() {
    const idx = this.getNotebooksIndex();
    idx.notebooks.forEach(n => localStorage.removeItem(this._notebookDataKey(n.id)));
    localStorage.removeItem(this.KEYS.NOTEBOOKS);
    localStorage.removeItem(this.KEYS.GLOBAL_SETTINGS);
  },

  clearAllKeepAuth() {
    const idx = this.getNotebooksIndex();
    idx.notebooks.forEach(n => localStorage.removeItem(this._notebookDataKey(n.id)));
    localStorage.removeItem(this.KEYS.NOTEBOOKS);
    localStorage.setItem(this.KEYS.GLOBAL_SETTINGS, JSON.stringify({ theme: 'light' }));
  },

  // ==================== CLOUD ====================
  setAllFromCloud(cloudData) {
    if (!cloudData) return;
    // الهيكل الجديد: notebooks + notebooksData
    if (Array.isArray(cloudData.notebooks) && cloudData.notebooksData && typeof cloudData.notebooksData === 'object') {
      localStorage.setItem(this.KEYS.NOTEBOOKS, JSON.stringify({
        notebooks: cloudData.notebooks,
        activeId: cloudData.activeId || cloudData.notebooks[0].id
      }));
      Object.keys(cloudData.notebooksData).forEach(nbId => {
        this._saveNotebookData(nbId, cloudData.notebooksData[nbId]);
      });
      if (cloudData.globalSettings) this.saveGlobalSettings(cloudData.globalSettings);
      return;
    }
    // توافق مع الهيكل القديم (دفتر واحد) — نحوّله لدفتر افتراضي
    if (Array.isArray(cloudData.customers) || Array.isArray(cloudData.sales)) {
      const idx = this.getNotebooksIndex();
      const nbId = idx.activeId;
      this._saveNotebookData(nbId, {
        customers: cloudData.customers || [],
        sales: cloudData.sales || [],
        purchases: cloudData.purchases || [],
        activityLog: cloudData.activityLog || [],
        settings: Object.assign({
          projectName: (cloudData.profile && cloudData.profile.storeName) || 'دفتر المبيعات',
          currency: 'د.ع',
          simplifiedDebtMode: false,
          customerViewMode: 'cards'
        }, cloudData.settings || {})
      });
      if (cloudData.settings && cloudData.settings.theme) {
        this.saveGlobalSettings({ theme: cloudData.settings.theme });
      }
    }
  },

  // silent savers
  saveCustomersSilent(list) { const d = this._ensureActiveData(); d.customers = list || []; this._saveNotebookData(this.getActiveNotebookId(), d); },
  saveSalesSilent(list) { const d = this._ensureActiveData(); d.sales = list || []; this._saveNotebookData(this.getActiveNotebookId(), d); },
  savePurchasesSilent(list) { const d = this._ensureActiveData(); d.purchases = list || []; this._saveNotebookData(this.getActiveNotebookId(), d); },
  saveActivityLogSilent(list) { const d = this._ensureActiveData(); d.activityLog = list || []; this._saveNotebookData(this.getActiveNotebookId(), d); }
};

function logActivity(type, title, detail) {
  if (!Array.isArray(state.activityLog)) state.activityLog = [];
  const entry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    type: type,
    title: title,
    detail: detail || '',
    timestamp: new Date().toISOString()
  };
  state.activityLog.unshift(entry);
  if (state.activityLog.length > 500) {
    state.activityLog = state.activityLog.slice(0, 500);
  }
  StorageService.saveActivityLog(state.activityLog);
  updateActivityLogBadge();
}

function formatRelativeTime(isoStr) {
  if (!isoStr) return '';
  const now = new Date();
  const past = new Date(isoStr);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `منذ ${diffHour} ساعة`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `منذ ${diffDay} يوم`;
  return past.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getActivityIconSymbol(type) {
  if (type.includes('customer')) return '#icon-group';
  if (type.includes('sale')) return '#icon-receipt';
  if (type.includes('purchase')) return '#icon-inventory';
  if (type.includes('repay')) return '#icon-payments';
  return '#icon-tune';
}

function updateActivityLogBadge() {
  const count = Array.isArray(state.activityLog) ? state.activityLog.length : 0;
  const badge = document.getElementById('activity-log-count-badge');
  const modalCount = document.getElementById('activity-log-modal-count');
  if (badge) badge.innerText = count;
  if (modalCount) modalCount.innerText = count;
}

function openActivityLogModal() {
  renderActivityLogList();
  openModal('modal-activity-log');
}

function renderActivityLogList() {
  const container = document.getElementById('activity-log-list');
  if (!container) return;
  updateActivityLogBadge();

  if (!state.activityLog || state.activityLog.length === 0) {
    container.innerHTML = '<div class="empty-state"><svg class="app-icon"><use href="#icon-history"/></svg><p>لا توجد نشاطات مسجلة بعد</p></div>';
    return;
  }

  container.innerHTML = state.activityLog.map(item => {
    const iconSym = getActivityIconSymbol(item.type);
    const relTime = formatRelativeTime(item.timestamp);
    const fullDate = formatDate(item.timestamp);

    return `
      <div class="list-item activity-item" title="${escapeHTML(fullDate)}">
        <div class="item-head" style="margin-bottom: 2px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <div class="metric-icon brand" style="width:22px; height:22px; border-radius:var(--r-sm);">
              <svg class="app-icon" style="width:13px; height:13px;"><use href="${iconSym}"/></svg>
            </div>
            <div class="item-title" style="font-size:12.5px;">${escapeHTML(item.title)}</div>
          </div>
          <span class="num" style="font-size:10.5px; color:var(--text-muted); font-weight:600;">${relTime}</span>
        </div>
        ${item.detail ? `<div class="item-subtitle" style="padding-right:28px; font-size:11.5px; color:var(--text-secondary); margin-top:1px;">${escapeHTML(item.detail)}</div>` : ''}
      </div>
    `;
  }).join('');
}

function confirmClearActivityLog() {
  if (!state.activityLog || state.activityLog.length === 0) return;
  openCustomDialog({
    title: 'حذف سجل النشاطات',
    desc: 'هل أنت متأكد من مسح جميع النشاطات المسجلة نهائياً؟',
    onConfirm: () => {
      state.activityLog = [];
      StorageService.saveActivityLog(state.activityLog);
      renderActivityLogList();
      showToast('تم مسح سجل النشاطات');
    }
  });
}

function reconcileCustomerDebts(customerId) {
  if (!customerId) return;
  const custSales = state.sales.filter(s => s.customerId === customerId && s.type !== 'repayment');
  const custRepayments = state.sales.filter(s => s.customerId === customerId && s.type === 'repayment');
  custSales.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  custSales.forEach(s => { if (s.upfrontPaid === undefined) s.upfrontPaid = Math.max(0, Number(s.paid) || 0); });
  let pool = custRepayments.reduce((acc, r) => acc + (Number(r.amount || r.paid) || 0), 0);
  custSales.forEach(s => {
    const price = Number(s.price) || 0;
    const upfront = Math.min(price, Number(s.upfrontPaid) || 0);
    s.paid = upfront; s.remaining = price - upfront;
  });
  for (let s of custSales) {
    if (pool <= 0) break;
    const debtOnSale = Number(s.remaining);
    if (debtOnSale <= 0) continue;
    const fromPool = Math.min(debtOnSale, pool);
    s.paid += fromPool; s.remaining -= fromPool; pool -= fromPool;
  }
}