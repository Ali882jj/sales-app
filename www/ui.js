function formatNumberByCurrency(num, format) {
  const raw = Number(num) || 0;
  const parts = String(raw).split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, format === 'dot' ? '.' : ',');
  if (parts.length > 1 && parts[1]) {
    return intPart + (format === 'dot' ? ',' : '.') + parts[1];
  }
  return intPart;
}

function formatCurrencyFull(amount) {
  const num = Number(amount) || 0;
  const currency = (StorageService && StorageService.getCurrentCurrency)
    ? StorageService.getCurrentCurrency()
    : { symbol: 'د.ع', format: 'comma' };
  return formatNumberByCurrency(num, currency.format) + ' ' + currency.symbol;
}

function formatCurrency(amount) {
  return formatCurrencyFull(amount);
}

function formatDate(isoStr) {
  if(!isoStr) return '';
  const d = new Date(isoStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'م' : 'ص';
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} • ${hoursStr}:${minutes} ${ampm}`;
}
function formatDateOnly(isoStr) {
  if(!isoStr) return '';
  const d = new Date(isoStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
function showOfflineBanner() {
  const banner = document.getElementById('connection-banner');
  const text = document.getElementById('connection-banner-text');
  if (!banner || !text) return;
  if (FirebaseService.bannerAutoHideTimer) {
    clearTimeout(FirebaseService.bannerAutoHideTimer);
    FirebaseService.bannerAutoHideTimer = null;
  }
  text.innerText = 'لا يتوفر اتصال في الشبكة';
  banner.classList.remove('online');
  banner.classList.add('offline', 'show');
}

function showOnlineBanner() {
  const banner = document.getElementById('connection-banner');
  const text = document.getElementById('connection-banner-text');
  if (!banner || !text) return;
  text.innerText = 'تمت استعادة الاتصال بالشبكة';
  banner.classList.remove('offline');
  banner.classList.add('online', 'show');
  if (FirebaseService.bannerAutoHideTimer) clearTimeout(FirebaseService.bannerAutoHideTimer);
  FirebaseService.bannerAutoHideTimer = setTimeout(() => {
    hideConnectionBanner();
  }, 3000);
}

function hideConnectionBanner() {
  const banner = document.getElementById('connection-banner');
  if (banner) banner.classList.remove('show', 'offline', 'online');
  if (FirebaseService.bannerAutoHideTimer) {
    clearTimeout(FirebaseService.bannerAutoHideTimer);
    FirebaseService.bannerAutoHideTimer = null;
  }
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  toastMsg.innerText = message;
  
  const iconUse = toastIcon.querySelector('use');
  if (iconUse) {
    iconUse.setAttribute('href', isError ? '#icon-error' : '#icon-check');
  }
  toastIcon.style.color = isError ? 'var(--danger)' : 'var(--success)';
  toast.classList.add('show');
  setTimeout(() => { toast.classList.remove('show'); }, 2600);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function openModal(id) { 
  const modalEl = document.getElementById(id);
  if (!modalEl) return;
  modalEl.classList.add('active');
  state.openModalStack.push(id);
  document.body.classList.add('modal-open');
  history.pushState({ isModal: true, modalId: id }, '', '#modal');
}

function closeModal(id) { 
  if (state.openModalStack.includes(id)) {
    history.back();
  }
}

function closeAllModalsDirectly() {
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  const hadModals = state.openModalStack.length > 0;
  state.openModalStack = [];
  document.body.classList.remove('modal-open');
  // لو كان في مودالات مفتوحة، استبدل history entry بدل ما نخليه معلّق
  if (hadModals && history.state && history.state.isModal) {
    history.replaceState({ isTab: true, tab: state.currentTab || 'dashboard' }, '', '#' + (state.currentTab || 'dashboard'));
  }
}

function openCustomDialog({ title, desc, onConfirm, requiresInput = false, inputPlaceholder = 'تأكيد' }) {
  document.getElementById('dialog-title').innerText = title || 'تأكيد الإجراء';
  document.getElementById('dialog-desc').innerText = desc || 'هل أنت متأكد من المتابعة؟';
  
  const inputWrap = document.getElementById('dialog-confirm-input-wrap');
  const inputEl = document.getElementById('dialog-confirm-input');
  const confirmBtn = document.getElementById('dialog-confirm-btn');
  
  state.dialogCallback = onConfirm;
  
  if (requiresInput) {
    inputWrap.style.display = 'block';
    inputEl.value = '';
    inputEl.placeholder = inputPlaceholder;
    confirmBtn.disabled = true;
    
    const newInput = inputEl.cloneNode(true);
    inputEl.parentNode.replaceChild(newInput, inputEl);
    newInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      confirmBtn.disabled = val !== inputPlaceholder;
    });
    newInput.focus();
  } else {
    inputWrap.style.display = 'none';
    confirmBtn.disabled = false;
  }
  
  openModal('custom-dialog');
}

function closeCustomDialog(confirmed) {
  const cb = (confirmed && typeof state.dialogCallback === 'function')
    ? state.dialogCallback
    : null;
  state.dialogCallback = null;

  // اقفل الديالوغ أولاً (بأمان مهما كانت حالة الـ stack)
  const dialogEl = document.getElementById('custom-dialog');
  if (dialogEl) dialogEl.classList.remove('active');
  state.openModalStack = state.openModalStack.filter(id => id !== 'custom-dialog');
if (state.openModalStack.length === 0) document.body.classList.remove('modal-open');

  // نفّذ الـ callback بعد إغلاق الديالوغ
  if (cb) {
    setTimeout(() => { try { cb(); } catch (e) { console.error(e); } }, 0);
  }
}

document.getElementById('dialog-confirm-btn').addEventListener('click', () => { 
  const btn = document.getElementById('dialog-confirm-btn');
  if (!btn.disabled) closeCustomDialog(true); 
});

const pageScrollMemory = {};

function saveCurrentScroll() {
  const pageId = state.activeSubPage || state.currentTab || 'dashboard';
  const y = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  pageScrollMemory[pageId] = y;
}

function restorePageScroll(pageId) {
  const y = pageScrollMemory[pageId] || 0;
  if (y <= 0) return;

  // منع smooth scroll مؤقتاً — نستخدم instant
  const prevBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';

  // scroll فوري بدون paint
  window.scrollTo(0, y);
  document.documentElement.scrollTop = y;
  document.body.scrollTop = y;

  // نعيد السلوك الأصلي بعد أول إطار
  requestAnimationFrame(() => {
    document.documentElement.style.scrollBehavior = prevBehavior;
  });
}

function updateDOMView(pageId, restoreScroll = false) {
  document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.desktop-nav-item').forEach(b => b.classList.remove('active'));

  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) targetPage.classList.add('active');

  const headerEl = document.getElementById('main-app-header');
  const topLevelTabs = ['dashboard', 'customers', 'sales', 'purchases'];

  if (topLevelTabs.includes(pageId)) {
    if (headerEl) headerEl.classList.remove('hidden-subpage');
    const targetDockBtn = document.getElementById('dock-btn-' + pageId);
    if (targetDockBtn) targetDockBtn.classList.add('active');
    const targetDeskBtn = document.getElementById('desk-btn-' + pageId);
    if (targetDeskBtn) targetDeskBtn.classList.add('active');
  } else {
    if (headerEl) headerEl.classList.add('hidden-subpage');
  }

  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'customers') renderCustomers();
  if (pageId === 'purchases') renderPurchases();
  if (pageId === 'sales') renderSales();
  if (pageId === 'settings') renderSettings();

  if (restoreScroll) {
    restorePageScroll(pageId);
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function switchTab(tabId) {
  saveCurrentScroll();
  closeAllModalsDirectly();
  state.activeSubPage = null;
  state.currentTab = tabId;

  if (tabId === 'dashboard') {
    history.replaceState({ isTab: true, tab: 'dashboard' }, '', '#dashboard');
  } else {
    if (!history.state || history.state.tab === 'dashboard' || !history.state.isTab) {
      history.pushState({ isTab: true, tab: tabId }, '', '#' + tabId);
    } else {
      history.replaceState({ isTab: true, tab: tabId }, '', '#' + tabId);
    }
  }

  updateDOMView(tabId);
}

function openSubPage(subPageId) {
  saveCurrentScroll();
  closeAllModalsDirectly();
  state.activeSubPage = subPageId;
  history.pushState({ isSubPage: true, subPage: subPageId }, '', '#' + subPageId);
  updateDOMView(subPageId);
}

function appBack() {
  history.back();
}

    function navigateToCustomerDebtors() {
      switchTab('customers');
      const debtorsBtn = document.getElementById('cust-list-filter-debtors');
      if (debtorsBtn) setCustomerListFilter('debtors', debtorsBtn);
    }

function applyCustomThemeStyles() {
  // لم يعد هناك تخصيص للألوان أو الحواف
}
function applySimplifiedDebtMode() {
  const enabled = isDebtMode();
  document.body.classList.toggle('simplified-debt-mode', enabled);

  const toggle = document.getElementById('toggle-simplified-debt');
  if (toggle) toggle.checked = enabled;

  const projectName = state.settings.projectName || 'دفتر المبيعات';
  const headerName = document.getElementById('header-app-name');
  if (headerName) {
    headerName.innerText = enabled ? (projectName === 'دفتر المبيعات' ? 'دفتر الديون' : projectName) : projectName;
  }

  const btnNewSaleDeskText = document.getElementById('btn-new-sale-desktop-text');
  if (btnNewSaleDeskText) btnNewSaleDeskText.innerText = enabled ? 'دين جديد' : 'بيع جديد';

  const btnCustAddSaleText = document.getElementById('btn-cust-add-sale-text');
  if (btnCustAddSaleText) btnCustAddSaleText.innerText = enabled ? 'تسجيل دين' : 'تسجيل بيع';

  const salesPageTitle = document.getElementById('sales-page-title');
  if (salesPageTitle) salesPageTitle.innerText = enabled ? 'سجل الديون' : 'سجل العمليات';

  const salesPageSubtitle = document.getElementById('sales-page-subtitle');
  if (salesPageSubtitle) salesPageSubtitle.innerText = enabled ? 'جميع الديون والتسديدات' : 'جميع المبيعات والتسديدات';

  const salesSectionTitle = document.getElementById('sales-section-title');
  if (salesSectionTitle) salesSectionTitle.innerText = enabled ? 'السجل المالي' : 'السجل المالي';

  const summaryMainLabel = document.getElementById('summary-main-label');
  if (summaryMainLabel) summaryMainLabel.innerText = enabled ? 'إجمالي الديون' : 'إجمالي المبيعات';

  const cardTotalPaidDash = document.getElementById('card-total-paid-dash');
  const cardTotalDebtDash = document.getElementById('card-total-debt-dash');
  if (cardTotalPaidDash) cardTotalPaidDash.style.display = enabled ? 'block' : 'none';
  if (cardTotalDebtDash) cardTotalDebtDash.style.display = enabled ? 'block' : 'none';

  const metricLabelDebt = document.getElementById('metric-label-debt');
  if (metricLabelDebt) metricLabelDebt.innerText = enabled ? 'الديون المعلقة' : 'المستحقات المعلقة';

  const sectionHeadUnsettledTitle = document.getElementById('section-head-unsettled-title');
  if (sectionHeadUnsettledTitle) sectionHeadUnsettledTitle.innerText = enabled ? 'الديون المعلقة' : 'ديون ومستحقات معلقة';

  const custDetailSalesLabel = document.getElementById('cust-detail-sales-label');
  if (custDetailSalesLabel) custDetailSalesLabel.innerText = enabled ? 'إجمالي الديون' : 'إجمالي المشتريات';

  const custFilterSales = document.getElementById('cust-filter-sales');
  if (custFilterSales) custFilterSales.innerText = enabled ? 'الديون' : 'المبيعات';

  const saleCustomerLockedLabel = document.getElementById('sale-customer-locked-label');
  if (saleCustomerLockedLabel) saleCustomerLockedLabel.innerText = enabled ? 'الزبون' : 'البيع للزبون';

  const salePaidLabel = document.getElementById('sale-paid-label');
  if (salePaidLabel) salePaidLabel.innerText = enabled ? 'دفعة مقدمة (اختياري)' : 'المبلغ المدفوع';

  const saleTotalLabel = document.getElementById('sale-total-label');
  if (saleTotalLabel) saleTotalLabel.innerText = enabled ? 'إجمالي الدين' : 'إجمالي الفاتورة';

  const saleSubmitBtnText = document.getElementById('sale-submit-btn-text');
  if (saleSubmitBtnText) saleSubmitBtnText.innerText = enabled ? 'حفظ العملية' : 'حفظ عملية البيع';

  document.querySelectorAll('#sale-materials-list .material-name').forEach(inp => {
    inp.placeholder = enabled ? 'اكتب اسم المادة فقط' : 'ابحث أو اكتب اسم المادة';
  });

  if (state.currentSalesFilter === 'sales_only' && enabled) {
    state.currentSalesFilter = 'all';
  }

  renderDashboard();
  if (document.getElementById('page-sales')?.classList.contains('active')) renderSales();
  if (document.getElementById('page-customer-detail')?.classList.contains('active') && state.selectedCustomerIdForDetail) {
    renderCustomerDetailDOM(state.selectedCustomerIdForDetail);
  }
}

function toggleSimplifiedDebtMode(enabled) {
  state.settings.simplifiedDebtMode = !!enabled;
  StorageService.saveSettings(state.settings);
  applySimplifiedDebtMode();
  logActivity('system_mode', enabled ? 'تفعيل نظام الديون المبسط' : 'إلغاء نظام الديون المبسط', '');
  showToast(enabled ? 'تم تفعيل نظام الديون المبسط' : 'تم إلغاء نظام الديون المبسط');
}

function toggleTheme() {
  const current = document.body.getAttribute('data-theme') || 'light';
  setThemeMode(current === 'light' ? 'dark' : 'light');
}

function setThemeMode(mode) {
  const newTheme = mode === 'dark' ? 'dark' : 'light';
  if (state.settings.theme === newTheme) return;

  document.body.setAttribute('data-theme', newTheme);
  state.settings.theme = newTheme;
  StorageService.saveSettings(state.settings);
  updateThemeUI();
}

function updateThemeUI() {
  const theme = state.settings.theme || 'light';

  // نص حالة المظهر (القديم — احتياطي)
  const label = document.getElementById('theme-label');
  if (label) label.innerText = theme === 'dark' ? 'داكن' : 'فاتح';

  // أيقونة الهيدر
  const themeIcon = document.getElementById('theme-icon');
  if (themeIcon) {
    const iconUse = themeIcon.querySelector('use');
    if (iconUse) {
      iconUse.setAttribute('href', theme === 'dark' ? '#icon-sun' : '#icon-moon');
    }
  }

  // سويتش المظهر في الإعدادات
  const switcher = document.getElementById('theme-switch');
  if (switcher) {
    switcher.classList.remove('light', 'dark');
    switcher.classList.add(theme);
  }
}

    function buildItemsCatalog() {
      const map = new Map();
      state.purchases.forEach(p => {
        const items = Array.isArray(p.items) ? p.items : [];
        items.forEach(it => {
          const name = (it.name || '').trim();
          if (!name) return;
          const key = name.toLowerCase();
          if (!map.has(key)) {
            map.set(key, { name: name, categories: new Set() });
          }
          if (p.category) map.get(key).categories.add(p.category);
        });
      });
      return Array.from(map.values()).map(v => ({
        name: v.name,
        categories: Array.from(v.categories)
      })).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }

    function searchItemsCatalog(query) {
      const all = buildItemsCatalog();
      if (!query || !query.trim()) return all.slice(0, 15);
      const q = query.trim().toLowerCase();
      return all.filter(it => it.name.toLowerCase().includes(q)).slice(0, 15);
    }

    function updateDashboardDate() {
      const d = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const dateStr = d.toLocaleDateString('ar-IQ', options);
      const el = document.getElementById('dashboard-date');
      if (el) el.innerText = dateStr;
    }
        function renderDashboard() {
      let totalSales = 0, totalPaid = 0, totalDebt = 0;
      state.sales.forEach(s => {
        if (s.type !== 'repayment') {
          totalSales += Number(s.price) || 0;
          totalPaid += Number(s.paid) || 0;
          totalDebt += Number(s.remaining) || 0;
        }
      });

      const totalPurchasesCost = state.purchases.reduce((acc, p) => acc + (Number(p.cost) || 0), 0);
      const rawProfit = totalSales - totalPurchasesCost;
      const netProfit = Math.max(0, rawProfit);

      const statSales = document.getElementById('stat-total-sales');
      if (statSales) statSales.innerText = formatCurrencyFull(isDebtMode() ? totalDebt : totalSales);
      document.getElementById('stat-total-paid').innerText = formatCurrencyFull(totalPaid);
      document.getElementById('stat-total-debt').innerText = formatCurrencyFull(totalDebt);
      document.getElementById('stat-total-purchases').innerText = formatCurrencyFull(totalPurchasesCost);
      document.getElementById('stat-net-profit').innerText = formatCurrencyFull(netProfit);

      const statPaidDash = document.getElementById('stat-total-paid-dash');
      const statDebtDash = document.getElementById('stat-total-debt-dash');
      if (statPaidDash) statPaidDash.innerText = formatCurrencyFull(totalPaid);
      if (statDebtDash) statDebtDash.innerText = formatCurrencyFull(totalDebt);
      
      document.getElementById('stat-customers-count').innerText = state.customers.length;
      document.getElementById('stat-sales-count').innerText = state.sales.filter(s => s.type !== 'repayment').length;

      const custBadge = document.getElementById('customers-badge-count');
      if (custBadge) custBadge.innerText = state.customers.length;

      const unsettled = state.sales.filter(s => s.type !== 'repayment' && Number(s.remaining) > 0);
      const unsettledContainer = document.getElementById('unsettled-sales-list');
      if (unsettled.length === 0) {
        unsettledContainer.innerHTML = '<div class="empty-state"><svg class="app-icon"><use href="#icon-check"/></svg><p>لا توجد مستحقات معلقة</p></div>';
      } else {
        unsettledContainer.innerHTML = unsettled.slice(0, 5).map(s => renderSaleCardHTML(s, false)).join('');
      }
    }

    function renderSaleCardHTML(s, isCustomerDetail = false) {
      const cust = state.customers.find(c => c.id === s.customerId);
      const customerName = cust ? cust.name : (s.customerName || 'زبون سابق');
      const debtMode = isDebtMode();

      if (s.type === 'repayment') {
        const amountPaid = Number(s.amount || s.paid) || 0;
        const mainTitle = isCustomerDetail ? (s.notes || s.description || 'تسديد دفعة') : customerName;
        const subTitle = isCustomerDetail ? (debtMode ? '' : 'دفعة تسديد') : (s.notes || s.description || 'تسديد دفعة');

        return `
          <div class="list-item sale-repay" onclick="${isCustomerDetail ? '' : `openCustomerDetail('${s.customerId}')`}">
            <div class="item-head">
              <div style="flex:1;">
                <div class="item-title">${escapeHTML(mainTitle)}</div>
                ${subTitle ? `<div class="item-subtitle">${escapeHTML(subTitle)}</div>` : ''}
              </div>
              <div class="item-actions">
                <span class="badge badge-repay">تسديد</span>
                <button class="mini-btn" onclick="event.stopPropagation(); openEditRepaymentModal('${s.id}')" title="تعديل">
                  <svg class="app-icon"><use href="#icon-edit"/></svg>
                </button>
                <button class="mini-btn danger" onclick="event.stopPropagation(); confirmDeleteRepayment('${s.id}')" title="حذف">
                  <svg class="app-icon"><use href="#icon-delete"/></svg>
                </button>
              </div>
            </div>
            <div class="item-foot">
              <span class="item-amount repay num">+ ${formatCurrencyFull(amountPaid)}</span>
              <span class="num">${formatDate(s.date)}</span>
            </div>
          </div>
        `;
      }

      let badgeClass = 'badge-paid';
      let badgeText = 'مدفوع';
      let borderClass = 'sale-paid';

      if (s.remaining > 0 && s.paid === 0) {
        badgeClass = 'badge-debt'; badgeText = 'دين'; borderClass = 'sale-debt';
      } else if (s.remaining > 0 && s.paid > 0) {
        badgeClass = 'badge-partial'; badgeText = 'مدفوع جزئي'; borderClass = 'sale-partial';
      }

      const saleDesc = s.description || 'مادة';
      const mainTitle = isCustomerDetail ? saleDesc : customerName;
      const subTitle = isCustomerDetail ? (debtMode ? '' : (s.notes || 'عملية بيع')) : saleDesc;

      return `
        <div class="list-item ${borderClass}" onclick="${isCustomerDetail ? '' : `openCustomerDetail('${s.customerId}')`}">
          <div class="item-head">
            <div style="flex:1;">
              <div class="item-title">${escapeHTML(mainTitle)}</div>
              ${subTitle ? `<div class="item-subtitle ${debtMode && isCustomerDetail ? 'sale-card-subtitle-hidden' : ''}">${escapeHTML(subTitle)}</div>` : ''}
            </div>
            <div class="item-actions">
              <span class="badge badge-paid ${badgeClass}">${badgeText}</span>
              <button class="mini-btn" onclick="event.stopPropagation(); openEditSaleModal('${s.id}')" title="تعديل">
                <svg class="app-icon"><use href="#icon-edit"/></svg>
              </button>
              <button class="mini-btn danger" onclick="event.stopPropagation(); confirmDeleteSale('${s.id}')" title="حذف">
                <svg class="app-icon"><use href="#icon-delete"/></svg>
              </button>
            </div>
          </div>
          <div class="item-foot">
            <div style="display:flex; align-items:center; gap:4px; flex-wrap:wrap;">
              <span class="item-amount num">${formatCurrencyFull(s.price)}</span>
              ${s.remaining > 0 ? `<span class="item-amount danger num" style="font-size:12px; margin-right:6px;">متبقي ${formatCurrencyFull(s.remaining)}</span>` : ''}
            </div>
            <span class="num">${formatDate(s.date)}</span>
          </div>
        </div>
      `;
    }

    function setSalesFilter(filterType, btn) {
      document.querySelectorAll('#page-sales .filter-btn').forEach(p => p.classList.remove('active'));
      if(btn) btn.classList.add('active');
      state.currentSalesFilter = filterType;
      renderSales();
    }

    function renderSales() {
      const container = document.getElementById('all-sales-list');
      const searchVal = (document.getElementById('sales-search')?.value || '').trim().toLowerCase();
      let list = [...state.sales];

      if (state.currentSalesFilter === 'sales_only') list = list.filter(s => s.type !== 'repayment');
      else if (state.currentSalesFilter === 'repayments_only') list = list.filter(s => s.type === 'repayment');
      else if (state.currentSalesFilter === 'debt') list = list.filter(s => s.type !== 'repayment' && s.remaining > 0 && s.paid === 0);
      else if (state.currentSalesFilter === 'partial') list = list.filter(s => s.type !== 'repayment' && s.remaining > 0 && s.paid > 0);
      else if (state.currentSalesFilter === 'paid') list = list.filter(s => s.type !== 'repayment' && s.remaining === 0);

      if (searchVal) {
        list = list.filter(s => {
          const c = state.customers.find(cust => cust.id === s.customerId);
          const cName = c ? c.name.toLowerCase() : (s.customerName || '').toLowerCase();
          const desc = (s.description || '').toLowerCase();
          const notes = (s.notes || '').toLowerCase();
          return cName.includes(searchVal) || desc.includes(searchVal) || notes.includes(searchVal);
        });
      }

      if (list.length === 0) {
        container.innerHTML = '<div class="empty-state"><svg class="app-icon"><use href="#icon-receipt"/></svg><p>لا توجد نتائج</p></div>';
        return;
      }
      container.innerHTML = list.map(s => renderSaleCardHTML(s, false)).join('');
    }

    function renderPurchases() {
      const container = document.getElementById('purchases-list');
      const q = (document.getElementById('purchases-search')?.value || '').trim().toLowerCase();
      let list = [...state.purchases];

      const totalCost = list.reduce((acc, p) => acc + (Number(p.cost) || 0), 0);
      document.getElementById('purchases-total-amount').innerText = formatCurrencyFull(totalCost);

      if (q) {
        list = list.filter(p => {
          const cat = (p.category || '').toLowerCase();
          const notes = (p.notes || '').toLowerCase();
          const itemsText = Array.isArray(p.items) ? p.items.map(i => (i.name || '').toLowerCase()).join(' ') : '';
          return cat.includes(q) || notes.includes(q) || itemsText.includes(q);
        });
      }

      if (list.length === 0) {
        container.innerHTML = '<div class="empty-state"><svg class="app-icon"><use href="#icon-inventory"/></svg><p>لا توجد مشتريات مسجلة</p></div>';
        return;
      }

      container.innerHTML = list.map(p => {
        const itemsCount = Array.isArray(p.items) ? p.items.length : 0;
        const cat = p.category || 'بضاعة عامة';
        const itemNames = Array.isArray(p.items) && p.items.length > 0
          ? p.items.slice(0, 3).map(i => i.name).join('، ') + (p.items.length > 3 ? '...' : '')
          : 'بدون مواد';

        return `
          <div class="list-item purchase" onclick="openPurchaseDetail('${p.id}')">
            <div class="item-head">
              <div style="flex:1;">
                <div class="item-title">${escapeHTML(cat)}</div>
                <div class="item-subtitle">${escapeHTML(itemNames)}</div>
              </div>
              <div class="item-actions">
                <span class="badge badge-brand">${itemsCount} مواد</span>
                <button class="mini-btn" onclick="event.stopPropagation(); openEditPurchaseModal('${p.id}')" title="تعديل">
                  <svg class="app-icon"><use href="#icon-edit"/></svg>
                </button>
                <button class="mini-btn danger" onclick="event.stopPropagation(); confirmDeletePurchase('${p.id}')" title="حذف">
                  <svg class="app-icon"><use href="#icon-delete"/></svg>
                </button>
              </div>
            </div>
            <div class="item-foot">
              <span class="item-amount brand num">${formatCurrencyFull(p.cost)}</span>
              <span class="num">${formatDate(p.date)}</span>
            </div>
          </div>
        `;
      }).join('');
    }

    function openPurchaseDetail(purchaseId) {
      const p = state.purchases.find(item => item.id === purchaseId);
      if (!p) return;
      
      state.currentPurchaseDetailId = purchaseId;
      document.getElementById('pd-category').innerText = p.category || 'بضاعة عامة';
      document.getElementById('pd-total').innerText = formatCurrencyFull(p.cost);
      
      const items = Array.isArray(p.items) ? p.items : [];
      document.getElementById('pd-items-count').innerText = items.length;
      
      const itemsListEl = document.getElementById('pd-items-list');
      if (items.length === 0) {
        itemsListEl.innerHTML = '<div style="text-align:center; padding: 12px; color: var(--text-muted); font-size: 12.5px;">لا توجد مواد</div>';
      } else {
        itemsListEl.innerHTML = items.map(it => `
          <div class="pd-item-row">
            <span class="name">${escapeHTML(it.name || '—')}</span>
            <span class="price num">${formatCurrencyFull(it.price)}</span>
          </div>
        `).join('');
      }

      const notesWrap = document.getElementById('pd-notes-wrap');
      const notesEl = document.getElementById('pd-notes');
      if (p.notes && p.notes.trim()) {
        notesWrap.style.display = 'block';
        notesEl.innerText = p.notes;
      } else {
        notesWrap.style.display = 'none';
      }

      openModal('modal-purchase-detail');
    }

    function editPurchaseFromDetail() {
      const id = state.currentPurchaseDetailId;
      closeModal('modal-purchase-detail');
      setTimeout(() => { if (id) openEditPurchaseModal(id); }, 150);
    }

    function deletePurchaseFromDetail() {
      const id = state.currentPurchaseDetailId;
      if (!id) return;
      closeModal('modal-purchase-detail');
      setTimeout(() => { confirmDeletePurchase(id); }, 150);
    }

    function openPurchaseModal() {
      document.getElementById('purchase-modal-title').innerText = 'إضافة مشتريات';
      document.getElementById('purchase-id').value = '';
      document.getElementById('purchase-category').value = '';
      document.getElementById('purchase-notes').value = '';
      document.getElementById('purchase-form-error').classList.remove('show');
      
      const list = document.getElementById('purchase-materials-list');
      list.innerHTML = '';
      addPurchaseMaterialRow();
      
      updatePurchaseTotalPreview();
      document.getElementById('purchase-submit-btn').innerHTML = '<svg class="app-icon"><use href="#icon-check"/></svg> حفظ المشتريات';
      openModal('modal-purchase');
    }

    function openEditPurchaseModal(purchaseId) {
      const p = state.purchases.find(item => item.id === purchaseId);
      if (!p) return;
      
      document.getElementById('purchase-modal-title').innerText = 'تعديل المشتريات';
      document.getElementById('purchase-id').value = p.id;
      document.getElementById('purchase-category').value = p.category || '';
      document.getElementById('purchase-notes').value = p.notes || '';
      
      const list = document.getElementById('purchase-materials-list');
      list.innerHTML = '';
      const items = Array.isArray(p.items) && p.items.length > 0 ? p.items : [{ name: '', price: '' }];
      items.forEach(it => addPurchaseMaterialRow(it.name, it.price));
      
      updatePurchaseTotalPreview();
      document.getElementById('purchase-form-error').classList.remove('show');
      document.getElementById('purchase-submit-btn').innerHTML = '<svg class="app-icon"><use href="#icon-check"/></svg> حفظ التعديلات';
      openModal('modal-purchase');
    }

    function addPurchaseMaterialRow(name = '', price = '') {
      const list = document.getElementById('purchase-materials-list');
      const row = document.createElement('div');
      row.className = 'material-row';
      const formattedPrice = price !== '' ? formatNumberWithCommas(rawNum(price)) : '';
      row.innerHTML = `
        <input type="text" class="form-input material-name" placeholder="اسم المادة" value="${escapeHTML(String(name))}">
        <input type="text" class="form-input price-input material-price" placeholder="السعر" value="${formattedPrice}" oninput="handleFormattedInput(this, updatePurchaseTotalPreview)">
        <button type="button" class="remove-row-btn" onclick="removePurchaseMaterialRow(this)" title="حذف">
          <svg class="app-icon"><use href="#icon-close"/></svg>
        </button>
      `;
      row.querySelector('.material-name').addEventListener('input', updatePurchaseTotalPreview);
      list.appendChild(row);
      updatePurchaseTotalPreview();
    }

    function removePurchaseMaterialRow(btn) {
      const list = document.getElementById('purchase-materials-list');
      if (list.children.length <= 1) {
        const row = list.children[0];
        row.querySelector('.material-name').value = '';
        row.querySelector('.material-price').value = '';
        updatePurchaseTotalPreview();
        return;
      }
      btn.closest('.material-row').remove();
      updatePurchaseTotalPreview();
    }

    function collectPurchaseMaterials() {
      const rows = document.querySelectorAll('#purchase-materials-list .material-row');
      const items = [];
      rows.forEach(row => {
        const name = row.querySelector('.material-name').value.trim();
        const price = rawNum(row.querySelector('.material-price').value);
        if (name) items.push({ name: name, price: price });
      });
      return items;
    }

    function updatePurchaseTotalPreview() {
      const items = collectPurchaseMaterials();
      const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
      document.getElementById('purchase-total-preview').innerText = formatCurrencyFull(total);
    }

    function handleSavePurchase(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('purchase-submit-btn');
      if (submitBtn && submitBtn.disabled) return;

      const pId = document.getElementById('purchase-id').value.trim();
      const category = document.getElementById('purchase-category').value.trim();
      const notes = document.getElementById('purchase-notes').value.trim();
      const items = collectPurchaseMaterials();

      const errorNotice = document.getElementById('purchase-form-error');
      const errorText = document.getElementById('purchase-form-error-text');

      if (!category) {
        errorText.innerText = 'يرجى كتابة نوع الصنف';
        errorNotice.classList.add('show');
        return;
      }
      if (items.length === 0) {
        errorText.innerText = 'يرجى إضافة مادة واحدة على الأقل';
        errorNotice.classList.add('show');
        return;
      }
      const totalCost = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
      if (totalCost <= 0) {
        errorText.innerText = 'يجب أن يكون مجموع الأسعار أكبر من الصفر';
        errorNotice.classList.add('show');
        return;
      }
      errorNotice.classList.remove('show');

      if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
      try {
        if (pId) {
          const p = state.purchases.find(item => item.id === pId);
          if (p) {
            p.category = category;
            p.items = items;
            p.cost = totalCost;
            p.notes = notes;
            StorageService.savePurchases(state.purchases);
            logActivity('purchase_edit', 'تعديل فاتورة مشتريات', `${category} - ${formatCurrencyFull(totalCost)}`);
            showToast('تم تعديل المشتريات');
          }
        } else {
          const newP = {
            id: 'p_' + Date.now(),
            category: category,
            items: items,
            cost: totalCost,
            notes: notes,
            date: new Date().toISOString()
          };
          state.purchases.unshift(newP);
          StorageService.savePurchases(state.purchases);
          logActivity('purchase_add', 'إضافة فاتورة مشتريات', `${category} - ${formatCurrencyFull(totalCost)}`);
          showToast('تم تسجيل المشتريات');
        }

        closeModal('modal-purchase');
        renderPurchases();
        renderDashboard();
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
      }
    }

    function confirmDeletePurchase(purchaseId) {
      const p = state.purchases.find(item => item.id === purchaseId);
      if (!p) return;
      const cat = p.category || 'البضاعة';
      const costVal = p.cost;
      openCustomDialog({
        title: 'حذف المشتريات',
        desc: `سيتم حذف "${cat}" بكل موادها. هل تريد المتابعة؟`,
        onConfirm: () => {
          state.purchases = state.purchases.filter(item => item.id !== purchaseId);
          StorageService.savePurchases(state.purchases);
          logActivity('purchase_delete', 'حذف فاتورة مشتريات', `${cat} - ${formatCurrencyFull(costVal)}`);
          showToast('تم حذف المشتريات');
          renderPurchases();
          renderDashboard();
        }
      });
    }
    
        function setCustomerListFilter(filterType, btn) {
      document.querySelectorAll('#page-customers .filter-btn').forEach(p => p.classList.remove('active'));
      if(btn) btn.classList.add('active');
      state.customerListFilter = filterType;
      renderCustomers();
    }

    function renderCustomers() {
      const container = document.getElementById('customers-list');
      const q = (document.getElementById('customer-search')?.value || '').trim().toLowerCase();

      let list = state.customers.map(c => {
        const custSales = state.sales.filter(s => s.customerId === c.id && s.type !== 'repayment');
        const debt = custSales.reduce((acc, cur) => acc + (Number(cur.remaining) || 0), 0);
        const totalPurchases = custSales.reduce((acc, cur) => acc + (Number(cur.price) || 0), 0);
        return { ...c, debt, totalPurchases, opsCount: custSales.length };
      });

      if (state.customerListFilter === 'debtors') {
        list = list.filter(c => c.debt > 0);
        list.sort((a,b) => b.debt - a.debt);
      } else if (state.customerListFilter === 'cleared') {
        list = list.filter(c => c.debt === 0);
      }

      if (q) {
        list = list.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
      }

      document.getElementById('customers-badge-count').innerText = state.customers.length;

      if (list.length === 0) {
        container.innerHTML = '<div class="empty-state"><svg class="app-icon"><use href="#icon-group"/></svg><p>لا يوجد زبائن</p></div>';
        return;
      }

      const debtMode = isDebtMode();
      container.innerHTML = list.map(c => `
        <div class="list-item ${c.debt > 0 ? 'customer-debt' : 'customer-clear'}" onclick="openCustomerDetail('${c.id}')">
          <div class="item-head" style="margin-bottom: 6px;">
            <div class="item-title" style="font-size: 14.5px;">${escapeHTML(c.name)}</div>
            ${c.debt > 0 ? `<span class="badge badge-debt num">${formatCurrencyFull(c.debt)}</span>` : '<span class="badge badge-paid">مسدد</span>'}
          </div>
          <div class="item-foot" style="padding-top: 6px; margin-top: 0; border-top: none;">
            <span>${c.opsCount} ${debtMode ? 'ديون' : 'عمليات'}${c.totalPurchases > 0 ? ` • ${formatCurrencyFull(c.totalPurchases)}` : ''}</span>
            <span class="num" style="direction:ltr;">${c.phone ? escapeHTML(c.phone) : '—'}</span>
          </div>
        </div>
      `).join('');
    }

    function renderCustomerDetailDOM(customerId) {
      const c = state.customers.find(item => item.id === customerId);
      if(!c) return;

      reconcileCustomerDebts(customerId);
      state.customerHistoryFilter = 'all';
      document.querySelectorAll('#cust-filter-row .filter-btn').forEach(btn => btn.classList.remove('active'));
      const allFilterBtn = document.getElementById('cust-filter-all');
      if (allFilterBtn) allFilterBtn.classList.add('active');

      document.getElementById('cust-detail-name').innerText = c.name;
      document.getElementById('cust-detail-phone').innerText = c.phone ? `هاتف: ${c.phone}` : 'بدون هاتف';
      document.getElementById('cust-detail-notes').innerText = c.notes ? `ملاحظة: ${c.notes}` : '';

      const pureSales = state.sales.filter(s => s.customerId === customerId && s.type !== 'repayment');
      let totalPurchases = 0, totalPaid = 0, totalDebt = 0;

      pureSales.forEach(s => {
        totalPurchases += Number(s.price) || 0;
        totalPaid += Number(s.paid) || 0;
        totalDebt += Number(s.remaining) || 0;
      });

      const debtEl = document.getElementById('cust-detail-debt');
      debtEl.innerText = formatCurrencyFull(totalDebt);
      if (totalDebt === 0) debtEl.classList.add('zero');
      else debtEl.classList.remove('zero');
      
      document.getElementById('cust-detail-sales').innerText = formatCurrencyFull(totalPurchases);
      document.getElementById('cust-detail-paid').innerText = formatCurrencyFull(totalPaid);

      renderCustomerHistoryList();
    }

    function openCustomerDetail(customerId) {
      state.selectedCustomerIdForDetail = customerId;
      renderCustomerDetailDOM(customerId);
      openSubPage('customer-detail');
    }

    function toggleCustomerFilterRow() {
      document.getElementById('cust-filter-row').classList.toggle('show');
    }

    function setCustomerHistoryFilter(filterType) {
      state.customerHistoryFilter = filterType;
      document.querySelectorAll('#cust-filter-row .filter-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = document.getElementById('cust-filter-' + filterType);
      if (activeBtn) activeBtn.classList.add('active');
      renderCustomerHistoryList();
    }

/* ============================================================
   CUSTOMER HISTORY: VIEW MODE (CARDS / TABLE)
   ============================================================ */

function getCustomerViewMode() {
  return (state.settings && state.settings.customerViewMode) || 'cards';
}

function toggleCustomerViewMenu(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('cust-view-menu');
  if (!menu) return;
  const willOpen = !menu.classList.contains('show');
  menu.classList.toggle('show', willOpen);
  if (willOpen) {
    menu.querySelectorAll('.view-mode-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === getCustomerViewMode());
    });
  }
}

function closeCustomerViewMenu() {
  const menu = document.getElementById('cust-view-menu');
  if (menu) menu.classList.remove('show');
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('cust-view-menu');
  const btn = document.getElementById('btn-cust-view');
  if (!menu || !menu.classList.contains('show')) return;
  if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
  menu.classList.remove('show');
});

function setCustomerViewMode(mode) {
  if (mode !== 'cards' && mode !== 'table') return;
  state.settings.customerViewMode = mode;
  StorageService.saveSettings(state.settings);
  closeCustomerViewMenu();
  renderCustomerHistoryList();
  showToast(mode === 'table' ? 'تم التبديل إلى عرض الجدول' : 'تم التبديل إلى عرض الكروت');
}

function renderCustomerHistoryList() {
  const customerId = state.selectedCustomerIdForDetail;
  const listContainer = document.getElementById('cust-detail-sales-list');
  if (!listContainer) return;

  let allCustRecords = state.sales.filter(s => s.customerId === customerId);
  allCustRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (state.customerHistoryFilter === 'sales') allCustRecords = allCustRecords.filter(s => s.type !== 'repayment');
  else if (state.customerHistoryFilter === 'repayments') allCustRecords = allCustRecords.filter(s => s.type === 'repayment');
  else if (state.customerHistoryFilter === 'debts') allCustRecords = allCustRecords.filter(s => s.type !== 'repayment' && Number(s.remaining) > 0);

  const mode = getCustomerViewMode();

  if (mode === 'table') {
    listContainer.innerHTML = renderCustomerHistoryTableHTML(allCustRecords);
    if (allCustRecords.length > 0) initCustomerTableInteractions();
    return;
  }

  // Cards mode
  if (allCustRecords.length === 0) {
    listContainer.innerHTML = '<div class="empty-state"><p>لا توجد سجلات</p></div>';
  } else {
    listContainer.innerHTML = allCustRecords.map(s => renderSaleCardHTML(s, true)).join('');
  }
}

function renderCustomerHistoryTableHTML(records) {
  if (records.length === 0) {
    return '<div class="empty-state"><svg class="app-icon"><use href="#icon-list"/></svg><p>لا توجد سجلات</p></div>';
  }

  let sumPrice = 0, sumPaid = 0, sumDebt = 0;

  const rowsHtml = records.map(t => {
    if (t.type === 'repayment') {
      const amount = Number(t.amount || t.paid) || 0;
      sumPaid += amount;
      const label = t.notes || t.description || 'تسديد دفعة';
      return `
        <tr class="cust-row-repay" data-id="${t.id}" data-type="repayment">
          <td><span class="cust-mat-name">${escapeHTML(label)}</span></td>
          <td></td>
          <td><span class="badge badge-repay">تسديد</span></td>
          <td class="cust-num cust-num-paid">${formatCurrencyFull(amount)}</td>
          <td></td>
          <td class="cust-date-cell">${formatDateOnly(t.date)}</td>
        </tr>
      `;
    }

    const price = Number(t.price) || 0;
    const paid = Number(t.paid) || 0;
    const remaining = Number(t.remaining) || 0;
    sumPrice += price;
    sumPaid += paid;
    sumDebt += remaining;

    let badgeClass, badgeText;
    if (remaining === 0) { badgeClass = 'badge-paid'; badgeText = 'مدفوع كامل'; }
    else if (paid > 0) { badgeClass = 'badge-partial'; badgeText = 'مدفوع جزئي'; }
    else { badgeClass = 'badge-debt'; badgeText = 'دين'; }

    return `
      <tr data-id="${t.id}" data-type="sale">
        <td><span class="cust-mat-name">${escapeHTML(t.description || 'مادة')}</span></td>
        <td class="cust-num cust-num-price">${formatCurrencyFull(price)}</td>
        <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        <td class="cust-num cust-num-paid">${formatCurrencyFull(paid)}</td>
        <td class="cust-num ${remaining > 0 ? 'cust-num-remaining' : ''}">${remaining > 0 ? formatCurrencyFull(remaining) : '—'}</td>
        <td class="cust-date-cell">${formatDateOnly(t.date)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="cust-table-viewport">
      <div class="cust-table-toolbar">
        <div class="cust-zoom-group" id="cust-zoom-group">
          <div class="cust-zoom-actions-wrap">
            <button type="button" class="cust-zoom-action" onclick="custChangeZoom(-0.1)" title="تصغير">
              <svg class="app-icon"><use href="#icon-minus"/></svg>
            </button>
            <button type="button" class="cust-zoom-action" onclick="custChangeZoom(0.1)" title="تكبير">
              <svg class="app-icon"><use href="#icon-add"/></svg>
            </button>
          </div>
          <button type="button" class="cust-zoom-toggle" onclick="custToggleZoomGroup()" title="تحكم بحجم الجدول">
            <svg class="app-icon"><use href="#icon-zoom"/></svg>
          </button>
        </div>
      </div>
      <div class="cust-zoom-scroll" id="cust-zoom-scroll">
        <div class="cust-zoom-wrapper" id="cust-zoom-wrapper">
          <div class="cust-zoom-content" id="cust-zoom-content">
            <table class="cust-data-table">
              <thead>
                <tr>
                  <th>${isDebtMode() ? 'البيان' : 'المادة'}</th>
                  <th>السعر</th>
                  <th>الحالة</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
              <tfoot>
                <tr>
                  <td><span class="cust-foot-label">المجموع</span></td>
                  <td class="cust-val-brand">${formatCurrencyFull(sumPrice)}</td>
                  <td></td>
                  <td class="cust-val-success">${formatCurrencyFull(sumPaid)}</td>
                  <td class="cust-val-danger">${formatCurrencyFull(sumDebt)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ============ Zoom logic (per-table) ============ */
let custCurrentScale = 1;
let custIsPinching = false;
let custInitialDistance = 0;
let custInitialScale = 1;
let custZoomTimer = null;
const CUST_MAX_SCALE = 1.6;

function custApplyScale(scale) {
  const contentEl = document.getElementById('cust-zoom-content');
  const wrapperEl = document.getElementById('cust-zoom-wrapper');
  const scrollEl = document.getElementById('cust-zoom-scroll');
  if (!contentEl || !wrapperEl || !scrollEl) return;

  contentEl.style.transform = 'none';
  contentEl.style.minWidth = '0px';
  const naturalW = contentEl.offsetWidth;
  const naturalH = contentEl.offsetHeight;

  const viewportW = scrollEl.clientWidth;
  const baseW = Math.max(naturalW, viewportW);
  const minScale = naturalW > viewportW ? viewportW / naturalW : 1;
  const clamped = Math.max(minScale, Math.min(CUST_MAX_SCALE, scale));

  contentEl.style.minWidth = baseW + 'px';
  contentEl.style.transform = `scale(${clamped})`;

  wrapperEl.style.width = (baseW * clamped) + 'px';
  wrapperEl.style.height = (naturalH * clamped) + 'px';

  custCurrentScale = clamped;
}

function custChangeZoom(delta) {
  custApplyScale(custCurrentScale + delta);
  custRestartZoomTimer();
}

function custToggleZoomGroup() {
  const group = document.getElementById('cust-zoom-group');
  if (!group) return;
  const isExpanded = group.classList.toggle('expanded');
  if (custZoomTimer) clearTimeout(custZoomTimer);
  if (isExpanded) {
    custZoomTimer = setTimeout(() => group.classList.remove('expanded'), 4000);
  }
}

function custRestartZoomTimer() {
  const group = document.getElementById('cust-zoom-group');
  if (!group || !group.classList.contains('expanded')) return;
  if (custZoomTimer) clearTimeout(custZoomTimer);
  custZoomTimer = setTimeout(() => group.classList.remove('expanded'), 4000);
}

function custGetDistance(t1, t2) {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function initCustomerTableInteractions() {
  // Reset scale state
  custCurrentScale = 1;
  custIsPinching = false;

  const scrollEl = document.getElementById('cust-zoom-scroll');
  if (!scrollEl) return;

  // Zoom: pinch
  scrollEl.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      custIsPinching = true;
      custInitialDistance = custGetDistance(e.touches[0], e.touches[1]);
      custInitialScale = custCurrentScale;
      e.preventDefault();
    }
  }, { passive: false });

  scrollEl.addEventListener('touchmove', (e) => {
    if (custIsPinching && e.touches.length === 2) {
      const d = custGetDistance(e.touches[0], e.touches[1]);
      custApplyScale(custInitialScale * (d / custInitialDistance));
      e.preventDefault();
    }
  }, { passive: false });

  scrollEl.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) custIsPinching = false;
  });

  // Zoom: ctrl + wheel
  scrollEl.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      custApplyScale(custCurrentScale - e.deltaY * 0.002);
    }
  }, { passive: false });

  // Row click → popup
  scrollEl.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      openCustRowPopup(e, row);
    });
  });

  // Apply initial scale fit-to-width
  requestAnimationFrame(() => {
    requestAnimationFrame(() => custApplyScale(1));
  });
}

