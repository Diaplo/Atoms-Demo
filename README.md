# AI-Builder Demo

A code generation and visualization platform similar to atoms.dev or v0.dev, powered by AI.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn UI
- **AI**: Vercel AI SDK (OpenAI + Anthropic)
- **Code Preview**: Sandpack
- **Database**: Supabase + Drizzle ORM
- **Auth**: Supabase Auth
- **State Management**: Zustand

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

3. Configure your Supabase credentials in `.env.local`

4. Run database migrations:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Features

- 🤖 AI-powered code generation with streaming responses
- 🎨 Real-time code preview with Sandpack
- 💾 Version history with rollback functionality
- 🔐 User authentication with Supabase
- 🎯 Multi-provider LLM support (OpenAI, Anthropic, custom)
- 📱 Responsive design with dark mode support

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main application routes
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── chat/             # Chat interface components
│   ├── editor/           # Code editor components
│   └── preview/          # Sandpack preview components
├── lib/                   # Utility functions and configs
│   ├── db/               # Database configuration
│   ├── supabase/         # Supabase client
│   └── utils.ts          # Helper functions
└── types/                 # TypeScript type definitions
```

## License

MIT