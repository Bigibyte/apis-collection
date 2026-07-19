import fs from "node:fs";
import pLimit from "p-limit";
import { readAllApis } from "../utils.js";

const TIMEOUT = 10_000;
const CONCURRENCY = 10;

interface LinkFailure {
  url: string;
  context: string;
  reason: string;
}

async function fetchStatus(url: string, method: "HEAD" | "GET"): Promise<Response> {
  return fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { "User-Agent": "bigibyte-apis-collection-link-checker/1.0" },
  });
}

async function checkUrl(url: string, context: string, failures: LinkFailure[]): Promise<boolean> {
  try {
    let resp = await fetchStatus(url, "HEAD");
    // Some servers reject HEAD outright; retry those with GET before judging.
    if ([403, 405, 501].includes(resp.status)) {
      resp = await fetchStatus(url, "GET");
    }
    if (resp.status === 429) return true;
    if (!resp.ok) {
      console.error(`[${resp.status}] ${url} (${context})`);
      failures.push({ url, context, reason: `HTTP ${resp.status}` });
      return false;
    }
    return true;
  } catch (error) {
    const message = (error as Error).message;
    console.error(`[FAIL] ${url} (${context}): ${message}`);
    failures.push({ url, context, reason: message });
    return false;
  }
}

export async function checkLinks(opts: { report?: string } = {}): Promise<void> {
  const apis = readAllApis();
  const limit = pLimit(CONCURRENCY);
  const failures: LinkFailure[] = [];
  const tasks: Promise<boolean>[] = [];

  for (const api of apis) {
    if (api.status === "dead") continue;
    for (const link of api.links ?? []) {
      if (link.url) tasks.push(limit(() => checkUrl(link.url!, `${api.name} > ${link.name}`, failures)));
    }
    for (const lib of api.libraries ?? []) {
      if (lib.documentation_url)
        tasks.push(limit(() => checkUrl(lib.documentation_url!, `${api.name} > ${lib.name} docs`, failures)));
      if (lib.source_code_url)
        tasks.push(limit(() => checkUrl(lib.source_code_url!, `${api.name} > ${lib.name} source`, failures)));
    }
  }

  const results = await Promise.all(tasks);
  const failed = results.filter((r) => !r).length;
  console.log(`Checked ${results.length} URLs, ${failed} failed`);

  if (opts.report) {
    fs.writeFileSync(
      opts.report,
      JSON.stringify({ checked: results.length, failed, failures }, null, 2),
    );
    console.log(`Report written to ${opts.report}`);
  }

  if (failed > 0) process.exit(1);
}
