const express = require('express');
const cors = require('cors');
const { categories, platforms, products } = require('./db/data');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory "database" state
let carts = {}; // userId -> array of items
let wishlists = {}; // userId -> array of productIds
let orders = {}; // userId -> array of orders
let users = [
  { id: 'u1', name: 'Admin User', email: 'admin@pricemesh.com', password: 'Password123!', role: 'admin' },
  { id: 'u2', name: 'Tushar Rawat', email: 'tushar@pricemesh.com', password: 'Password123!', role: 'user' }
];

// Helper to get user from token (dummy auth)
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const token = auth.split(' ')[1];
  const user = users.find(u => 'token_' + u.id === token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
};

// ─── AUTH ROUTES ──────────────────────────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: 'token_' + user.id, user: { name: user.name, email: user.email, role: user.role } });
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (users.find(u => u.email === email)) return res.status(400).json({ error: 'Email already exists' });
  const user = { id: 'u'+Date.now(), name, email, password, role: 'user' };
  users.push(user);
  res.json({ token: 'token_' + user.id, user: { name: user.name, email: user.email, role: user.role } });
});

app.put('/api/auth/me', authenticate, (req, res) => {
  const { name, email } = req.body;
  req.user.name = name;
  req.user.email = email;
  res.json({ user: { name: req.user.name, email: req.user.email, role: req.user.role } });
});

// ─── METADATA ROUTES ──────────────────────────────────────────────
app.get('/api/categories', (req, res) => {
  res.json({ data: categories });
});

app.get('/api/platforms', (req, res) => {
  res.json({ data: platforms });
});

// ─── PRODUCTS ROUTES ──────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { page = 1, limit = 16, search, category, platform, sort, minPrice, maxPrice } = req.query;
  
  // Flatten listings to make them distinct "results" just like the frontend expects for rendering
  let results = [];
  products.forEach(p => {
    p.listings.forEach(l => {
      results.push({
        id: p.id,
        listing_id: l.id,
        product_id: p.id,
        emoji: p.emoji,
        platform_color: l.platform_color,
        platform_name: l.platform_name,
        platform_slug: platforms.find(pl => pl.id === l.platform_id)?.slug,
        rating: l.rating,
        review_count: l.review_count,
        name: p.name,
        category_slug: p.category_slug,
        price: l.price,
        original_price: l.original_price
      });
    });
  });

  // Apply Filters
  if (search) results = results.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  if (category) results = results.filter(r => r.category_slug === category);
  if (platform) results = results.filter(r => r.platform_slug === platform);
  if (minPrice) results = results.filter(r => r.price >= Number(minPrice));
  if (maxPrice) results = results.filter(r => r.price <= Number(maxPrice));

  // If no specific platform filter is chosen, show only the best price for each product
  // because the user wants "Compare prices... Find the best deal".
  if (!platform) {
     const bestListingsMap = {};
     results.forEach(r => {
        if (!bestListingsMap[r.product_id] || bestListingsMap[r.product_id].price > r.price) {
           bestListingsMap[r.product_id] = r;
        }
     });
     results = Object.values(bestListingsMap);
  }

  // Sorting
  if (sort === 'price-asc') results.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') results.sort((a,b) => b.price - a.price);
  if (sort === 'rating') results.sort((a,b) => b.rating - a.rating);
  if (sort === 'savings') results.sort((a,b) => {
    const savingsA = a.original_price ? a.original_price - a.price : 0;
    const savingsB = b.original_price ? b.original_price - b.price : 0;
    return savingsB - savingsA;
  });

  // Pagination
  const total = results.length;
  const totalPages = Math.ceil(total / Number(limit));
  const paged = results.slice((Number(page)-1)*Number(limit), Number(page)*Number(limit));

  res.json({ data: paged, pagination: { page: Number(page), totalPages, total } });
});

app.get('/api/products/search/suggestions', (req, res) => {
  const q = (req.query.q || '').toLowerCase();
  if (!q) return res.json({ suggestions: [] });
  const suggestions = products
    .filter(p => p.name.toLowerCase().includes(q))
    .slice(0, 5)
    .map(p => ({ name: p.name, emoji: p.emoji }));
  res.json({ suggestions });
});

