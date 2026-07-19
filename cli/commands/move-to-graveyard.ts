import fs from "node:fs";
import path from "node:path";
import { getProjectRoot, collectionDir, graveyardDir, readYamlFile, listYamlFiles } from "../utils.js";
import { apiSchema } from "../schema.js";

export async function moveToGraveyard(): Promise<void> {
  const root = getProjectRoot();
  const collDir = collectionDir(root);
  const gravDir = graveyardDir(root);
  fs.mkdirSync(gravDir, { recursive: true });

  const moved: string[] = [];

  for (const file of listYamlFiles(collDir)) {
    const filePath = path.join(collDir, file);
    const raw = readYamlFile<unknown>(filePath);
    const result = apiSchema.safeParse(raw);
    if (!result.success) {
      console.warn(`Skip ${file}: invalid schema`);
      continue;
    }
    if (result.data.status === "dead") {
      fs.renameSync(filePath, path.join(gravDir, file));
      moved.push(file);
    }
  }

  console.log(`Moved ${moved.length} API(s) to graveyard: ${moved.join(", ") || "(none)"}`);
}
