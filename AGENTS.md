# AGENTS.md

AI Builder Demo - Agent Development Guide

This file describes the current architecture, implementation rules, and active constraints for agents working on this repository.

The product goal remains the same:

- Users authenticate with Supabase Auth.
- Users describe UI requirements in natural language.
- The app streams an LLM response.
- Generated React code is shown in the editor.
- Sandpack renders the result live.
- Chats and code versions are persisted.

## 1. Current Product Shape

The app is currently a full-stack AI builder with these main areas:

1. Auth
2. Dashboard workspace
3. AI chat and code generation
4. Sandpack editor + preview
5. Chat persistence
6. Version history
7. User-provided API key settings

Main workspace layout:

`Sidebar | Chat Panel | Code Editor / Preview | Version History`

Notes:

- `Sidebar` manages chats and account actions.
- `Chat Panel` is the prompt/response interface.
- `Code Editor` and `Preview` are driven by Sandpack.
- `Version History` is a right-side panel with restore and manual save actions.
- The top-level App Router layout is intentionally dynamic because the workspace depends on auth cookies and user-specific state.

## 2. Approved Stack

Use only the following stack unless the user explicitly asks for a change:

- Next.js 14+ App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- Zustand
- Vercel AI SDK
- `@codesandbox/sandpack-react`
- Supabase Auth
- Drizzle ORM
- Postgres

## 3. Current Folder Structure

Follow the current structure instead of the earlier simplified MVP structure:

```text
app
  (auth)/
    actions.ts
    login/page.tsx
    register/page.tsx
  api/
    auth/
      callback/route.ts
      login/route.ts
      register/route.ts
      session/route.ts
    chat/route.ts
    chats/
      [chatId]/route.ts
      [chatId]/versions/route.ts
      [chatId]/versions/[versionId]/route.ts
      route.ts
    user/route.ts
  dashboard/
    layout.tsx
    page.tsx
  layout.tsx
  page.tsx

pages
  _document.tsx

components
  builder/
  chat/
  history/
  layout/
  preview/
  settings/
  ui/

lib
  ai/
  db/
  prompts/
  sandpack/
  store/
  supabase/
  utils/

types/
```

Rules:

- Do not create random top-level folders.
- Prefer extending the existing module areas above.
- Keep auth, builder, preview, history, and settings concerns separated.
- `pages/_document.tsx` is an intentional compatibility shim for Next production builds; do not delete it unless the build has been re-verified without it.

## 4. Core Modules

### Auth

Implemented with Supabase Auth.

Current requirements:

- Login
- Register
- Logout
- Session persistence through middleware and SSR cookie handling

### AI Chat

Current flow:

1. User submits prompt in `ChatContainer`
2. `/api/chat` validates request
3. Vercel AI SDK streams response
4. Markdown/code blocks are parsed
5. Generated files update the builder state
6. Final assistant response is persisted to chat history
7. A code version is created after the assistant message finishes

### Sandpack Runtime

Required runtime defaults:

- `/App.tsx`
- `/index.tsx`
- `/styles.css`

The app currently supports multi-file outputs, not just a single `App.tsx`.

### Version History

Current intended behavior:

- Auto-create a version after each completed assistant generation
- Allow manual save from the version panel
- Load versions when switching chats
- Restore a selected version into editor + preview
- Delete non-latest versions

Current gap:

- Compare modal exists but is not yet wired into the main workflow

### API Key Settings

Current implementation:

- Settings modal stores one `openai-compatible` config in local browser storage
- User provides:
  - API key
  - Base URL
  - Model ID

Important:

- Never hardcode API keys
- Never log raw API keys
- Treat settings storage as local-only unless the user explicitly asks for server persistence

Current gap:

- Multi-provider support described in older docs is not implemented yet

## 5. Database Schema

The actual schema in this repo is:

### `users`

- `id`
- `email`
- `full_name`
- `avatar_url`
- `created_at`
- `updated_at`

### `projects`

- `id`
- `user_id`
- `name`
- `description`
- `created_at`
- `updated_at`

### `chats`

- `id`
- `project_id`
- `user_id`
- `title`
- `created_at`
- `updated_at`

### `messages`

- `id`
- `chat_id`
- `role`
- `content`
- `created_at`

### `code_versions`

- `id`
- `chat_id`
- `message_id`
- `prompt`
- `version`
- `files`
- `is_manual`
- `description`
- `created_at`

Do not revert this schema back to the older `conversations` model unless explicitly requested.

## 6. State Management

Primary stores:

- `lib/store/builder-store.ts`
- `lib/store/settings-store.ts`

Rules:

- `builder-store` is the source of truth for current files, messages, versions, and active builder UI state.
- `settings-store` owns locally persisted API settings.
- Avoid introducing new global stores unless state clearly spans multiple distant UI regions.

## 7. AI Output Contract

The current app expects multi-file markdown code blocks with filepath annotations.

Required format:

```markdown
```tsx
// filepath: App.tsx
export default function App() {
  return <div>Hello</div>
}
```

```css
/* filepath: styles.css */
body {
  margin: 0;
}
```
```

Rules:

- Always include filepath annotations.
- `App.tsx` is required.
- Output must remain runnable inside Sandpack without extra installs.
- Prefer Tailwind CSS.
- Do not import external packages in generated code.

## 8. API Expectations

Current important routes:

- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/callback`
- `POST /api/chat`
- `GET /api/chats`
- `POST /api/chats`
- `GET /api/chats/[chatId]`
- `POST /api/chats/[chatId]`
- `GET /api/chats/[chatId]/versions`
- `POST /api/chats/[chatId]/versions`
- `DELETE /api/chats/[chatId]/versions/[versionId]`
- `GET /api/user`

Rules:

- Auth-protected API routes should return `401/403/404` JSON where appropriate.
- Do not redirect API requests to login pages.
- Keep auth cookie handling compatible with the installed `@supabase/ssr` version.

## 9. UI Rules

Required layout behavior:

- Use `flex`
- Use full-height containers
- Keep editor/preview areas scroll-safe
- Preserve mobile and desktop usability

Current layout targets:

- Chat sidebar width starts at `380px`
- Editor/preview split is `50/50` in split mode
- Version panel width is `280px`

Do not remove the resizable chat panel without user approval.

## 10. Coding Rules

- TypeScript strict-compatible code only
- Prefer function components
- Prefer small focused components
- Use Tailwind for styling
- Keep Sandpack-compatible generated code self-contained
- Reuse existing helpers before adding new abstractions
- Ensure code compiles after changes

## 11. Security Rules

- Never hardcode secrets
- Never log raw API keys
- Avoid logging full auth tokens
- Keep AI execution isolated inside Sandpack
- Do not weaken auth middleware or session handling

## 12. Active Gaps / Backlog

These are known incomplete areas and are valid targets for future work:

1. Wire the version compare modal into the main dashboard workflow.
2. Expand API key settings to true multi-provider support if the product still needs it.
3. Decide whether API keys should remain local-only or be encrypted and stored server-side.
4. Review dashboard header tabs and either connect them to workspace state or remove them.
5. Remove or consolidate legacy code paths that are no longer the primary implementation.

## 13. Definition of Done

A feature is done when:

- UI works
- TypeScript passes
- Build passes
- Auth still works
- Chat generation still works
- Sandpack preview still renders
- Persistence behavior is correct for the affected feature

If a change affects auth, chat persistence, or version history, verify the full end-to-end path, not just the isolated component.
