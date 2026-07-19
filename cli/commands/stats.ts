import chalk from "chalk";
import { readAllApis } from "../utils.js";

function tally<T extends string>(values: T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  return counts;
}

function printSection(title: string, counts: Record<string, number>, limit?: number): void {
  console.log(chalk.bold(`\n${title}`));
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of limit ? entries.slice(0, limit) : entries) {
    console.log(`  ${key.padEnd(36)} ${count}`);
  }
}

export async function stats(): Promise<void> {
  const apis = readAllApis();
  console.log(chalk.bold(`Total APIs: ${apis.length}`));

  printSection("By status", tally(apis.map((a) => a.status)));
  printSection("By pricing", tally(apis.map((a) => a.pricing)));
  printSection("By auth type", tally(apis.map((a) => a.auth_type)));
  printSection("Top 15 categories", tally(apis.flatMap((a) => a.categories)), 15);

  const withLibraries = apis.filter((a) => a.libraries?.length).length;
  const withSpec = apis.filter((a) => a.specification?.url).length;
  console.log(chalk.bold("\nCoverage"));
  console.log(`  With libraries${" ".padEnd(22)} ${withLibraries}`);
  console.log(`  With specification${" ".padEnd(18)} ${withSpec}`);
}
