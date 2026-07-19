(() => {
  const TOKEN_KEY = 'mscodex-admin-token';
  const LOCK_KEY = 'mscodex-admin-lock';
  const MAX_FAILS = 5;
  const LOCK_MS = 5 * 60 * 1000;

  const loginView = document.querySelector('[data-admin-login]');
  const dashView = document.querySelector('[data-admin-dashboard]');
  const loginForm = document.querySelector('[data-login-form]');
  const loginError = document.querySelector('[data-login-error]');
  const otpHint = document.querySelector('[data-otp-hint]');
  const sendOtpBtn = document.querySelector('[data-send-otp]');
  const loginBtn = loginForm?.querySelector('button[type="submit"]');
  const pwdForm = document.querySelector('[data-password-form]');
  const pwdError = document.querySelector('[data-password-error]');
  const pwdBtn = document.querySelector('[data-password-btn]');
  const productList = document.querySelector('[data-product-list]');
  const productForm = document.querySelector('[data-product-form]');
  const formTitle = document.querySelector('[data-form-title]');
  const formError = document.querySelector('[data-form-error]');
  const formSuccess = document.querySelector('[data-form-success]');
  const deleteBtn = document.querySelector('[data-delete-product]');
  const imagePreview = document.querySelector('[data-image-preview]');
  const previewImg = imagePreview?.querySelector('img');
  const dropzoneEmpty = document.querySelector('[data-dropzone-empty]');
  const dropzone = document.querySelector('[data-dropzone]');
  const imageInput = document.querySelector('[data-image-input]');
  const uploadStatus = document.querySelector('[data-upload-status]');
  const productCountEl = document.querySelector('[data-product-count]');
  const saveBtn = document.querySelector('[data-save-btn]');
  const adminUsernameEl = document.querySelector('[data-admin-username]');
  const credentialsPanel = document.querySelector('[data-credentials-panel]');
  const credentialsForm = document.querySelector('[data-credentials-form]');
  const credentialsError = document.querySelector('[data-credentials-error]');
  const credentialsSuccess = document.querySelector('[data-credentials-success]');

  let products = [];
  let editingId = null;
  let pendingImageFile = null;
  let pendingPreviewUrl = null;
  let token = readStoredToken();
  let adminUser = null;
  let uploading = false;
  let sessionTimer = null;
  let listQuery = '';
  const productSearch = document.querySelector('[data-product-search]');

  const cfg = window.MSCODEX_SUPABASE || {};
  const adminEmail = cfg.adminEmail || 'lucascostapix1@gmail.com';
  const adminWhatsapp = String(cfg.whatsapp || '5511960670956').replace(/\D/g, '');

  const emailLabel = document.querySelector('[data-admin-email-label]');
  const waLabel = document.querySelector('[data-admin-whatsapp-label]');
  if (emailLabel) emailLabel.textContent = adminEmail;
  if (waLabel) {
    const d = adminWhatsapp.replace(/^55/, '');
    waLabel.textContent = d.length >= 11
      ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : adminWhatsapp;
  }

  function readStoredToken() {
    const sessionToken = sessionStorage.getItem(TOKEN_KEY);
    if (sessionToken) return sessionToken;
    const legacy = localStorage.getItem(TOKEN_KEY);
    if (legacy) {
      sessionStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem(TOKEN_KEY);
      return legacy;
    }
    return '';
  }

  function show(el, text) {
    if (!el) return;
    el.hidden = false;
    el.textContent = text || '';
  }

  function hide(el) {
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
  }

  function getLockState() {
    try {
      return JSON.parse(sessionStorage.getItem(LOCK_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function setLockState(state) {
    sessionStorage.setItem(LOCK_KEY, JSON.stringify(state));
  }

  function isLockedOut() {
    const state = getLockState();
    if (!state.until) return false;
    if (Date.now() < state.until) return true;
    setLockState({ fails: 0, until: 0 });
    return false;
  }

  function lockRemainingMin() {
    const state = getLockState();
    return Math.max(1, Math.ceil(((state.until || 0) - Date.now()) / 60000));
  }

  function registerFail() {
    const state = getLockState();
    const fails = Number(state.fails || 0) + 1;
    if (fails >= MAX_FAILS) {
      setLockState({ fails, until: Date.now() + LOCK_MS });
      return true;
    }
    setLockState({ fails, until: 0 });
    return false;
  }

  function clearFails() {
    setLockState({ fails: 0, until: 0 });
  }

  function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showScreen(screen) {
    if (loginView) loginView.hidden = screen !== 'login';
    if (dashView) dashView.hidden = screen !== 'painel';
    document.body.classList.toggle('admin-authed', screen === 'painel');
  }

  function normalizeCode(raw) {
    const txt = String(raw || '').trim();
    if (!txt) return '';
    // Se colou o link inteiro do e-mail (contendo token= ou access_token=)
    if (/http/i.test(txt)) {
      try {
        const u = new URL(txt);
        const qsToken =
          u.searchParams.get('token') ||
          u.searchParams.get('code') ||
          u.searchParams.get('otp');
        if (qsToken) return qsToken;
        const hashParams = new URLSearchParams((u.hash || '').replace(/^#/, ''));
        const hashToken = hashParams.get('access_token');
        if (hashToken) return hashToken;
      } catch {
        /* ignore */
      }
    }
    const hashMatch = txt.match(/access_token=([A-Za-z0-9._-]+)/);
    if (hashMatch) return hashMatch[1];
    return txt.replace(/[^A-Za-z0-9]/g, '');
  }

  function setAuthView(authenticated) {
    if (!authenticated && credentialsPanel) credentialsPanel.hidden = true;

    if (authenticated) {
      showScreen('painel');
      history.replaceState(null, '', '#painel');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      startSessionWatch();
      return;
    }

    stopSessionWatch();
    showScreen('login');
    history.replaceState(null, '', '#login');
  }

  function setToken(next) {
    token = next || '';
    localStorage.removeItem(TOKEN_KEY);
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  }

  function stopSessionWatch() {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
  }

  function startSessionWatch() {
    stopSessionWatch();
    sessionTimer = setInterval(async () => {
      const ok = await checkSession(false);
      if (!ok) forceLogout('Sessão expirada. Peça um novo código.');
    }, 60000);
  }

  function forceLogout(message) {
    setToken('');
    adminUser = null;
    products = [];
    setAuthView(false);
    resetForm();
    if (message) show(loginError, message);
  }

  async function secureLogout() {
    try {
      if (token) await window.mscodexRpc('logout_shop_admin', { p_token: token });
    } catch {
      /* ignore */
    }
    forceLogout('');
    hide(loginError);
    hide(otpHint);
    showScreen('login');
  }

  function selectedChannel() {
    const checked = loginForm?.querySelector('input[name="channel"]:checked');
    return checked?.value === 'email' ? 'email' : 'whatsapp';
  }

  async function sendOtp() {
    hide(loginError);
    hide(otpHint);

    if (isLockedOut()) {
      show(loginError, `Muitas tentativas. Aguarde ${lockRemainingMin()} min.`);
      return;
    }

    const channel = selectedChannel();
    if (sendOtpBtn) {
      sendOtpBtn.disabled = true;
      sendOtpBtn.textContent = 'Enviando…';
    }

    try {
      const { url, anonKey } = cfg;
      const res = await fetch(`${url}/functions/v1/send-admin-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar o código.');
      show(
        otpHint,
        data.message ||
          (channel === 'email'
            ? `Código enviado para ${adminEmail}.`
            : 'Código enviado. Verifique WhatsApp e e-mail.')
      );
      loginForm?.elements?.otp?.focus();
    } catch (err) {
      show(loginError, err.message || 'Erro ao enviar código.');
    } finally {
      if (sendOtpBtn) {
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Enviar código';
      }
    }
  }

  function revokePreview() {
    if (pendingPreviewUrl) {
      URL.revokeObjectURL(pendingPreviewUrl);
      pendingPreviewUrl = null;
    }
  }

  function updatePreview(src) {
    if (!imagePreview || !previewImg || !dropzoneEmpty) return;
    if (!src) {
      imagePreview.hidden = true;
      dropzoneEmpty.hidden = false;
      previewImg.removeAttribute('src');
      return;
    }
    previewImg.src = src;
    imagePreview.hidden = false;
    dropzoneEmpty.hidden = true;
  }

  function resetForm() {
    editingId = null;
    pendingImageFile = null;
    revokePreview();
    productForm?.reset();
    if (productForm) {
      productForm.elements.active.checked = true;
      productForm.elements.image.value = '';
      productForm.elements.id.value = '';
      if (imageInput) imageInput.value = '';
    }
    if (formTitle) formTitle.textContent = 'Novo produto';
    if (deleteBtn) deleteBtn.hidden = true;
    updatePreview('');
    hide(formError);
    hide(formSuccess);
    hide(uploadStatus);
  }

  function fillForm(product) {
    editingId = product.id;
    pendingImageFile = null;
    revokePreview();
    if (formTitle) formTitle.textContent = `Editar: ${product.name}`;
    productForm.elements.id.value = product.id;
    productForm.elements.name.value = product.name || '';
    productForm.elements.description.value = product.description || '';
    productForm.elements.requirements.value = product.requirements || '';
    productForm.elements.price.value = product.price ?? 0;
    productForm.elements.category.value = product.category || '';
    productForm.elements.tags.value = (product.tags || []).join(', ');
    productForm.elements.featured.checked = Boolean(product.featured);
    productForm.elements.active.checked = product.active !== false;
    productForm.elements.image.value = product.image_url || product.image || '';
    if (imageInput) imageInput.value = '';
    if (deleteBtn) deleteBtn.hidden = false;
    updatePreview(product.image_url || product.image || '');
    hide(formError);
    hide(formSuccess);
    hide(uploadStatus);
  }

  function renderList() {
    if (!productList) return;
    if (productCountEl) {
      const n = products.length;
      productCountEl.textContent = `${n} produto${n === 1 ? '' : 's'}`;
    }

    const q = listQuery.trim().toLowerCase();
    const visible = q
      ? products.filter((p) => {
          const hay = `${p.name || ''} ${p.category || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
          return hay.includes(q);
        })
      : products;

    if (!products.length) {
      productList.innerHTML = `
        <div class="admin-empty-state">
          <strong>Nenhum produto ainda</strong>
          <p>Clique em “+ Novo produto” para cadastrar o primeiro.</p>
        </div>`;
      return;
    }

    if (!visible.length) {
      productList.innerHTML = `
        <div class="admin-empty-state">
          <strong>Nenhum resultado</strong>
          <p>Tente outro termo de busca.</p>
        </div>`;
      return;
    }

    productList.innerHTML = visible
      .map((p) => {
        const activeClass = p.active ? '' : ' is-inactive';
        const selected = editingId === p.id ? ' is-selected' : '';
        const thumb = p.image
          ? `<img src="${p.image.replace(/"/g, '&quot;')}" alt="" loading="lazy" />`
          : `<span class="admin-thumb-fallback">${escapeHtml((p.category || 'MS').slice(0, 2))}</span>`;
        const statusChip = p.active
          ? '<span class="admin-status-chip is-active">Ativo</span>'
          : '<span class="admin-status-chip is-inactive">Inativo</span>';
        const featuredChip = p.featured
          ? '<span class="admin-status-chip is-featured">Destaque</span>'
          : '';
        return `
          <button type="button" class="admin-product-item${activeClass}${selected}" data-edit-id="${p.id}">
            <span class="admin-product-thumb">${thumb}</span>
            <span class="admin-product-body">
              <span class="admin-product-item-top">
                <strong>${escapeHtml(p.name)}</strong>
                <em>${money(p.price)}</em>
              </span>
              <span class="admin-product-item-meta">
                <span>${escapeHtml(p.category || 'Geral')}</span>
                ${statusChip}
                ${featuredChip}
              </span>
            </span>
          </button>
        `;
      })
      .join('');
  }

  async function loadProducts() {
    const data = await window.mscodexRpc('admin_list_products', { p_token: token });
    const rows = Array.isArray(data) ? data : data ? [data] : [];
    products = rows.map(window.mapProduct);
    renderList();
  }

  async function checkSession(updateUi = true) {
    if (!token) return false;
    try {
      const data = await window.mscodexRpc('verify_admin_session', { p_token: token });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.admin_id) {
        setToken('');
        return false;
      }
      adminUser = { id: row.admin_id, username: row.username };
      if (updateUi && adminUsernameEl) adminUsernameEl.textContent = adminUser.username;
      return true;
    } catch {
      setToken('');
      return false;
    }
  }

  function parseTags(value) {
    return String(value || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
  }

  async function handleImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      show(formError, 'Selecione um arquivo de imagem válido.');
      return;
    }

    hide(formError);
    pendingImageFile = file;
    revokePreview();
    pendingPreviewUrl = URL.createObjectURL(file);
    updatePreview(pendingPreviewUrl);

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    show(
      uploadStatus,
      Number(sizeMb) > 2
        ? `Imagem de ${sizeMb}MB selecionada. Ela será comprimida automaticamente ao salvar.`
        : 'Imagem pronta. Será enviada ao salvar o produto.'
    );
  }

  async function resolveImageUrl() {
    if (!pendingImageFile) return productForm.elements.image.value || '';

    show(uploadStatus, 'Otimizando e enviando imagem…');
    uploading = true;
    if (saveBtn) saveBtn.disabled = true;

    try {
      const blob = await window.mscodexCompressImage(pendingImageFile);
      const nameHint = productForm.elements.name.value || 'produto';
      const publicUrl = await window.mscodexUploadProductImage(blob, nameHint);
      productForm.elements.image.value = publicUrl;
      pendingImageFile = null;
      revokePreview();
      updatePreview(publicUrl);
      show(uploadStatus, `Imagem enviada (${Math.round(blob.size / 1024)} KB).`);
      return publicUrl;
    } finally {
      uploading = false;
      if (saveBtn) saveBtn.disabled = false;
    }
  }

  async function requireAdmin() {
    const ok = await checkSession(true);
    if (!ok) {
      forceLogout('Acesso apenas para administrador. Faça login.');
      throw new Error('Não autenticado');
    }
  }

  sendOtpBtn?.addEventListener('click', () => {
    sendOtp();
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(loginError);

    if (isLockedOut()) {
      show(loginError, `Muitas tentativas. Aguarde ${lockRemainingMin()} min.`);
      return;
    }

    const code = normalizeCode(new FormData(loginForm).get('otp'));
    if (!code) {
      show(loginError, 'Digite o código que você recebeu.');
      return;
    }

    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Entrando…';
    }

    try {
      const { url, anonKey } = cfg;
      const res = await fetch(`${url}/functions/v1/verify-admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Código inválido ou expirado.');
      const row = data;
      if (!row?.token || !row?.admin_id) throw new Error('Código inválido ou expirado.');

      clearFails();
      setToken(row.token);
      adminUser = { id: row.admin_id, username: row.username };
      if (adminUsernameEl) adminUsernameEl.textContent = adminUser.username;
      setAuthView(true);
      resetForm();
      await loadProducts();
      loginForm.reset();
      hide(otpHint);
    } catch (err) {
      setToken('');
      const locked = registerFail();
      show(
        loginError,
        locked
          ? `Acesso bloqueado por ${lockRemainingMin()} min.`
          : err.message || 'Código inválido ou expirado.'
      );
      showScreen('login');
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Entrar no painel';
      }
    }
  });

  document.querySelector('[data-logout]')?.addEventListener('click', () => secureLogout());

  document.querySelector('[data-toggle-credentials]')?.addEventListener('click', () => {
    if (!credentialsPanel) return;
    credentialsPanel.hidden = !credentialsPanel.hidden;
    hide(credentialsError);
    hide(credentialsSuccess);
  });

  credentialsForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(credentialsError);
    hide(credentialsSuccess);
    try {
      await requireAdmin();
      const fd = new FormData(credentialsForm);
      const newUsername = String(fd.get('new_username') || '').trim();
      const newPassword = String(fd.get('new_password') || '');
      if (!newUsername && !newPassword) {
        show(credentialsError, 'Informe novo usuário e/ou nova senha.');
        return;
      }
      const data = await window.mscodexRpc('change_shop_admin_credentials', {
        p_token: token,
        p_current_password: String(fd.get('current_password') || ''),
        p_new_username: newUsername || null,
        p_new_password: newPassword || null,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (row?.username) {
        adminUser = { id: row.admin_id, username: row.username };
        if (adminUsernameEl) adminUsernameEl.textContent = row.username;
      }
      credentialsForm.reset();
      show(credentialsSuccess, 'Credenciais atualizadas.');
    } catch (err) {
      show(credentialsError, err.message || 'Erro ao atualizar credenciais');
    }
  });

  document.querySelector('[data-new-product]')?.addEventListener('click', () => {
    resetForm();
    renderList();
  });

  productSearch?.addEventListener('input', () => {
    listQuery = productSearch.value || '';
    renderList();
  });

  pwdForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(pwdError);
    if (pwdBtn) {
      pwdBtn.disabled = true;
      pwdBtn.textContent = 'Entrando…';
    }
    const fd = new FormData(pwdForm);
    const username = String(fd.get('username') || '').trim();
    const password = String(fd.get('password') || '');
    if (!username || !password) {
      show(pwdError, 'Preencha usuário e senha.');
      if (pwdBtn) {
        pwdBtn.disabled = false;
        pwdBtn.textContent = 'Entrar com senha';
      }
      return;
    }
    try {
      const data = await window.mscodexRpc('login_shop_admin', {
        p_username: username,
        p_password: password,
      });
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.token || !row?.admin_id) throw new Error('Credenciais inválidas.');
      clearFails();
      setToken(row.token);
      adminUser = { id: row.admin_id, username: row.username };
      if (adminUsernameEl) adminUsernameEl.textContent = adminUser.username;
      setAuthView(true);
      resetForm();
      await loadProducts();
      pwdForm.reset();
      hide(otpHint);
    } catch (err) {
      setToken('');
      const locked = registerFail();
      show(
        pwdError,
        locked ? `Acesso bloqueado por ${lockRemainingMin()} min.` : err.message || 'Credenciais inválidas.'
      );
      showScreen('login');
    } finally {
      if (pwdBtn) {
        pwdBtn.disabled = false;
        pwdBtn.textContent = 'Entrar com senha';
      }
    }
  });

  document.querySelector('[data-reset-form]')?.addEventListener('click', () => {
    resetForm();
    renderList();
  });

  document.querySelector('[data-clear-image]')?.addEventListener('click', () => {
    pendingImageFile = null;
    revokePreview();
    productForm.elements.image.value = '';
    if (imageInput) imageInput.value = '';
    updatePreview('');
    hide(uploadStatus);
  });

  document.querySelector('[data-change-image]')?.addEventListener('click', () => imageInput?.click());

  dropzone?.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear-image], [data-change-image]')) return;
    if (!imagePreview?.hidden && e.target.closest('.admin-image-preview')) return;
    imageInput?.click();
  });

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('is-dragover');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('is-dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImageFile(file);
  });
  imageInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  });

  productList?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-edit-id]');
    if (!btn) return;
    const product = products.find((p) => p.id === btn.getAttribute('data-edit-id'));
    if (!product) return;
    fillForm(product);
    renderList();
  });

  productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (uploading) return;
    hide(formError);
    hide(formSuccess);
    try {
      await requireAdmin();
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Salvando…';
      }
      const image_url = await resolveImageUrl();
      const payload = {
        p_token: token,
        p_name: productForm.elements.name.value.trim(),
        p_description: productForm.elements.description.value.trim(),
        p_requirements: productForm.elements.requirements.value.trim(),
        p_price: Number(productForm.elements.price.value),
        p_category: productForm.elements.category.value.trim(),
        p_tags: parseTags(productForm.elements.tags.value),
        p_image_url: image_url,
        p_featured: productForm.elements.featured.checked,
        p_active: productForm.elements.active.checked,
      };
      const result = editingId
        ? await window.mscodexRpc('admin_update_product', { ...payload, p_id: editingId })
        : await window.mscodexRpc('admin_create_product', payload);
      const product = window.mapProduct(Array.isArray(result) ? result[0] : result);
      await loadProducts();
      if (product) fillForm(product);
      show(formSuccess, 'Produto salvo com sucesso.');
    } catch (err) {
      show(formError, err.message || 'Erro ao salvar');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar produto';
      }
    }
  });

  deleteBtn?.addEventListener('click', async () => {
    if (!editingId) return;
    if (!window.confirm('Excluir este produto permanentemente?')) return;
    try {
      await requireAdmin();
      await window.mscodexRpc('admin_delete_product', { p_token: token, p_id: editingId });
      resetForm();
      await loadProducts();
      show(formSuccess, 'Produto excluído.');
    } catch (err) {
      show(formError, err.message || 'Erro ao excluir');
    }
  });

  async function init() {
    showScreen('login');
    try {
      const authed = await checkSession(true);
      if (authed) {
        setAuthView(true);
        resetForm();
        await loadProducts();
      } else {
        showScreen('login');
      }
    } catch {
      showScreen('login');
    }
  }

  init();
})();
