# Dashboard Screenshot Feedback Tool — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vite + React + TypeScript SPA with an Express backend that accepts a dashboard screenshot, calls OpenRouter with a skill-based system prompt, and returns structured UX feedback as a downloadable TXT file.

**Architecture:** Single repo with npm workspaces: `frontend/` (Vite + React SPA) and `backend/` (Express + TypeScript API). In dev, Vite proxies `/api/*` to Express on port 3001. In production, Express serves the Vite build and handles API routes on a single port.

**Tech Stack:** Vite 5, React 18, TypeScript 5, Express 4, Vitest 1, @testing-library/react 14, supertest, tsx (dev runner), Node.js built-in fetch (Node 18+)

---

## File Map

**Root**
- Create: `package.json` — npm workspaces + root dev/build/start scripts
- Create: `.gitignore`

**`frontend/`**
- Create: `package.json`
- Create: `vite.config.ts` — React plugin + `/api` proxy + Vitest jsdom config
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/test-setup.ts`
- Create: `src/types.ts` — `View` type, `FeedbackState` interface
- Create: `src/App.tsx` — state machine: upload → loading → result
- Create: `src/App.test.tsx`
- Create: `src/components/UploadScreen.tsx`
- Create: `src/components/UploadScreen.test.tsx`
- Create: `src/components/LoadingScreen.tsx`
- Create: `src/components/ResultScreen.tsx`
- Create: `src/components/ResultScreen.test.tsx`

**`backend/`**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `src/index.ts` — Express app setup, conditional server start
- Create: `src/routes/feedback.ts` — POST /api/feedback
- Create: `src/routes/feedback.test.ts`
- Create: `src/skills/dashboard.md` — placeholder skill content

---

## Task 1: Scaffold project structure

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/test-setup.ts`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/vitest.config.ts`
- Create: `backend/.env.example`
- Create: `backend/src/skills/dashboard.md`

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "dashboard-feedback",
  "private": true,
  "workspaces": ["frontend", "backend"],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=frontend\" \"npm run dev --workspace=backend\"",
    "build": "npm run build --workspace=frontend && npm run build --workspace=backend",
    "start": "npm run start --workspace=backend"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.env
*.local
```

- [ ] **Step 3: Create `frontend/package.json`**

```json
{
  "name": "dashboard-feedback-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.2.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.2.0"
  }
}
```

- [ ] **Step 4: Create `frontend/vite.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
})
```

- [ ] **Step 5: Create `frontend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create `frontend/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard Feedback</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `frontend/src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 8: Create `frontend/src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 9: Create `backend/package.json`**

```json
{
  "name": "dashboard-feedback-backend",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.11.0",
    "@types/supertest": "^6.0.2",
    "supertest": "^6.3.4",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0"
  }
}
```

- [ ] **Step 10: Create `backend/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 11: Create `backend/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
```

- [ ] **Step 12: Create `backend/.env.example`**

```
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=anthropic/claude-sonnet-4-6
PORT=3001
```

- [ ] **Step 13: Create `backend/src/skills/dashboard.md`**

```markdown
# Dashboard UX Feedback Skill

You are a senior UX designer specializing in dashboard design. When given a dashboard screenshot, provide structured, actionable feedback covering:

1. **Information Hierarchy** — Is the most important data prominent? Is there visual clutter?
2. **Layout & Spacing** — Is the grid consistent? Are related elements grouped?
3. **Typography** — Are font sizes and weights creating clear hierarchy?
4. **Color Usage** — Is color used purposefully? Are there accessibility concerns?
5. **Data Visualization** — Are chart types appropriate for the data? Are axes labeled?
6. **Navigation & Wayfinding** — Can users orient themselves quickly?
7. **Key Recommendations** — Top 3 actionable improvements, prioritized by impact.

Be specific. Reference exact elements you observe. Keep the tone constructive.
```

- [ ] **Step 14: Install dependencies**

```bash
npm install
```

Expected: installs workspace dependencies for root, frontend, and backend.

- [ ] **Step 15: Commit**

```bash
git add .
git commit -m "chore: scaffold project structure"
```

---

## Task 2: Backend — Express server setup

**Files:**
- Create: `backend/src/index.ts`

- [ ] **Step 1: Write failing test for 404 on unknown route**

Create `backend/src/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from './index'

describe('Express server', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/unknown')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend && npm test -- index.test.ts
```

Expected: FAIL — `Cannot find module './index'`

- [ ] **Step 3: Implement `backend/src/index.ts`**

```typescript
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import feedbackRouter from './routes/feedback'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))

