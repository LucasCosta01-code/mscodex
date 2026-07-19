(() => {
  const CART_KEY = 'mscodex-cart';
  const grid = document.querySelector('[data-shop-grid]');
  const filtersEl = document.querySelector('[data-shop-filters]');
  const statusEl = document.querySelector('[data-shop-status]');
  const drawer = document.querySelector('[data-cart-drawer]');
  const cartItemsEl = document.querySelector('[data-cart-items]');
  const cartCountEl = document.querySelector('[data-cart-count]');
  const cartTotalEl = document.querySelector('[data-cart-total]');
  const checkoutBtn = document.querySelector('[data-cart-checkout]');
  const totalCountEl = document.querySelector('[data-shop-total-count]');
  const detailModal = document.querySelector('[data-product-modal]');
  const detailMedia = document.querySelector('[data-product-media]');
  const detailTitle = document.querySelector('[data-product-title]');
  const detailCategory = document.querySelector('[data-product-category]');
  const detailDesc = document.querySelector('[data-product-desc]');
  const detailReqs = document.querySelector('[data-product-reqs]');
  const detailReqsText = document.querySelector('[data-product-reqs-text]');
  const detailTags = document.querySelector('[data-product-tags]');
  const detailPrice = document.querySelector('[data-product-price]');
  const detailAddBtn = document.querySelector('[data-detail-add]');

  if (!grid) return;

  let products = [];
  let whatsapp = window.MSCODEX_SUPABASE?.whatsapp || '5511960670956';
  let activeFilter = 'all';
  let cart = loadCart();

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function money(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeCategory(value) {
    return String(value || '').trim();
  }

  async function fetchProducts() {
    const rows = await window.mscodexFetchProducts();
    products = (rows || []).map((row) => {
      const mapped = window.mapProduct(row);
      mapped.category = normalizeCategory(mapped.category) || 'Geral';
      return mapped;
    });
  }

  function categories() {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }

  function renderFilters() {
    if (!filtersEl) return;
    filtersEl.innerHTML = categories()
      .map((cat) => {
        const label = cat === 'all' ? 'Todos' : cat;
        const active = activeFilter === cat ? ' is-active' : '';
        return `<button type="button" class="shop-filter${active}" data-filter="${escapeHtml(cat)}">${escapeHtml(label)}</button>`;
      })
      .join('');
  }

  function filteredProducts() {
    if (activeFilter === 'all') return products.slice();
    return products.filter((p) => p.category === activeFilter);
  }

  function updateVisibleHint(listLength) {
    const hint = document.querySelector('[data-shop-visible-count]');
    if (!hint) return;
    if (activeFilter === 'all') {
      hint.textContent = listLength
        ? `Mostrando ${listLength} pack${listLength === 1 ? '' : 's'}`
        : 'Nenhum pack disponível';
      return;
    }
    hint.textContent = listLength
      ? `${listLength} em ${activeFilter}`
      : `Nada em ${activeFilter}`;
  }

  function showToast(message) {
    const toast = document.querySelector('[data-shop-toast]');
    if (!toast) return;
    toast.hidden = false;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => {
        toast.hidden = true;
      }, 220);
    }, 2200);
  }

  function pulseCart() {
    const fab = document.querySelector('[data-cart-open]');
    if (!fab) return;
    fab.classList.remove('is-pulse');
    void fab.offsetWidth;
    fab.classList.add('is-pulse');
  }

  function renderProducts() {
    const list = filteredProducts();
    grid.classList.add('is-ready');
    grid.classList.remove('reveal', 'delay-1');
    grid.classList.add('visible');
    grid.style.opacity = '1';
    grid.style.transform = 'none';
    grid.style.filter = 'none';

    if (totalCountEl) {
      const n = products.length;
      totalCountEl.textContent = `${n} produto${n === 1 ? '' : 's'}`;
    }
    updateVisibleHint(list.length);

    if (!list.length) {
      grid.innerHTML = `
        <div class="shop-empty-state">
          <strong>Nenhum produto nesta categoria</strong>
          <p>Escolha “Todos” ou outra categoria para ver os packs disponíveis.</p>
        </div>`;
      return;
    }

    grid.innerHTML = list
      .map((p, index) => {
        const tags = (p.tags || [])
          .slice(0, 4)
          .map((t) => `<span>${escapeHtml(t)}</span>`)
          .join('');
        const img = p.image
          ? `<div class="shop-card-media"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" /></div>`
          : `<div class="shop-card-media shop-card-media-empty" aria-hidden="true"><span>${escapeHtml((p.category || 'MS').slice(0, 2))}</span></div>`;
        const featured = p.featured ? ' is-featured' : '';
        const requirements = p.requirements
          ? `<p class="shop-card-reqs"><span>Requisitos</span>${escapeHtml(p.requirements)}</p>`
          : '';
        return `
          <article class="shop-product-card${featured}" data-product-id="${escapeHtml(p.id)}" style="--reveal-delay:${Math.min(index, 8) * 40}ms">
            ${img}
            <div class="shop-card-body">
              <div class="shop-card-topline">
                <span class="shop-card-category">${escapeHtml(p.category || 'Geral')}</span>
                ${p.featured ? '<span class="shop-card-badge">Destaque</span>' : ''}
              </div>
              <h3>${escapeHtml(p.name)}</h3>
              <p class="shop-card-desc">${escapeHtml(p.description)}</p>
              ${requirements}
              ${tags ? `<div class="shop-card-tags">${tags}</div>` : ''}
              <div class="shop-card-footer">
                <div class="shop-card-price">${money(p.price)}</div>
                <button type="button" class="btn btn-primary shop-add-btn" data-add-cart="${escapeHtml(p.id)}">
                  Adicionar
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  }

  function cartQty() {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }

  function cartTotal() {
    return cart.reduce((sum, item) => {
      const product = products.find((p) => p.id === item.id) || item;
      return sum + Number(product.price || 0) * item.qty;
    }, 0);
  }

  function renderCart() {
    if (cartCountEl) cartCountEl.textContent = String(cartQty());
    if (cartTotalEl) cartTotalEl.textContent = money(cartTotal());
    if (checkoutBtn) checkoutBtn.disabled = cart.length === 0;

    if (!cartItemsEl) return;

    if (!cart.length) {
      cartItemsEl.innerHTML = '<p class="cart-empty">Seu carrinho está vazio.</p>';
      return;
    }

    cartItemsEl.innerHTML = cart
      .map((item) => {
        const product = products.find((p) => p.id === item.id) || item;
        const line = Number(product.price || 0) * item.qty;
        return `
          <div class="cart-line" data-cart-id="${escapeHtml(item.id)}">
            <div class="cart-line-info">
              <strong>${escapeHtml(product.name || item.name)}</strong>
              <span>${money(product.price)} · ${escapeHtml(product.category || '')}</span>
            </div>
            <div class="cart-line-controls">
              <button type="button" data-qty-dec="${escapeHtml(item.id)}" aria-label="Diminuir">−</button>
              <span>${item.qty}</span>
              <button type="button" data-qty-inc="${escapeHtml(item.id)}" aria-label="Aumentar">+</button>
            </div>
            <div class="cart-line-total">${money(line)}</div>
            <button type="button" class="cart-line-remove" data-remove="${escapeHtml(item.id)}" aria-label="Remover">×</button>
          </div>
        `;
      })
      .join('');
  }

  function addToCart(id, triggerBtn) {
    const product = products.find((p) => p.id === id);
    if (!product) return;
    const existing = cart.find((i) => i.id === id);
    if (existing) existing.qty += 1;
    else {
      cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        qty: 1,
      });
    }
    saveCart();
    renderCart();
    pulseCart();
    showToast(`${product.name} adicionado ao carrinho`);
    if (triggerBtn) {
      const original = triggerBtn.textContent;
      triggerBtn.classList.add('is-added');
      triggerBtn.textContent = 'Adicionado';
      clearTimeout(triggerBtn._addedTimer);
      triggerBtn._addedTimer = setTimeout(() => {
        triggerBtn.classList.remove('is-added');
        triggerBtn.textContent = original || 'Adicionar';
      }, 1400);
    }
  }

  function setQty(id, delta) {
    const item = cart.find((i) => i.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) cart = cart.filter((i) => i.id !== id);
    saveCart();
    renderCart();
  }

  function removeItem(id) {
    cart = cart.filter((i) => i.id !== id);
    saveCart();
    renderCart();
  }

  function clearCart() {
    cart = [];
    saveCart();
    renderCart();
  }

  function openCart() {
    if (!drawer) return;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
  }

  function closeCart() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
  }

  function closeDetail() {
    if (!detailModal) return;
    detailModal.classList.remove('is-open');
    detailModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('product-open');
  }

  function renderDetail(product) {
    if (!product || !detailModal) return;
    if (detailTitle) detailTitle.textContent = product.name || 'Produto';
    if (detailCategory) detailCategory.textContent = product.category || 'Geral';
    if (detailDesc) detailDesc.textContent = product.description || '';
    if (detailPrice) detailPrice.textContent = money(product.price);

    if (detailReqs) {
      if (product.requirements) {
        detailReqs.hidden = false;
        if (detailReqsText) detailReqsText.textContent = product.requirements;
      } else {
        detailReqs.hidden = true;
        if (detailReqsText) detailReqsText.textContent = '';
      }
    }

    if (detailTags) {
      const tags = (product.tags || []).filter(Boolean);
      if (tags.length) {
        detailTags.hidden = false;
        detailTags.innerHTML = tags.map((t) => `<span>${escapeHtml(t)}</span>`).join('');
      } else {
        detailTags.hidden = true;
        detailTags.innerHTML = '';
      }
    }

    if (detailMedia) {
      detailMedia.innerHTML = product.image
        ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />`
        : `<div class="product-media-fallback">${escapeHtml((product.category || 'MS').slice(0, 2))}</div>`;
    }

    detailModal.classList.add('is-open');
    detailModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('product-open');
    detailAddBtn?.setAttribute('data-add-id', product.id);
    detailModal.querySelector('.product-modal-scroll')?.scrollTo({ top: 0 });
  }

  function checkoutWhatsApp() {
    if (!cart.length) return;
    const lines = cart.map((item) => {
      const product = products.find((p) => p.id === item.id) || item;
      const lineTotal = Number(product.price || 0) * item.qty;
      return `- ${product.name} × ${item.qty} — ${money(lineTotal)}`;
    });

    const message = [
      'Olá Lucas! Quero fechar este pedido na MSCODEX:',
      '',
      ...lines,
      '',
      `Total: ${money(cartTotal())}`,
    ].join('\n');

    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function bindEvents() {
    filtersEl?.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      activeFilter = btn.getAttribute('data-filter') || 'all';
      renderFilters();
      renderProducts();
    });

    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-add-cart]');
      if (btn) {
        addToCart(btn.getAttribute('data-add-cart'), btn);
        return;
      }
      const card = e.target.closest('.shop-product-card');
      if (card) {
        const id = card.getAttribute('data-product-id');
        const product = products.find((p) => p.id === id);
        if (product) renderDetail(product);
      }
    });

    document.querySelectorAll('[data-cart-open]').forEach((el) => {
      el.addEventListener('click', openCart);
    });

    document.querySelectorAll('[data-cart-close]').forEach((el) => {
      el.addEventListener('click', closeCart);
    });

    document.querySelectorAll('[data-product-close]').forEach((el) => {
      el.addEventListener('click', closeDetail);
    });

    document.querySelector('[data-cart-clear]')?.addEventListener('click', clearCart);
    checkoutBtn?.addEventListener('click', checkoutWhatsApp);

    cartItemsEl?.addEventListener('click', (e) => {
      const inc = e.target.closest('[data-qty-inc]');
      const dec = e.target.closest('[data-qty-dec]');
      const rem = e.target.closest('[data-remove]');
      if (inc) setQty(inc.getAttribute('data-qty-inc'), 1);
      if (dec) setQty(dec.getAttribute('data-qty-dec'), -1);
      if (rem) removeItem(rem.getAttribute('data-remove'));
    });

    detailAddBtn?.addEventListener('click', () => {
      const id = detailAddBtn.getAttribute('data-add-id');
      if (id) addToCart(id, detailAddBtn);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCart();
        closeDetail();
      }
    });
  }

  async function init() {
    bindEvents();
    renderCart();
    try {
      await fetchProducts();
      if (statusEl) statusEl.hidden = true;
      activeFilter = 'all';
      renderFilters();
      renderProducts();
      renderCart();
    } catch (err) {
      grid.classList.add('is-ready', 'visible');
      grid.style.opacity = '1';
      grid.innerHTML = `
        <div class="shop-empty-state">
          <strong>Não foi possível carregar a loja</strong>
          <p>${escapeHtml(err.message || 'Erro ao conectar no Supabase.')}</p>
        </div>`;
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = err.message || 'Erro ao carregar a loja no Supabase.';
      }
    }
  }

  init();
})();
