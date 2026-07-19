#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();
program.name("apis").version("1.0.0").description("Bigibyte APIs Collection CLI");

program
  .command("build")
  .description("Generate README.md, per-API pages, and data/*.json")
  .action(async () => {
    const { build } = await import("./commands/build.js");
    await build();
  });

program
  .command("validate")
  .description("Validate all collection/ and graveyard/ entries against schema")
  .action(async () => {
    const { validate } = await import("./commands/validate.js");
    await validate();
  });

program
  .command("add")
  .description("Interactively add a new API")
  .action(async () => {
    const { add } = await import("./commands/add.js");
    await add();
  });

program
  .command("check-links")
  .description("Check all URLs in collection files")
  .option("--report <file>", "write a JSON report of failures")
  .action(async (opts: { report?: string }) => {
    const { checkLinks } = await import("./commands/check-links.js");
    await checkLinks(opts);
  });

program
  .command("migrate")
  .description("Migrate entries from an upstream apis-collection checkout")
  .requiredOption("--from <path>", "path to the source repository root")
  .action(async (opts: { from: string }) => {
    const { migrate } = await import("./commands/migrate.js");
    await migrate(opts.from);
  });

program
  .command("enrich-auth")
  .description("Fill auth_type/https/cors by cross-referencing public-apis/public-apis (MIT)")
  .option("--file <path>", "read the source markdown from a local file instead of fetching")
  .action(async (opts: { file?: string }) => {
    const { enrichAuth } = await import("./commands/enrich-auth.js");
    await enrichAuth(opts);
  });

program
  .command("stats")
  .description("Print collection statistics")
  .action(async () => {
    const { stats } = await import("./commands/stats.js");
    await stats();
  });

program
  .command("enrich")
  .description("Enrich library data from GitHub API")
  .action(async () => {
    const { enrich } = await import("./commands/enrich.js");
    await enrich();
  });

program
  .command("move-to-graveyard")
  .description("Move dead APIs from collection/ to graveyard/")
  .action(async () => {
    const { moveToGraveyard } = await import("./commands/move-to-graveyard.js");
    await moveToGraveyard();
  });

program.parseAsync(process.argv);
