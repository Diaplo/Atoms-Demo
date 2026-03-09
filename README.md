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

## Sandpack Bundler

当前项目本地和线上统一使用官方公开 Sandpack bundler。

- `npm run dev`：启动 Next.js 开发环境
- `npm run build` + `npm run start`：启动生产构建后的 Next.js 服务

相关环境变量：

```bash
NEXT_PUBLIC_SANDPACK_BUNDLER_URL=https://sandpack-bundler.codesandbox.io
```

如果没有额外配置，代码默认也会回退到官方 bundler。
如果后续需要切回自托管，可以再通过 `NEXT_PUBLIC_SANDPACK_BUNDLER_URL` 覆盖。

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
