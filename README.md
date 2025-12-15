# PetCare Pro - Vet & Pet Shop Management System

A complete web-based management system for veterinary clinics and pet shops with multi-branch support, POS billing, inventory management, and comprehensive reporting.

## Features

### Phase 1 (MVP) - Completed
- **Sales/POS System** - Product search, shopping cart, GST calculation, multiple payment methods
- **Product Management** - Full CRUD operations, categories, pricing, GST rates
- **Stock Management** - Branch-wise tracking, stock adjustments, batch management
- **Customer Management** - Customer database, pet profiles, purchase history
- **Branch Management** - 8 branches with individual stats and management
- **Basic Reports** - Daily sales, stock reports, GST reports, branch performance

### Phase 2 - Included
- **Low Stock Alerts** - Automatic alerts with suggested reorder quantities
- **Expiry Tracking** - Items expiring in 30/60/90 days with alerts
- **Stock Transfers** - Transfer stock between branches
- **Purchase Orders** - Create POs, track status, receive goods
- **Supplier Management** - Supplier database with credit limits

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS + Recharts
- **Backend**: Node.js + Express.js
- **Database**: SQLite (better-sqlite3)
- **Authentication**: JWT

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn

### Installation

1. **Clone/Download the project**
```bash
cd Medical-Claude
```

2. **Install Backend Dependencies**
```bash
cd backend
npm install
```

3. **Seed the Database**
```bash
npm run seed
```

4. **Start the Backend**
```bash
npm run dev
```
Backend runs at: http://localhost:5000

5. **Install Frontend Dependencies** (in a new terminal)
```bash
cd frontend
npm install
```

6. **Start the Frontend**
```bash
npm run dev
```
Frontend runs at: http://localhost:3000

## Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| Manager | ramesh | admin123 |
| Cashier | cashier1 | cashier123 |

## Project Structure

```
Medical-Claude/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # SQLite configuration
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js          # Login/logout
│   │   │   ├── branches.js      # Branch management
│   │   │   ├── products.js      # Product CRUD
│   │   │   ├── stock.js         # Stock management
│   │   │   ├── customers.js     # Customer & pets
│   │   │   ├── sales.js         # POS & billing
│   │   │   ├── suppliers.js     # Supplier management
│   │   │   ├── purchaseOrders.js
│   │   │   ├── reports.js       # All reports
│   │   │   └── dashboard.js     # Dashboard data
│   │   ├── seed.js              # Database seeding
│   │   └── server.js            # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx       # Main layout with sidebar
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Authentication state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── SalesPOS.jsx     # Main POS screen
│   │   │   ├── Products.jsx
│   │   │   ├── Stock.jsx
│   │   │   ├── Branches.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Suppliers.jsx
│   │   │   ├── PurchaseOrders.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── LowStockAlerts.jsx
│   │   │   ├── ExpiryTracking.jsx
│   │   │   └── StockTransfers.jsx
│   │   ├── utils/
│   │   │   └── api.js           # Axios configuration
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Products
- `GET /api/products` - List products
- `GET /api/products/categories` - Get categories
- `GET /api/products/low-stock` - Low stock items
- `GET /api/products/expiring` - Expiring products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Stock
- `GET /api/stock/branch/:id` - Get stock for branch
- `POST /api/stock/adjust` - Adjust stock
- `POST /api/stock/transfer` - Create transfer
- `GET /api/stock/transfers` - List transfers

### Sales
- `POST /api/sales` - Create sale
- `GET /api/sales` - List sales
- `GET /api/sales/:id` - Get sale details
- `POST /api/sales/hold` - Hold sale
- `GET /api/sales/held/list` - Get held sales

### Reports
- `GET /api/reports/sales/daily` - Daily sales report
- `GET /api/reports/sales` - Sales report (range)
- `GET /api/reports/stock` - Stock report
- `GET /api/reports/gst` - GST report
- `GET /api/reports/branch-performance` - Branch comparison

## GST Rates

| Category | GST Rate |
|----------|----------|
| Pet Food | 5% |
| Medicine | 12% |
| Vaccines | 12% |
| Grooming | 18% |
| Accessories | 18% |
| Aquarium | 18% |
| Bird Products | 18% |

## Sample Data Included

- **8 Branches** across Chennai (Anna Nagar, Velachery, T Nagar, Adyar, Porur, Tambaram, Chromepet, Perambur)
- **38 Products** across all categories
- **12 Customers** (retail and wholesale)
- **10 Pets** linked to customers
- **7 Suppliers** with contact details
- **Sample sales transactions**

## Deployment

### Frontend (Vercel/Netlify)
```bash
cd frontend
npm run build
# Deploy the 'dist' folder
```

### Backend (Railway/Render)
- Push to GitHub
- Connect repository to Railway/Render
- Set environment variables
- Deploy

## Support

For issues or questions, please create an issue in the repository.

---

Built with React, Node.js, and SQLite
