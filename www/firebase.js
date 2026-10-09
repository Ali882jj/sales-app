/* ============================================================
   FIREBASE SERVICE - المزامنة السحابية
   ============================================================ */

const FirebaseService = {
  syncTimer: null,
  isConnected: false,
  isConnecting: true,
  connectionCheckTimer: null,
  bannerAutoHideTimer: null,

  init() {
    // لا شيء — AuthService يتولى جلب البيانات السحابية
    this.updateUIStatus();
  },

  updateUIStatus(statusMsg = null) {
    const syncDot = document.getElementById('drive-sync-dot');
    const syncText = document.getElementById('drive-sync-status-text');
    const msg = document.getElementById('gdrive-sync-msg');
    const accountStatusText = document.querySelector('.account-status-row span:last-child');
    const accountDot = document.querySelector('.account-status-dot');

    const logged = AuthService.isLoggedIn();
    const isConnecting = this.isConnecting === true;
    const online = navigator.onLine && this.isConnected === true;

    if (syncDot) syncDot.classList.remove('online', 'offline');
    if (accountDot) accountDot.classList.remove('offline');

    if (isConnecting) {
      if (syncText) syncText.innerText = 'جارٍ الاتصال...';
      if (accountStatusText) accountStatusText.innerText = 'جارٍ الاتصال...';
      return;
    }

    if (!logged) {
      if (syncText) syncText.innerText = 'حساب زائر — غير مسجل';
      if (msg && !statusMsg) msg.innerText = 'سجّل الدخول لتفعيل المزامنة';
      if (accountStatusText) accountStatusText.innerText = 'الحساب غير متصل';
      if (accountDot) accountDot.classList.add('offline');
      return;
    }

    if (online) {
  if (syncDot) syncDot.classList.add('online');
  if (syncText) syncText.innerText = 'المزامنة نشطة';
  if (msg && !statusMsg) {
    const lastSync = StorageService.getLastSyncTime();
    if (lastSync) {
      const t = new Date(lastSync).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
      msg.innerText = `جاهز للمزامنة. آخر نسخة احتياطية: ${t}`;
    } else {
      msg.innerText = 'جاهز للمزامنة';
    }
  }
  if (accountStatusText) accountStatusText.innerText = 'الحساب متصل والمزامنة نشطة';
} else {
      if (syncDot) syncDot.classList.add('offline');
      if (syncText) syncText.innerText = 'لا يتوفر اتصال بالشبكة — المزامنة متوقفة';
      if (msg && !statusMsg) msg.innerText = 'غير متصل بالشبكة';
      if (accountStatusText) accountStatusText.innerText = 'غير متصل — المزامنة متوقفة';
      if (accountDot) accountDot.classList.add('offline');
    }

    if (msg && statusMsg) msg.innerText = statusMsg;
  },

  scheduleAutoSync() {
    clearTimeout(this.syncTimer);
    this.syncTimer = setTimeout(() => { this.syncData(false); }, 1200);
  },

  async syncData(manual = false) {
    if (!navigator.onLine || this.isConnected !== true) {
      if (manual) showToast('لا يتوفر اتصال بالشبكة', true);
      return;
    }

    let uid = AuthService.getUid();
    if (!uid) {
      const session = StorageService.getUserSession();
      if (session && session.uid) uid = session.uid;
    }
    if (!uid) {
      if (manual) showToast('يرجى تسجيل الدخول أولاً', true);
      return;
    }

    const safeDisplayName = AuthService.currentUser?.displayName
      || fbAuth.currentUser?.displayName
      || AuthService.currentUser?.email
      || '';

    const idx = StorageService.getNotebooksIndex();
    const notebooksData = {};
    idx.notebooks.forEach(nb => {
      const d = StorageService._getNotebookData(nb.id);
      if (d) notebooksData[nb.id] = d;
    });

    const payload = {
      profile: {
        displayName: safeDisplayName,
        email: AuthService.currentUser?.email || fbAuth.currentUser?.email || '',
        storeName: state.settings.projectName || '',
        updatedAt: new Date().toISOString()
      },
      version: '5.0',
      exportedAt: new Date().toISOString(),
      notebooks: idx.notebooks,
      activeId: idx.activeId,
      notebooksData: notebooksData,
      globalSettings: StorageService.getGlobalSettings()
    };

try {
  await fbDb.ref('userData/' + uid).set(payload);
  StorageService.saveLastSyncTime(new Date().toISOString());
  this.updateUIStatus();
  if (manual) showToast('تم الحفظ في السحابة');
} catch(err) {
      console.error(err);
      this.updateUIStatus('تعذر الاتصال بالخادم');
      if (manual) showToast('تعذر الاتصال بالخادم', true);
    }
  },

  async pullLatestData(showAlert = true) {
    const uid = AuthService.getUid();
    if (!uid) {
      if (showAlert) showToast('سجّل الدخول لجلب البيانات من السحابة', true);
      return;
    }

    try {
      const snap = await fbDb.ref('userData/' + uid).once('value');
      const imported = snap.val();

      const hasNew = imported && Array.isArray(imported.notebooks) && imported.notebooksData;
      const hasOld = imported && (Array.isArray(imported.customers) || Array.isArray(imported.sales));

      if (hasNew || hasOld) {
        StorageService.setAllFromCloud(imported);

        state.customers = StorageService.getCustomers();
        state.sales = StorageService.getSales();
        state.purchases = StorageService.getPurchases();
        state.settings = StorageService.getSettings();
        state.activityLog = StorageService.getActivityLog();

        document.body.setAttribute('data-theme', state.settings.theme || 'light');
        updateThemeUI();

        const headerName = document.getElementById('header-app-name');
        if (headerName) headerName.innerText = state.settings.projectName || 'دفتر المبيعات';

        applyCustomThemeStyles();
        applySimplifiedDebtMode();
        renderDashboard();
        renderCustomers();
        renderPurchases();
        renderSales();
        updateActivityLogBadge();
        if (state.selectedCustomerIdForDetail) {
          renderCustomerDetailDOM(state.selectedCustomerIdForDetail);
        }

        if (showAlert) {
          logActivity('system_sync', 'استرجاع بيانات من السحابة', 'تمت استعادة البيانات');
          showToast('تم استرجاع البيانات');
        }
      } else if (showAlert) {
        showToast('لا توجد بيانات سحابية محفوظة', true);
      }
    } catch(err) {
      console.error(err);
      if (showAlert) showToast('تعذر استرجاع البيانات', true);
    }
  }
};


