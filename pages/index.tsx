export default async function handler(request) {
  return new Response(
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>gh-proxy on EdgeOne</title>
    <style>
      :root {
        --bg: #f4f7fb;
        --card: #ffffff;
        --text: #1d2433;
        --muted: #5c6475;
        --accent: #0a8f8a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Segoe UI", "PingFang SC", sans-serif;
        background: radial-gradient(circle at top right, #dff5ff 0%, var(--bg) 45%);
        color: var(--text);
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .card {
        width: min(760px, 100%);
        background: var(--card);
        border-radius: 18px;
        padding: 28px;
        box-shadow: 0 20px 48px rgba(21, 45, 77, 0.12);
      }
      h1 { margin: 0 0 12px; font-size: 28px; }
      p { margin: 0 0 12px; color: var(--muted); line-height: 1.6; }
      code {
        background: #eef4ff;
        border-radius: 8px;
        padding: 2px 8px;
        color: #0f2e68;
      }
      .hint {
        margin-top: 16px;
        border-left: 4px solid var(--accent);
        background: #ecfbfa;
        padding: 12px 14px;
        border-radius: 8px;
      }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>gh-proxy 已迁移到 EdgeOne Pages</h1>
      <p>代理逻辑运行在 <code>/functions/_worker.js</code>，保持与原 Cloudflare Worker 一致的 URL 转发行为。</p>
      <p>你可以直接访问代理路径，例如：</p>
      <p><code>/https://github.com/user/repo/releases/download/v1.0.0/file.zip</code></p>
      <div class="hint">
        健康检查接口：<code>/api/health</code>
      </div>
    </main>
  </body>
</html>`,
    {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    }
  )
}