// app.js — priceMesh Frontend
// Connects directly to the Node.js backend at http://localhost:3000

const API = 'http://localhost:3000/api';

// ─── State ────────────────────────────────────────────────────
const state = {
  token: localStorage.getItem('pm_token') || null,
  user: JSON.parse(localStorage.getItem('pm_user') || 'null'),
  cart: [],
  compareList: [],    // listing ids
  compareProducts: [], // full product objects
  currentPage: 1,
  currentCategory: '',
  currentSearch: '',
  categories: [],
  platforms: [],
};

// ─── API Helper ───────────────────────────────────────────────
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  opts.headers = { ...headers, ...opts.headers };
  const res = await fetch(`http://localhost:5000/api${path}`, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || res.statusText);
  }
  return res.json();
}

// ─── Init ─────────────────────────────────────────────────────
async function init() {
  updateAuthUI();
  await loadMeta();
  await loadProducts();
  setupSearch();
  if (state.token) await refreshCart();
}

async function loadMeta() {
  try {
    const [cats, plats] = await Promise.all([
      api('/categories'),
      api('/platforms'),
    ]);
    state.categories = cats.data;
    state.platforms = plats.data;
    renderCategoryPills();
    renderPlatformFilter();
  } catch (e) {
    console.warn('Could not load meta — is the backend running?', e.message);
    showServerWarning();
  }
}

function showServerWarning() {
  document.getElementById('productGrid').innerHTML = `
    <div style="grid-column:1/-1">
      <div class="empty">
        <div class="empty-icon">⚠️</div>
        <p><strong>Backend not running</strong></p>
        <p style="margin-top:8px">Start the server: <code style="background:#f0f0f0;padding:2px 8px;border-radius:4px">cd backend && npm run dev</code></p>
        <p style="margin-top:6px;font-size:12px">Then refresh this page</p>
      </div>
    </div>`;
}

function renderCategoryPills() {
  const el = document.getElementById('categoryPills');
  const top = state.categories.filter(c => !c.parent_id);
  el.innerHTML = ['All', ...top.map(c => c.name)].map(name => {
    const slug = name === 'All' ? '' : top.find(c => c.name === name)?.slug || '';
    const active = state.currentCategory === slug;
    return `<button class="pill ${active ? 'active' : ''}" onclick="selectCategory('${slug}')">${name}</button>`;
  }).join('');
}

function renderPlatformFilter() {
  const el = document.getElementById('platformFilter');
  const existing = el.innerHTML;
  el.innerHTML = '<option value="">All Platforms</option>' +
    state.platforms.map(p => `<option value="${p.slug}">${p.name}</option>`).join('');
}

// ─── Products ─────────────────────────────────────────────────
async function loadProducts(page = 1) {
  state.currentPage = page;
  const grid = document.getElementById('productGrid');
  grid.innerHTML = `<div class="loading" style="grid-column:1/-1"><div class="spinner"></div> Loading products...</div>`;

  const search   = document.getElementById('searchInput').value;
  const platform = document.getElementById('platformFilter').value;
  const sort     = document.getElementById('sortFilter').value;
  const minPrice = document.getElementById('minPrice').value;
  const maxPrice = document.getElementById('maxPrice').value;

  const params = new URLSearchParams({
    page, limit: 16,
    ...(search   && { search }),
    ...(state.currentCategory && { category: state.currentCategory }),
    ...(platform && { platform }),
    ...(sort     && { sort }),
    ...(minPrice && { minPrice }),
    ...(maxPrice && { maxPrice }),
  });

  try {
    const { data, pagination } = await api(`/products?${params}`);
    renderProducts(data, pagination);
  } catch (e) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">😕</div><p>${e.message}</p></div>`;
  }
}

