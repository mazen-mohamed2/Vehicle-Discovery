import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = new Map();

export function loadTypeScript(relativePath) {
  const filename = path.resolve(root, relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const localRequire = (request) => {
    if (request.startsWith("@/")) return loadTypeScript(path.join("src", `${request.slice(2)}.ts`));
    if (request.startsWith(".")) {
      const resolved = path.resolve(path.dirname(filename), request);
      return loadTypeScript(
        path.relative(root, resolved.endsWith(".ts") ? resolved : `${resolved}.ts`),
      );
    }
    return nativeRequire(request);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", output)(
    localRequire,
    module,
    module.exports,
    filename,
    path.dirname(filename),
  );
  return module.exports;
}

export function clearTypeScriptModules() {
  cache.clear();
}