/* ============ Row popup ============ */
let custActiveRowId = null;
let custActiveRowType = null;
let custActiveRowEl = null;

function openCustRowPopup(e, rowEl) {
  closeCustRowPopup();
  custActiveRowId = rowEl.getAttribute('data-id');
  custActiveRowType = rowEl.getAttribute('data-type');
  custActiveRowEl = rowEl;
  rowEl.classList.add('cust-row-selected');

  const popup = document.getElementById('cust-row-popup');
  const backdrop = document.getElementById('cust-popup-backdrop');
  popup.classList.add('show');
  backdrop.classList.add('show');

  const pw = popup.offsetWidth || 140;
  const ph = popup.offsetHeight || 90;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = e.clientX;
  let y = e.clientY;
  if (x + pw + 10 > vw) x = vw - pw - 10;
  if (x < 10) x = 10;
  if (y + ph + 10 > vh) y = y - ph - 8;
  if (y < 10) y = 10;

  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
}

function closeCustRowPopup() {
  const popup = document.getElementById('cust-row-popup');
  const backdrop = document.getElementById('cust-popup-backdrop');
  if (popup) popup.classList.remove('show');
  if (backdrop) backdrop.classList.remove('show');
  if (custActiveRowEl) custActiveRowEl.classList.remove('cust-row-selected');
  custActiveRowId = null;
  custActiveRowType = null;
  custActiveRowEl = null;
}