function renderProducts(products, pagination) {
  const grid = document.getElementById('productGrid');
  document.getElementById('resultInfo').innerHTML =
    `<strong>${pagination.total}</strong> products found`;

  if (!products.length) {
    grid.innerHTML = `<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🔍</div><p>No products found. Try different filters.</p></div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  grid.innerHTML = products.map(p => productCard(p)).join('');
  renderPagination(pagination);
}

function productCard(p) {
  const savings = p.original_price ? Math.round((1 - p.price / p.original_price) * 100) : 0;
  const inCart = state.cart.some(i => i.listing_id === p.listing_id);
  const inCompare = state.compareList.includes(p.listing_id);
  const inWish = false; // simplified

  return `
  <div class="product-card ${inCompare ? 'compare-on' : ''}" onclick="openProduct('${p.id}')">
    <div class="card-img">${p.emoji || '📦'}</div>
    <div class="card-body">
      <div class="platform-row">
        <span class="platform-tag" style="background:${hexToLight(p.platform_color)};color:${p.platform_color}">
          ${p.platform_name}
        </span>
        <span class="rating-tag">★ ${p.rating?.toFixed(1) || '—'} (${(p.review_count||0).toLocaleString()})</span>
      </div>
      <div class="card-name">${p.name}</div>
      <div class="card-price">
        <span class="price-now">₹${p.price.toLocaleString('en-IN')}</span>
        ${p.original_price ? `<span class="price-was">₹${p.original_price.toLocaleString('en-IN')}</span>` : ''}
        ${savings > 0 ? `<span class="price-save">-${savings}%</span>` : ''}
      </div>
      <div class="card-actions" onclick="event.stopPropagation()">
        <button class="btn-add ${inCart ? 'added' : ''}" onclick="toggleCartItem('${p.listing_id}','${p.product_id}')">
          ${inCart ? '✓ Added' : 'Add to cart'}
        </button>
        <button class="btn-compare ${inCompare ? 'on' : ''}" title="Compare" onclick="toggleCompare('${p.listing_id}','${p.id}')">⇄</button>
        <button class="btn-wish ${inWish ? 'on' : ''}" title="Wishlist" onclick="toggleWishlist('${p.id}')">♡</button>
      </div>
    </div>
  </div>`;
}

function hexToLight(hex) {
  // Convert hex to low-opacity background
  if (!hex) return '#f0f0f0';
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},0.12)`;
}

function renderPagination(pagination) {
  const el = document.getElementById('pagination');
  const { page, totalPages } = pagination;
  if (totalPages <= 1) { el.innerHTML = ''; return; }

  let html = '';
  if (page > 1) html += `<button class="page-btn" onclick="loadProducts(${page-1})">← Prev</button>`;
  for (let i = Math.max(1, page-2); i <= Math.min(totalPages, page+2); i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadProducts(${i})">${i}</button>`;
  }
  if (page < totalPages) html += `<button class="page-btn" onclick="loadProducts(${page+1})">Next →</button>`;
  el.innerHTML = html;
}

function selectCategory(slug) {
  state.currentCategory = slug;
  renderCategoryPills();
  loadProducts(1);
}

// ─── Product Detail ───────────────────────────────────────────
async function openProduct(productId) {
  showPage('detail');
  document.getElementById('detailContent').innerHTML = `<div class="loading"><div class="spinner"></div> Loading...</div>`;
  try {
    const { data: p } = await api(`/products/${productId}`);
    renderDetail(p);
  } catch (e) {
    document.getElementById('detailContent').innerHTML = `<div class="empty"><p>${e.message}</p></div>`;
  }
}

function renderDetail(p) {
  const bestListing = p.listings?.[0];
  const savings = bestListing?.original_price
    ? Math.round((1 - bestListing.price / bestListing.original_price) * 100) : 0;

  const specs = typeof p.specs === 'object' ? p.specs : {};

  document.getElementById('detailContent').innerHTML = `
    <button class="detail-back" onclick="showPage('home')">← Back to products</button>
    <div class="detail-layout">
      <div>
        <div class="detail-img">${p.emoji || '📦'}</div>
      </div>
      <div class="detail-info">
        <div class="detail-brand">${p.brand || ''} · ${p.category_name || ''}</div>
        <h1>${p.name}</h1>
        ${p.description ? `<p style="font-size:14px;color:var(--text-muted);margin-bottom:16px;line-height:1.6">${p.description}</p>` : ''}

        ${bestListing ? `
        <div class="detail-best-price">
          <div class="label">Best Price Available</div>
          <div class="amount">₹${bestListing.price.toLocaleString('en-IN')}</div>
          <div style="font-size:13px;color:var(--accent-dark);margin-top:2px">
            on ${bestListing.platform_name}
            ${savings > 0 ? ` · Save ${savings}%` : ''}
          </div>
        </div>` : ''}

        <div class="listings-section">
          <h3>Available on ${p.listings?.length || 0} platforms</h3>
          ${(p.listings || []).map((l, i) => `
            <div class="listing-row">
              <span class="listing-platform" style="color:${l.platform_color}">${l.platform_name}</span>
              ${i === 0 ? '<span class="best-badge">Best Price</span>' : ''}
              <span class="listing-price" style="margin-left:${i===0?'0':'auto'}">₹${l.price.toLocaleString('en-IN')}</span>
              ${l.original_price ? `<span class="listing-original">₹${l.original_price.toLocaleString('en-IN')}</span>` : ''}
              ${l.original_price && l.price < l.original_price
                ? `<span class="listing-save">-${Math.round((1-l.price/l.original_price)*100)}%</span>` : ''}
              <span class="listing-rating">★ ${l.rating?.toFixed(1)} (${(l.review_count||0).toLocaleString()})</span>
              <button class="btn-add listing-buy" onclick="toggleCartItem('${l.id}','${p.id}')">Add to cart</button>
            </div>`).join('')}
        </div>

        ${Object.keys(specs).length ? `
        <div>
          <h3 style="font-size:14px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Specifications</h3>
          <div class="specs-grid">
            ${Object.entries(specs).map(([k,v]) => `
              <div class="spec-item">
                <div class="spec-key">${k}</div>
                <div class="spec-val">${v}</div>
              </div>`).join('')}
          </div>
        </div>` : ''}
      </div>
    </div>`;
}

// ─── Search ───────────────────────────────────────────────────
function setupSearch() {
  const input = document.getElementById('searchInput');
  const sugg = document.getElementById('suggestions');
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (q.length < 2) { sugg.classList.remove('open'); return; }
    debounceTimer = setTimeout(async () => {
      try {
        const { suggestions } = await api(`/products/search/suggestions?q=${encodeURIComponent(q)}`);
        if (!suggestions.length) { sugg.classList.remove('open'); return; }
        sugg.innerHTML = suggestions.map(s =>
          `<div class="suggestion-item" onclick="selectSuggestion('${s.name.replace(/'/g,"\\'")}')">
            <span>${s.emoji || '📦'}</span>
            <span>${s.name}</span>
          </div>`).join('');
        sugg.classList.add('open');
      } catch {}
    }, 250);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { sugg.classList.remove('open'); loadProducts(1); }
    if (e.key === 'Escape') sugg.classList.remove('open');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-bar')) sugg.classList.remove('open');
  });
}