app.use('/api/feedback', feedbackRouter)

export default app

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
  })
}
```

- [ ] **Step 4: Create stub `backend/src/routes/feedback.ts`** (needed for import to resolve)

```typescript
import { Router } from 'express'

const router = Router()

export default router
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd backend && npm test -- index.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/src/index.ts backend/src/routes/feedback.ts backend/src/index.test.ts
git commit -m "feat: add Express server setup"
```

---

## Task 3: Backend — Feedback route validation (TDD)

**Files:**
- Modify: `backend/src/routes/feedback.ts`
- Create: `backend/src/routes/feedback.test.ts`

- [ ] **Step 1: Write failing validation tests**

Create `backend/src/routes/feedback.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../index'

describe('POST /api/feedback — validation', () => {
  it('returns 400 when image is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ mediaType: 'image/png' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('image is required')
  })

  it('returns 400 when mediaType is invalid', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/gif' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })

  it('returns 400 when mediaType is missing', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('mediaType must be image/png, image/jpeg, or image/webp')
  })

  it('accepts image/jpeg as valid mediaType', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/jpeg' })
    // Should not be a 400 validation error (will 500/502 without real API key — that's fine)
    expect(res.status).not.toBe(400)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && npm test -- feedback.test.ts
```

Expected: FAIL — all four tests fail (stub router returns nothing)

- [ ] **Step 3: Implement validation in `backend/src/routes/feedback.ts`**

```typescript
import { Router, Request, Response } from 'express'
import { readFileSync } from 'fs'
import path from 'path'

const router = Router()

const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp']

router.post('/', async (req: Request, res: Response) => {
  const { image, mediaType, context } = req.body

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image is required' })
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: 'mediaType must be image/png, image/jpeg, or image/webp' })
  }

  // OpenRouter call will be added in Task 4
  return res.status(501).json({ error: 'Not implemented' })
})

export default router
```

- [ ] **Step 4: Run tests to verify validation tests pass**

```bash
cd backend && npm test -- feedback.test.ts
```

Expected: 3 PASS (validation tests), 1 PASS (jpeg accepted — returns 501, not 400)

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/feedback.ts backend/src/routes/feedback.test.ts
git commit -m "feat: add feedback route validation"
```

---

## Task 4: Backend — OpenRouter integration (TDD)

**Files:**
- Modify: `backend/src/routes/feedback.ts`
- Modify: `backend/src/routes/feedback.test.ts`

- [ ] **Step 1: Add OpenRouter integration tests to `feedback.test.ts`**

Append to `backend/src/routes/feedback.test.ts`:

```typescript
import { vi, beforeEach, afterEach } from 'vitest'

describe('POST /api/feedback — OpenRouter integration', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns feedback text on success', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Great layout!' } }],
      }),
    } as Response)

    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png', context: 'fintech SaaS' })

    expect(res.status).toBe(200)
    expect(res.body.feedback).toBe('Great layout!')
  })

  it('passes context in the user message', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Feedback' } }],
      }),
    } as Response)

    await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png', context: 'fintech SaaS' })

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const textBlock = body.messages[0].content.find((b: any) => b.type === 'text')
    expect(textBlock.text).toContain('Context: fintech SaaS')
  })

  it('sends image as data URI in image_url block', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Feedback' } }],
      }),
    } as Response)

    await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png' })

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const imageBlock = body.messages[0].content.find((b: any) => b.type === 'image_url')
    expect(imageBlock.image_url.url).toBe('data:image/png;base64,abc123')
  })

  it('returns 504 on AbortError (timeout)', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(
      Object.assign(new Error('aborted'), { name: 'AbortError' })
    )

    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png' })

    expect(res.status).toBe(504)
    expect(res.body.error).toBe('The analysis took too long. Please try again.')
  })

  it('returns 502 when OpenRouter returns an error response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'Rate limited' } }),
    } as Response)

    const res = await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png' })

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('Rate limited')
  })

  it('truncates context to 200 characters server-side', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Feedback' } }],
      }),
    } as Response)

    const longContext = 'a'.repeat(300)
    await request(app)
      .post('/api/feedback')
      .send({ image: 'abc123', mediaType: 'image/png', context: longContext })

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string)
    const textBlock = body.messages[0].content.find((b: any) => b.type === 'text')
    expect(textBlock.text).toContain('a'.repeat(200))
    expect(textBlock.text).not.toContain('a'.repeat(201))
  })
})
```

