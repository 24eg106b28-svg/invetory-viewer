# Inventory Viewer

Angular frontend + Node.js/Express backend. Inventory data is stored in `backend/data/inventory.json`.

## Requirements
- Node.js 18.19 or newer (20 LTS recommended) and npm

## Project structure
```
inventory-viewer/
├── backend/
│   ├── server.js              Express REST API + JSON file storage
│   ├── package.json
│   └── data/inventory.json    Your data (14 sample items included)
└── frontend/
    ├── angular.json, package.json, tsconfig*.json, proxy.conf.json
    └── src/
        ├── index.html, main.ts, styles.css
        └── app/
            ├── app.component.ts / .html   Table, filters, add/edit form
            ├── inventory.service.ts       HTTP calls to the API
            └── item.model.ts              Types
```

## Run in development (two terminals)
```bash
# Terminal 1 - API on http://localhost:3000
cd backend
npm install
npm start

# Terminal 2 - Angular on http://localhost:4200
cd frontend
npm install
npm start
```
Open http://localhost:4200. The dev server proxies `/api` to port 3000 (see `frontend/proxy.conf.json`).

## Run as a single server (production)
```bash
cd frontend && npm install && npm run build
cd ../backend && npm install && npm start
```
Open http://localhost:3000. Express serves the built Angular app and the API together.
Set a different port with `PORT=8080 npm start`.

## API
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Server check |
| GET | `/api/items?q=&category=` | List items, optional search and category filter |
| GET | `/api/items/:id` | One item |
| POST | `/api/items` | Create an item (returns 201) |
| PUT | `/api/items/:id` | Replace an item |
| DELETE | `/api/items/:id` | Delete an item (returns 204) |

Item shape:
```json
{ "id": 1, "name": "Hex bolts M8", "sku": "FST-1001", "category": "Fasteners",
  "quantity": 420, "minStock": 100, "price": 0.12 }
```
Status is derived: quantity 0 = out of stock, below `minStock` = low stock, otherwise in stock.
Errors return `{ "error": "message" }` with 400 (invalid), 404 (not found) or 409 (duplicate SKU).

## Notes
- The JSON file is read once at startup and rewritten atomically after each change. Edit it only while the server is stopped.
- JSON file storage suits one server and light use. For several users or large data, move to SQLite or PostgreSQL.
- Next steps to consider: login, stock-movement history, CSV import/export, pagination.
