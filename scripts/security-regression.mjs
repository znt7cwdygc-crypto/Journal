import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function filesUnder(root) {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const sourceFiles = filesUnder("src").filter((path) => /\.(ts|tsx)$/.test(path));
const failures = [];

for (const path of sourceFiles) {
  const source = readFileSync(path, "utf8");
  if (source.includes("application/ld+json") && source.includes("JSON.stringify(")) {
    failures.push(`${path}: JSON-LD uses raw JSON.stringify`);
  }
  if (/<ContactReveal[\s\S]{0,240}\scontact=/.test(source)) {
    failures.push(`${path}: raw contact is passed to the client reveal component`);
  }
  if (/updateMany\([\s\S]{0,180}viewCount:\s*\{\s*increment:\s*1/.test(source)) {
    failures.push(`${path}: a list request increments views for multiple records`);
  }
}

const serializer = readFileSync("src/lib/json-ld.ts", "utf8");
for (const escapedCharacter of ["<", ">", "&"]) {
  if (!serializer.includes(`.replace(/${escapedCharacter}/g`)) {
    failures.push(`src/lib/json-ld.ts: missing escape for ${escapedCharacter}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Security regression checks passed");
