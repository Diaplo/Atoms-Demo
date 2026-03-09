import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

const nextMode = process.argv[2] === "start" ? "start" : "dev";
const nextArgs = process.argv.slice(3);
const bundlerHost = process.env.SANDPACK_BUNDLER_HOST || "0.0.0.0";
const bundlerPort = process.env.SANDPACK_BUNDLER_PORT || "3101";
const bundlerPublicHost =
  process.env.SANDPACK_BUNDLER_PUBLIC_HOST ||
  (() => {
    try {
      return process.env.NEXT_PUBLIC_APP_URL
        ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
        : "localhost";
    } catch {
      return "localhost";
    }
  })();
const bundlerUrl =
  process.env.NEXT_PUBLIC_SANDPACK_BUNDLER_URL ||
  `http://${bundlerPublicHost}:${bundlerPort}`;
const sharedEnv = {
  ...process.env,
  NEXT_PUBLIC_SANDPACK_BUNDLER_URL: bundlerUrl,
  SANDPACK_BUNDLER_HOST: bundlerHost,
  SANDPACK_BUNDLER_PUBLIC_HOST: bundlerPublicHost,
  SANDPACK_BUNDLER_PORT: bundlerPort,
};

const bundlerScript = path.join(projectRoot, "lib", "sandpack", "bundler-server.mjs");
const nextCli = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");

let isShuttingDown = false;
let bundlerProcess;
let nextProcess;

function terminateProcessTree(child) {
  if (!child || child.exitCode !== null || child.killed || !child.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore",
    });
    return;
  }

  child.kill("SIGTERM");
}

function shutdown(code = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  terminateProcessTree(nextProcess);
  terminateProcessTree(bundlerProcess);
  process.exit(code);
}

console.log(`[sandpack-bundler] Using ${bundlerUrl}`);

bundlerProcess = spawn(process.execPath, [bundlerScript], {
  cwd: projectRoot,
  env: sharedEnv,
  stdio: "inherit",
});

nextProcess = spawn(process.execPath, [nextCli, nextMode, ...nextArgs], {
  cwd: projectRoot,
  env: sharedEnv,
  stdio: "inherit",
});

bundlerProcess.on("error", (error) => {
  console.error("[sandpack-bundler] Failed to start bundler process:", error);
  shutdown(1);
});

nextProcess.on("error", (error) => {
  console.error("[sandpack-bundler] Failed to start Next.js process:", error);
  shutdown(1);
});

bundlerProcess.on("exit", (code) => {
  if (isShuttingDown) {
    return;
  }

  console.error(
    `[sandpack-bundler] Bundler process exited unexpectedly with code ${code ?? 0}`
  );
  shutdown(code ?? 1);
});

nextProcess.on("exit", (code) => {
  if (isShuttingDown) {
    return;
  }

  shutdown(code ?? 0);
});

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
