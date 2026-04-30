# FinSecure AI Backend 🚀

A secure backend system built using Node.js, Express, and TypeScript with authentication and role-based access.

## 🚀 Features
- User Registration
- Login with JWT Authentication
- Protected Routes
- Role-based Authorization
- Password hashing using bcrypt

## 🛠 Tech Stack
- Node.js
- Express
- TypeScript
- JWT (Authentication)
- bcrypt (Security)

## 📂 Project Structure
backend/
 ├── src/
 │    ├── controllers/
 │    ├── middleware/
 │    ├── routes/
 │    ├── app.ts
 │    └── server.ts
 ├── package.json

## 🔗 API Endpoints

### Register
POST /api/auth/register

### Login
POST /api/auth/login

### Profile (Protected)
GET /api/auth/profile

## ▶️ Run Locally

```bash
cd backend
npm install
npm run dev
