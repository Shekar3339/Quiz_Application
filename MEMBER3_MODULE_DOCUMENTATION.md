# Member 3: Quiz Attempts, Results, and History

## 1. Module overview and responsibilities

This module lets a signed-in student start a quiz, save progress, submit answers, receive a server-calculated score, and review past attempts. The server owns the timer deadline and answer key; the browser only presents questions and sends selected option indexes.

## 2. Features implemented

- Quiz instructions and a 30-minute timer begin when the server creates the attempt.
- One-question-at-a-time UI, previous/next controls, question map, answered states, and a submission review dialog.
- Answers are saved to MongoDB as the student selects them and restored when the attempt is reopened.
- The server closes attempts when their deadline passes, including on resume, answer-save, and result reads. A submission that arrives after the deadline is scored and marked `expired`.
- Server-side scoring reports total, correct, incorrect, unanswered, marks, percentage, duration, and final status.
- A responsive result summary and authenticated attempt history include resume and view-result links.
- The answer key is stored in a server-only question snapshot and is never included in attempt responses.

## 3. Frontend components and routes

- `client/src/pages/TakeQuizPage.jsx`: instructions, active attempt, timer, answer navigation, autosave, and submit confirmation.
- `client/src/pages/ResultsPage.jsx`: score summary and attempt details.
- `client/src/pages/AttemptHistoryPage.jsx`: recent attempts and result/resume actions.
- `client/src/services/attemptService.js`: client calls for attempt APIs.
- `client/src/App.jsx`: authenticated routes `/quizzes/:quizId`, `/results/:attemptId`, and `/attempt-history`.
- `client/src/components/AppNavbar.jsx`, `client/src/pages/DashboardPage.jsx`, and `client/src/styles.css`: navigation, quiz launch links, history/result links, and module styling.

## 4. Backend controllers and routes

- `server/src/models/attempt.model.js`: MongoDB attempt schema and indexes.
- `server/src/controllers/attempt.controller.js`: attempt lifecycle, validation, secure scoring, and response serialization.
- `server/src/routes/attempt.routes.js`: authenticated API routes; mounted at `/api/attempts` in `server/src/app.js`.

All attempt routes use the existing `requireAuth` middleware and cookie-based JWT session.

## 5. Attempt schema

The schema stores `userId`, `quizId`, `quizTitle`, selected `answers`, a private `questionSnapshot`, `startedAt`, `deadline`, `submittedAt`, `timeTaken`, question/answer counts, marks, percentage, status, and timestamps. The snapshot freezes question text, option text, and the correct option index when an attempt begins, so later quiz edits do not alter an in-flight attempt. The correct index is excluded from normal Mongoose projections and removed from every API response.

Statuses are `in_progress`, `submitted`, and `expired`. A partial unique index allows at most one active attempt per user and quiz. Optimistic concurrency prevents simultaneous updates from silently overwriting one another.

## 6. API documentation

Every endpoint requires the existing signed-in HttpOnly session cookie. IDs are MongoDB ObjectIds.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/attempts/start` | Start an attempt or resume the active attempt for the quiz |
| `GET` | `/api/attempts/active/:quizId` | Retrieve the current user's active attempt, if any |
| `POST` | `/api/attempts/:id/answers` | Save/replace selected answers for an active attempt |
| `POST` | `/api/attempts/:id/submit` | Submit and score an attempt |
| `GET` | `/api/attempts/mine` | List up to 100 attempts for the signed-in user |
| `GET` | `/api/attempts/:id` | Read the signed-in user's result |

Start request:

```json
{ "quizId": "68e000000000000000000001" }
```

Active attempt response (correct answers are omitted):

```json
{
  "attempt": {
    "id": "68e000000000000000000010",
    "quizTitle": "Math basics",
    "status": "in_progress",
    "startedAt": "2026-11-15T10:00:00.000Z",
    "deadline": "2026-11-15T10:30:00.000Z",
    "totalQuestions": 1,
    "totalMarks": 1,
    "answers": [],
    "questions": [{ "id": "68e000000000000000000002", "prompt": "2 + 2?", "options": ["3", "4"], "position": 0 }]
  }
}
```

Save or submit answers using `{ "answers": [{ "questionId": "...", "selectedOptionIndex": 1 }] }`. A submitted result contains `correctAnswers`, `incorrectAnswers`, `unansweredQuestions`, `obtainedMarks`, `totalMarks`, `percentage`, `timeTaken`, and `status`. Sending a client score or unsupported submission field is rejected.

## 7. Automatic scoring

The server compares each saved option index to the private snapshot's correct index. Each question is one mark. Percentage is `correct answers / total marks * 100`, rounded to two decimal places. Omitted answers count as unanswered; wrong selections count as incorrect. A quiz does not currently define pass criteria, so the result does not invent a pass/fail label.

## 8. Security and timer

- Quiz start, active lookup, answer save, submit, history, and result routes require authentication.
- Every attempt query includes the authenticated user ID; another user's result is returned as not found.
- Request question IDs and option indexes are checked against the immutable attempt snapshot.
- Client-submitted score fields are rejected; all score fields come from server calculation.
- Correct indexes are never sent before or after submission.
- The server sets a fixed deadline at creation and checks it on all lifecycle routes. Refreshing cannot reset it.
- A submit request received after the deadline is scored from the last server-saved answers; late client answer changes are ignored.
- The 30-minute countdown is a user-facing display of that deadline; expiration submission is server-validated.

## 9. Error handling

Invalid IDs/selections return `400`; missing quizzes or attempts return `404`; empty quizzes, closed attempts, or duplicate submission return `409`; missing/invalid authentication returns `401`. Database or unexpected failures return a generic `500` without exposing internal details. The UI shows loading/error states and keeps answer controls available if an autosave fails so submission can be retried.

## 10. Testing performed

Verified in this checkout:

- `node --test test/quiz.routes.test.js test/attempt.scoring.test.js` from `server/`: 7 tests passed.
- `npm run build` from `client/`: Vite production build passed.
- `git diff --check`: passed.
- Full `npm test`: the quiz tests passed, but the existing authentication integration test could not start because `server/.env` is not present. The end-to-end attempt API was not exercised against MongoDB for the same reason; configure MongoDB and the JWT secret, then run `npm run test:integration` and exercise the documented routes in the authenticated app.

## 11. Dependencies and running

No dependencies were added. In separate terminals, install packages if needed and run:

```powershell
cd server
npm install
npm run dev
```

```powershell
cd client
npm install
npm run dev
```

Set `MONGODB_URI` and a 32-byte-or-longer `JWT_SECRET` in `server/.env` as described in `README.md`. The API uses the existing `CLIENT_URL`/port defaults; the client uses the existing `VITE_API_URL` default.