- [ ] **Step 2: Run tests to verify new tests fail**

```bash
cd backend && npm test -- feedback.test.ts
```

Expected: 4 validation tests PASS, 6 new integration tests FAIL

- [ ] **Step 3: Implement OpenRouter call in `backend/src/routes/feedback.ts`**

Replace the file contents:

```typescript
import { Router, Request, Response } from 'express'
import { readFileSync } from 'fs'
import path from 'path'

const router = Router()

const ALLOWED_MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp']

router.post('/', async (req: Request, res: Response) => {
  const { image, mediaType, context } = req.body

  if (!image || typeof image !== 'string') {
    return res.status(400).json({ error: 'image is required' })
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: 'mediaType must be image/png, image/jpeg, or image/webp' })
  }

  let skillContent: string
  try {
    skillContent = readFileSync(
      path.resolve(__dirname, '../skills/dashboard.md'),
      'utf-8'
    )
  } catch {
    return res.status(500).json({ error: 'Skill file not found' })
  }

  const contextText = context ? String(context).slice(0, 200) : ''
  const userText = `Please analyze this dashboard.${contextText ? ` Context: ${contextText}` : ''}`

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000)

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-6',
        system: skillContent,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mediaType};base64,${image}` },
              },
              { type: 'text', text: userText },
            ],
          },
        ],
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      return res
        .status(502)
        .json({ error: (errData as any).error?.message || 'OpenRouter error' })
    }

    const data = (await response.json()) as any
    const feedback: string = data.choices?.[0]?.message?.content

    if (!feedback) {
      return res.status(502).json({ error: 'No feedback returned from model' })
    }

    return res.json({ feedback })
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') {
      return res
        .status(504)
        .json({ error: 'The analysis took too long. Please try again.' })
    }
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again later.' })
  }
})

export default router
```

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && npm test
```

Expected: all 10 tests PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/feedback.ts backend/src/routes/feedback.test.ts
git commit -m "feat: implement OpenRouter integration in feedback route"
```

---

## Task 5: Frontend — Types and App state machine (TDD)

**Files:**
- Create: `frontend/src/types.ts`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/App.test.tsx`
- Create: `frontend/src/components/UploadScreen.tsx` (stub)
- Create: `frontend/src/components/LoadingScreen.tsx` (stub)
- Create: `frontend/src/components/ResultScreen.tsx` (stub)

- [ ] **Step 1: Create `frontend/src/types.ts`**

```typescript
export type View = 'upload' | 'loading' | 'result'

export interface FeedbackState {
  view: View
  feedback: string
  error: string | null
}
```

- [ ] **Step 2: Create component stubs** (needed so App.tsx imports resolve)

`frontend/src/components/UploadScreen.tsx`:
```tsx
interface Props {
  onSubmit: (image: string, mediaType: string, context: string) => void
}
export default function UploadScreen({ onSubmit }: Props) {
  return <div data-testid="upload-screen" />
}
```

`frontend/src/components/LoadingScreen.tsx`:
```tsx
export default function LoadingScreen() {
  return <div data-testid="loading-screen" />
}
```

`frontend/src/components/ResultScreen.tsx`:
```tsx
interface Props {
  feedback: string
  error: string | null
  onReset: () => void
}
export default function ResultScreen({ feedback, error, onReset }: Props) {
  return <div data-testid="result-screen" />
}
```

- [ ] **Step 3: Write failing App tests**

Create `frontend/src/App.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App state machine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders upload screen initially', () => {
    render(<App />)
    expect(screen.getByTestId('upload-screen')).toBeInTheDocument()
  })

  it('shows loading screen while API call is in flight', async () => {
    let resolveFetch!: (value: any) => void
    const pendingFetch = new Promise((resolve) => { resolveFetch = resolve })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pendingFetch))

    render(<App />)
    // Trigger handleSubmit directly by calling onSubmit on the stub
    // We'll test the real flow in integration; here we test the state transition
    // by triggering the prop directly through the rendered component tree
    // This requires App to pass handleSubmit as onSubmit to UploadScreen
    const uploadScreen = screen.getByTestId('upload-screen')
    expect(uploadScreen).toBeInTheDocument()

    resolveFetch({ ok: true, json: async () => ({ feedback: 'done' }) })
  })

  it('shows result screen after successful API call', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: 'Great dashboard!' }),
    }))

    const { rerender } = render(<App />)

    // Access the onSubmit prop by finding the component
    // Simulate what UploadScreen would call:
    const instance = screen.getByTestId('upload-screen')
    // We'll use the real UploadScreen in the integration test (Task 9)
    // Here we verify App transitions using a spy on its own handleSubmit
    expect(instance).toBeInTheDocument()
  })
})
```

