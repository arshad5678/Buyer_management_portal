# Buyer Management Portal

A full-stack web application designed for streamlined buyer management, authentication, and invoice data ingestion from CSV and Excel spreadsheets.

---

## 🛠 Technology Stack

- **Frontend**: React (Vite), Axios, Vanilla CSS
- **Backend**: Node.js, Express.js (MVC Architecture)
- **Database**: MySQL (via `mysql2`)
- **Authentication**: JSON Web Tokens (JWT) & bcrypt password hashing
- **File Ingestion**: Multer, `csv-parser` (CSV), `xlsx` (Excel)

---

## 📂 Project Structure

```text
buyer-management-portal/
├── backend/
│   ├── src/
│   │   ├── config/          # Database and app configurations
│   │   ├── controllers/     # MVC Controllers (request/response handling)
│   │   ├── middlewares/     # Auth, file upload, and validation middlewares
│   │   ├── models/          # Database query models
│   │   ├── routes/          # RESTful API route definitions
│   │   ├── utils/           # Helper utilities
│   │   └── server.js        # Express app entry point
│   ├── .env.example         # Template for environment variables
│   ├── .env                 # Local environment variables (git-ignored)
│   └── package.json         # Backend dependencies and scripts
│
├── frontend/
│   ├── src/                 # React components, pages, services, styles
│   ├── index.html           # HTML template
│   ├── vite.config.js       # Vite configuration with /api proxy
│   └── package.json         # Frontend dependencies and scripts
│
├── database/
│   └── schema.sql           # Database schema & migrations
│
├── .gitignore               # Root git ignore rules
└── README.md                # Project documentation
```

---

## ⚙️ Prerequisites

- **Node.js**: v18.0.0 or higher (Installed: `v25.2.1`)
- **npm**: v9.0.0 or higher (Installed: `11.6.2`)
- **MySQL Server**: v8.0 or higher running locally or remotely

---

## 🚀 Getting Started

### 1. Clone & Navigate
```bash
git clone <repository-url>
cd buyer_management_portal
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies (if not already installed)
npm install

# Copy environment variables template
cp .env.example .env

# Start backend in development mode (runs on port 5001)
npm run dev
```

> **Note on Port 5001**: macOS uses port `5000` for AirPlay Receiver (`ControlCenter`). The backend is configured to use port `5001` by default to avoid conflicts.

### 3. Frontend Setup
In a new terminal:
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite development server (runs on port 5173)
npm run dev
```

---

## 🧪 How to Verify the Initial Setup

1. **Verify Backend Health Endpoint**:
   ```bash
   curl http://localhost:5001/api/health
   ```
   **Expected Response**:
   ```json
   {
     "status": "success",
     "message": "Buyer Management Portal Backend API is running",
     "timestamp": "..."
   }
   ```

2. **Verify Frontend Build & Dev Server**:
   ```bash
   cd frontend
   npm run build
   ```
   **Expected Result**: Successful build output in `./dist` without errors.

---

## 📋 Incremental Roadmap

- [x] **Step 1**: Initial Project Setup (Directory structure, Vite React, Express starter, `.gitignore`, README)
- [ ] **Step 2**: Database Schema Design & MySQL Connection Setup
- [ ] **Step 3**: User Authentication (Registration, Login with Email/Mobile, Password Hashing, JWT)
- [ ] **Step 4**: Session Management (10-minute idle expiry, auto-refresh, logout invalidation)
- [ ] **Step 5**: File Upload & Validation Pipeline (Multer 5MB limit, CSV/XLS/XLSX validation)
- [ ] **Step 6**: File Parsing & Buyer Data Storage (Batch processing, transaction management)
- [ ] **Step 7**: Buyer Records API (Pagination, search by Name/Email/Mobile, sorting)
- [ ] **Step 8**: Frontend UI (Responsive Landing Page, Auth Pages, File Upload, Buyer Data Table)
- [ ] **Step 9**: Testing, Security Hardening & Deployment Readiness
