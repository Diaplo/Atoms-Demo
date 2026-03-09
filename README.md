# AI-Builder Demo

一个由 AI 驱动的代码生成与可视化平台。

## 技术栈

- **框架**：Next.js 14（App Router）
- **语言**：TypeScript
- **样式**：Tailwind CSS + shadcn/ui
- **AI**：Vercel AI SDK（OpenAI-compatible）
- **代码预览**：Sandpack
- **数据库**：Supabase + Drizzle ORM
- **认证**：Supabase Auth
- **状态管理**：Zustand

## 快速开始

1. 安装依赖：
   ```bash
   npm install
   ```

2. 配置环境变量：
   ```bash
   cp .env.example .env.local
   ```

3. 在 `.env.local` 中填入你的 Supabase 配置。

4. 执行数据库同步：
   ```bash
   npm run db:push
   ```

5. 启动开发环境：
   ```bash
   npm run dev
   ```

## 自托管 Sandpack Bundler

当前项目会在启动 Next.js 的同时，自动启动本地 Sandpack bundler。

- `npm run dev`：同时启动 Next.js 和本地 bundler，默认地址为 `http://127.0.0.1:3101`
- `npm run sandpack:bundler`：只启动 bundler 静态服务
- `npm run dev:next`：只启动 Next.js，适合接入其他 bundler 地址

相关环境变量：

```bash
SANDPACK_BUNDLER_HOST=0.0.0.0
SANDPACK_BUNDLER_PUBLIC_HOST=localhost
SANDPACK_BUNDLER_PORT=3101
NEXT_PUBLIC_SANDPACK_BUNDLER_URL=http://localhost:3101
```

如果要部署到线上，建议把 bundler 独立部署到单独的域名或端口，并将
`NEXT_PUBLIC_SANDPACK_BUNDLER_URL` 指向对应的公开地址。

## 功能特性

- AI 流式代码生成
- 基于 Sandpack 的实时代码预览
- 聊天记录持久化
- 版本历史与版本恢复
- Supabase 用户认证
- OpenAI-compatible 模型配置
- 适配桌面端与移动端的响应式布局

## 项目结构

```text
app/                      # Next.js App Router 页面与 API
  (auth)/                 # 登录、注册等认证页面
  api/                    # 服务端 API 路由
  dashboard/              # 主工作区页面
  layout.tsx              # 根布局
  page.tsx                # 根路由入口

pages/
  _document.tsx           # 兼容性文档入口

components/
  builder/                # 编辑器、预览、版本区主布局
  chat/                   # 聊天相关组件
  history/                # 版本历史相关组件
  layout/                 # Sidebar、Header 等布局组件
  preview/                # Preview 相关组件
  settings/               # API 配置与设置弹窗
  ui/                     # 通用 UI 基础组件

lib/
  db/                     # Drizzle schema 与数据库相关逻辑
  prompts/                # AI 提示词
  sandpack/               # Sandpack 运行时处理
  store/                  # Zustand 状态管理
  supabase/               # Supabase 客户端与服务端封装
  utils/                  # 通用工具函数

types/                    # 全局 TypeScript 类型定义
drizzle/                  # 数据库迁移与快照
```

## License

MIT
