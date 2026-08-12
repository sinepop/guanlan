// Node ESM loader hook：给 .ts 文件里 `import "./foo"` 这种省略扩展名的引用
// 补上 `.ts`。只做扩展名补全，不做转译（Node 24 --experimental-transform-types 负责）。
export async function resolve(specifier, context, nextResolve) {
  const parent = context.parentURL ?? "";
  const looksLikeBareRelPath =
    parent.endsWith(".ts") &&
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !specifier.endsWith(".ts") &&
    !specifier.endsWith(".js") &&
    !specifier.endsWith(".json");
  if (looksLikeBareRelPath && !specifier.startsWith("node:")) {
    try {
      return await nextResolve(specifier + ".ts", context);
    } catch {
      // fall through
    }
  }
  return nextResolve(specifier, context);
}