app.get('/api/products/compare/bulk', (req, res) => {
  const ids = req.query.ids ? req.query.ids.split(',') : [];
  const list = products.filter(p => ids.includes(p.id));
  // Ensure listings of returned products are sorted by price inside the product object for proper compare rendering
  list.forEach(p => p.listings.sort((a,b) => a.price - b.price));
  res.json({ data: list });
});

app.get('/api/products/:id', (req, res) => {
  const p = products.find(x => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  // Ensure listing sorted for detail view
  p.listings.sort((a,b) => a.price - b.price);
  res.json({ data: p });
});

// ─── CART ROUTES ──────────────────────────────────────────────────
const getCart = (userId) => carts[userId] || [];

app.get('/api/cart', authenticate, (req, res) => {
  res.json({ items: getCart(req.user.id) });
});

app.post('/api/cart', authenticate, (req, res) => {
  const { listingId } = req.body;
  let foundP, foundL;
  products.forEach(p => p.listings.forEach(l => { if(l.id === listingId){ foundP = p; foundL = l; } }));
  if (!foundL) return res.status(400).json({ error: 'Listing not found' });
  
  const userCart = getCart(req.user.id);
  // Avoid duplicates or just add? Usually we might increase quantity, but logic says just push for now based on app.js simplistic nature
  userCart.push({
    cart_item_id: 'ci_'+Date.now(),
    listing_id: foundL.id,
    product_id: foundP.id,
    product_name: foundP.name,
    platform_name: foundL.platform_name,
    platform_color: foundL.platform_color,
    price: foundL.price,
    quantity: 1,
    emoji: foundP.emoji,
    original_price: foundL.original_price
  });
  carts[req.user.id] = userCart;
  res.json({ success: true });
});

app.delete('/api/cart/:id', authenticate, (req, res) => {
  carts[req.user.id] = getCart(req.user.id).filter(i => i.cart_item_id !== req.params.id);
  res.json({ success: true });
});

app.delete('/api/cart', authenticate, (req, res) => {
  carts[req.user.id] = [];
  res.json({ success: true });
});

// ─── ORDERS ROUTES ────────────────────────────────────────────────
const getOrders = (uid) => orders[uid] || [];

app.get('/api/orders', authenticate, (req, res) => {
  res.json({ data: getOrders(req.user.id) });
});

app.post('/api/orders', authenticate, (req, res) => {
  const userCart = getCart(req.user.id);
  if(!userCart.length) return res.status(400).json({ error: 'Cart empty' });
  
  const total = userCart.reduce((acc, cur) => acc + (cur.price * cur.quantity), 0);
  const newOrder = {
    id: 'ord_'+Date.now(),
    created_at: new Date().toISOString(),
    status: 'Processing',
    items: userCart.map(i => ({ ...i, unit_price: i.price, quantity: i.quantity })),
    total_amount: total
  };
  
  const userOrders = getOrders(req.user.id);
  userOrders.unshift(newOrder); // Prepend so latest is first
  orders[req.user.id] = userOrders;
  carts[req.user.id] = []; // Clear cart on successful order
  res.json({ success: true });
});

// ─── WISHLIST ROUTES ──────────────────────────────────────────────
const getWishlist = (uid) => wishlists[uid] || [];

app.get('/api/wishlist', authenticate, (req, res) => {
  const list = getWishlist(req.user.id).map(pid => {
    const p = products.find(x => x.id === pid);
    if (!p) return null;
    const bestListing = p.listings.reduce((prev, curr) => (prev.price < curr.price ? prev : curr));
    return {
      product_id: p.id,
      name: p.name,
      emoji: p.emoji,
      best_price: bestListing.price,
      listing_count: p.listings.length
    };
  }).filter(Boolean);
  res.json({ data: list });
});

app.post('/api/wishlist', authenticate, (req, res) => {
  const { productId } = req.body;
  const list = getWishlist(req.user.id);
  if (list.includes(productId)) return res.status(400).json({ error: 'Already in wishlist' });
  list.push(productId);
  wishlists[req.user.id] = list;
  res.json({ success: true });
});

app.delete('/api/wishlist/:id', authenticate, (req, res) => {
  wishlists[req.user.id] = getWishlist(req.user.id).filter(pid => pid !== req.params.id);
  res.json({ success: true });
});

// ─── START SERVER ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend resolving mock data layer on port ${PORT}`);
});