/* ============================================================
   AUTH SERVICE - نظام الحسابات
   ============================================================ */

const firebaseConfig = {
  apiKey: "AIzaSyDPdefrv0fJH8b1X9S8rgOwy96uQNpwP68",
  authDomain: "sales-tracker-6d749.firebaseapp.com",
  databaseURL: "https://sales-tracker-6d749-default-rtdb.firebaseio.com",
  projectId: "sales-tracker-6d749",
  storageBucket: "sales-tracker-6d749.firebasestorage.app",
  messagingSenderId: "50243657134",
  appId: "1:50243657134:web:2899c81e31aa86e62cbc3f"
};

firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth();
const fbDb = firebase.database();

const AuthService = {
  currentUser: null,
  isReady: false,
  _resolveReady: null,

  init() {
    return new Promise((resolve) => {
      this._resolveReady = resolve;

      fbAuth.onAuthStateChanged(async (user) => {
        if (user) {
          let displayName = user.displayName || '';
          try {
            const snap = await fbDb.ref('userData/' + user.uid + '/profile').once('value');
            const profile = snap.val();
            if (profile) {
              if (profile.displayName && profile.displayName.trim() && profile.displayName !== profile.storeName) {
                displayName = profile.displayName;
              } else if (!displayName && profile.storeName) {
                displayName = profile.storeName;
              }
              state.userProfile = profile;
            }
          } catch (e) { /* تجاهل */ }

          this.currentUser = {
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.email
          };
          StorageService.saveUserSession(this.currentUser);
        } else {
          const cachedSession = StorageService.getUserSession();
          if (cachedSession && !navigator.onLine) {
            this.currentUser = {
              uid: cachedSession.uid,
              email: cachedSession.email,
              displayName: cachedSession.displayName
            };
          } else {
            this.currentUser = null;
            state.userProfile = null;
            StorageService.clearUserSession();
          }
        }

        this.isReady = true;
        this.updateAuthUI();
        if (this._resolveReady) { this._resolveReady(); this._resolveReady = null; }
      });
    });
  },

  isLoggedIn() { return !!this.currentUser; },
  getUid() { return this.currentUser ? this.currentUser.uid : null; },

  updateAuthUI() {
    const logged = this.isLoggedIn();
    const user = this.currentUser;

    const dashNotice = document.getElementById('dashboard-auth-notice');
    if (dashNotice) {
      if (logged) {
        dashNotice.style.display = 'none';
      } else {
        dashNotice.style.display = shouldShowDashboardAuthNotice() ? 'flex' : 'none';
      }
    }

    const setNotice = document.getElementById('settings-auth-notice');
    const setAccount = document.getElementById('settings-account-card');
    if (setNotice) setNotice.style.display = logged ? 'none' : 'flex';
    if (setAccount) setAccount.style.display = logged ? 'block' : 'none';

    if (logged) {
      const session = StorageService.getUserSession();
      const effectiveUser = user || session;
      if (effectiveUser) {
        const nameEl = document.getElementById('account-display-name');
        const emailEl = document.getElementById('account-display-email');
        const avatarEl = document.getElementById('account-avatar-letter');
        if (nameEl) nameEl.innerText = effectiveUser.displayName || 'مستخدم';
        if (emailEl) emailEl.innerText = effectiveUser.email || '';
        if (avatarEl) {
          const firstChar = (effectiveUser.displayName || effectiveUser.email || 'م').trim().charAt(0);
          avatarEl.innerText = firstChar;
        }
      }
    }

    const syncDot = document.getElementById('drive-sync-dot');
    const syncText = document.getElementById('drive-sync-status-text');
    const isConnecting = FirebaseService.isConnecting === true;
    const online = navigator.onLine && FirebaseService.isConnected === true;

    if (syncDot && syncText) {
      syncDot.classList.remove('online', 'offline');
      if (isConnecting) {
        syncText.innerText = 'جارٍ الاتصال...';
      } else if (!logged) {
        syncText.innerText = 'حساب زائر — غير مسجل';
      } else if (online) {
        syncDot.classList.add('online');
        syncText.innerText = 'المزامنة نشطة';
      } else {
        syncDot.classList.add('offline');
        syncText.innerText = 'لا يتوفر اتصال بالشبكة — المزامنة متوقفة';
      }
    }

    const accountDot = document.querySelector('.account-status-dot');
    const accountStatusText = document.querySelector('.account-status-row span:last-child');
    if (accountDot && accountStatusText) {
      accountDot.classList.remove('offline');
      if (!logged) {
        accountDot.classList.add('offline');
        accountStatusText.innerText = 'الحساب غير متصل';
      } else if (!online) {
        accountDot.classList.add('offline');
        accountStatusText.innerText = 'غير متصل — المزامنة متوقفة';
      } else {
        accountStatusText.innerText = 'الحساب متصل والمزامنة نشطة';
      }
    }
  },

  async replaceLocalWithCloud(cloudData) {
    StorageService.clearAllKeepAuth();
    StorageService.setAllFromCloud(cloudData || {});

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

    applyCustomThemeStyles();
    applySimplifiedDebtMode();
    renderDashboard();
    renderCustomers();
    renderSales();
    renderPurchases();
    updateActivityLogBadge();
    if (state.selectedCustomerIdForDetail) renderCustomerDetailDOM(state.selectedCustomerIdForDetail);
  },

  async uploadLocalToCloud(uid) {
    const safeDisplayName = AuthService.currentUser?.displayName
      || fbAuth.currentUser?.displayName
      || AuthService.currentUser?.email
      || '';

    const idx = StorageService.getNotebooksIndex();
    const notebooksData = {};
    idx.notebooks.forEach(nb => {
      const d = StorageService._getNotebookData(nb.id);
      if (d) notebooksData[nb.id] = d;
    });

    const payload = {
      profile: {
        displayName: safeDisplayName,
        email: AuthService.currentUser?.email || fbAuth.currentUser?.email || '',
        storeName: state.settings.projectName || '',
        updatedAt: new Date().toISOString()
      },
      version: '5.0',
      exportedAt: new Date().toISOString(),
      notebooks: idx.notebooks,
      activeId: idx.activeId,
      notebooksData: notebooksData,
      globalSettings: StorageService.getGlobalSettings()
    };

    await fbDb.ref('userData/' + uid).set(payload);
  }
};


