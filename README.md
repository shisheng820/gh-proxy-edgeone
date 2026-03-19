# gh-proxy EdgeOne Pages 项目

## 一键部署

[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https%3A%2F%2Fgithub.com%2Fshisheng820%2Fgh-proxy-edgeone&project-name=gh-proxy-edgeone&output-directory=dist)

这个仓库已整理为标准的 EdgeOne Pages 项目结构，并针对“GitHub 下载反代”做了定制化配置。

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

## 下载反代定制说明

针对大文件下载、长连接和多级跳转，项目做了以下定制：

1. `edgeone.json` 将 `nodeFunctionsConfig.maxDuration` 设置为 `120`（平台允许范围内最大值）。
2. 代理逻辑保留流式转发（`new Response(res.body, ...)`），不在函数内缓存整个文件体。
3. 增加重定向跳数保护（默认最多 8 跳，可通过环境变量调整），避免异常循环跳转。
4. 增加相对重定向兼容（Location 为相对路径时可继续跟随）。
5. 支持运行时环境变量：
- `GH_PROXY_ASSET_URL`
- `GH_PROXY_PREFIX`
- `GH_PROXY_JSDELIVR`
- `GH_PROXY_WHITELIST`
- `GH_PROXY_MAX_REDIRECT_HOPS`

## edgeone.json 说明

项目根目录新增了 `edgeone.json`，用于覆盖控制台默认构建行为，主要包括：

1. `installCommand`: `npm install`
2. `buildCommand`: `npx edgeone pages build`
3. `outputDirectory`: `dist`
4. `nodeVersion`: `22.11.0`
5. `nodeFunctionsConfig.maxDuration`: `120`
6. `headers`: 基础安全头 + `/api/*` 不缓存

## 你需要在 EdgeOne 控制台补齐的配置

1. 创建 Pages 项目，并将仓库根目录设置为当前目录。
2. 构建设置（如果你使用 `edgeone.json`，可自动覆盖控制台同名配置）：
- 构建命令：`npx edgeone pages build`
- 输出目录：`dist`
3. 域名设置：
- 先用默认 `*.edgeone.app` 域名验证。
- 如需自定义域名，在控制台绑定并添加对应 DNS 记录。
4. 环境变量（建议）：
- 建议把 `GH_PROXY_PREFIX`、`GH_PROXY_WHITELIST` 等变量在控制台设置，避免硬编码。

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
