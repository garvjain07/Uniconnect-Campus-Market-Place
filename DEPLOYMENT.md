# UniConnect Deployment Guide

This guide covers deployment on Render and Vercel. Replace every placeholder before deploying.

## 1. Architecture

```text
Vercel (React frontend)
  -> Render Web Service (Express API)
       -> MongoDB Atlas
       -> Cloudinary
       -> Render Web Service (FastAPI ML)
       -> Optional email provider
```

## 2. External accounts

Create accounts for:

- MongoDB Atlas
- Cloudinary
- Render
- Vercel
- Gemini, optionally
- Resend or another email provider, when email features are restored

Never commit real passwords, API keys, JWT secrets, or MongoDB connection strings.

## 3. MongoDB Atlas

1. Create an M0 free cluster.
2. Create a database user and strong password.
3. Open **Network Access** and allow `0.0.0.0/0` for Render services.
4. Copy the Node.js connection string.

```text
mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/uniconnect
```

URL-encode special characters in the username or password.

## 4. Generate JWT secrets

Run twice and use two different outputs:

```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use the outputs as `JWT_SECRET` and `JWT_REFRESH_SECRET`.

## 5. Deploy the backend on Render

Create a Render **Web Service**:

```text
Repository: your UniConnect repository
Root Directory: backend
Runtime: Node
Build Command: npm ci
Start Command: npm start
Health Check Path: /api/health
Node Version: 20
```

Required environment variables:

```env
NODE_VERSION=20
MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@cluster.example.mongodb.net/uniconnect
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret

FRONTEND_URL=https://your-production-domain.vercel.app
BACKEND_URL=https://your-backend.onrender.com
MOBILE_URL=

ML_SERVICE_URL=https://your-ml-service.onrender.com

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

GEMINI_API_KEY=
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MODEL_ORDER=gemini-2.5-flash,gemini-3-flash-preview,gemini-2.5-flash-lite
AI_ASSISTANT_ENABLED=true
AI_RATE_LIMIT_MAX=20

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
```

Optional HTTP email variables:

```env
RESEND_API_KEY=re_your-resend-api-key
EMAIL_FROM=UniConnect <onboarding@resend.dev>
```

Health check:

```text
https://your-backend.onrender.com/api/health
```

## 6. Deploy the ML service on Render

Create another Render **Web Service**:

```text
Root Directory: ml_service
Runtime: Python
Python Version: 3.11
Build Command: pip install -r requirements.txt
Start Command: python -m uvicorn src.app.main:app --host 0.0.0.0 --port $PORT
Health Check Path: /health
```

Environment variables:

```env
ML_SERVICE_HOST=0.0.0.0
RECOMMENDER_MODEL_PATH=artifacts/recommender.joblib
RECOMMENDER_DATA_PATH=data/sample_listings.csv
ALCOHOL_MODEL_PATH=src/best_model_finetuned.keras
ALCOHOL_THRESHOLD=0.6
```

TensorFlow can require substantial memory. If it restarts or returns out-of-memory errors, use a larger paid instance or another host.

Test:

```text
https://your-ml-service.onrender.com/health
```

Set the backend:

```env
ML_SERVICE_URL=https://your-ml-service.onrender.com
```

Then redeploy the backend.

## 7. Deploy the frontend on Vercel

Create a Vercel project:

```text
Root Directory: frontend
Framework: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

Environment variables:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_SOCKET_URL=https://your-backend.onrender.com
VITE_CLOUDINARY_UPLOAD_PRESET=
```

Redeploy the frontend after changing Vite variables.

## 8. CORS configuration

Set `FRONTEND_URL` to the exact production browser origin, with no `/api` and no trailing slash:

```env
FRONTEND_URL=https://your-production-domain.vercel.app
```

Multiple origins:

```env
FRONTEND_URL=https://your-production-domain.vercel.app,https://another-domain.com
```

The backend also permits `.vercel.app` domains. Redeploy backend and frontend after URL changes. Hard refresh the browser:

```text
Ctrl + Shift + R
```

## 9. Temporary password-only authentication

The current implementation:

- Creates users as verified
- Registers by name, email, and password
- Logs in with email and password
- Disables forgot-password/reset-password endpoints
- Disables verification/resend endpoints

No SMTP or email API key is required for registration/login.

## 10. Mobile app

Set in [mobileapp/app.json](mobileapp/app.json):

```json
"extra": {
  "apiUrl": "https://your-backend.onrender.com/api",
  "socketUrl": "https://your-backend.onrender.com"
}
```

Or use build variables:

```env
EXPO_PUBLIC_API_URL=https://your-backend.onrender.com/api
EXPO_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
```

Build:

```powershell
cd mobileapp
npm ci
npx eas-cli login
npx eas build --platform android --profile production
```

## 11. Environment checklist

Backend required:

```env
MONGODB_URI
JWT_SECRET
JWT_REFRESH_SECRET
FRONTEND_URL
BACKEND_URL
ML_SERVICE_URL
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Backend optional:

```env
GEMINI_API_KEY
GEMINI_BASE_URL
GEMINI_MODEL
GEMINI_MODEL_ORDER
AI_ASSISTANT_ENABLED
AI_RATE_LIMIT_MAX
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
RESEND_API_KEY
EMAIL_FROM
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_MAX
```

## 12. Verification

Test:

```text
Backend: https://your-backend.onrender.com/api/health
ML: https://your-ml-service.onrender.com/health
Frontend: https://your-production-domain.vercel.app
```

Flows:

1. Register.
2. Login.
3. Create a listing.
4. Upload an image.
5. Chat.
6. Check recommendations.
7. Logout and refresh.

