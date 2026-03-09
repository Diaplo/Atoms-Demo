# AI Builder Demo

一个基于 Next.js、Supabase、Sandpack 和 OpenAI-compatible 模型的 AI Builder 演示项目。

## 文档入口

- [使用文档](docs/使用文档.md)
- [项目说明](docs/项目说明.md)
- [开发约束](AGENTS.md)

## 快速开始

1. 安装依赖

```bash
npm install
```

2. 复制环境变量

```bash
cp .env.example .env.local
```

3. 配置 Supabase、数据库和应用地址

4. 初始化数据库

```bash
npm run db:push
```

5. 启动开发环境

```bash
npm run dev
```

## 核心能力

- Supabase 登录、注册和会话管理
- AI 对话生成 React 代码
- Sandpack 实时代码预览
- 聊天记录持久化
- 代码版本自动保存和手动保存
- 本地 API Key / Base URL / Model ID 配置

## 运行说明

- `/api/chat` 当前 `maxDuration` 为 `300` 秒
- Sandpack 默认使用官方 bundler：`https://sandpack-bundler.codesandbox.io`
- API Key 目前只保存在浏览器本地，不会写入服务端数据库

## License

MIT