/* ============ دوال مودال الحسابات ============ */

function openAuthModal(defaultTab = 'login') {
  const isOffline = !navigator.onLine || (FirebaseService.isConnected === false && FirebaseService.isConnecting === false);
  if (isOffline) {
    showToast('يلزم اتصال بالإنترنت لتسجيل الدخول', true);
    return;
  }

  document.getElementById('auth-error').classList.remove('show');
  document.getElementById('auth-form-login').reset();
  document.getElementById('auth-form-signup').reset();

  const forgotMsg = document.getElementById('auth-forgot-msg');
  if (forgotMsg) { forgotMsg.classList.remove('show', 'error'); forgotMsg.innerText = ''; }
  const forgotBtn = document.getElementById('btn-forgot-password');
  if (forgotBtn) forgotBtn.disabled = false;

  const iconUse = document.querySelector('#auth-modal-icon-svg use');
  if (iconUse) iconUse.setAttribute('href', '#icon-user-login');

  switchAuthTab(defaultTab);
  openModal('modal-auth');
}

function closeAuthModal() {
  if (state.openModalStack.includes('modal-auth')) {
    closeModal('modal-auth');
  } else {
    document.getElementById('modal-auth').classList.remove('active');
  }
}

function switchAuthTab(tab) {
  document.getElementById('auth-error').classList.remove('show');
  const forgotMsg = document.getElementById('auth-forgot-msg');
  if (forgotMsg) { forgotMsg.classList.remove('show', 'error'); forgotMsg.innerText = ''; }

  const tabLogin = document.getElementById('auth-tab-login');
  const tabSignup = document.getElementById('auth-tab-signup');
  const formLogin = document.getElementById('auth-form-login');
  const formSignup = document.getElementById('auth-form-signup');
  const title = document.getElementById('auth-modal-title');
  const subtitle = document.getElementById('auth-modal-subtitle');
  const iconUse = document.querySelector('#auth-modal-icon-svg use');

  if (tab === 'login') {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    formLogin.classList.add('active');
    formSignup.classList.remove('active');
    if (title) title.innerText = 'مرحباً بك مجدداً';
    if (subtitle) subtitle.innerText = 'سجل دخولك للوصول إلى لوحة التحكم وبياناتك';
    if (iconUse) iconUse.setAttribute('href', '#icon-user-login');
  } else {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    formSignup.classList.add('active');
    formLogin.classList.remove('active');
    if (title) title.innerText = 'إنشاء حساب جديد';
    if (subtitle) subtitle.innerText = 'أنشئ حسابك لإدارة مبيعاتك ومتابعة مستحقاتك المالية';
    if (iconUse) iconUse.setAttribute('href', '#icon-user-signup');
  }
}