Note: Full App integration tests (simulating a real file upload through UploadScreen) are in Task 9 once real UploadScreen is implemented. These tests verify the initial render and import wiring.

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd frontend && npm test -- App.test.tsx
```

Expected: FAIL — `Cannot find module './App'`

- [ ] **Step 5: Create `frontend/src/App.tsx`**

```tsx
import { useState } from 'react'
import { FeedbackState } from './types'
import UploadScreen from './components/UploadScreen'
import LoadingScreen from './components/LoadingScreen'
import ResultScreen from './components/ResultScreen'

const initialState: FeedbackState = {
  view: 'upload',
  feedback: '',
  error: null,
}

export default function App() {
  const [state, setState] = useState<FeedbackState>(initialState)

  const handleSubmit = async (image: string, mediaType: string, context: string) => {
    setState({ view: 'loading', feedback: '', error: null })
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, mediaType, context }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again later.')
      }
      setState({ view: 'result', feedback: data.feedback, error: null })
    } catch (e) {
      setState({
        view: 'result',
        feedback: '',
        error: (e as Error).message,
      })
    }
  }

  const handleReset = () => setState(initialState)

  if (state.view === 'loading') return <LoadingScreen />
  if (state.view === 'result') {
    return (
      <ResultScreen
        feedback={state.feedback}
        error={state.error}
        onReset={handleReset}
      />
    )
  }
  return <UploadScreen onSubmit={handleSubmit} />
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd frontend && npm test -- App.test.tsx
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types.ts frontend/src/App.tsx frontend/src/App.test.tsx \
  frontend/src/components/UploadScreen.tsx \
  frontend/src/components/LoadingScreen.tsx \
  frontend/src/components/ResultScreen.tsx
git commit -m "feat: add App state machine and component stubs"
```

---

## Task 6: Frontend — UploadScreen (TDD)

**Files:**
- Modify: `frontend/src/components/UploadScreen.tsx`
- Create: `frontend/src/components/UploadScreen.test.tsx`

- [ ] **Step 1: Write failing UploadScreen tests**

Create `frontend/src/components/UploadScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UploadScreen from './UploadScreen'

