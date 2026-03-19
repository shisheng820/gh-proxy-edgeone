# gh-proxy EdgeOne Pages 项目

## 一键部署

[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fshisheng820%2Fgh-proxy-edgeone&project-name=gh-proxy-edgeone&output-directory=dist)

这个仓库已整理为标准的 EdgeOne Pages 项目结构。

## 项目结构

```text
.
├── functions/
│   ├── _worker.js        # 全路径代理核心逻辑（由原 Cloudflare Worker 迁移）
│   ├── _middleware.js    # 全局中间件示例
│   └── api/
│       └── health.js     # GET /api/health 健康检查
├── pages/
│   └── index.tsx         # 根路径页面
├── public/
│   └── index.html        # 静态资源示例
├── edgeone.config.ts
├── edgeone.json
├── tsconfig.json
└── package.json
```

## edgeone.json 说明

项目根目录新增了 `edgeone.json`，用于覆盖控制台默认构建行为，主要包括：

1. `installCommand`: `npm install`
2. `buildCommand`: `npx edgeone pages build`
3. `outputDirectory`: `dist`
4. `nodeVersion`: `22.11.0`
5. `nodeFunctionsConfig.maxDuration`: `30`

## 你需要在 EdgeOne 控制台补齐的配置

1. 创建 Pages 项目，并将仓库根目录设置为当前目录。
2. 构建设置（如果你使用 `edgeone.json`，可自动覆盖控制台同名配置）：
- 构建命令：`npx edgeone pages build`
- 输出目录：`dist`
3. 域名设置：
- 先用默认 `*.edgeone.app` 域名验证。
- 如需自定义域名，在控制台绑定并添加对应 DNS 记录。
4. 环境变量（可选）：
- 当前 `functions/_worker.js` 中 `ASSET_URL`、`PREFIX`、`Config.jsdelivr` 为硬编码。
- 如需运行时可配置，请在控制台添加变量并通过 `context.env` 读取。

## 本地开发

```bash
npm install
npm run dev
```

## 构建与部署

```bash
npm run build
npm run deploy
```