function showAuthError(msg) {
  const errEl = document.getElementById('auth-error');
  const txtEl = document.getElementById('auth-error-text');
  if (txtEl) txtEl.innerText = msg;
  if (errEl) errEl.classList.add('show');
}

function hideAuthError() {
  const errEl = document.getElementById('auth-error');
  if (errEl) errEl.classList.remove('show');
}

function setBtnLoading(btnId, loading, loadingText) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span class="auth-spinner"></span><span>${loadingText || 'جاري...'}</span>`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }
  }
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  const useEl = btnEl.querySelector('use');
  if (useEl) useEl.setAttribute('href', isPassword ? '#icon-eye-off' : '#icon-eye');
}

function translateAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'هذا البريد مستخدم بالفعل',
    'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
    'auth/weak-password': 'كلمة المرور ضعيفة (6 أحرف على الأقل)',
    'auth/user-not-found': 'لا يوجد حساب بهذا البريد',
    'auth/wrong-password': 'كلمة المرور غير صحيحة',
    'auth/invalid-credential': 'البريد أو كلمة المرور غير صحيحة',
    'auth/too-many-requests': 'محاولات كثيرة، حاول لاحقاً',
    'auth/network-request-failed': 'تعذر الاتصال بالإنترنت',
    'auth/user-disabled': 'هذا الحساب معطّل'
  };
  return map[code] || 'حدث خطأ، حاول مرة أخرى';
}

async function handleForgotPassword() {
  const forgotBtn = document.getElementById('btn-forgot-password');
  const forgotMsg = document.getElementById('auth-forgot-msg');
  const emailInput = document.getElementById('login-email');
  const email = (emailInput?.value || '').trim();

  if (!navigator.onLine) {
    forgotMsg.innerText = 'يجب الاتصال بالشبكة أولاً للمتابعة';
    forgotMsg.classList.add('show', 'error');
    return;
  }

  forgotMsg.classList.remove('show', 'error');
  forgotMsg.innerText = '';

  if (!email) {
    forgotMsg.innerText = 'أدخل بريدك الإلكتروني أولاً ثم اضغط الزر مرة أخرى';
    forgotMsg.classList.add('show', 'error');
    emailInput?.focus();
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    forgotMsg.innerText = 'صيغة البريد الإلكتروني غير صحيحة';
    forgotMsg.classList.add('show', 'error');
    return;
  }

  forgotBtn.disabled = true;
  const originalText = forgotBtn.innerText;
  forgotBtn.innerText = 'جاري الإرسال...';

  try {
    await fbAuth.sendPasswordResetEmail(email);
    forgotMsg.innerText = `تم إرسال رسالة إعادة تعيين كلمة المرور إلى ${email}. تحقّق من بريدك الوارد (او الرسائل غير المرغوب فيها).`;
    forgotMsg.classList.add('show');
    forgotMsg.classList.remove('error');
  } catch (err) {
    console.error(err);
    let msg = 'تعذر إرسال الرسالة، حاول مرة أخرى';
    if (err.code === 'auth/user-not-found') msg = 'لا يوجد حساب مسجّل بهذا البريد';
    else if (err.code === 'auth/invalid-email') msg = 'البريد الإلكتروني غير صحيح';
    else if (err.code === 'auth/too-many-requests') msg = 'محاولات كثيرة، حاول لاحقاً';
    else if (err.code === 'auth/network-request-failed') msg = 'تعذر الاتصال بالإنترنت';
    forgotMsg.innerText = msg;
    forgotMsg.classList.add('show', 'error');
  } finally {
    forgotBtn.disabled = false;
    forgotBtn.innerText = originalText;
  }
}

async function handleLogin(e) {
  e.preventDefault();
  hideAuthError();

  if (!navigator.onLine) {
    showAuthError('يجب الاتصال بالشبكة أولاً للمتابعة');
    return;
  }

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email) { showAuthError('يرجى إدخال البريد الإلكتروني'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthError('صيغة البريد الإلكتروني غير صحيحة'); return; }
  if (!password) { showAuthError('يرجى إدخال كلمة المرور'); return; }

  setBtnLoading('login-submit-btn', true, 'جاري الدخول...');
  try {
    const cred = await fbAuth.signInWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    StorageService.saveUserSession({
      uid: uid,
      email: cred.user.email,
      displayName: cred.user.displayName || cred.user.email
    });
    const snap = await fbDb.ref('userData/' + uid).once('value');
    const cloudData = snap.val() || {};
    await AuthService.replaceLocalWithCloud(cloudData);
    if (cloudData.profile && cloudData.profile.displayName && cloudData.profile.displayName.trim()) {
      StorageService.saveUserSession({
        uid: uid,
        email: cred.user.email,
        displayName: cloudData.profile.displayName
      });
    }
    closeAuthModal();
    showToast('تم تسجيل الدخول بنجاح');
  } catch (err) {
    console.error(err);
    showAuthError(translateAuthError(err.code));
  } finally {
    setBtnLoading('login-submit-btn', false);
  }
}

async function handleSignup(e) {
  e.preventDefault();
  hideAuthError();

  if (!navigator.onLine) {
    showAuthError('يجب الاتصال بالشبكة أولاً للمتابعة');
    return;
  }

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const passwordConfirm = document.getElementById('signup-password-confirm').value;

  if (!name) { showAuthError('يرجى إدخال الاسم أو اسم المتجر'); return; }
  if (!email) { showAuthError('يرجى إدخال البريد الإلكتروني'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthError('صيغة البريد الإلكتروني غير صحيحة'); return; }
  if (!password) { showAuthError('يرجى إدخال كلمة المرور'); return; }
  if (password.length < 6) { showAuthError('كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
  if (password !== passwordConfirm) { showAuthError('كلمتا المرور غير متطابقتين'); return; }

  setBtnLoading('signup-submit-btn', true, 'جاري الإنشاء...');
  try {
    const cred = await fbAuth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;
    await cred.user.updateProfile({ displayName: name });
    const currentProjectName = state.settings.projectName || 'دفتر المبيعات';
    await fbDb.ref('userData/' + uid + '/profile').set({
      displayName: name,
      storeName: currentProjectName,
      email: email,
      createdAt: new Date().toISOString()
    });

    AuthService.currentUser = {
      uid: uid,
      email: email,
      displayName: name
    };

    await AuthService.uploadLocalToCloud(uid);
    StorageService.saveUserSession({
      uid: uid,
      email: cred.user.email,
      displayName: name
    });
    const snap = await fbDb.ref('userData/' + uid).once('value');
    const cloudData = snap.val() || {};
    await AuthService.replaceLocalWithCloud(cloudData);
    closeAuthModal();
    showToast('تم إنشاء الحساب بنجاح');
  } catch (err) {
    console.error(err);
    showAuthError(translateAuthError(err.code));
  } finally {
    setBtnLoading('signup-submit-btn', false);
  }
}

function openEditAccountModal() {
  if (!AuthService.isLoggedIn()) {
    showToast('يرجى تسجيل الدخول أولاً', true);
    return;
  }
  const nameInput = document.getElementById('edit-account-name');
  if (nameInput) nameInput.value = AuthService.currentUser?.displayName || '';
  document.getElementById('edit-account-current-pass').value = '';
  document.getElementById('edit-account-new-pass').value = '';
  document.getElementById('edit-account-confirm-pass').value = '';
  document.getElementById('edit-account-error').classList.remove('show');
  const forgotMsg = document.getElementById('edit-account-forgot-msg');
  if (forgotMsg) { forgotMsg.classList.remove('show', 'error'); forgotMsg.innerText = ''; }
  const forgotBtn = document.getElementById('btn-edit-forgot-password');
  if (forgotBtn) forgotBtn.disabled = false;
  openModal('modal-edit-account');
}

async function handleSaveAccount(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('edit-account-submit-btn');
  if (submitBtn && submitBtn.disabled) return;

  const errorNotice = document.getElementById('edit-account-error');
  const errorText = document.getElementById('edit-account-error-text');
  const showError = (msg) => { errorText.innerText = msg; errorNotice.classList.add('show'); };
  errorNotice.classList.remove('show');

  const newName = document.getElementById('edit-account-name').value.trim();
  const currentPass = document.getElementById('edit-account-current-pass').value;
  const newPass = document.getElementById('edit-account-new-pass').value;
  const confirmPass = document.getElementById('edit-account-confirm-pass').value;

  if (!newName) return showError('يرجى إدخال اسم الحساب');

  const wantsPasswordChange = !!(currentPass || newPass || confirmPass);
  if (wantsPasswordChange) {
    if (!currentPass) return showError('يرجى إدخال كلمة المرور الحالية');
    if (!newPass) return showError('يرجى إدخال كلمة المرور الجديدة');
    if (newPass.length < 6) return showError('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    if (newPass !== confirmPass) return showError('كلمتا المرور الجديدتان غير متطابقتين');
  }
  if (!navigator.onLine) return showError('يجب الاتصال بالإنترنت لإتمام العملية');

  if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }
  try {
    const user = fbAuth.currentUser;
    if (!user) throw new Error('no-user');

    if (newName !== (AuthService.currentUser?.displayName || '')) {
      await user.updateProfile({ displayName: newName });
      await fbDb.ref('userData/' + user.uid + '/profile').update({
        displayName: newName,
        updatedAt: new Date().toISOString()
      });
      if (AuthService.currentUser) {
        AuthService.currentUser.displayName = newName;
        StorageService.saveUserSession(AuthService.currentUser);
      }
    }

    if (wantsPasswordChange) {
      const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPass);
      await user.reauthenticateWithCredential(cred);
      await user.updatePassword(newPass);
    }

    AuthService.updateAuthUI();
    closeModal('modal-edit-account');
    showToast(wantsPasswordChange ? 'تم تحديث الحساب وكلمة المرور' : 'تم تحديث بيانات الحساب');
  } catch (err) {
    console.error(err);
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      showError('كلمة المرور الحالية غير صحيحة');
    } else if (err.code === 'auth/weak-password') {
      showError('كلمة المرور الجديدة ضعيفة جداً');
    } else if (err.code === 'auth/requires-recent-login') {
      showError('انتهت صلاحية الجلسة. سجّل خروج وادخل مرة أخرى ثم حاول');
    } else if (err.code === 'auth/network-request-failed') {
      showError('تعذر الاتصال بالإنترنت');
    } else if (err.message === 'no-user') {
      showError('لا يوجد مستخدم مسجّل');
    } else {
      showError('حدث خطأ، حاول مرة أخرى');
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
  }
}

async function handleEditForgotPassword() {
  const forgotMsg = document.getElementById('edit-account-forgot-msg');
  const forgotBtn = document.getElementById('btn-edit-forgot-password');
  const user = fbAuth.currentUser;
  const email = user?.email || AuthService.currentUser?.email;

  if (!navigator.onLine) {
    forgotMsg.innerText = 'يجب الاتصال بالإنترنت';
    forgotMsg.classList.add('show', 'error');
    return;
  }
  if (!email) {
    forgotMsg.innerText = 'لا يمكن تحديد بريدك الإلكتروني';
    forgotMsg.classList.add('show', 'error');
    return;
  }

  forgotMsg.classList.remove('show', 'error');
  forgotMsg.innerText = '';
  forgotBtn.disabled = true;
  const originalText = forgotBtn.innerText;
  forgotBtn.innerText = 'جاري الإرسال...';

  try {
    await fbAuth.sendPasswordResetEmail(email);
    forgotMsg.innerText = `تم إرسال رابط إعادة التعيين إلى ${email}. تحقق من بريدك الوارد او الرسائل غير المرغوب فيها.`;
    forgotMsg.classList.add('show');
    forgotMsg.classList.remove('error');
  } catch (err) {
    console.error(err);
    forgotMsg.innerText = 'تعذر إرسال الرسالة، حاول لاحقاً';
    forgotMsg.classList.add('show', 'error');
  } finally {
    forgotBtn.disabled = false;
    forgotBtn.innerText = originalText;
  }
}

function handleLogout() {
  openCustomDialog({
    title: 'تسجيل الخروج',
    desc: 'هل تريد تسجيل الخروج؟. بياناتك محفوظة وستعود عند تسجيل الدخول مجددًا.',
    onConfirm: async () => {
      try {
        try { await fbAuth.signOut(); } catch(e) { /* offline logout */ }
        StorageService.clearUserSession();
        try { localStorage.removeItem('store_dismiss_auth_notice'); } catch(e) {}
        StorageService.clearAllKeepAuth();
        state.customers = [];
        state.sales = [];
        state.purchases = [];
        state.activityLog = [];
        state.settings = StorageService.getSettings();
        AuthService.currentUser = null;
        AuthService.updateAuthUI();
        applyCustomThemeStyles();
        applySimplifiedDebtMode();
        renderDashboard();
        renderCustomers();
        renderSales();
        renderPurchases();
        updateActivityLogBadge();
        showToast('تم تسجيل الخروج');
      } catch (err) {
        console.error(err);
        showToast('تعذر تسجيل الخروج', true);
      }
    }
  });
}

function dismissDashboardAuthNotice() {
  const notice = document.getElementById('dashboard-auth-notice');
  if (notice) notice.style.display = 'none';
  try { localStorage.setItem('store_dismiss_auth_notice', '1'); } catch(e) {}
}

function shouldShowDashboardAuthNotice() {
  try {
    return localStorage.getItem('store_dismiss_auth_notice') !== '1';
  } catch(e) { return true; }
}