describe('UploadScreen', () => {
  it('submit button is disabled when no file is selected', () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  it('shows error and keeps button disabled for wrong file type', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const file = new File(['gif'], 'image.gif', { type: 'image/gif' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please upload a PNG, JPG, or WEBP image.'
    )
    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  it('shows error and keeps button disabled for file over 10MB', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const file = new File(['x'], 'image.png', { type: 'image/png' })
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.getByRole('alert')).toHaveTextContent(
      'File is too large. Max size is 10MB.'
    )
    expect(screen.getByTestId('submit-button')).toBeDisabled()
  })

  it('enables submit button for valid PNG file', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const file = new File(['image'], 'image.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByTestId('submit-button')).toBeEnabled()
  })

  it('enables submit button for valid WEBP file', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const file = new File(['image'], 'image.webp', { type: 'image/webp' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    expect(screen.getByTestId('submit-button')).toBeEnabled()
  })

  it('truncates context input to 200 characters', async () => {
    render(<UploadScreen onSubmit={vi.fn()} />)
    const input = screen.getByTestId('context-input')
    await userEvent.type(input, 'a'.repeat(250))
    expect((input as HTMLTextAreaElement).value).toHaveLength(200)
  })

  it('calls onSubmit with base64, mediaType, and context when submitted', async () => {
    const onSubmit = vi.fn()
    render(<UploadScreen onSubmit={onSubmit} />)

    const file = new File(['hello'], 'image.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.type(screen.getByTestId('context-input'), 'fintech SaaS')
    await userEvent.click(screen.getByTestId('submit-button'))

    await vi.waitFor(() => {
      expect(onSubmit).toHaveBeenCalledOnce()
    })

    const [base64, mediaType, context] = onSubmit.mock.calls[0]
    expect(mediaType).toBe('image/png')
    expect(context).toBe('fintech SaaS')
    expect(typeof base64).toBe('string')
    expect(base64.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- UploadScreen.test.tsx
```

Expected: FAIL — stub component doesn't have testids or behavior

- [ ] **Step 3: Implement `frontend/src/components/UploadScreen.tsx`**

```tsx
import { useState, useRef, DragEvent, ChangeEvent } from 'react'

interface Props {
  onSubmit: (image: string, mediaType: string, context: string) => void
}

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Please upload a PNG, JPG, or WEBP image.'
  }
  if (file.size > MAX_BYTES) {
    return 'File is too large. Max size is 10MB.'
  }
  return null
}

export default function UploadScreen({ onSubmit }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [context, setContext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    const err = validateFile(f)
    setError(err)
    setFile(err ? null : f)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleSubmit = () => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      onSubmit(base64, file.type, context)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        data-testid="dropzone"
        style={{ border: '2px dashed #ccc', padding: '2rem', cursor: 'pointer' }}
      >
        {file ? file.name : 'Drop a screenshot here or click to browse'}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
          style={{ display: 'none' }}
          data-testid="file-input"
        />
      </div>

      {error && <p role="alert" style={{ color: 'red' }}>{error}</p>}

      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value.slice(0, 200))}
        placeholder="Describe the dashboard or its context (optional)"
        maxLength={200}
        data-testid="context-input"
      />

      <button
        onClick={handleSubmit}
        disabled={!file}
        data-testid="submit-button"
      >
        Get Feedback
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- UploadScreen.test.tsx
```

Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/UploadScreen.tsx frontend/src/components/UploadScreen.test.tsx
git commit -m "feat: implement UploadScreen with file validation"
```

---

## Task 7: Frontend — LoadingScreen

**Files:**
- Modify: `frontend/src/components/LoadingScreen.tsx`

No complex behavior to test. Replace the stub:

- [ ] **Step 1: Implement `frontend/src/components/LoadingScreen.tsx`**

```tsx
export default function LoadingScreen() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <div role="status" aria-label="Loading" style={{ fontSize: '2rem' }}>⏳</div>
      <p>Analyzing your dashboard…</p>
    </div>
  )
}
```

- [ ] **Step 2: Run existing tests to confirm no regressions**

```bash
cd frontend && npm test
```

Expected: all tests PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/LoadingScreen.tsx
git commit -m "feat: implement LoadingScreen"
```

---

## Task 8: Frontend — ResultScreen (TDD)

**Files:**
- Modify: `frontend/src/components/ResultScreen.tsx`
- Create: `frontend/src/components/ResultScreen.test.tsx`

- [ ] **Step 1: Write failing ResultScreen tests**

Create `frontend/src/components/ResultScreen.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResultScreen from './ResultScreen'

describe('ResultScreen', () => {
  it('displays feedback text', () => {
    render(<ResultScreen feedback="Great layout!" error={null} onReset={vi.fn()} />)
    expect(screen.getByTestId('feedback-text')).toHaveTextContent('Great layout!')
  })

  it('shows download button when feedback is present', () => {
    render(<ResultScreen feedback="Great layout!" error={null} onReset={vi.fn()} />)
    expect(screen.getByTestId('download-button')).toBeInTheDocument()
  })

  it('does not show download button when error is present', () => {
    render(<ResultScreen feedback="" error="Something went wrong." onReset={vi.fn()} />)
    expect(screen.queryByTestId('download-button')).not.toBeInTheDocument()
  })

  it('shows error message when error is present', () => {
    render(
      <ResultScreen feedback="" error="Something went wrong. Please try again later." onReset={vi.fn()} />
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Something went wrong. Please try again later.'
    )
  })

  it('calls onReset when Start Over is clicked', async () => {
    const onReset = vi.fn()
    render(<ResultScreen feedback="feedback" error={null} onReset={onReset} />)
    await userEvent.click(screen.getByTestId('reset-button'))
    expect(onReset).toHaveBeenCalledOnce()
  })

  it('triggers file download with correct filename format when Download TXT is clicked', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:mock')
    const revokeObjectURL = vi.fn()
    const clickFn = vi.fn()

    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })

    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = createElement(tag)
      if (tag === 'a') {
        Object.defineProperty(el, 'click', { value: clickFn })
      }
      return el
    })

    render(<ResultScreen feedback="My feedback" error={null} onReset={vi.fn()} />)
    await userEvent.click(screen.getByTestId('download-button'))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(clickFn).toHaveBeenCalledOnce()

    const anchor = (document.createElement as any).mock.results.find(
      (r: any) => r.value.tagName === 'A'
    )?.value
    expect(anchor?.download).toMatch(/^dashboard-feedback-.+\.txt$/)

    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- ResultScreen.test.tsx
```

Expected: FAIL — stub component missing testids and behavior

- [ ] **Step 3: Implement `frontend/src/components/ResultScreen.tsx`**

```tsx
interface Props {
  feedback: string
  error: string | null
  onReset: () => void
}

export default function ResultScreen({ feedback, error, onReset }: Props) {
  const handleDownload = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const blob = new Blob([feedback], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-feedback-${timestamp}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '2rem' }}>
      {error ? (
        <p role="alert" style={{ color: 'red' }}>{error}</p>
      ) : (
        <>
          <pre
            data-testid="feedback-text"
            style={{ whiteSpace: 'pre-wrap', border: '1px solid #ccc', padding: '1rem' }}
          >
            {feedback}
          </pre>
          <button onClick={handleDownload} data-testid="download-button">
            Download TXT
          </button>
        </>
      )}
      <button onClick={onReset} data-testid="reset-button" style={{ marginLeft: '1rem' }}>
        Start Over
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- ResultScreen.test.tsx
```

Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ResultScreen.tsx frontend/src/components/ResultScreen.test.tsx
git commit -m "feat: implement ResultScreen with download and reset"
```

---

## Task 9: Frontend — App integration test

**Files:**
- Modify: `frontend/src/App.test.tsx`

- [ ] **Step 1: Replace App.test.tsx with full integration tests**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

describe('App integration', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders upload screen initially', () => {
    render(<App />)
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('shows loading screen after submit, then result on success', async () => {
    let resolveFetch!: (v: any) => void
    const pending = new Promise((r) => { resolveFetch = r })
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(pending))

    render(<App />)

    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    resolveFetch({ ok: true, json: async () => ({ feedback: 'Looking good!' }) })

    await waitFor(() => {
      expect(screen.getByTestId('feedback-text')).toHaveTextContent('Looking good!')
    })
  })

  it('shows error in result screen when API returns error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Something went wrong. Please try again later.' }),
    }))

    render(<App />)

    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again later.'
      )
    })
  })

  it('returns to upload screen when Start Over is clicked', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ feedback: 'Good work!' }),
    }))

    render(<App />)

    const file = new File(['img'], 'shot.png', { type: 'image/png' })
    await userEvent.upload(screen.getByTestId('file-input'), file)
    await userEvent.click(screen.getByTestId('submit-button'))

    await waitFor(() => {
      expect(screen.getByTestId('reset-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('reset-button'))

    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run integration tests**

```bash
cd frontend && npm test -- App.test.tsx
```

Expected: all 4 tests PASS

- [ ] **Step 3: Run full frontend test suite**

```bash
cd frontend && npm test
```

Expected: all frontend tests PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.test.tsx
git commit -m "test: add App integration tests"
```

---

## Task 10: Production build — Express serves frontend dist

**Files:**
- Modify: `backend/src/index.ts`

- [ ] **Step 1: Add static file serving to `backend/src/index.ts`**

Replace the file:

```typescript
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { existsSync } from 'fs'
import feedbackRouter from './routes/feedback'

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json({ limit: '20mb' }))

app.use('/api/feedback', feedbackRouter)

// Serve frontend in production
const distPath = path.resolve(__dirname, '../../frontend/dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

export default app

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`)
  })
}
```

- [ ] **Step 2: Run all backend tests to confirm no regressions**

```bash
cd backend && npm test
```

Expected: all tests PASS

- [ ] **Step 3: Build frontend**

```bash
cd frontend && npm run build
```

Expected: `frontend/dist/` created with `index.html` and assets.

- [ ] **Step 4: Build backend**

```bash
cd backend && npm run build
```

Expected: `backend/dist/` created.

- [ ] **Step 5: Create `.env` with your OpenRouter key**

```bash
cp backend/.env.example backend/.env
# Then edit backend/.env and set OPENROUTER_API_KEY=your_key_here
```

- [ ] **Step 6: Start production server and verify**

```bash
npm run start
```

Open `http://localhost:3001` — you should see the app UI (upload screen).
Upload a dashboard screenshot, click Get Feedback, verify feedback appears and TXT download works.

- [ ] **Step 7: Commit**

```bash
git add backend/src/index.ts
git commit -m "feat: serve frontend dist from Express in production"
```

---

## Done

All tasks complete. The app is:
- Fully tested (backend validation, OpenRouter integration, frontend components, App integration)
- Dev-ready: `npm run dev` starts both servers concurrently
- Production-ready: `npm run build && npm start` serves everything from Express on port 3001
- Skill-driven: replace `backend/src/skills/dashboard.md` with the real dashboard skill content before deployment
