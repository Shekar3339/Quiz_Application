# Online Quiz Application

A React and Express application for creating and managing quizzes. The client and API are separate applications; quiz data is persisted in MongoDB.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- MongoDB running locally or a MongoDB connection URI

## Project structure

```text
client/
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
  src/
    app.js
server/src/
  config/
    auth.js
    db.js
  controllers/
    auth.controller.js
  middleware/
    requireAuth.js
  models/
    User.js
    quiz.model.js
  routes/
    auth.routes.js
    health.routes.js
    quiz.routes.js
  validation/
    quiz.validation.js
  server.js
  test/quiz.routes.test.js
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

Open two terminals from the project root.

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

Vite prints the client URL (usually `http://localhost:5173`). The Express server listens on port `5000` by default. Set `VITE_API_URL` in the client environment to change the API base URL (default `http://localhost:5000/api`).

## Verify

- Run API tests with `cd server; npm test`.
- Build the client with `cd client; npm run build`.
- Open the Vite URL to create and manage quizzes.
- Request `http://localhost:5000/api/health`; a successful response contains `"status": "ok"`.
- Open the Vite URL to access registration, login, dashboard, and profile pages.
- Request `http://localhost:5000/api/health` in a browser or run `Invoke-RestMethod http://localhost:5000/api/health` in PowerShell. A successful response contains `"status": "ok"`.
- The server connects to MongoDB before it starts listening. If the connection fails, check `MONGODB_URI` and that MongoDB is available.
- Run the authentication integration checks with `cd server; npm run test:integration`. The tests use the configured MongoDB database and remove their uniquely generated test account afterward.

## Quiz and question API

All routes are prefixed with `/api/quizzes`. JSON validation errors return `400` with `{ "error": "..." }`; missing quiz/question IDs return `404`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/quizzes` | List quizzes, including question counts |
| `POST` | `/api/quizzes` | Create a quiz |
| `GET` | `/api/quizzes/:quizId` | Get quiz details and ordered questions |
| `PATCH` | `/api/quizzes/:quizId` | Update title and/or description |
| `DELETE` | `/api/quizzes/:quizId` | Delete a quiz and its embedded questions |
| `POST` | `/api/quizzes/:quizId/questions` | Add a question |
| `PATCH` | `/api/quizzes/:quizId/questions/:questionId` | Update a question |
| `DELETE` | `/api/quizzes/:quizId/questions/:questionId` | Delete a question |
| `PUT` | `/api/quizzes/:quizId/questions/order` | Reorder all questions |

Create a quiz with `title` (required, 1–120 characters), optional `description` (up to 2,000 characters), and `ownerId` when unauthenticated. A question requires `prompt` (1–500 characters), 2–6 non-empty `options` (up to 200 characters each), and an integer `correctOptionIndex` pointing to one of those options. Quiz question ordering is represented by `position`; reorder requests must provide every stable question ID exactly once:

```json
{
  "questionIds": ["68e000000000000000000001", "68e000000000000000000002"]
}
```

MongoDB ObjectIds are the stable quiz (`id`) and question (`id`) identifiers. Questions are embedded in their quiz document, each with its own stable ObjectId. The quiz model stores `ownerId`, timestamps, question positions, options, and `correctOptionIndex`.

Quiz list/detail and question mutation responses intentionally omit `correctOptionIndex`. It is stored and validated by the API for scoring/attempts integration, but is not included in the quiz data presented to clients. Editing an existing question may omit `correctOptionIndex` to preserve the current answer; if options change, the API keeps the answer mapped to the same option text when that text is still unique, and otherwise requires an explicit new index. Attempts/scoring should resolve quiz and question IDs on the server and compare submitted choices against the stored index; never accept an answer key from an attempt request.

## Authentication and ownership integration

Authentication is not implemented yet. For now, the browser creates a local `ownerId` in local storage and sends it when creating quizzes; it is only an identifier, not proof of identity. As a result, unauthenticated endpoints are suitable for local development only and do not provide access control.

When authentication is added, its middleware must set `req.user.id` (or `req.user._id`) to the authenticated user ID before the quiz router. The API then derives the owner on quiz creation and rejects attempts to create/update/delete a quiz owned by another authenticated user. Keep the local `ownerId` fallback only for unauthenticated development, or remove it when all clients are authenticated. Protect every quiz-management route with the authentication middleware before deployment.

Passwords should be hashed with bcrypt, JWT secrets must come from the environment, and request data must be validated at each API boundary.
## Authentication API

- `POST /api/auth/register` — create an account with `{ "name", "email", "password" }`.
- `POST /api/auth/login` — authenticate with `{ "email", "password" }`.
- `POST /api/auth/logout` — clear the authentication cookie.
- `GET /api/auth/profile` — return the signed-in user's safe profile; requires the HttpOnly JWT cookie.

Passwords are hashed with bcrypt and excluded from normal database projections. JWTs are stored in HttpOnly cookies; the client sends cookies with API requests. The server requires `JWT_SECRET` to be at least 32 bytes.

The dashboard currently expects Member 2's `GET /api/quizzes` response to contain `{ "quizzes": [] }`, and Member 3's `GET /api/attempts/mine` response to contain `{ "attempts": [], "totalAttempts": 0, "averageScore": 0 }`. Attempts may include `quizTitle`, `completedAt`, `percentage`, or `score` and `maxScore`. It displays clear loading, empty, or unavailable states until those teammate endpoints are connected. Quiz and attempt APIs remain owned by Members 2 and 3.
