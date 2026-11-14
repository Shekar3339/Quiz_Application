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
    main.jsx
    styles.css
  package.json
  vite.config.js
server/
  .env.example
  src/
    app.js
    config/
      db.js
    routes/
      health.routes.js
    server.js
  package.json
```

## Setup

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI` to your MongoDB connection string and replace `JWT_SECRET` with a long, random secret. Do not commit `server/.env`.
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

- Open the Vite URL in a browser to see the React home page.
- Request `http://localhost:5000/api/health` in a browser or run `Invoke-RestMethod http://localhost:5000/api/health` in PowerShell. A successful response contains `"status": "ok"`.
- The server connects to MongoDB before it starts listening. If the connection fails, check `MONGODB_URI` and that MongoDB is available.

## Current scope

This is only the shared project foundation: MongoDB connection setup, environment configuration, CORS/JSON middleware, an API health check, and a React landing page. Authentication, quiz management, attempts, scoring, and results are intentionally left for the team modules.

Passwords should be hashed with bcrypt, JWT secrets must come from the environment, and correct quiz answers must remain on the server when those modules are implemented. Validate request data at each API boundary.
