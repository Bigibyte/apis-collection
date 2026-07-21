"use strict";

const REPO = "https://github.com/Bigibyte/apis-collection";
const PAGE_URL = (slug) => `${REPO}/blob/main/pages/${slug}/README.md`;

const state = {
  apis: [],
  query: "",
  filters: { category: null, auth_type: null, pricing: null, https: null },
};

const el = {
  search: document.getElementById("search"),
  filters: document.getElementById("filters"),
  results: document.getElementById("results"),
  count: document.getElementById("count"),
  empty: document.getElementById("empty"),
  themeToggle: document.getElementById("theme-toggle"),
};

// ---- Theme ---------------------------------------------------------------
function initTheme() {
  const saved = localStorage.getItem("theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);
  el.themeToggle.addEventListener("click", () => {
    const current =
      document.documentElement.getAttribute("data-theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

// ---- Rendering -----------------------------------------------------------
function escapeHtml(s) {
  return (s || "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
}

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function makeChip(label, active, onClick) {
  const b = document.createElement("button");
  b.className = "chip";
  b.type = "button";
  b.textContent = label;
  b.setAttribute("aria-pressed", String(active));
  b.addEventListener("click", onClick);
  return b;
}

function renderFilters() {
  el.filters.innerHTML = "";
  const categories = uniqueSorted(state.apis.flatMap((a) => a.categories));

  const groups = [
    { key: "category", label: "Category", options: categories, isSelect: true },
    { key: "auth_type", label: "Auth", options: ["none", "api_key", "oauth2", "bearer", "basic", "unknown"] },
    { key: "pricing", label: "Pricing", options: ["free", "freemium", "paid", "unknown"] },
    { key: "https", label: "HTTPS", options: ["yes"] },
  ];

  for (const group of groups) {
    const wrapper = document.createElement("div");
    wrapper.className = "filter-group";
    const label = document.createElement("span");
    label.className = "label";
    label.textContent = group.label;
    wrapper.appendChild(label);

    if (group.isSelect) {
      const select = document.createElement("select");
      select.className = "chip";
      select.innerHTML =
        `<option value="">All</option>` +
        group.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
      select.value = state.filters.category || "";
      select.addEventListener("change", () => {
        state.filters.category = select.value || null;
        renderFilters();
        render();
      });
      wrapper.appendChild(select);
    } else {
      for (const opt of group.options) {
        const active = state.filters[group.key] === opt;
        wrapper.appendChild(
          makeChip(group.key === "https" ? "HTTPS only" : opt, active, () => {
            state.filters[group.key] = active ? null : opt;
            renderFilters();
            render();
          }),
        );
      }
    }
    el.filters.appendChild(wrapper);
  }
}

function matches(api) {
  const f = state.filters;
  if (f.category && !api.categories.includes(f.category)) return false;
  if (f.auth_type && api.auth_type !== f.auth_type) return false;
  if (f.pricing && api.pricing !== f.pricing) return false;
  if (f.https === "yes" && api.https !== true) return false;
  if (state.query) {
    const q = state.query.toLowerCase();
    const hay = `${api.name} ${api.description || ""} ${api.categories.join(" ")}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

function cardHtml(api) {
  const tags = [];
  for (const cat of api.categories) tags.push(`<span class="tag cat">${escapeHtml(cat)}</span>`);
  tags.push(`<span class="tag">${escapeHtml(api.auth_type)}</span>`);
  if (api.pricing && api.pricing !== "unknown")
    tags.push(`<span class="tag">${escapeHtml(api.pricing)}</span>`);
  if (api.https === true) tags.push(`<span class="tag">https</span>`);

  return `
    <article class="card">
      <h2><a href="${PAGE_URL(api.slug)}" rel="noopener">${escapeHtml(api.name)}</a></h2>
      <p class="desc">${escapeHtml(api.description || "No description.")}</p>
      <div class="meta">${tags.join("")}</div>
    </article>`;
}

function render() {
  state.query = el.search.value.trim();
  const visible = state.apis.filter(matches);
  el.results.innerHTML = visible.map(cardHtml).join("");
  el.empty.hidden = visible.length > 0;
  el.count.textContent = `${visible.length} of ${state.apis.length} APIs`;
}

// ---- Boot ----------------------------------------------------------------
async function boot() {
  initTheme();
  try {
    const res = await fetch("./data/apis.min.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.apis = (await res.json()).filter((a) => a.status !== "dead");
    state.apis.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    el.results.innerHTML = `<p class="empty">Could not load data (${escapeHtml(
      String(err),
    )}). Run <code>npm run build</code> first.</p>`;
    return;
  }
  el.search.addEventListener("input", render);
  renderFilters();
  render();
}

boot();