function handleCustPopupAction(action) {
  const id = custActiveRowId;
  const type = custActiveRowType;
  closeCustRowPopup();
  if (!id || !type) return;

  if (type === 'repayment') {
    if (action === 'edit') openEditRepaymentModal(id);
    else confirmDeleteRepayment(id);
  } else {
    if (action === 'edit') openEditSaleModal(id);
    else confirmDeleteSale(id);
  }
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeCustRowPopup();
});
    
    function openCustomerPicker() {
  const searchInput = document.getElementById('customer-picker-search');
  if (searchInput) searchInput.value = '';
  renderCustomerPickerList();
  openModal('modal-customer-picker');
}

function renderCustomerPickerList() {
  const container = document.getElementById('customer-picker-list');
  if (!container) return;

  const searchInput = document.getElementById('customer-picker-search');
  const q = (searchInput?.value || '').trim().toLowerCase();

  let list = [...state.customers];

  if (q) {
    list = list.filter(c => 
      c.name.toLowerCase().includes(q) || 
      (c.phone && c.phone.includes(q))
    );
  }

  if (list.length === 0) {
    container.innerHTML = '<div class="customer-picker-empty">لا توجد نتائج</div>';
    return;
  }

  container.innerHTML = list.map(c => `
    <div class="customer-picker-item" onclick="selectCustomerFromPicker('${c.id}')">
      <div class="cp-name">${escapeHTML(c.name)}</div>
    </div>
  `).join('');
}

