// Sobe o Next em modo dev e abre o localhost sempre no Chrome.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const port = process.env.PORT || "3000";
const url = `http://localhost:${port}`;

const chromePaths = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
];

function openInChrome() {
  const chrome = chromePaths.find((p) => existsSync(p));
  if (chrome) {
    spawn(chrome, [url], { detached: true, stdio: "ignore" }).unref();
  } else {
    console.warn(`Chrome não encontrado. Abra ${url} manualmente.`);
  }
}

const next = spawn("npx", ["next", "dev", "-p", port], {
  stdio: ["inherit", "pipe", "inherit"],
  shell: true,
});

let opened = false;
next.stdout.on("data", (chunk) => {
  process.stdout.write(chunk);
  if (!opened && /Ready|ready/.test(chunk.toString())) {
    opened = true;
    openInChrome();
  }
});

next.on("exit", (code) => process.exit(code ?? 0));