function selectSuggestion(name) {
  document.getElementById('searchInput').value = name;
  document.getElementById('suggestions').classList.remove('open');
  loadProducts(1);
}

// ─── Cart ─────────────────────────────────────────────────────
async function refreshCart() {
  if (!state.token) return;
  try {
    const data = await api('/cart');
    state.cart = data.items || [];
    updateCartBadge();
  } catch {}
}

function toggleCart() {
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('cartOverlay');
  const isOpen = drawer.classList.contains('open');
  if (isOpen) {
    drawer.classList.remove('open');
    overlay.classList.remove('open');
  } else {
    renderCartDrawer();
    drawer.classList.add('open');
    overlay.classList.add('open');
  }
}

function renderCartDrawer() {
  const body = document.getElementById('cartBody');
  const foot = document.getElementById('cartFoot');

  if (!state.token) {
    body.innerHTML = `<div class="cart-empty"><div>🔒</div><p>Please <a onclick="showModal('loginModal')">login</a> to view your cart</p></div>`;
    foot.innerHTML = '';
    return;
  }

  if (!state.cart.length) {
    body.innerHTML = `<div class="cart-empty"><div>🛒</div><p>Your cart is empty</p></div>`;
    foot.innerHTML = '';
    return;
  }

  body.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">${item.emoji || '📦'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.product_name}</div>
        <div class="cart-item-meta" style="color:${item.platform_color}">${item.platform_name}</div>
        <div class="cart-item-bottom">
          <span class="cart-item-price">₹${item.price.toLocaleString('en-IN')}</span>
          <button class="cart-item-remove" onclick="removeFromCart('${item.cart_item_id}')">✕</button>
        </div>
      </div>
    </div>`).join('');

  const total = state.cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const savings = state.cart.reduce((s, i) => s + ((i.original_price || i.price) - i.price) * i.quantity, 0);

  foot.innerHTML = `
    ${savings > 0 ? `<div class="cart-savings">You save ₹${savings.toLocaleString('en-IN')} on this order</div>` : ''}
    <div class="cart-total"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>
    <button class="btn-primary full" onclick="placeOrder()">Proceed to Checkout →</button>
    <button class="btn-ghost full" style="margin-top:8px;text-align:center" onclick="clearCart()">Clear cart</button>`;
}

async function toggleCartItem(listingId, productId) {
  if (!state.token) { showModal('loginModal'); return; }
  const existing = state.cart.find(i => i.listing_id === listingId);
  try {
    if (existing) {
      await api(`/cart/${existing.cart_item_id}`, { method: 'DELETE' });
      toast('Removed from cart');
    } else {
      await api('/cart', { method: 'POST', body: JSON.stringify({ listingId }) });
      toast('Added to cart!');
    }
    await refreshCart();
    loadProducts(state.currentPage);
    renderCartDrawer();
  } catch (e) { toast(e.message); }
}

async function removeFromCart(cartItemId) {
  try {
    await api(`/cart/${cartItemId}`, { method: 'DELETE' });
    await refreshCart();
    renderCartDrawer();
  } catch (e) { toast(e.message); }
}

async function clearCart() {
  try {
    await api('/cart', { method: 'DELETE' });
    await refreshCart();
    renderCartDrawer();
    toast('Cart cleared');
  } catch (e) { toast(e.message); }
}

function updateCartBadge() {
  document.getElementById('cartBadge').textContent = state.cart.length;
}

async function placeOrder() {
  if (!state.cart.length) { toast('Cart is empty'); return; }
  try {
    await api('/orders', {
      method: 'POST',
      body: JSON.stringify({
        shippingAddress: { line1: '123 MG Road', city: 'Delhi', state: 'Delhi', pincode: '110001' },
        notes: 'Order from priceMesh'
      })
    });
    await refreshCart();
    renderCartDrawer();
    toggleCart();
    toast('🎉 Order placed successfully!');
    loadProducts(state.currentPage);
  } catch (e) { toast(e.message); }
}

// ─── Compare ──────────────────────────────────────────────────
function toggleCompare(listingId, productId) {
  const idx = state.compareList.indexOf(listingId);
  if (idx >= 0) {
    state.compareList.splice(idx, 1);
    state.compareProducts = state.compareProducts.filter(p => p.listing_id !== listingId);
  } else {
    if (state.compareList.length >= 4) { toast('Max 4 products to compare'); return; }
    state.compareList.push(listingId);
  }

  const bar = document.getElementById('compareBar');
  bar.style.display = state.compareList.length ? 'flex' : 'none';
  document.getElementById('compareCount').textContent = `${state.compareList.length} selected`;
  loadProducts(state.currentPage);
}

async function openCompare() {
  if (state.compareList.length < 2) { toast('Select at least 2 products'); return; }
  try {
    // Get product IDs by finding them from the current grid
    const productIds = [...new Set(
      state.compareList.map(lid => {
        const btn = document.querySelector(`button[onclick*="toggleCompare('${lid}'"]`);
        if (!btn) return null;
        const match = btn.getAttribute('onclick').match(/'([^']+)'\)$/);
        return match ? match[1] : null;
      }).filter(Boolean)
    )];

    if (productIds.length < 1) { toast('Reload and try again'); return; }
    const { data } = await api(`/products/compare/bulk?ids=${productIds.join(',')}`);
    renderCompare(data);
    showModal('compareModal');
  } catch (e) { toast(e.message); }
}

function renderCompare(products) {
  const minPrice = Math.min(...products.flatMap(p => p.listings.map(l => l.price)));
  const maxRating = Math.max(...products.flatMap(p => p.listings.map(l => l.rating || 0)));

  const allSpecKeys = [...new Set(products.flatMap(p => Object.keys(p.specs || {})))];

  let html = `<div style="overflow-x:auto"><table class="compare-table">
    <thead><tr>
      <th></th>
      ${products.map(p => `<th style="min-width:200px">
        <div style="font-size:28px;margin-bottom:6px">${p.emoji}</div>
        <div style="font-size:13px;color:var(--text);font-weight:600;text-transform:none;letter-spacing:0">${p.name.substring(0,45)}${p.name.length>45?'...':''}</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:3px">${p.brand}</div>
      </th>`).join('')}
    </tr></thead>
    <tbody>
    <tr>
      <td>Best Price</td>
      ${products.map(p => {
        const best = p.listings[0];
        const isMin = best && best.price === minPrice;
        return `<td ${isMin?'class="winner"':''}>₹${best?.price.toLocaleString('en-IN')||'—'}${isMin?'<span class="win-badge">Lowest</span>':''}${best?`<br/><span style="font-size:11px;color:var(--text-muted)">${best.platform_name}</span>`:''}</td>`;
      }).join('')}
    </tr>
    <tr>
      <td>Savings</td>
      ${products.map(p => {
        const best = p.listings[0];
        const s = best?.original_price ? Math.round((1-best.price/best.original_price)*100) : 0;
        return `<td style="color:var(--accent-dark)">${s}% off</td>`;
      }).join('')}
    </tr>
    <tr>
      <td>Rating</td>
      ${products.map(p => {
        const r = p.listings[0]?.rating || 0;
        const isMax = r === maxRating;
        return `<td ${isMax?'class="winner"':''}>★ ${r.toFixed(1)}${isMax?'<span class="win-badge">Top</span>':''}</td>`;
      }).join('')}
    </tr>
    <tr>
      <td>Platforms</td>
      ${products.map(p => `<td>${p.listings.map(l=>`<span style="font-size:11px;color:${l.platform_color};margin-right:4px">${l.platform_name}</span>`).join('')}</td>`).join('')}
    </tr>
    ${allSpecKeys.map(k => `
    <tr>
      <td style="text-transform:capitalize">${k}</td>
      ${products.map(p => `<td>${(p.specs||{})[k] || '—'}</td>`).join('')}
    </tr>`).join('')}
    <tr>
      <td></td>
      ${products.map(p => {
        const best = p.listings[0];
        if (!best) return '<td>—</td>';
        const inCart = state.cart.some(i => i.listing_id === best.id);
        return `<td><button class="btn-add ${inCart?'added':''}" onclick="toggleCartItem('${best.id}','${p.id}')">${inCart?'✓ Added':'Add to cart'}</button></td>`;
      }).join('')}
    </tr>
    </tbody>
  </table></div>`;

  document.getElementById('compareContent').innerHTML = html;
}

function clearCompare() {
  state.compareList = [];
  state.compareProducts = [];
  document.getElementById('compareBar').style.display = 'none';
  loadProducts(state.currentPage);
}

// ─── Wishlist ─────────────────────────────────────────────────
async function toggleWishlist(productId) {
  if (!state.token) { showModal('loginModal'); return; }
  try {
    await api('/wishlist', { method: 'POST', body: JSON.stringify({ productId }) });
    toast('♡ Added to wishlist');
  } catch (e) {
    if (e.message.includes('already')) {
      await api(`/wishlist/${productId}`, { method: 'DELETE' });
      toast('Removed from wishlist');
    } else toast(e.message);
  }
}

async function loadWishlist() {
  if (!state.token) {
    document.getElementById('wishlistContent').innerHTML = `<div class="empty"><div class="empty-icon">🔒</div><p><a onclick="showModal('loginModal')">Login</a> to view your wishlist</p></div>`;
    return;
  }
  try {
    const { data } = await api('/wishlist');
    if (!data.length) {
      document.getElementById('wishlistContent').innerHTML = `<div class="empty"><div class="empty-icon">♡</div><p>Your wishlist is empty</p></div>`;
      return;
    }
    document.getElementById('wishlistContent').innerHTML = `
      <div class="wishlist-grid">${data.map(item => `
        <div class="product-card" style="cursor:default">
          <div class="card-body">
            <div style="font-size:36px;text-align:center;padding:16px 0">${item.emoji || '📦'}</div>
            <div class="card-name">${item.name}</div>
            <div style="font-size:13px;color:var(--accent);font-weight:600;margin-bottom:8px">
              From ₹${item.best_price?.toLocaleString('en-IN') || '—'}
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">
              ${item.listing_count} platform${item.listing_count !== 1 ? 's' : ''}
            </div>
            <button class="btn-ghost" style="width:100%;font-size:12px;color:var(--danger);border:1px solid var(--border);border-radius:6px;padding:7px" onclick="removeWishlist('${item.product_id}', this)">Remove ✕</button>
          </div>
        </div>`).join('')}
      </div>`;
  } catch (e) {
    document.getElementById('wishlistContent').innerHTML = `<div class="empty"><p>${e.message}</p></div>`;
  }
}

async function removeWishlist(productId, btn) {
  try {
    await api(`/wishlist/${productId}`, { method: 'DELETE' });
    btn.closest('.product-card').remove();
    toast('Removed from wishlist');
  } catch (e) { toast(e.message); }
}

// ─── Orders ───────────────────────────────────────────────────
async function loadOrders() {
  if (!state.token) {
    document.getElementById('ordersContent').innerHTML = `<div class="empty"><div class="empty-icon">🔒</div><p><a onclick="showModal('loginModal')">Login</a> to view your orders</p></div>`;
    return;
  }
  try {
    const { data } = await api('/orders');
    if (!data.length) {
      document.getElementById('ordersContent').innerHTML = `<div class="empty"><div class="empty-icon">📋</div><p>No orders yet</p></div>`;
      return;
    }
    document.getElementById('ordersContent').innerHTML = data.map(o => `
      <div class="order-card">
        <div class="order-header">
          <div>
            <div style="font-size:14px;font-weight:600;margin-bottom:4px">Order #${o.id.substring(0,8).toUpperCase()}</div>
            <div class="order-id">${new Date(o.created_at).toLocaleDateString('en-IN', {day:'numeric',month:'short',year:'numeric'})}</div>
          </div>
          <span class="order-status status-${o.status}">${o.status}</span>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
          ${(o.items||[]).map(i => `
            <div style="display:flex;align-items:center;gap:8px;font-size:13px">
              <span style="font-size:20px">${i.emoji||'📦'}</span>
              <div>
                <div style="font-weight:500">${i.product_name?.substring(0,30)}${(i.product_name?.length||0)>30?'...':''}</div>
                <div style="font-size:11px;color:var(--text-muted)">${i.platform_name} · ₹${i.unit_price.toLocaleString('en-IN')} × ${i.quantity}</div>
              </div>
            </div>`).join('')}
        </div>
        <div style="font-size:15px;font-weight:600">Total: ₹${o.total_amount.toLocaleString('en-IN')}</div>
      </div>`).join('');
  } catch (e) {
    document.getElementById('ordersContent').innerHTML = `<div class="empty"><p>${e.message}</p></div>`;
  }
}

// ─── Auth ─────────────────────────────────────────────────────
async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  document.getElementById('loginError').textContent = '';
  try {
    const { token, user } = await api('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password })
    });
    saveAuth(token, user);
    closeModal('loginModal');
    await refreshCart();
    toast(`Welcome back, ${user.name}!`);
  } catch (e) {
    document.getElementById('loginError').textContent = e.message;
  }
}

async function register() {
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  document.getElementById('regError').textContent = '';
  try {
    const { token, user } = await api('/auth/register', {
      method: 'POST', body: JSON.stringify({ name, email, password })
    });
    saveAuth(token, user);
    closeModal('registerModal');
    toast(`Welcome to priceMesh, ${user.name}!`);
  } catch (e) {
    document.getElementById('regError').textContent = e.message;
  }
}

function saveAuth(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem('pm_token', token);
  localStorage.setItem('pm_user', JSON.stringify(user));
  updateAuthUI();
}

function logout() {
  state.token = null;
  state.user = null;
  state.cart = [];
  localStorage.removeItem('pm_token');
  localStorage.removeItem('pm_user');
  updateAuthUI();
  updateCartBadge();
  toggleUserDropdown(true);
  showPage('home');
  toast('Logged out');
}

function updateAuthUI() {
  const authArea = document.getElementById('authArea');
  const userMenu = document.getElementById('userMenu');
  if (state.user) {
    authArea.style.display = 'none';
    userMenu.style.display = 'flex';
    document.getElementById('userName').textContent = state.user.name.split(' ')[0];
    document.getElementById('userAvatar').textContent = state.user.name[0].toUpperCase();
  } else {
    authArea.style.display = 'flex';
    userMenu.style.display = 'none';
  }
}

function toggleUserDropdown(forceClose = false) {
  const d = document.getElementById('userDropdown');
  d.style.display = (d.style.display === 'none' || forceClose) ? (forceClose ? 'none' : 'block') : 'none';
}

document.addEventListener('click', e => {
  if (!e.target.closest('.user-menu')) {
    document.getElementById('userDropdown').style.display = 'none';
  }
});

// ─── Pages ────────────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  window.scrollTo(0, 0);

  if (name === 'orders') loadOrders();
  if (name === 'wishlist') loadWishlist();
  if (name === 'profile') loadProfile();
}

function loadProfile() {
  if (!state.user) {
    document.getElementById('profileContent').innerHTML = `<div class="empty"><div class="empty-icon">🔒</div><p><a onclick="showModal('loginModal')">Login</a> to view profile</p></div>`;
    return;
  }
  const u = state.user;
  document.getElementById('profileContent').innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">${u.name[0].toUpperCase()}</div>
      <div class="form-group"><label>Full Name</label><input type="text" id="profileName" value="${u.name}" /></div>
      <div class="form-group"><label>Email</label><input type="email" id="profileEmail" value="${u.email}" /></div>
      <div style="display:flex;gap:10px;margin-top:4px">
        <button class="btn-primary" onclick="updateProfile()">Save Changes</button>
        <span style="font-size:12px;color:var(--text-muted);align-self:center">Role: ${u.role}</span>
      </div>
    </div>`;
}

async function updateProfile() {
  const name = document.getElementById('profileName').value;
  const email = document.getElementById('profileEmail').value;
  try {
    const { user } = await api('/auth/me', { method: 'PUT', body: JSON.stringify({ name, email }) });
    saveAuth(state.token, user);
    toast('Profile updated');
  } catch (e) { toast(e.message); }
}

// ─── Modals ───────────────────────────────────────────────────
function showModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
function switchModal(close, open) {
  closeModal(close);
  showModal(open);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    if (document.getElementById('cartDrawer').classList.contains('open')) toggleCart();
  }
});

// ─── Toast ────────────────────────────────────────────────────
let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ─── Boot ─────────────────────────────────────────────────────
init();