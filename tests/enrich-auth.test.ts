import { describe, it, expect } from "vitest";
import { parseSource, nameKey } from "../cli/commands/enrich-auth.js";

const SAMPLE = `
Sponsored table (different format, must be ignored):
| API | Description | Call this API |
|---|:---|:---|
| [IPstack](https://ipstack.com) | Locate visitors by IP | [<img src="https://run.pstmn.io/button.svg">](https://god.gw.postman.com/run) |

Real data table:
| API | Description | Auth | HTTPS | CORS |
|---|:---|:---|:---|:---|
| [Etherscan](https://etherscan.io/apis) | Ethereum explorer API | \`apiKey\` | Yes | Yes |
| [Chainlink](https://chain.link) | Hybrid smart contracts | No | Yes | Unknown |
| [Steem](https://developers.steem.io/) | Blogging blockchain | No | No | No |
| [Some OAuth API](https://example.com) | Uses OAuth | \`OAuth\` | Yes | No |
`;

describe("nameKey", () => {
  it("collapses to lowercase alphanumerics", () => {
    expect(nameKey("AI & ML API!")).toBe("aimlapi");
    expect(nameKey("500px")).toBe("500px");
  });
});

describe("parseSource", () => {
  const map = parseSource(SAMPLE);

  it("ignores the sponsored table", () => {
    expect(map.has(nameKey("IPstack"))).toBe(false);
  });

  it("parses apiKey -> api_key with https and cors", () => {
    expect(map.get(nameKey("Etherscan"))).toEqual({ auth: "api_key", https: true, cors: "yes" });
  });

  it("maps No auth to none and Unknown cors to undefined", () => {
    expect(map.get(nameKey("Chainlink"))).toEqual({ auth: "none", https: true, cors: undefined });
  });

  it("parses https:false and cors:no", () => {
    expect(map.get(nameKey("Steem"))).toEqual({ auth: "none", https: false, cors: "no" });
  });

  it("maps OAuth -> oauth2", () => {
    expect(map.get(nameKey("Some OAuth API"))?.auth).toBe("oauth2");
  });
});
