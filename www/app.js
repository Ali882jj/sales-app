/* ============================================================
   APP.JS - نقطة البداية وربط الأحداث العامة
   ============================================================ */

async function initApp() {
  state.customers = StorageService.getCustomers();
  state.sales = StorageService.getSales();
  state.purchases = StorageService.getPurchases();
  state.settings = StorageService.getSettings();
  state.activityLog = StorageService.getActivityLog();

  document.body.setAttribute('data-theme', state.settings.theme || 'light');
  updateThemeUI();

  if (state.settings.projectName) {
    document.getElementById('header-app-name').innerText = state.settings.projectName;
  }

  history.replaceState({ isTab: true, tab: 'dashboard' }, '', '#dashboard');

  updateDashboardDate();
  updateActivityLogBadge();
  applySimplifiedDebtMode();
  renderDashboard();

  // ===== استرجع الجلسة المحلية فوراً (Offline Support) =====
  const cachedSession = StorageService.getUserSession();
  if (cachedSession) {
    AuthService.currentUser = {
      uid: cachedSession.uid,
      email: cachedSession.email,
      displayName: cachedSession.displayName
    };
    AuthService.isReady = true;
  }

  // حدّث مؤشرات الحالة الآن (قبل رد Firebase)
  AuthService.updateAuthUI();
  FirebaseService.updateUIStatus();

  // شغّل Firebase Auth وانتظر الحالة الأولى
  await AuthService.init();
}


/* ============================================================
   إغلاق المودالات عند النقر خارجها
   ============================================================ */
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { 
    if (e.target === overlay) closeModal(overlay.id); 
  });
});


/* ============================================================
   معالج زر الرجوع (popstate)
   ============================================================ */
window.addEventListener('popstate', (e) => {
  if (state.openModalStack.length > 0) {
    const topModalId = state.openModalStack.pop();
    const modalEl = document.getElementById(topModalId);
    if (modalEl) modalEl.classList.remove('active');
    if (state.openModalStack.length === 0) document.body.classList.remove('modal-open');
    return;
  }

  if (state.activeSubPage) {
    const fallbackTab = state.activeSubPage === 'customer-detail' ? 'customers' : 'dashboard';
    state.activeSubPage = null;
    state.currentTab = fallbackTab;

    const y = pageScrollMemory[fallbackTab] || 0;
    const prevBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';

    updateDOMView(fallbackTab, false);

    if (y > 0) {
      window.scrollTo(0, y);
      document.documentElement.scrollTop = y;
      document.body.scrollTop = y;
    }

    requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = prevBehavior;
    });
    return;
  }

  if (state.currentTab !== 'dashboard') {
    state.currentTab = 'dashboard';
    history.replaceState({ isTab: true, tab: 'dashboard' }, '', '#dashboard');
    updateDOMView('dashboard', true);
    return;
  }
});


/* ============================================================
   مراقبة حالة الاتصال بـ Firebase
   ============================================================ */
fbDb.ref('.info/connected').on('value', (snap) => {
  const nowConnected = snap.val() === true;

  if (FirebaseService.connectionCheckTimer) {
    clearTimeout(FirebaseService.connectionCheckTimer);
    FirebaseService.connectionCheckTimer = null;
  }

  if (nowConnected) {
    const wasOffline = FirebaseService.isConnected === false && FirebaseService.isConnecting === false;
    FirebaseService.isConnected = true;
    FirebaseService.isConnecting = false;
    AuthService.updateAuthUI();
    FirebaseService.updateUIStatus();
    if (wasOffline) showOnlineBanner();
    else hideConnectionBanner();
  } else {
    FirebaseService.isConnected = false;
    FirebaseService.isConnecting = true;
    AuthService.updateAuthUI();

    FirebaseService.connectionCheckTimer = setTimeout(() => {
      FirebaseService.isConnecting = false;
      AuthService.updateAuthUI();
      FirebaseService.updateUIStatus();
      showOfflineBanner();
    }, 5000);
  }
});


/* ============================================================
   مراقبة حالة الشبكة (Online/Offline)
   ============================================================ */
window.addEventListener('online', () => {
  AuthService.updateAuthUI();
  FirebaseService.updateUIStatus();
});

window.addEventListener('offline', () => {
  AuthService.updateAuthUI();
  FirebaseService.updateUIStatus();
});


/* ============================================================
   نقطة الانطلاق
   ============================================================ */
window.addEventListener('DOMContentLoaded', initApp);