const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const FILE = path.join(__dirname, 'data', 'inventory.json');

// --- JSON file storage: loaded once, saved atomically after every change ---
function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
let items = load();
function save() {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2));
  fs.renameSync(tmp, FILE); // atomic swap so a crash never leaves a half-written file
}

// --- Validation ---
function clean(body) {
  const b = body || {};
  const name = String(b.name ?? '').trim();
  const sku = String(b.sku ?? '').trim().toUpperCase();
  const category = String(b.category ?? '').trim();
  const quantity = Number(b.quantity), minStock = Number(b.minStock), price = Number(b.price);
  if (!name || !sku || !category) return { error: 'Name, SKU and category are required.' };
  if ([quantity, minStock, price].some(n => !Number.isFinite(n) || n < 0))
    return { error: 'Quantity, minimum stock and price must be 0 or more.' };
  return { value: { name, sku, category, quantity: Math.floor(quantity), minStock: Math.floor(minStock), price } };
}
const skuTaken = (sku, exceptId) => items.some(i => i.sku === sku && i.id !== exceptId);

// --- App ---
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true, items: items.length }));

app.get('/api/items', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const category = req.query.category;
  res.json(items.filter(i =>
    (!q || `${i.name} ${i.sku}`.toLowerCase().includes(q)) && (!category || i.category === category)));
});

app.get('/api/items/:id', (req, res) => {
  const item = items.find(i => i.id === Number(req.params.id));
  item ? res.json(item) : res.status(404).json({ error: 'Item not found.' });
});

app.post('/api/items', (req, res) => {
  const { value, error } = clean(req.body);
  if (error) return res.status(400).json({ error });
  if (skuTaken(value.sku)) return res.status(409).json({ error: `SKU ${value.sku} already exists.` });
  const item = { id: items.reduce((m, i) => Math.max(m, i.id), 0) + 1, ...value };
  items.push(item);
  save();
  res.status(201).json(item);
});

app.put('/api/items/:id', (req, res) => {
  const idx = items.findIndex(i => i.id === Number(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'Item not found.' });
  const { value, error } = clean(req.body);
  if (error) return res.status(400).json({ error });
  if (skuTaken(value.sku, items[idx].id)) return res.status(409).json({ error: `SKU ${value.sku} already exists.` });
  items[idx] = { id: items[idx].id, ...value };
  save();
  res.json(items[idx]);
});

app.delete('/api/items/:id', (req, res) => {
  const idx = items.findIndex(i => i.id === Number(req.params.id));
  if (idx < 0) return res.status(404).json({ error: 'Item not found.' });
  items.splice(idx, 1);
  save();
  res.status(204).end();
});

// Serve the built Angular app when it exists (production mode)
const dist = path.join(__dirname, '..', 'frontend', 'dist', 'inventory-viewer', 'browser');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: 'Invalid request body.' });
  console.error(err);
  res.status(500).json({ error: 'Server error.' });
});

app.listen(PORT, () => console.log(`Inventory API running at http://localhost:${PORT}`));
