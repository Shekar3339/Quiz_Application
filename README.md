# Online Quiz Application

A MERN foundation for a team-built online quiz application. The repository keeps the React client and Express API in separate folders so each module can be developed and run independently.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB running locally or a MongoDB connection URI

## Project structure

```text
client/
  index.html
  src/
    App.jsx
    components/
      AppNavbar.jsx
    context/
      AuthContext.jsx
    main.jsx
    pages/
      DashboardPage.jsx
      LoginPage.jsx
      ProfilePage.jsx
      RegisterPage.jsx
    services/
      api.js
    styles.css
  package.json
  vite.config.js
server/
  .env.example
  src/
    app.js
    config/
      auth.js
      db.js
    controllers/
      auth.controller.js
    middleware/
      requireAuth.js
    models/
      User.js
    routes/
      auth.routes.js
      health.routes.js
    server.js
  test/
    auth.integration.test.js
  package.json
```

## Setup

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI` to your MongoDB connection string. Set `JWT_SECRET` to a random secret of at least 32 bytes; generate one locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Do not commit `server/.env` or share the generated secret.
3. Install dependencies in each application:

   ```powershell
   cd server
   npm install
   cd ..\client
   npm install
   ```

## Run

Open two terminals from the repository root.

Start the API:

```powershell
cd server
npm run dev
```

Start the React client:

```powershell
cd client
npm run dev
```

Vite prints the client URL (usually `http://localhost:5173`). The Express server listens on port `5000` by default; both values can be changed through the server environment variables.

## Verify

- Open the Vite URL to access registration, login, dashboard, and profile pages.
- Request `http://localhost:5000/api/health` in a browser or run `Invoke-RestMethod http://localhost:5000/api/health` in PowerShell. A successful response contains `"status": "ok"`.
- The server connects to MongoDB before it starts listening. If the connection fails, check `MONGODB_URI` and that MongoDB is available.
- Run the authentication integration checks with `cd server; npm run test:integration`. The tests use the configured MongoDB database and remove their uniquely generated test account afterward.

## Authentication API

- `POST /api/auth/register` — create an account with `{ "name", "email", "password" }`.
- `POST /api/auth/login` — authenticate with `{ "email", "password" }`.
- `POST /api/auth/logout` — clear the authentication cookie.
- `GET /api/auth/profile` — return the signed-in user's safe profile; requires the HttpOnly JWT cookie.

Passwords are hashed with bcrypt and excluded from normal database projections. JWTs are stored in HttpOnly cookies; the client sends cookies with API requests. The server requires `JWT_SECRET` to be at least 32 bytes.

The dashboard currently expects Member 2's `GET /api/quizzes` response to contain `{ "quizzes": [] }`, and Member 3's `GET /api/attempts/mine` response to contain `{ "attempts": [], "totalAttempts": 0, "averageScore": 0 }`. Attempts may include `quizTitle`, `completedAt`, `percentage`, or `score` and `maxScore`. It displays clear loading, empty, or unavailable states until those teammate endpoints are connected. Quiz and attempt APIs remain owned by Members 2 and 3.