function selectCustomerFromPicker(customerId) {
  const c = state.customers.find(item => item.id === customerId);
  if (!c) return;

  const select = document.getElementById('sale-customer-select');
  const displayInput = document.getElementById('sale-customer-display-input');
  
  if (select) {
    select.innerHTML = `<option value="${c.id}">${escapeHTML(c.name)}</option>`;
    select.value = c.id;
  }
  if (displayInput) {
    displayInput.value = c.name;
  }

  closeModal('modal-customer-picker');
}

    function openCustomerModal(fromSaleModal = false) {
      state.returnToSaleModalAfterCustomer = fromSaleModal;
      document.getElementById('cust-modal-title').innerText = 'إضافة زبون جديد';
      document.getElementById('cust-id').value = '';
      document.getElementById('customer-form').reset();
      document.getElementById('cust-submit-btn').innerHTML = '<svg class="app-icon"><use href="#icon-check"/></svg> حفظ الزبون';
      document.getElementById('cust-form-error').classList.remove('show');
      openModal('modal-customer');
    }

    function openEditCustomerModal(customerId) {
      const c = state.customers.find(item => item.id === customerId);
      if (!c) return;
      document.getElementById('cust-modal-title').innerText = 'تعديل بيانات الزبون';
      document.getElementById('cust-id').value = c.id;
      document.getElementById('cust-name').value = c.name || '';
      document.getElementById('cust-phone').value = c.phone || '';
      document.getElementById('cust-notes').value = c.notes || '';
      document.getElementById('cust-submit-btn').innerHTML = '<svg class="app-icon"><use href="#icon-check"/></svg> حفظ التعديلات';
      document.getElementById('cust-form-error').classList.remove('show');
      openModal('modal-customer');
    }

    function handleSaveCustomer(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('cust-submit-btn');
      if (submitBtn && submitBtn.disabled) return;

      const custId = document.getElementById('cust-id').value.trim();
      const name = document.getElementById('cust-name').value.trim();
      const phone = document.getElementById('cust-phone').value.trim();
      const notes = document.getElementById('cust-notes').value.trim();
      const errorNotice = document.getElementById('cust-form-error');
      const errorText = document.getElementById('cust-form-error-text');

      if (!name) { errorText.innerText = 'يرجى كتابة اسم الزبون'; errorNotice.classList.add('show'); return; }
      errorNotice.classList.remove('show');

      if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
      try {
        if (custId) {
          const customer = state.customers.find(item => item.id === custId);
          if (customer) {
            customer.name = name; customer.phone = phone; customer.notes = notes;
            StorageService.saveCustomers(state.customers);
            logActivity('customer_edit', 'تعديل بيانات زبون', name);
            showToast(`تم تعديل بيانات ${name}`);
            if (state.selectedCustomerIdForDetail === custId) renderCustomerDetailDOM(custId);
          }
        } else {
          const newCustomer = { id: 'c_' + Date.now(), name, phone, notes, createdAt: new Date().toISOString() };
          state.customers.unshift(newCustomer);
          StorageService.saveCustomers(state.customers);
          logActivity('customer_add', 'إضافة زبون جديد', name);
          showToast(`تم إضافة ${name}`);
if (state.returnToSaleModalAfterCustomer) {
  const select = document.getElementById('sale-customer-select');
  const displayInput = document.getElementById('sale-customer-display-input');
  select.innerHTML = `<option value="${newCustomer.id}">${escapeHTML(newCustomer.name)}</option>`;
  select.value = newCustomer.id;
  if (displayInput) displayInput.value = newCustomer.name;
  state.returnToSaleModalAfterCustomer = false;
}
        }
        closeModal('modal-customer'); 
        renderDashboard(); 
        renderCustomers();
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
      }
    }

    function confirmDeleteCustomer(customerId) {
      const c = state.customers.find(item => item.id === customerId);
      if (!c) return;
      const custSales = state.sales.filter(s => s.customerId === customerId);
      const countOps = custSales.length;

      openCustomDialog({
        title: 'حذف الزبون',
        desc: countOps > 0 
          ? `سيتم حذف "${c.name}" و ${countOps} من عملياته نهائياً.` 
          : `سيتم حذف "${c.name}" نهائياً.`,
        onConfirm: () => {
          state.sales = state.sales.filter(s => s.customerId !== customerId);
          StorageService.saveSales(state.sales);

          state.customers = state.customers.filter(item => item.id !== customerId);
          StorageService.saveCustomers(state.customers);

          if (state.selectedCustomerIdForDetail === customerId) {
            state.selectedCustomerIdForDetail = null;
          }

          logActivity('customer_delete', 'حذف زبون', c.name);
          showToast(`تم حذف ${c.name}`);
          renderDashboard(); 
          renderCustomers(); 
          renderSales();
          appBack();
        }
      });
    }
    
    function openSaleModal() {
  const select = document.getElementById('sale-customer-select');
  const displayInput = document.getElementById('sale-customer-display-input');
  select.innerHTML = '<option value="">اختر الزبون...</option>';
  select.value = '';
  if (displayInput) displayInput.value = '';

      const debtMode = isDebtMode();
      document.getElementById('sale-modal-title').innerText = debtMode ? 'إضافة دين' : 'إضافة عملية بيع';
      document.getElementById('sale-id').value = '';
      document.getElementById('sale-locked-customer-id').value = '';
      document.getElementById('sale-form-error').classList.remove('show');
      document.getElementById('sale-paid').value = '';
      document.getElementById('sale-notes').value = '';
      
document.getElementById('sale-customer-select-group').style.display = 'block';
document.getElementById('sale-customer-display').style.display = 'none';
document.getElementById('sale-customer-locked-label').style.display = 'block';
      const list = document.getElementById('sale-materials-list');
      list.innerHTML = '';
      addSaleMaterialRow();

      updateSaleTotalPreview();
      calculateSaleRemaining();
      setPaymentButtonsActive('');
document.getElementById('sale-submit-btn').innerHTML = `<svg class="app-icon"><use href="#icon-check"/></svg> <span id="sale-submit-btn-text">${debtMode ? 'حفظ العملية' : 'حفظ عملية البيع'}</span>`;
setDateFieldValue('sale', new Date().toISOString());
openModal('modal-sale');
}

    function openSaleModalForCurrentCustomer() {
      const customerId = state.selectedCustomerIdForDetail;
      const c = state.customers.find(item => item.id === customerId);
      if (!c) return;

      const debtMode = isDebtMode();
      document.getElementById('sale-modal-title').innerText = debtMode ? 'إضافة دين' : 'تسجيل بيع';
      document.getElementById('sale-id').value = '';
      document.getElementById('sale-locked-customer-id').value = customerId;
      document.getElementById('sale-form-error').classList.remove('show');
      document.getElementById('sale-paid').value = '';
      document.getElementById('sale-notes').value = '';

      document.getElementById('sale-customer-select-group').style.display = 'none';
      document.getElementById('sale-customer-display').style.display = 'block';
      document.getElementById('sale-customer-display-name').innerText = c.name;

      const list = document.getElementById('sale-materials-list');
      list.innerHTML = '';
      addSaleMaterialRow();

      updateSaleTotalPreview();
      calculateSaleRemaining();
      setPaymentButtonsActive('');
      document.getElementById('sale-submit-btn').innerHTML = `<svg class="app-icon"><use href="#icon-check"/></svg> <span id="sale-submit-btn-text">${debtMode ? 'حفظ العملية' : 'حفظ عملية البيع'}</span>`;
setDateFieldValue('sale', new Date().toISOString());
openModal('modal-sale');
}

