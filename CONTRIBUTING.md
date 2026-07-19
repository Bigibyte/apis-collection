# Contributing

Thanks for helping make this collection better! Every API is a single YAML file in
[`collection/`](./collection) (or [`graveyard/`](./graveyard) for dead APIs). The README, per-API
pages and JSON files are **generated** — never edit them by hand.

## Adding a new API

The easy way:

```bash
npm install
npm run add        # interactive wizard, creates collection/<slug>.yaml
npm run validate   # check your entry
npm run build      # regenerate README, pages and data/
```

Then open a pull request with the new YAML file **and** the regenerated files.

## Entry format

```yaml
name: Example API
slug: example-api          # lowercase letters, digits, hyphens; must match the filename
description: What the API does, in one or two sentences.
categories:                # at least one, from categories.yaml
  - Development
type: REST
pricing: freemium          # free | freemium | paid | unknown
auth_type: api_key         # none | api_key | oauth2 | bearer | basic | unknown
https: true
cors: yes                  # yes | no | unknown
added: 2026-07-19
last_verified: 2026-07-19
links:
  - name: Docs / Website
    url: https://example.com/docs
```

Optional fields: `base_url`, `logo`, `contact`, `discussion_url`, `rate_limits`, `tags`,
`specification`, `libraries`. See [`cli/schema.ts`](./cli/schema.ts) for the full schema.

## Rules

- One API per file, filename must be `<slug>.yaml`.
- `status` defaults to `active`. Use `deprecated` for APIs on the way out; dead APIs get
  `status: dead` and are moved with `npm run move-to-graveyard`.
- Descriptions should be factual, not marketing copy.
- CI runs `validate`, the tests, and checks that generated files are up to date.

## Updating or removing an API

Edit the YAML file, run `npm run validate && npm run build`, and open a PR. To report a dead
API without fixing it yourself, open an issue.
