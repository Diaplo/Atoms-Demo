import http from "node:http";
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");
const bundlerRoot = path.join(
  projectRoot,
  "node_modules",
  "@codesandbox",
  "sandpack-client",
  "sandpack"
);

const host = process.env.SANDPACK_BUNDLER_HOST || "0.0.0.0";
const port = Number(process.env.SANDPACK_BUNDLER_PORT || "3101");
const publicHost = process.env.SANDPACK_BUNDLER_PUBLIC_HOST || "localhost";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
  });
  res.end(message);
}

function resolveAssetPath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const relativePath = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const normalizedPath = path.normalize(path.join(bundlerRoot, relativePath));

  if (!normalizedPath.startsWith(bundlerRoot)) {
    return null;
  }

  return normalizedPath;
}

async function serveFile(req, res, filePath) {
  let targetPath = filePath;
  let stat;

  try {
    stat = await fsp.stat(targetPath);
  } catch {
    sendText(res, 404, "Not Found");
    return;
  }

  if (stat.isDirectory()) {
    targetPath = path.join(targetPath, "index.html");

    try {
      stat = await fsp.stat(targetPath);
    } catch {
      sendText(res, 404, "Not Found");
      return;
    }
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, max-age=300",
    "Content-Length": stat.size,
    "Content-Type": contentType,
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  const stream = fs.createReadStream(targetPath);
  stream.on("error", () => {
    if (!res.headersSent) {
      sendText(res, 500, "Failed to read asset");
      return;
    }

    res.destroy();
  });
  stream.pipe(res);
}

async function createHealthPayload() {
  let version = "unknown";

  try {
    version = (await fsp.readFile(path.join(bundlerRoot, "version.txt"), "utf8")).trim();
  } catch {
    version = "missing";
  }

  return {
    bundlerRoot,
    host,
    ok: true,
    port,
    publicHost,
    url: `http://${publicHost}:${port}`,
    version,
  };
}

if (!fs.existsSync(bundlerRoot)) {
  console.error(
    `[sandpack-bundler] Missing bundler assets at ${bundlerRoot}. Run npm install first.`
  );
  process.exit(1);
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendText(res, 400, "Missing request URL");
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendText(res, 405, "Method Not Allowed");
    return;
  }

  const url = new URL(req.url, `http://${host}:${port}`);

  if (url.pathname === "/health") {
    sendJson(res, 200, await createHealthPayload());
    return;
  }

  const assetPath = resolveAssetPath(req.url);

  if (!assetPath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  await serveFile(req, res, assetPath);
});

server.listen(port, host, () => {
  console.log(
    `[sandpack-bundler] Serving ${bundlerRoot} at http://${host}:${port}`
  );
});

function shutdown(signal) {
  server.close(() => {
    console.log(`[sandpack-bundler] Stopped on ${signal}`);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