function openEditSaleModal(saleId) {
  const sale = state.sales.find(item => item.id === saleId);
  if (!sale || sale.type === 'repayment') return;

  const debtMode = isDebtMode();
  const select = document.getElementById('sale-customer-select');
  const displayInput = document.getElementById('sale-customer-display-input');
  const existingCustomer = state.customers.find(c => c.id === sale.customerId);

  select.innerHTML = '<option value="">اختر الزبون...</option>';
  select.value = sale.customerId;
  if (displayInput) {
    displayInput.value = existingCustomer ? existingCustomer.name : '';
  }

  document.getElementById('sale-modal-title').innerText = debtMode ? 'تعديل الدين' : 'تعديل عملية البيع';
  document.getElementById('sale-id').value = sale.id;
  // ✅ ثبّت معرّف الزبون الحالي (لا يمكن تغييره أثناء التعديل)
  document.getElementById('sale-locked-customer-id').value = sale.customerId;

  const paidVal = sale.upfrontPaid !== undefined ? sale.upfrontPaid : sale.paid;
  document.getElementById('sale-paid').value = formatNumberWithCommas(rawNum(paidVal));
  document.getElementById('sale-notes').value = sale.notes || '';

  // ✅ إخفاء حقل اختيار الزبون وزر "زبون جديد" عند التعديل
  document.getElementById('sale-customer-select-group').style.display = 'none';

  // ✅ إظهار كرت الزبون مع توضيح أنه تعديل لعملية هذا الزبون
const displayBox = document.getElementById('sale-customer-display');
displayBox.style.display = 'block';
// ✅ إخفاء النص التوضيحي وإبقاء اسم الزبون فقط
document.getElementById('sale-customer-locked-label').style.display = 'none';
document.getElementById('sale-customer-display-name').innerText =
  existingCustomer ? existingCustomer.name : (sale.customerName || 'زبون سابق');

  const list = document.getElementById('sale-materials-list');
  list.innerHTML = '';
  addSaleMaterialRow(sale.description || '', sale.price);

  updateSaleTotalPreview();
  calculateSaleRemaining();
  document.getElementById('sale-form-error').classList.remove('show');
document.getElementById('sale-submit-btn').innerHTML = `<svg class="app-icon"><use href="#icon-check"/></svg> <span id="sale-submit-btn-text">حفظ التعديلات</span>`;
setDateFieldValue('sale', sale.date);
openModal('modal-sale');
}

    function addSaleMaterialRow(name = '', price = '') {
      const list = document.getElementById('sale-materials-list');
      const row = document.createElement('div');
      row.className = 'material-row';
      
      const rowId = 'smr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      const formattedPrice = price !== '' ? formatNumberWithCommas(rawNum(price)) : '';
      const debtMode = isDebtMode();
      const placeholder = debtMode ? 'اكتب اسم المادة فقط' : 'ابحث أو اكتب اسم المادة';

      row.innerHTML = `
        <div class="material-search-wrap">
          <input type="text" class="form-input material-name" placeholder="${placeholder}" value="${escapeHTML(String(name))}" autocomplete="off">
          <div class="material-dropdown" id="dropdown_${rowId}"></div>
        </div>
        <input type="text" class="form-input price-input material-price" placeholder="سعر البيع" value="${formattedPrice}" oninput="handleFormattedInput(this, updateSaleTotalPreview)">
        <button type="button" class="remove-row-btn" onclick="removeSaleMaterialRow(this)" title="حذف">
          <svg class="app-icon"><use href="#icon-close"/></svg>
        </button>
      `;
      
      list.appendChild(row);
      
      const nameInput = row.querySelector('.material-name');
      const dropdown = row.querySelector('.material-dropdown');
      
      nameInput.addEventListener('input', (e) => {
        if (!isDebtMode()) showMaterialDropdown(dropdown, nameInput, e.target.value);
        updateSaleTotalPreview();
      });
      
      nameInput.addEventListener('focus', (e) => {
        if (!isDebtMode()) showMaterialDropdown(dropdown, nameInput, e.target.value);
      });
      
      nameInput.addEventListener('blur', () => {
        setTimeout(() => { dropdown.classList.remove('show'); }, 200);
      });
      
      updateSaleTotalPreview();
    }

    function showMaterialDropdown(dropdownEl, inputEl, query) {
      if (isDebtMode()) return;
      const results = searchItemsCatalog(query);
      
      if (results.length === 0) {
        dropdownEl.innerHTML = '<div class="material-dropdown-empty">لا توجد مواد مطابقة</div>';
      } else {
        dropdownEl.innerHTML = results.map((it) => {
          const catHint = it.categories.length > 0 ? it.categories.slice(0, 2).join('، ') : '';
          return `
            <div class="material-dropdown-item" data-name="${escapeHTML(it.name)}">
              <span>${escapeHTML(it.name)}</span>
              ${catHint ? `<span class="cat-hint">${escapeHTML(catHint)}</span>` : ''}
            </div>
          `;
        }).join('');
        
        dropdownEl.querySelectorAll('.material-dropdown-item').forEach(itemEl => {
          itemEl.addEventListener('mousedown', (e) => {
            e.preventDefault();
            inputEl.value = itemEl.getAttribute('data-name');
            dropdownEl.classList.remove('show');
            updateSaleTotalPreview();
            const priceInput = inputEl.closest('.material-row').querySelector('.material-price');
            if (priceInput) priceInput.focus();
          });
        });
      }
      
      dropdownEl.classList.add('show');
    }

    function removeSaleMaterialRow(btn) {
      const list = document.getElementById('sale-materials-list');
      if (list.children.length <= 1) {
        const row = list.children[0];
        row.querySelector('.material-name').value = '';
        row.querySelector('.material-price').value = '';
        updateSaleTotalPreview();
        return;
      }
      btn.closest('.material-row').remove();
      updateSaleTotalPreview();
    }

    function collectSaleMaterials() {
      const rows = document.querySelectorAll('#sale-materials-list .material-row');
      const items = [];
      rows.forEach(row => {
        const name = row.querySelector('.material-name').value.trim();
        const price = rawNum(row.querySelector('.material-price').value);
        if (name) items.push({ name: name, price: price });
      });
      return items;
    }

    function updateSaleTotalPreview() {
      const items = collectSaleMaterials();
      const total = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
      document.getElementById('sale-total-preview').innerText = formatCurrencyFull(total);
      calculateSaleRemaining();
    }

    function calculateSaleRemaining() {
      const items = collectSaleMaterials();
      const totalPrice = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
      let paid = rawNum(document.getElementById('sale-paid').value);
      
      if (paid > totalPrice && totalPrice > 0) {
        paid = totalPrice;
        document.getElementById('sale-paid').value = formatNumberWithCommas(totalPrice);
      }
      
      const remaining = Math.max(0, totalPrice - paid);
      document.getElementById('sale-remaining-display').value = formatNumberWithCommas(remaining);
      
      if (totalPrice > 0) {
        if (paid === totalPrice) setPaymentButtonsActive('full');
        else if (paid === 0) setPaymentButtonsActive('debt');
        else setPaymentButtonsActive('partial');
      }
    }

    function setQuickPaymentType(type) {
      const items = collectSaleMaterials();
      const totalPrice = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
      const paidInput = document.getElementById('sale-paid');
      
      if (type === 'full') paidInput.value = formatNumberWithCommas(totalPrice);
      else if (type === 'debt') paidInput.value = '0';
      else if (type === 'partial') { 
        if(totalPrice > 0 && !paidInput.value) paidInput.value = formatNumberWithCommas(Math.floor(totalPrice / 2)); 
      }
      setPaymentButtonsActive(type); 
      calculateSaleRemaining();
    }

    function setPaymentButtonsActive(type) {
      document.getElementById('btn-type-full').classList.toggle('active', type === 'full');
      document.getElementById('btn-type-partial').classList.toggle('active', type === 'partial');
      document.getElementById('btn-type-debt').classList.toggle('active', type === 'debt');
    }

    function handleSaveSale(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('sale-submit-btn');
      if (submitBtn && submitBtn.disabled) return;

      const saleId = document.getElementById('sale-id').value.trim();
      const lockedCustomerId = document.getElementById('sale-locked-customer-id').value.trim();
      const dropdownCustomerId = document.getElementById('sale-customer-select').value;
      const customerId = lockedCustomerId || dropdownCustomerId;
      
      const items = collectSaleMaterials();
      const notes = document.getElementById('sale-notes').value.trim();
      const paid = rawNum(document.getElementById('sale-paid').value);
      
      const errorNotice = document.getElementById('sale-form-error');
      const errorText = document.getElementById('sale-form-error-text');

      if (!customerId) { errorText.innerText = 'يرجى اختيار الزبون'; errorNotice.classList.add('show'); return; }
      if (items.length === 0) { errorText.innerText = 'يرجى إضافة مادة واحدة على الأقل'; errorNotice.classList.add('show'); return; }
      
      const totalPrice = items.reduce((sum, it) => sum + (Number(it.price) || 0), 0);
      if (totalPrice <= 0) { errorText.innerText = 'يجب أن يكون مجموع الأسعار أكبر من الصفر'; errorNotice.classList.add('show'); return; }
      if (isNaN(paid) || paid < 0) { errorText.innerText = 'المبلغ المدفوع غير صحيح'; errorNotice.classList.add('show'); return; }
      if (paid > totalPrice) { errorText.innerText = 'المبلغ المدفوع أكبر من الإجمالي'; errorNotice.classList.add('show'); return; }
      
      errorNotice.classList.remove('show');

      const targetCust = state.customers.find(c => c.id === customerId);
      const custName = targetCust ? targetCust.name : 'زبون';
      const debtMode = isDebtMode();

      if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
      try {
        if (saleId) {
          const sale = state.sales.find(item => item.id === saleId);
          if (sale) {
            sale.customerId = customerId; 
            sale.description = items[0].name;
            sale.price = items[0].price;
            sale.upfrontPaid = Math.min(items[0].price, paid); 
            sale.paid = sale.upfrontPaid; 
            sale.remaining = Math.max(0, sale.price - sale.paid); 
            sale.notes = notes;
const editDateVal = document.getElementById('sale-date').value;
if (editDateVal) sale.date = editDateVal;
reconcileCustomerDebts(customerId);
            StorageService.saveSales(state.sales);
            logActivity('sale_edit', debtMode ? 'تعديل دين' : 'تعديل عملية بيع', `${custName} - ${formatCurrencyFull(sale.price)}`);
            showToast(debtMode ? 'تم تعديل الدين' : 'تم تعديل العملية');
          }
        } else {
          let remainingPoolToPay = paid;
          const nowBase = Date.now();
          const newRecords = [];

          items.forEach((item, index) => {
            const itemPrice = Number(item.price) || 0;
            let itemPaid = 0;

            if (remainingPoolToPay >= itemPrice) {
              itemPaid = itemPrice;
              remainingPoolToPay -= itemPrice;
            } else if (remainingPoolToPay > 0) {
              itemPaid = remainingPoolToPay;
              remainingPoolToPay = 0;
            } else {
              itemPaid = 0;
            }

            const itemRemaining = Math.max(0, itemPrice - itemPaid);

const selectedDateISO = document.getElementById('sale-date').value || new Date().toISOString();
const selectedTime = new Date(selectedDateISO).getTime();

newRecords.push({
    id: 's_' + (nowBase + index),
    type: 'sale',
    customerId: customerId,
    description: item.name,
    price: itemPrice,
    upfrontPaid: itemPaid,
    paid: itemPaid,
    remaining: itemRemaining,
    notes: notes,
    date: new Date(selectedTime + (index * 100)).toISOString()
  });
          });

          state.sales = [...newRecords.reverse(), ...state.sales];
          reconcileCustomerDebts(customerId);
          StorageService.saveSales(state.sales);

          logActivity('sale_add', debtMode ? 'تسجيل دين' : 'تسجيل عملية بيع', `${custName} - ${formatCurrencyFull(totalPrice)}`);
          const countMsg = newRecords.length === 1 
            ? (debtMode ? 'تم تسجيل الدين' : 'تم تسجيل عملية البيع') 
            : (debtMode ? `تم تسجيل ${newRecords.length} ديون` : `تم تسجيل ${newRecords.length} عمليات بيع بنجاح`);
          showToast(countMsg);
        }

        closeModal('modal-sale'); 
        renderDashboard(); 
        renderSales(); 
        renderCustomers();
        if (state.selectedCustomerIdForDetail) renderCustomerDetailDOM(state.selectedCustomerIdForDetail);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
      }
    }

    function confirmDeleteSale(saleId) {
      const sale = state.sales.find(item => item.id === saleId);
      if (!sale) return;
      const customerId = sale.customerId;
      const desc = sale.description || 'هذه العملية';
      const salePrice = sale.price;
      const targetCust = state.customers.find(c => c.id === customerId);
      const custName = targetCust ? targetCust.name : '';

      openCustomDialog({
        title: 'حذف العملية',
        desc: `سيتم حذف "${desc}" بقيمة ${formatCurrencyFull(salePrice)}.`,
        onConfirm: () => {
          state.sales = state.sales.filter(item => item.id !== saleId);
          reconcileCustomerDebts(customerId);
          StorageService.saveSales(state.sales);
          logActivity('sale_delete', 'حذف عملية بيع', `${custName ? custName + ' - ' : ''}${desc} (${formatCurrencyFull(salePrice)})`);
          showToast('تم حذف العملية');
          renderDashboard(); 
          renderSales(); 
          renderCustomers();
          if (state.selectedCustomerIdForDetail) renderCustomerDetailDOM(state.selectedCustomerIdForDetail);
        }
      });
    }

    function openCustomerRepaymentModal() {
      const customerId = state.selectedCustomerIdForDetail;
      const c = state.customers.find(item => item.id === customerId);
      if (!c) return;
      reconcileCustomerDebts(customerId);
      const custSales = state.sales.filter(s => s.customerId === customerId && s.type !== 'repayment');
      const totalDebt = custSales.reduce((acc, cur) => acc + (Number(cur.remaining) || 0), 0);

      if (totalDebt <= 0) { showToast('لا توجد ديون على هذا الزبون'); return; }

      document.getElementById('cust-repay-error').classList.remove('show');
      document.getElementById('cust-repay-modal-name').innerText = `الزبون: ${c.name}`;
      document.getElementById('cust-repay-modal-debt').innerText = formatCurrencyFull(totalDebt);
document.getElementById('cust-repay-amount').value = '';
document.getElementById('cust-repay-notes').value = '';
setDateFieldValue('repay', new Date().toISOString());
openModal('modal-cust-repay');
}

    function handleSaveCustomerRepayment(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('cust-repay-submit-btn');
      if (submitBtn && submitBtn.disabled) return;

      const customerId = state.selectedCustomerIdForDetail;
      const c = state.customers.find(item => item.id === customerId);
      if (!c) return;

      const errorNotice = document.getElementById('cust-repay-error');
      const errorText = document.getElementById('cust-repay-error-text');
      const repayAmount = rawNum(document.getElementById('cust-repay-amount').value);
      const notes = document.getElementById('cust-repay-notes').value.trim() || 'تسديد دفعة';

      reconcileCustomerDebts(customerId);
      const unsettledSales = state.sales.filter(s => s.customerId === customerId && s.type !== 'repayment' && Number(s.remaining) > 0);
      const totalDebt = unsettledSales.reduce((acc, cur) => acc + Number(cur.remaining), 0);

      if (isNaN(repayAmount) || repayAmount <= 0) {
        errorText.innerText = 'يرجى إدخال مبلغ صحيح'; errorNotice.classList.add('show'); return;
      }
      if (repayAmount > totalDebt) {
        errorText.innerText = `المبلغ أكبر من الدين (${formatCurrencyFull(totalDebt)})`;
        errorNotice.classList.add('show'); return;
      }
      errorNotice.classList.remove('show');

      if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
      try {
        let remainingToDeduct = repayAmount;
        const salesChronological = [...unsettledSales].reverse();
        for (let sale of salesChronological) {
          if (remainingToDeduct <= 0) break;
          const currentSaleDebt = Number(sale.remaining);
          if (remainingToDeduct >= currentSaleDebt) {
            sale.paid = Number(sale.paid) + currentSaleDebt; 
            sale.remaining = 0; 
            remainingToDeduct -= currentSaleDebt;
          } else {
            sale.paid = Number(sale.paid) + remainingToDeduct; 
            sale.remaining = currentSaleDebt - remainingToDeduct; 
            remainingToDeduct = 0;
          }
        }

        const selectedRepayDate = document.getElementById('cust-repay-date').value || new Date().toISOString();

const paymentLogRecord = {
  id: 'r_' + Date.now(), 
  customerId: customerId, 
  type: 'repayment', 
  amount: repayAmount,
  price: 0, 
  paid: 0, 
  remaining: 0, 
  description: `تسديد دفعة (${notes})`, 
  notes: notes, 
  date: selectedRepayDate
};
        state.sales.unshift(paymentLogRecord);
        reconcileCustomerDebts(customerId);
        StorageService.saveSales(state.sales);
        logActivity('repay_add', 'تسديد دفعة', `${c.name} - ${formatCurrencyFull(repayAmount)}`);
        closeModal('modal-cust-repay');

        const newRemainingDebt = Math.max(0, totalDebt - repayAmount);
        if (newRemainingDebt === 0) showToast(`تم سداد حساب ${c.name} بالكامل`);
        else showToast(`تم تسديد ${formatCurrencyFull(repayAmount)}`);

        renderDashboard(); 
        renderSales(); 
        renderCustomers(); 
        renderCustomerDetailDOM(customerId);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
      }
    }

    function openEditRepaymentModal(repaymentId) {
      const rep = state.sales.find(item => item.id === repaymentId && item.type === 'repayment');
      if (!rep) return;
      const cust = state.customers.find(c => c.id === rep.customerId);
      const customerName = cust ? cust.name : (rep.customerName || 'زبون سابق');

      document.getElementById('edit-repay-id').value = rep.id;
      document.getElementById('edit-repay-customer').value = customerName;
document.getElementById('edit-repay-amount').value = formatNumberWithCommas(Number(rep.amount || rep.paid) || 0);
document.getElementById('edit-repay-notes').value = rep.notes || '';
document.getElementById('edit-repay-error').classList.remove('show');
setDateFieldValue('edit-repay', rep.date);
openModal('modal-edit-repay');
    }

    function handleSaveEditRepayment(e) {
      e.preventDefault();
      const submitBtn = document.getElementById('edit-repay-submit-btn');
      if (submitBtn && submitBtn.disabled) return;

      const repId = document.getElementById('edit-repay-id').value;
      const newAmount = rawNum(document.getElementById('edit-repay-amount').value);
      const newNotes = document.getElementById('edit-repay-notes').value.trim() || 'تسديد دفعة';
      const errorNotice = document.getElementById('edit-repay-error');
      const errorText = document.getElementById('edit-repay-error-text');

      const rep = state.sales.find(item => item.id === repId);
      if (!rep) return;

      if (isNaN(newAmount) || newAmount <= 0) {
        errorText.innerText = 'يرجى إدخال مبلغ صحيح'; errorNotice.classList.add('show'); return;
      }

      const custPureSales = state.sales.filter(s => s.customerId === rep.customerId && s.type !== 'repayment');
      const totalPurchases = custPureSales.reduce((acc, s) => acc + (Number(s.price) || 0), 0);
      const totalUpfront = custPureSales.reduce((acc, s) => acc + (Number(s.upfrontPaid !== undefined ? s.upfrontPaid : s.paid) || 0), 0);
      const otherRepayments = state.sales.filter(s => s.customerId === rep.customerId && s.type === 'repayment' && s.id !== repId);
      const totalOtherRepay = otherRepayments.reduce((acc, r) => acc + (Number(r.amount || r.paid) || 0), 0);
      const maxAllowed = Math.max(0, totalPurchases - totalUpfront - totalOtherRepay);

      if (newAmount > maxAllowed) {
        errorText.innerText = `المبلغ أكبر من الدين القابل للسداد (${formatCurrencyFull(maxAllowed)})`;
        errorNotice.classList.add('show'); return;
      }
      errorNotice.classList.remove('show');

      const cust = state.customers.find(c => c.id === rep.customerId);
      const custName = cust ? cust.name : 'زبون';

      if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
      try {
        rep.amount = newAmount; 
rep.notes = newNotes; 
rep.description = `تسديد دفعة (${newNotes})`;
const editRepayDate = document.getElementById('edit-repay-date').value;
if (editRepayDate) rep.date = editRepayDate;
reconcileCustomerDebts(rep.customerId);
        StorageService.saveSales(state.sales);
        logActivity('repay_edit', 'تعديل تسديد', `${custName} - ${formatCurrencyFull(newAmount)}`);
        closeModal('modal-edit-repay');
        showToast('تم تعديل التسديد');
        renderDashboard(); 
        renderSales(); 
        renderCustomers();
        if (state.selectedCustomerIdForDetail) renderCustomerDetailDOM(state.selectedCustomerIdForDetail);
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
      }
    }

    function confirmDeleteRepayment(repaymentId) {
      const rep = state.sales.find(item => item.id === repaymentId);
      if (!rep) return;
      const customerId = rep.customerId;
      const amount = Number(rep.amount || rep.paid) || 0;
      const cust = state.customers.find(c => c.id === customerId);
      const custName = cust ? cust.name : 'زبون';

      openCustomDialog({
        title: 'حذف دفعة التسديد',
        desc: `سيتم حذف دفعة بقيمة ${formatCurrencyFull(amount)} وإرجاعها كدين.`,
        onConfirm: () => {
          state.sales = state.sales.filter(item => item.id !== repaymentId);
          reconcileCustomerDebts(customerId);
          StorageService.saveSales(state.sales);
          logActivity('repay_delete', 'حذف تسديد', `${custName} - ${formatCurrencyFull(amount)}`);
          showToast('تم حذف التسديد');
          renderDashboard(); 
          renderSales(); 
          renderCustomers();
          if (state.selectedCustomerIdForDetail) renderCustomerDetailDOM(state.selectedCustomerIdForDetail);
        }
      });
    }
    
        function handlePDFToggleChange() {
      const toggleRepay = document.getElementById('toggle-pdf-repayments');
      const toggleNotes = document.getElementById('toggle-pdf-notes');
      state.pdfIncludeRepayments = toggleRepay ? toggleRepay.checked : true;
      state.pdfIncludeCustomerNotes = toggleNotes ? toggleNotes.checked : true;
      renderPDFReportContent();
    }

    function renderPDFReportContent() {
      const customerId = state.currentReportCustomerId;
      if (!customerId) return;
      const c = state.customers.find(item => item.id === customerId);
      if (!c) return;

      reconcileCustomerDebts(customerId);
      const pureSales = state.sales.filter(s => s.customerId === customerId && s.type !== 'repayment');
      const repayments = state.sales.filter(s => s.customerId === customerId && s.type === 'repayment');

      let totalSales = 0, totalPaid = 0, totalDebt = 0;
      pureSales.forEach(s => {
        totalSales += Number(s.price) || 0;
        totalPaid += Number(s.paid) || 0;
        totalDebt += Number(s.remaining) || 0;
      });

      const todayStr = new Date().toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const currency = state.settings.currency || 'د.ع';
      const projectName = state.settings.projectName || 'دفتر المبيعات';
      const debtMode = isDebtMode();

      const salesRowsHtml = pureSales.map((s, idx) => {
        return `
          <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding:8px 10px; border:1px solid #e2e8f0; color:#64748b;">${formatDate(s.date)}</td>
            <td style="padding:8px 10px; border:1px solid #e2e8f0; font-weight:700; color:#0f172a;">${escapeHTML(s.description || 'مادة')}</td>
            <td style="padding:8px 10px; border:1px solid #e2e8f0;">${Number(s.price).toLocaleString('en-US')} ${currency}</td>
            <td style="padding:8px 10px; border:1px solid #e2e8f0; color:#16a34a;">${Number(s.paid).toLocaleString('en-US')} ${currency}</td>
            <td style="padding:8px 10px; border:1px solid #e2e8f0; font-weight:800; color:${s.remaining > 0 ? '#e11d48' : '#059669'};">${Number(s.remaining).toLocaleString('en-US')} ${currency}</td>
          </tr>
        `;
      }).join('');

      const repaymentsBlockHtml = state.pdfIncludeRepayments ? `
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 14.5px; font-weight:800; color:#111827; margin-bottom: 8px; border-right:3.5px solid #7c3aed; padding-right:8px;">
            سجل التسديدات (${repayments.length})
          </h3>
          <table style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid #e5e7eb;">
            <thead>
              <tr style="background:#f1f5f9; color:#334155; text-align:right;">
                <th style="padding:9px 10px; border:1px solid #e2e8f0; width:22%;">التاريخ</th>
                <th style="padding:9px 10px; border:1px solid #e2e8f0;">الملاحظة</th>
                <th style="padding:9px 10px; border:1px solid #e2e8f0; width:25%;">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              ${repayments.length === 0 ? `<tr><td colspan="3" style="text-align:center; padding:12px; color:#94a3b8;">لا توجد تسديدات</td></tr>` : repayments.map((r, idx) => `
                <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="padding:8px 10px; border:1px solid #e2e8f0; color:#64748b;">${formatDate(r.date)}</td>
                  <td style="padding:8px 10px; border:1px solid #e2e8f0; font-weight:600;">${escapeHTML(r.notes || r.description || 'تسديد دفعة')}</td>
                  <td style="padding:8px 10px; border:1px solid #e2e8f0; font-weight:800; color:#7c3aed;">+ ${Number(r.amount || r.paid).toLocaleString('en-US')} ${currency}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : '';

      const notesFieldHtml = state.pdfIncludeCustomerNotes ? `
        <div><span style="color:#64748b;">ملاحظات:</span><span style="margin-right:4px;">${c.notes ? escapeHTML(c.notes) : 'لا توجد'}</span></div>
      ` : '';

      const totalPurchasesLabel = debtMode ? 'إجمالي الديون' : 'إجمالي المشتريات';
      const debtLabel = debtMode ? 'إجمالي الديون المتبقية' : 'الدين المتبقي';
      const salesTableTitle = debtMode ? `سجل الديون (${pureSales.length})` : `سجل المبيعات (${pureSales.length})`;

      const reportHtml = `
        <div id="report-printable-area" style="font-family: Arial, sans-serif; direction:rtl; text-align:right; color:#111827; background:#ffffff; line-height:1.6; padding: 6px;">
          <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; display:flex; justify-content:space-between; align-items:flex-end;">
            <div>
              <h1 style="font-size: 22px; font-weight:800; color:#4f46e5; margin:0 0 3px 0;">${escapeHTML(projectName)}</h1>
              <div style="font-size: 14px; color:#4b5563; font-weight:700;">كشف حساب</div>
            </div>
            <div style="text-align:left; font-size:11px; color:#6b7280;">
              <div>تاريخ الإصدار:</div>
              <div style="font-weight:700; color:#111827;">${todayStr}</div>
            </div>
          </div>

          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:14px 18px; margin-bottom: 18px;">
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:13.5px;">
              <div><span style="color:#64748b;">الزبون:</span><strong style="color:#0f172a; font-size:15px; margin-right:4px;">${escapeHTML(c.name)}</strong></div>
              <div><span style="color:#64748b;">الهاتف:</span><strong style="color:#0f172a; margin-right:4px;" dir="ltr">${c.phone ? escapeHTML(c.phone) : 'غير مسجل'}</strong></div>
              <div><span style="color:#64748b;">تاريخ التسجيل:</span><span style="margin-right:4px;">${c.createdAt ? formatDate(c.createdAt) : 'غير متوفر'}</span></div>
              ${notesFieldHtml}
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:10px; margin-bottom: 20px; text-align:center;">
            <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:12px 6px;">
              <div style="font-size:11.5px; color:#1e40af; font-weight:700; margin-bottom:3px;">${totalPurchasesLabel}</div>
              <div style="font-size:16px; font-weight:800; color:#1d4ed8;">${Number(totalSales).toLocaleString('en-US')} ${currency}</div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 6px;">
              <div style="font-size:11.5px; color:#166534; font-weight:700; margin-bottom:3px;">إجمالي المدفوع</div>
              <div style="font-size:16px; font-weight:800; color:#15803d;">${Number(totalPaid).toLocaleString('en-US')} ${currency}</div>
            </div>
            <div style="background:#fef2f2; border:1.5px solid #fecaca; border-radius:10px; padding:12px 6px;">
              <div style="font-size:11.5px; color:#991b1b; font-weight:800; margin-bottom:3px;">${debtLabel}</div>
              <div style="font-size:17px; font-weight:800; color:#b91c1c;">${Number(totalDebt).toLocaleString('en-US')} ${currency}</div>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 14.5px; font-weight:800; color:#111827; margin-bottom: 8px; border-right:3.5px solid #4f46e5; padding-right:8px;">
              ${salesTableTitle}
            </h3>
            <table style="width:100%; border-collapse:collapse; font-size:12px; border:1px solid #e5e7eb;">
              <thead>
                <tr style="background:#f1f5f9; color:#334155; text-align:right;">
                  <th style="padding:9px 10px; border:1px solid #e2e8f0; width:18%;">التاريخ</th>
                  <th style="padding:9px 10px; border:1px solid #e2e8f0;">${debtMode ? 'البيان' : 'المادة المباعة'}</th>
                  <th style="padding:9px 10px; border:1px solid #e2e8f0;">السعر</th>
                  <th style="padding:9px 10px; border:1px solid #e2e8f0;">المدفوع</th>
                  <th style="padding:9px 10px; border:1px solid #e2e8f0;">المتبقي</th>
                </tr>
              </thead>
              <tbody>
                ${pureSales.length === 0 ? `<tr><td colspan="5" style="text-align:center; padding:14px; color:#94a3b8;">لا توجد عمليات</td></tr>` : salesRowsHtml}
              </tbody>
            </table>
          </div>

          ${repaymentsBlockHtml}

          <div style="border: 2px dashed ${totalDebt > 0 ? '#fb7185' : '#10b981'}; background: ${totalDebt > 0 ? '#fff1f2' : '#f0fdf4'}; border-radius:12px; padding:16px 20px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <div style="font-size:15px; font-weight:800; color:#0f172a;">الرصيد النهائي:</div>
              <div style="font-size:12px; color:#64748b;">${totalDebt > 0 ? 'يرجى مراجعة المستحقات أعلاه.' : 'الحساب مسدد بالكامل.'}</div>
            </div>
            <div style="font-size:22px; font-weight:900; color:${totalDebt > 0 ? '#be123c' : '#15803d'};">
              ${Number(totalDebt).toLocaleString('en-US')} ${currency}
            </div>
          </div>

          <div style="margin-top: 22px; padding-top: 10px; border-top:1px solid #e5e7eb; display:flex; justify-content:space-between; font-size:11px; color:#94a3b8;">
            <span>${escapeHTML(projectName)}</span>
            <span>كشف حساب إلكتروني</span>
          </div>
        </div>
      `;

      const wrapper = document.getElementById('pdf-report-content-wrapper');
      if (wrapper) wrapper.innerHTML = reportHtml;
    }

    function openPDFReportModal(customerId) {
      const c = state.customers.find(item => item.id === customerId);
      if (!c) { showToast('لم يتم العثور على الزبون', true); return; }

      state.currentReportCustomerId = customerId;
      document.getElementById('pdf-modal-title').innerText = `كشف حساب: ${c.name}`;
      document.getElementById('pdf-download-progress-hint').innerText = 'يمكنك تنزيل الكشف أو طباعته';

      state.pdfIncludeRepayments = true;
      state.pdfIncludeCustomerNotes = true;
      const tRepay = document.getElementById('toggle-pdf-repayments');
      const tNotes = document.getElementById('toggle-pdf-notes');
      if (tRepay) tRepay.checked = true;
      if (tNotes) tNotes.checked = true;

      renderPDFReportContent();
      openModal('modal-pdf-report');
    }

    async function executePDFDownload() {
      const customerId = state.currentReportCustomerId || state.selectedCustomerIdForDetail;
      const c = state.customers.find(item => item.id === customerId);
      if (!c) return;
      const element = document.getElementById('report-printable-area');
      if (!element) return;

      const progressHint = document.getElementById('pdf-download-progress-hint');
      const downloadBtn = document.getElementById('btn-direct-download-pdf');
      const safeName = c.name.replace(/[\/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
      const filename = `كشف-حساب-${safeName}.pdf`;

      if (downloadBtn) downloadBtn.disabled = true;
      if (progressHint) progressHint.innerText = 'جاري التحويل...';

      const opt = {
        margin: [8, 8, 8, 8], filename: filename, image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      try {
        await html2pdf().set(opt).from(element).save();
        if (progressHint) progressHint.innerText = `تم التنزيل`;
        showToast(`تم تنزيل الملف`);
      } catch (err) {
        if (progressHint) progressHint.innerText = 'استخدم زر الطباعة';
        showToast('تعذر التنزيل المباشر', true);
      } finally {
        if (downloadBtn) downloadBtn.disabled = false;
      }
    }

    function printReportDirectly() {
      const content = document.getElementById('report-printable-area');
      if (!content) return;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>طباعة</title><style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; direction: rtl; text-align: right; margin: 0; padding: 20px; background: #ffffff; color: #111827; } @media print { body { padding: 0; } }</style></head><body>${content.innerHTML}</body></html>`);
        printWindow.document.close(); 
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 350);
      } else { window.print(); }
    }
/* ============================================================
   CURRENCY MODALS
   ============================================================ */
function openCurrencyModal() {
  renderCurrencyList();
  openModal('modal-currency');
}

function renderCurrencyList() {
  const container = document.getElementById('currency-list-container');
  if (!container) return;

  const all = StorageService.getAllCurrencies();
  const current = StorageService.getCurrentCurrency();

  container.innerHTML = all.map(c => {
    const isActive = c.id === current.id;
    const canDelete = !c.isDefault;
    return `
      <div class="currency-picker-item ${isActive ? 'active' : ''}" onclick="handleSelectCurrency('${escapeHTML(c.id)}')">
        <div class="currency-picker-name">${escapeHTML(c.name)}</div>
        <div class="currency-picker-actions">
          <span class="currency-picker-symbol">${escapeHTML(c.symbol)}</span>
          ${canDelete ? `
            <button type="button" class="mini-btn danger" title="حذف" onclick="event.stopPropagation(); confirmDeleteCustomCurrency('${escapeHTML(c.id)}')">
              <svg class="app-icon"><use href="#icon-delete"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function handleSelectCurrency(id) {
  StorageService.setCurrentCurrency(id);
  state.settings.currency = StorageService.getSettings().currency;
  showToast('تم تغيير العملة');
  closeModal('modal-currency');
  renderAllAfterCurrencyChange();
}

function renderAllAfterCurrencyChange() {
  renderDashboard();
  if (document.getElementById('page-sales')?.classList.contains('active')) renderSales();
  if (document.getElementById('page-purchases')?.classList.contains('active')) renderPurchases();
  if (document.getElementById('page-customers')?.classList.contains('active')) renderCustomers();
  if (document.getElementById('page-customer-detail')?.classList.contains('active') && state.selectedCustomerIdForDetail) {
    renderCustomerDetailDOM(state.selectedCustomerIdForDetail);
  }
  renderSettings();
}

function confirmDeleteCustomCurrency(id) {
  const c = StorageService.getAllCurrencies().find(x => x.id === id);
  if (!c || c.isDefault) return;
  openCustomDialog({
    title: 'حذف العملة',
    desc: `سيتم حذف "${c.name}" نهائياً.`,
    onConfirm: () => {
      const ok = StorageService.deleteCustomCurrency(id);
      if (!ok) { showToast('تعذر الحذف', true); return; }
      state.settings = StorageService.getSettings();
      showToast('تم حذف العملة');
      renderCurrencyList();
      renderAllAfterCurrencyChange();
    }
  });
}

function openAddCurrencyModal() {
  document.getElementById('currency-form-name').value = '';
  document.getElementById('currency-form-symbol').value = '';
  document.querySelectorAll('input[name="currency-format"]').forEach(r => {
    r.checked = (r.value === 'comma');
  });
  document.getElementById('currency-form-error').classList.remove('show');
  openModal('modal-add-currency');
}

function handleSaveCustomCurrency(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('currency-submit-btn');
  if (submitBtn && submitBtn.disabled) return;

  const name = document.getElementById('currency-form-name').value.trim();
  const symbol = document.getElementById('currency-form-symbol').value.trim();
  const formatInput = document.querySelector('input[name="currency-format"]:checked');
  const format = formatInput ? formatInput.value : 'comma';

  const errorNotice = document.getElementById('currency-form-error');
  const errorText = document.getElementById('currency-form-error-text');

  if (!name) { errorText.innerText = 'يرجى إدخال اسم العملة'; errorNotice.classList.add('show'); return; }
  if (!symbol) { errorText.innerText = 'يرجى إدخال رمز العملة'; errorNotice.classList.add('show'); return; }

  const dup = StorageService.getAllCurrencies().find(c => c.symbol === symbol);
  if (dup) { errorText.innerText = 'رمز العملة مستخدم بالفعل'; errorNotice.classList.add('show'); return; }

  errorNotice.classList.remove('show');

  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
  try {
    const newC = StorageService.addCustomCurrency({ name, symbol, format });
    showToast('تمت إضافة العملة');
    closeModal('modal-add-currency');
    renderCurrencyList();
    if (newC) {
      StorageService.setCurrentCurrency(newC.id);
      state.settings = StorageService.getSettings();
      renderAllAfterCurrencyChange();
      closeModal('modal-currency');
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
  }
}

function renderSettings() {
  const nbNameEl = document.getElementById('settings-current-notebook-name');
  if (nbNameEl) nbNameEl.innerText = state.settings.projectName || 'دفتر المبيعات';

  const currency = StorageService.getCurrentCurrency();
  const currencyValueEl = document.getElementById('settings-current-currency');
  if (currencyValueEl) {
    currencyValueEl.innerText = currency.name + ' (' + currency.symbol + ')';
  }

  const nameInput = document.getElementById('setting-display-name');
  if (nameInput) nameInput.value = AuthService.currentUser?.displayName || '';
  const toggle = document.getElementById('toggle-simplified-debt');
  if (toggle) toggle.checked = isDebtMode();
  FirebaseService.updateUIStatus();
  updateActivityLogBadge();
  updateThemeUI();
}

function exportDataBackup() {
  const idx = StorageService.getNotebooksIndex();
  const notebooksData = {};
  idx.notebooks.forEach(nb => {
    const d = StorageService._getNotebookData(nb.id);
    if (d) notebooksData[nb.id] = d;
  });
  const backupData = {
    version: '5.0',
    exportedAt: new Date().toISOString(),
    notebooks: idx.notebooks,
    activeId: idx.activeId,
    notebooksData: notebooksData,
    globalSettings: StorageService.getGlobalSettings()
  };
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = blobUrl; 
      downloadAnchor.download = `backup_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(downloadAnchor); 
      downloadAnchor.click(); 
      downloadAnchor.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      showToast('تم التصدير');
    }

    function triggerImportFileInput() {
      const fileInput = document.getElementById('import-file-input');
      fileInput.value = ''; 
      fileInput.click();
    }

    function importDataBackup(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const content = e.target.result;
const imported = JSON.parse(content);
const isNewFormat = imported && Array.isArray(imported.notebooks) && imported.notebooksData;
const isOldFormat = imported && Array.isArray(imported.customers) && Array.isArray(imported.sales);
if (!isNewFormat && !isOldFormat) {
  showToast('الملف غير متوافق', true); return;
}

const descMsg = isNewFormat
  ? `${imported.notebooks.length} دفتر. سيتم استبدال البيانات الحالية بالكامل.`
  : `${imported.customers.length} زبون و ${imported.sales.length} عملية. سيتم استبدال البيانات الحالية.`;

openCustomDialog({
  title: 'استيراد نسخة احتياطية',
  desc: descMsg,
  onConfirm: () => {
    try {
      StorageService.clearAllKeepAuth();
      StorageService.setAllFromCloud(imported);

      state.customers = StorageService.getCustomers();
      state.sales = StorageService.getSales();
      state.purchases = StorageService.getPurchases();
      state.settings = StorageService.getSettings();
      state.activityLog = StorageService.getActivityLog();
      state.selectedCustomerIdForDetail = null;

      logActivity('system_import', 'استيراد نسخة احتياطية',
        isNewFormat ? `${imported.notebooks.length} دفتر` : `${state.customers.length} زبون`);

      document.body.setAttribute('data-theme', state.settings.theme || 'light');
      updateThemeUI();
      applyCustomThemeStyles();
      applySimplifiedDebtMode();

      const headerName = document.getElementById('header-app-name');
      if (headerName) headerName.innerText = state.settings.projectName || 'دفتر المبيعات';

      renderDashboard();
      renderCustomers();
      renderSales();
      renderPurchases();
      updateActivityLogBadge();

      showToast('تم الاستيراد بنجاح');
      switchTab('dashboard');
    } catch(err) {
      console.error(err);
      showToast('حدث خطأ', true);
    }
  }
});
        } catch (err) { showToast('تعذر قراءة الملف', true); }
      };
      reader.readAsText(file);
    }

    function confirmResetAllData() {
      openCustomDialog({
        title: 'حذف جميع البيانات',
        desc: 'سيتم مسح جميع البيانات نهائياً من هذا المتصفح. لا يمكن التراجع. للمتابعة، اكتب كلمة "تأكيد" في الحقل أدناه.',
        requiresInput: true,
        inputPlaceholder: 'تأكيد',
        onConfirm: () => {
          StorageService.clearAll(); 
          state.customers = []; 
          state.sales = []; 
          state.purchases = [];
          state.activityLog = [];
          showToast('تم مسح البيانات'); 
          initApp(); 
          switchTab('dashboard');
        }
      });
    }
    
    function openNotebooksModal() {
  renderNotebooksList();
  openModal('modal-notebooks');
}

function renderNotebooksList() {
  const container = document.getElementById('notebooks-list-container');
  const guestHint = document.getElementById('notebooks-guest-hint');
  if (!container) return;

  const notebooks = StorageService.getAllNotebooks();
  const activeId = StorageService.getActiveNotebookId();
  const logged = AuthService.isLoggedIn();

  container.innerHTML = notebooks.map(nb => {
    const isActive = nb.id === activeId;
    const d = StorageService._getNotebookData(nb.id);
    const custCount = (d && Array.isArray(d.customers)) ? d.customers.length : 0;
    const salesCount = (d && Array.isArray(d.sales)) ? d.sales.filter(s => s.type !== 'repayment').length : 0;
    const canDelete = notebooks.length > 1;

    return `
      <div class="notebook-item ${isActive ? 'active' : ''}" onclick="handleSwitchNotebook('${nb.id}')">
        <div class="notebook-item-body">
          <div class="notebook-item-name">${escapeHTML(nb.name)}</div>
          <div class="notebook-item-meta">
            <span>${custCount} زبون</span>
            <span>•</span>
            <span>${salesCount} عملية</span>
            ${isActive ? '<span class="notebook-item-badge">الحالي</span>' : ''}
          </div>
        </div>
        <div class="notebook-item-actions">
          <button type="button" class="mini-btn" title="تعديل الاسم" onclick="event.stopPropagation(); openRenameNotebook('${nb.id}')">
            <svg class="app-icon"><use href="#icon-edit"/></svg>
          </button>
          ${canDelete ? `
            <button type="button" class="mini-btn danger" title="حذف" onclick="event.stopPropagation(); confirmDeleteNotebook('${nb.id}')">
              <svg class="app-icon"><use href="#icon-delete"/></svg>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  if (guestHint) guestHint.style.display = logged ? 'none' : 'block';
}

function handleAddNotebookClick() {
  if (!AuthService.isLoggedIn()) {
    showToast('سجّل الدخول لإضافة دفاتر جديدة', true);
    return;
  }
  openAddNotebookModal();
}

function openAddNotebookModal() {
  document.getElementById('notebook-form-title').innerText = 'دفتر جديد';
  document.getElementById('notebook-id').value = '';
  document.getElementById('notebook-name').value = '';
  document.getElementById('notebook-form-error').classList.remove('show');
  document.getElementById('notebook-submit-btn').innerHTML = '<svg class="app-icon"><use href="#icon-check"/></svg> إنشاء الدفتر';
  openModal('modal-add-notebook');
}

function openRenameNotebook(id) {
  const nb = StorageService.getAllNotebooks().find(n => n.id === id);
  if (!nb) return;
  document.getElementById('notebook-form-title').innerText = 'تعديل اسم الدفتر';
  document.getElementById('notebook-id').value = id;
  document.getElementById('notebook-name').value = nb.name;
  document.getElementById('notebook-form-error').classList.remove('show');
  document.getElementById('notebook-submit-btn').innerHTML = '<svg class="app-icon"><use href="#icon-check"/></svg> حفظ التعديلات';
  openModal('modal-add-notebook');
}

function handleSaveNotebook(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('notebook-submit-btn');
  if (submitBtn && submitBtn.disabled) return;

  const id = document.getElementById('notebook-id').value.trim();
  const name = document.getElementById('notebook-name').value.trim();
  const errorNotice = document.getElementById('notebook-form-error');
  const errorText = document.getElementById('notebook-form-error-text');

  if (!name) {
    errorText.innerText = 'يرجى إدخال اسم الدفتر';
    errorNotice.classList.add('show');
    return;
  }
  const all = StorageService.getAllNotebooks();
  const duplicate = all.find(n => n.id !== id && n.name.trim() === name);
  if (duplicate) {
    errorText.innerText = 'يوجد دفتر بنفس الاسم';
    errorNotice.classList.add('show');
    return;
  }
  errorNotice.classList.remove('show');

  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
  try {
    if (id) {
      StorageService.renameNotebook(id, name);
      if (StorageService.getActiveNotebookId() === id) {
        state.settings.projectName = name;
        const headerName = document.getElementById('header-app-name');
        if (headerName) headerName.innerText = name;
        applySimplifiedDebtMode();
      }
      logActivity('notebook_edit', 'تعديل اسم دفتر', name);
      showToast('تم تعديل الاسم');
      closeModal('modal-add-notebook');
      renderNotebooksList();
    } else {
      const nb = StorageService.createNotebook(name);
      logActivity('notebook_add', 'إنشاء دفتر جديد', name);
      closeModal('modal-add-notebook');
      closeModal('modal-notebooks');
      reloadActiveNotebook(nb.id);
      showToast(`تم إنشاء "${name}"`);
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
  }
}

function handleSwitchNotebook(id) {
  const activeId = StorageService.getActiveNotebookId();
  if (id === activeId) { closeModal('modal-notebooks'); return; }
  const nb = StorageService.getAllNotebooks().find(n => n.id === id);
  if (!nb) return;

  StorageService.switchNotebook(id);
  logActivity('notebook_switch', 'التبديل إلى دفتر آخر', nb.name);
  closeModal('modal-notebooks');
  reloadActiveNotebook(id);
  showToast(`تم التبديل إلى "${nb.name}"`);
}

function confirmDeleteNotebook(id) {
  const all = StorageService.getAllNotebooks();
  if (all.length <= 1) { showToast('لا يمكن حذف الدفتر الأخير', true); return; }
  const nb = all.find(n => n.id === id);
  if (!nb) return;

  openCustomDialog({
    title: 'حذف الدفتر',
    desc: `سيتم حذف "${nb.name}" مع جميع زبائنه وعملياته ومشترياته نهائياً. لا يمكن التراجع. للمتابعة اكتب كلمة "تأكيد".`,
    requiresInput: true,
    inputPlaceholder: 'تأكيد',
    onConfirm: () => {
      const wasActive = StorageService.getActiveNotebookId() === id;
      const ok = StorageService.deleteNotebook(id);
      if (!ok) { showToast('تعذر حذف الدفتر', true); return; }
      logActivity('notebook_delete', 'حذف دفتر', nb.name);
      showToast(`تم حذف "${nb.name}"`);

      if (wasActive) {
        const newActive = StorageService.getActiveNotebook();
        reloadActiveNotebook(newActive.id);
      } else {
        renderNotebooksList();
      }
    }
  });
}

function reloadActiveNotebook(id) {
  state.customers = StorageService.getCustomers();
  state.sales = StorageService.getSales();
  state.purchases = StorageService.getPurchases();
  state.settings = StorageService.getSettings();
  state.activityLog = StorageService.getActivityLog();
  state.selectedCustomerIdForDetail = null;

  document.body.setAttribute('data-theme', state.settings.theme || 'light');
  updateThemeUI();

  const headerName = document.getElementById('header-app-name');
  if (headerName) headerName.innerText = state.settings.projectName || 'دفتر المبيعات';

  applySimplifiedDebtMode();
  renderDashboard();
  renderCustomers();
  renderSales();
  renderPurchases();
  updateActivityLogBadge();

  switchTab('dashboard');
}
/* ============================================================
   DATE PICKER
   ============================================================ */
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const datePickerState = {
  mode: null,
  selectedDate: new Date()
};

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getDatePickerIds(mode) {
  if (mode === 'sale') return { input: 'sale-date', display: 'sale-date-display' };
  if (mode === 'repay') return { input: 'cust-repay-date', display: 'cust-repay-date-display' };
  if (mode === 'edit-repay') return { input: 'edit-repay-date', display: 'edit-repay-date-display' };
  return { input: null, display: null };
}

function openDatePicker(mode) {
  datePickerState.mode = mode;
  const ids = getDatePickerIds(mode);
  const input = document.getElementById(ids.input);
  let base = new Date();
  if (input && input.value) {
    const d = new Date(input.value);
    if (!isNaN(d.getTime())) base = d;
  }
  datePickerState.selectedDate = new Date(base);

  buildDatePickerColumns();
  openModal('modal-date-picker');
  requestAnimationFrame(() => requestAnimationFrame(() => scrollToSelectedDate()));
}

function buildDatePickerColumns() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);

  const daysCol = document.getElementById('dp-days');
  const monthsCol = document.getElementById('dp-months');
  const yearsCol = document.getElementById('dp-years');
  if (!daysCol || !monthsCol || !yearsCol) return;

  const sel = datePickerState.selectedDate;
  const maxDays = daysInMonth(sel.getFullYear(), sel.getMonth());

  daysCol.innerHTML = '';
  for (let d = 1; d <= maxDays; d++) {
    const el = document.createElement('div');
    el.className = 'date-picker-item';
    el.textContent = String(d).padStart(2, '0');
    el.onclick = () => { datePickerState.selectedDate.setDate(d); scrollToSelectedDate(); };
    daysCol.appendChild(el);
  }

  monthsCol.innerHTML = '';
  AR_MONTHS.forEach((name, i) => {
    const el = document.createElement('div');
    el.className = 'date-picker-item';
    el.textContent = name;
    el.onclick = () => {
      const oldDay = datePickerState.selectedDate.getDate();
      datePickerState.selectedDate.setMonth(i);
      const maxD = daysInMonth(datePickerState.selectedDate.getFullYear(), i);
      if (oldDay > maxD) datePickerState.selectedDate.setDate(maxD);
      buildDatePickerColumns();
      scrollToSelectedDate();
    };
    monthsCol.appendChild(el);
  });

  yearsCol.innerHTML = '';
  years.forEach(y => {
    const el = document.createElement('div');
    el.className = 'date-picker-item';
    el.textContent = y;
    el.onclick = () => {
      const oldDay = datePickerState.selectedDate.getDate();
      datePickerState.selectedDate.setFullYear(y);
      const maxD = daysInMonth(y, datePickerState.selectedDate.getMonth());
      if (oldDay > maxD) datePickerState.selectedDate.setDate(maxD);
      buildDatePickerColumns();
      scrollToSelectedDate();
    };
    yearsCol.appendChild(el);
  });

  [daysCol, monthsCol, yearsCol].forEach(col => {
    col.onscroll = () => {
      clearTimeout(col._t);
      col._t = setTimeout(() => {
        const idx = Math.round(col.scrollTop / 44);
        updateActiveClass(col, idx);
        if (col === daysCol) datePickerState.selectedDate.setDate(idx + 1);
        else if (col === monthsCol) datePickerState.selectedDate.setMonth(idx);
        else if (col === yearsCol) datePickerState.selectedDate.setFullYear(years[idx]);
      }, 100);
    };
  });
}

function scrollToSelectedDate() {
  const d = datePickerState.selectedDate;
  const daysCol = document.getElementById('dp-days');
  const monthsCol = document.getElementById('dp-months');
  const yearsCol = document.getElementById('dp-years');
  if (!daysCol || !monthsCol || !yearsCol) return;

  const dayIdx = d.getDate() - 1;
  const monthIdx = d.getMonth();
  const yearIdx = Array.from(yearsCol.children).findIndex(el => Number(el.textContent) === d.getFullYear());

  daysCol.scrollTop = dayIdx * 44;
  monthsCol.scrollTop = monthIdx * 44;
  if (yearIdx >= 0) yearsCol.scrollTop = yearIdx * 44;

  updateActiveClass(daysCol, dayIdx);
  updateActiveClass(monthsCol, monthIdx);
  if (yearIdx >= 0) updateActiveClass(yearsCol, yearIdx);
}

function updateActiveClass(col, activeIdx) {
  Array.from(col.children).forEach((child, i) => {
    child.classList.toggle('active', i === activeIdx);
  });
}

function confirmDatePicker() {
  const mode = datePickerState.mode;
  const ids = getDatePickerIds(mode);
  const d = datePickerState.selectedDate;

  const input = document.getElementById(ids.input);
  const display = document.getElementById(ids.display);
  if (input) input.value = d.toISOString();
  if (display) display.textContent = formatDateOnly(d.toISOString());

  closeModal('modal-date-picker');
}

function setDateFieldValue(mode, isoDate) {
  const ids = getDatePickerIds(mode);
  const input = document.getElementById(ids.input);
  const display = document.getElementById(ids.display);
  const iso = isoDate || new Date().toISOString();
  if (input) input.value = iso;
  if (display) display.textContent = formatDateOnly(iso);
}

function updateCurrencyFormatUI() {
  const checked = document.querySelector('input[name="currency-format"]:checked');
  const val = checked ? checked.value : 'comma';
  const commaLabel = document.getElementById('format-comma-label');
  const dotLabel = document.getElementById('format-dot-label');
  if (commaLabel) commaLabel.classList.toggle('active', val === 'comma');
  if (dotLabel) dotLabel.classList.toggle('active', val === 'dot');
}