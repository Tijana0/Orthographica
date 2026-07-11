/* ————————————————————————————————————————————————
   Orthographica — app
   Views: lineage · chronology · glyph field · atlas · specimens
   ———————————————————————————————————————————————— */

"use strict";

/* ——— Constants ——— */

const TYPE_ORDER = ["Alphabet", "Abjad", "Abugida", "Syllabary", "Logographic", "Featural"];

const TYPE_COLORS = {
  Alphabet:    "#7fb2ff",
  Abjad:       "#f0a35e",
  Abugida:     "#7fd694",
  Syllabary:   "#cf9bf5",
  Logographic: "#f07373",
  Featural:    "#55d4c1",
};

const TYPE_DEFS = {
  Alphabet:    "letters for both consonants and vowels",
  Abjad:       "consonants written; vowels implied or marked with diacritics",
  Abugida:     "consonant letters carry an inherent vowel, altered by marks",
  Syllabary:   "one symbol per whole syllable",
  Logographic: "symbols stand for words or morphemes",
  Featural:    "letter shapes encode articulatory features",
};

const DIR_ORDER = ["LTR", "RTL", "TTB", "Boustrophedon"];
const DIR_ARROW = { LTR: "→", RTL: "←", TTB: "↓", Boustrophedon: "⇄" };
const DIR_LABEL = {
  LTR: "left to right",
  RTL: "right to left",
  TTB: "top to bottom",
  Boustrophedon: "boustrophedon (alternating)",
};

const STATUS_ORDER = ["All", "Living", "Historical", "Constructed"];
const NOW = 2026;

/* ——— Data indexes ——— */

const byId = new Map(SCRIPTS.map(s => [s.id, s]));
const childrenOf = new Map();
SCRIPTS.forEach(s => {
  if (s.parent_script && byId.has(s.parent_script)) {
    if (!childrenOf.has(s.parent_script)) childrenOf.set(s.parent_script, []);
    childrenOf.get(s.parent_script).push(s.id);
  }
});

// Cut at the first comma or parenthetical suffix — but not a leading "(",
// so "(Small) Seal" survives while "Han (Hanzi, Kanji, Hanja)" becomes "Han".
const shortName = s => s.name.split(",")[0].split(" (")[0].trim();
const era = y => (y < 0 ? `${-y} BCE` : `${y} CE`);
const eraShort = y => (y < 0 ? `−${-y}` : `${y}`);
const fmtCount = n => (n ? n.toLocaleString("en-US") : "unknown");
const firstGlyph = str => (str ? [...str][0] : null);
const isGenericQuirk = q => !q || q.startsWith("A writing system of type");

/* ——— State ——— */

const VALID_VIEWS = ["lineage", "chronology", "glyphfield", "atlas", "specimens"];
// Deep link: #view or #view:ScriptCode (e.g. #specimens:Arab)
const [hashView, hashScript] = location.hash.replace("#", "").split(":");

const state = {
  view: VALID_VIEWS.includes(hashView) ? hashView : "lineage",
  status: "All",
  types: new Set(),
  dirs: new Set(),
  search: "",
};

function matches(s) {
  if (state.status !== "All" && s.status !== state.status) return false;
  if (state.types.size && !state.types.has(s.type)) return false;
  if (state.dirs.size && !state.dirs.has(s.directionality)) return false;
  if (state.search) {
    const q = state.search;
    const hay = (s.name + " " + s.id + " " + s.languages.join(" ")).toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

const filtered = () => SCRIPTS.filter(matches);

/* ——— DOM handles ——— */

const stage = document.getElementById("stage");

// Inner content width of the stage — clientWidth minus its own padding,
// so fixed-width SVGs never overflow into a horizontal scrollbar.
function stageWidth() {
  const cs = getComputedStyle(stage);
  return Math.floor(stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
}
const topbar = document.getElementById("topbar");
const panel = document.getElementById("panel");
const panelBody = document.getElementById("panel-body");

const tooltip = document.createElement("div");
tooltip.id = "tooltip";
document.body.appendChild(tooltip);

function showTip(html, x, y) {
  tooltip.innerHTML = html;
  tooltip.style.opacity = 1;
  const w = tooltip.offsetWidth, h = tooltip.offsetHeight;
  tooltip.style.left = Math.min(x + 14, window.innerWidth - w - 12) + "px";
  tooltip.style.top = Math.min(y + 14, window.innerHeight - h - 12) + "px";
}
const hideTip = () => (tooltip.style.opacity = 0);

const tipHTML = s =>
  `<b>${shortName(s)}</b><div class="t-sub">${s.type} · ${s.directionality} · ${era(s.timeline.invention_date)}${
    s.timeline.extinction_date ? "–" + era(s.timeline.extinction_date) : " – now"}</div>`;

/* ——— Header controls ——— */

function buildControls() {
  // View tabs
  const tabs = document.getElementById("tabs");
  const VIEWS = [
    ["lineage", "Lineage"],
    ["chronology", "Chronology"],
    ["glyphfield", "Glyph Field"],
    ["atlas", "Atlas"],
    ["specimens", "Specimens"],
  ];
  VIEWS.forEach(([id, label]) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.dataset.view = id;
    if (id === state.view) b.classList.add("active");
    b.onclick = () => {
      state.view = id;
      history.replaceState(null, "", "#" + id);
      tabs.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
      render();
    };
    tabs.appendChild(b);
  });

  // Status segmented control
  const seg = document.getElementById("status-seg");
  STATUS_ORDER.forEach(st => {
    const b = document.createElement("button");
    b.textContent = st === "All" ? "Show all" : st;
    if (st === state.status) b.classList.add("active");
    b.onclick = () => {
      state.status = st;
      seg.querySelectorAll("button").forEach(x => x.classList.toggle("active", x === b));
      render();
    };
    seg.appendChild(b);
  });

  // Type chips (doubles as the colour legend)
  const tc = document.getElementById("type-chips");
  TYPE_ORDER.forEach(t => {
    const b = document.createElement("button");
    b.className = "chip";
    b.style.setProperty("--chip-c", TYPE_COLORS[t]);
    b.innerHTML = `<span class="dot"></span>${t}`;
    b.title = TYPE_DEFS[t];
    b.onclick = () => {
      state.types.has(t) ? state.types.delete(t) : state.types.add(t);
      b.classList.toggle("active");
      render();
    };
    tc.appendChild(b);
  });

  // Direction chips
  const dc = document.getElementById("dir-chips");
  DIR_ORDER.forEach(d => {
    const b = document.createElement("button");
    b.className = "chip";
    b.innerHTML = `<span class="arrow">${DIR_ARROW[d]}</span>${d}`;
    b.title = DIR_LABEL[d];
    b.onclick = () => {
      state.dirs.has(d) ? state.dirs.delete(d) : state.dirs.add(d);
      b.classList.toggle("active");
      render();
    };
    dc.appendChild(b);
  });

  // Search
  const search = document.getElementById("search");
  let deb;
  search.addEventListener("input", () => {
    clearTimeout(deb);
    deb = setTimeout(() => {
      state.search = search.value.trim().toLowerCase();
      render();
    }, 160);
  });
}

function renderStats() {
  const f = filtered();
  const living = f.filter(s => s.status === "Living").length;
  const hist = f.filter(s => s.status === "Historical").length;
  const con = f.filter(s => s.status === "Constructed").length;
  const el = document.getElementById("statsbar");
  if (!f.length) {
    el.innerHTML = `<b>0</b> of ${SCRIPTS.length} scripts match`;
    return;
  }
  const oldest = f.reduce((a, b) => (a.timeline.invention_date < b.timeline.invention_date ? a : b));
  el.innerHTML =
    `<b>${f.length}</b> of ${SCRIPTS.length} scripts · ` +
    `<b>${living}</b> living · <b>${hist}</b> historical · <b>${con}</b> constructed · ` +
    `oldest shown: ${shortName(oldest)}, ${era(oldest.timeline.invention_date)}`;
}

/* ——— View header: note + legend ——— */

const LEG_C = "#b8ae9c";
const sw = (w, inner) => `<svg width="${w}" height="14" aria-hidden="true">${inner}</svg>`;
const swDot = attrs => sw(14, `<circle cx="7" cy="7" r="5" ${attrs}></circle>`);

const LEGEND_MECH = [
  sw(40, TYPE_ORDER.map((t, i) => `<circle cx="${5 + i * 6}" cy="7" r="2.6" fill="${TYPE_COLORS[t]}"></circle>`).join("")),
  "colour = mechanism",
];
const LEGEND_LIVING = [swDot(`fill="${LEG_C}"`), "living — filled"];
const LEGEND_HIST = [swDot(`fill="none" stroke="${LEG_C}" stroke-width="1.4"`), "historical — outlined"];
const LEGEND_CONS = [swDot(`fill="none" stroke="${LEG_C}" stroke-width="1.4" stroke-dasharray="2 1.5"`), "constructed — dashed"];

function viewHead(noteText, legendItems) {
  const head = document.createElement("div");
  head.className = "view-head";
  const note = document.createElement("p");
  note.className = "view-note";
  note.textContent = noteText;
  head.appendChild(note);
  if (legendItems && legendItems.length) {
    const leg = document.createElement("div");
    leg.className = "legend";
    leg.innerHTML = legendItems.map(([swatch, label]) => `<span class="legend-item">${swatch}${label}</span>`).join("");
    head.appendChild(leg);
  }
  stage.appendChild(head);
}

/* ——— Render dispatch ——— */

let currentSim = null;

function render() {
  if (currentSim) { currentSim.stop(); currentSim = null; }
  hideTip();
  renderStats();
  stage.innerHTML = "";
  const f = filtered();
  if (!f.length) {
    stage.innerHTML = `<div class="empty-state">No scripts match these filters — the page is blank, like Linear A to us all.</div>`;
    return;
  }
  ({ lineage: renderLineage,
     chronology: renderChronology,
     glyphfield: renderGlyphField,
     atlas: renderAtlas,
     specimens: renderSpecimens })[state.view](f);
}

/* ————————————————————————————————————————————————
   View 1 · Lineage — radial evolutionary tree
   ———————————————————————————————————————————————— */

function renderLineage() {
  viewHead(
    "Every script hangs from its evolutionary parent; independent inventions radiate from the centre. Scroll to zoom, drag to pan, click a node for detail. Filtered-out scripts are dimmed, never severed — lineage is indivisible.",
    [LEGEND_LIVING, LEGEND_HIST, LEGEND_CONS, LEGEND_MECH]);

  const width = stageWidth();
  const height = Math.max(660, window.innerHeight - topbar.offsetHeight - 130);
  const radius = Math.max(520, Math.min(width, height * 1.35) / 2 - 40);

  const rows = [{ id: "__root", parent_script: null }, ...SCRIPTS];
  const root = d3.stratify()
    .id(d => d.id)
    .parentId(d => (d.id === "__root" ? null : d.parent_script && byId.has(d.parent_script) ? d.parent_script : "__root"))(rows);

  root.sort((a, b) =>
    d3.ascending(a.data.timeline?.invention_date ?? -9e9, b.data.timeline?.invention_date ?? -9e9) ||
    d3.ascending(a.data.name, b.data.name));

  d3.cluster().size([2 * Math.PI, radius])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.5))(root);

  const svg = d3.select(stage).append("svg")
    .attr("id", "lineage-svg")
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

  const g = svg.append("g");
  const fit = Math.min(width, height) / (radius * 2 + 170);
  const initial = d3.zoomIdentity.scale(Math.max(fit, 0.42));
  const zoom = d3.zoom().scaleExtent([0.3, 5]).on("zoom", e => g.attr("transform", e.transform));
  svg.call(zoom).call(zoom.transform, initial);

  const dimmed = d => d.data.id !== "__root" && !matches(d.data);

  g.append("g").selectAll("path")
    .data(root.links())
    .join("path")
    .attr("class", "tree-link")
    .attr("stroke-width", d => (d.source.depth === 0 ? 0.6 : 1.1))
    .attr("stroke-opacity", d => (dimmed(d.target) ? 0.04 : d.source.depth === 0 ? 0.1 : 0.24))
    .attr("d", d3.linkRadial().angle(d => d.x).radius(d => d.y));

  // Centre mark — the undivided origin
  g.append("text")
    .attr("text-anchor", "middle").attr("dy", "0.35em")
    .attr("fill", "#d8b45c").attr("font-size", 15).attr("opacity", 0.8)
    .text("✳");

  const node = g.append("g").selectAll("g")
    .data(root.descendants().filter(d => d.data.id !== "__root"))
    .join("g")
    .attr("class", "tree-node")
    .attr("transform", d => `rotate(${(d.x * 180) / Math.PI - 90}) translate(${d.y},0)`)
    .attr("opacity", d => (dimmed(d) ? 0.13 : 1))
    .on("click", (e, d) => openPanel(d.data.id))
    .on("mousemove", (e, d) => showTip(tipHTML(d.data), e.clientX, e.clientY))
    .on("mouseleave", hideTip);

  node.append("circle")
    .attr("r", d => (d.children ? 4 : 3.2))
    .attr("fill", d => (d.data.status === "Living" ? TYPE_COLORS[d.data.type] : "none"))
    .attr("stroke", d => TYPE_COLORS[d.data.type])
    .attr("stroke-width", 1.4)
    .attr("stroke-dasharray", d => (d.data.status === "Constructed" ? "2 1.5" : null));

  // Leaves label outward into open space; parent nodes label inward so they
  // never invade the leaf ring. Interior labels that are neighbours in angle
  // (chains share one ray; siblings sit on adjacent rays) alternate which side
  // of the ray they hang on, so they can't stack on top of each other.
  root.descendants()
    .filter(d => d.children && d.data.id !== "__root")
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .forEach((d, i) => (d.labelSide = i % 2));

  node.append("text")
    .attr("class", "tree-label")
    .attr("dy", d => (d.children ? (d.labelSide ? "-0.45em" : "1.1em") : "0.32em"))
    .attr("x", d => ((d.x < Math.PI ? 1 : -1) * (d.children ? -7 : 7)))
    .attr("text-anchor", d => ((d.x < Math.PI) === !!d.children ? "end" : "start"))
    .attr("transform", d => (d.x >= Math.PI ? "rotate(180)" : null))
    .text(d => shortName(d.data));

  // Exact cleanup pass: near the core, converging rays can still cross. Model
  // each label as a tight rectangle oriented along its ray and let interior
  // labels try their side, the flipped side, then deeper insets until they
  // clear everything already placed; if nothing clears, keep the original.
  const labelBox = (d, textEl) => {
    const w = textEl.getComputedTextLength();
    let x0 = parseFloat(textEl.getAttribute("x"));
    if (textEl.getAttribute("text-anchor") === "end") x0 -= w;
    let x1 = x0 + w;
    let y = parseFloat(textEl.getAttribute("dy")) * 9.5;
    if (d.x >= Math.PI) { [x0, x1, y] = [-x1, -x0, -y]; }
    const th = d.x - Math.PI / 2;
    const c = Math.cos(th), s = Math.sin(th);
    const lx = d.y + (x0 + x1) / 2;
    return { cx: c * lx - s * y, cy: s * lx + c * y, ux: c, uy: s, hw: (x1 - x0) / 2, hh: 6.2 };
  };

  const boxesClash = (a, b) => {
    const axes = [[a.ux, a.uy], [-a.uy, a.ux], [b.ux, b.uy], [-b.uy, b.ux]];
    const dx = b.cx - a.cx, dy = b.cy - a.cy;
    return axes.every(([x, y]) => {
      const ra = a.hw * Math.abs(a.ux * x + a.uy * y) + a.hh * Math.abs(-a.uy * x + a.ux * y);
      const rb = b.hw * Math.abs(b.ux * x + b.uy * y) + b.hh * Math.abs(-b.uy * x + b.ux * y);
      return Math.abs(dx * x + dy * y) <= ra + rb;
    });
  };

  const placed = [];
  const leafG = [], innerG = [];
  node.each(function (d) { (d.children ? innerG : leafG).push([this.querySelector("text"), d]); });
  leafG.forEach(([text, d]) => { if (!dimmed(d)) placed.push(labelBox(d, text)); });
  innerG.sort((a, b) => a[1].x - b[1].x);
  innerG.forEach(([text, d]) => {
    const right = d.x < Math.PI;
    const sides = d.labelSide
      ? ["-0.45em", "1.1em", "-1.5em", "2.15em"]
      : ["1.1em", "-0.45em", "2.15em", "-1.5em"];
    const original = {
      dy: text.getAttribute("dy"), x: text.getAttribute("x"),
      anchor: text.getAttribute("text-anchor"),
    };
    for (const inset of [7, 22, 40]) {
      for (const outward of [false, true]) {
        for (const dy of sides) {
          text.setAttribute("dy", dy);
          text.setAttribute("x", (right ? 1 : -1) * (outward ? inset : -inset));
          text.setAttribute("text-anchor", right === outward ? "start" : "end");
          const box = labelBox(d, text);
          if (!placed.some(f => boxesClash(f, box))) { placed.push(box); return; }
        }
      }
    }
    text.setAttribute("dy", original.dy);
    text.setAttribute("x", original.x);
    text.setAttribute("text-anchor", original.anchor);
    placed.push(labelBox(d, text));
  });
}

/* ————————————————————————————————————————————————
   View 2 · Chronology — lifespan bars, 3350 BCE → now
   ———————————————————————————————————————————————— */

function renderChronology(f) {
  viewHead(
    "Each bar spans a script’s attested life, from first inscription to last — living scripts run off the right edge into the present. Sorted by birth.",
    [
      [sw(28, `<rect x="0" y="4.5" width="18" height="5" rx="2" fill="${LEG_C}"></rect><circle cx="23" cy="7" r="2.6" fill="${LEG_C}"></circle>`), "in use to the present"],
      [sw(20, `<rect x="0" y="4.5" width="18" height="5" rx="2" fill="${LEG_C}" opacity="0.45"></rect>`), "extinct"],
      [sw(10, `<line x1="5" y1="1" x2="5" y2="13" stroke="#d8b45c" stroke-dasharray="2 4"></line>`), "today"],
      LEGEND_MECH,
    ]);

  const rows = [...f].sort((a, b) =>
    a.timeline.invention_date - b.timeline.invention_date || a.name.localeCompare(b.name));

  const gutter = 235;
  const width = stageWidth();
  const rowH = 19;
  const bodyH = rows.length * rowH + 14;
  const x = d3.scaleLinear().domain([-3450, 2120]).range([gutter, width - 24]);
  const ticks = d3.range(-3000, 2001, 500);

  // Sticky axis strip
  const axisDiv = document.createElement("div");
  axisDiv.id = "timeline-axis";
  axisDiv.style.top = topbar.offsetHeight + "px";
  stage.appendChild(axisDiv);
  const ax = d3.select(axisDiv).append("svg").attr("width", width).attr("height", 26);
  ax.selectAll("text").data(ticks).join("text")
    .attr("class", "tl-tick")
    .attr("x", d => x(d)).attr("y", 17).attr("text-anchor", "middle")
    .text(d => (d === 0 ? "1 CE" : eraShort(d)));

  const svg = d3.select(stage).append("svg").attr("width", width).attr("height", bodyH);

  svg.selectAll("line.tl-grid").data(ticks).join("line")
    .attr("class", "tl-grid")
    .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", 0).attr("y2", bodyH);

  svg.append("line").attr("class", "tl-now")
    .attr("x1", x(NOW)).attr("x2", x(NOW)).attr("y1", 0).attr("y2", bodyH);

  const row = svg.selectAll("g.tl-row").data(rows).join("g")
    .attr("class", "tl-row")
    .attr("transform", (d, i) => `translate(0,${i * rowH + 8})`)
    .on("click", (e, d) => openPanel(d.id))
    .on("mousemove", (e, d) => showTip(tipHTML(d), e.clientX, e.clientY))
    .on("mouseleave", hideTip);

  row.append("rect") // hit area
    .attr("x", 0).attr("width", width).attr("height", rowH).attr("fill", "transparent");

  row.append("text")
    .attr("class", "tl-name")
    .attr("x", gutter - 12).attr("y", rowH / 2 + 3.5).attr("text-anchor", "end")
    .text(d => shortName(d));

  row.append("rect")
    .attr("class", "tl-bar")
    .attr("x", d => x(d.timeline.invention_date))
    .attr("width", d => Math.max(2.5, x(d.timeline.extinction_date ?? NOW) - x(d.timeline.invention_date)))
    .attr("y", 4).attr("height", rowH - 9)
    .attr("rx", 2)
    .attr("fill", d => TYPE_COLORS[d.type])
    .attr("opacity", d => (d.timeline.extinction_date ? 0.5 : 0.88));

  row.filter(d => !d.timeline.extinction_date).append("circle")
    .attr("cx", x(NOW)).attr("cy", rowH / 2 - 0.5).attr("r", 2.6)
    .attr("fill", d => TYPE_COLORS[d.type]);
}

/* ————————————————————————————————————————————————
   View 3 · Glyph Field — bubbles sized by grapheme count
   ———————————————————————————————————————————————— */

function renderGlyphField(f) {
  viewHead(
    "Every script as a bubble, area scaled to its encoded grapheme inventory (log scale — Han would otherwise be the page). Clustered by mechanism.",
    [
      [swDot(`fill="${LEG_C}" fill-opacity="0.85"`), "living — filled"],
      [swDot(`fill="${LEG_C}" fill-opacity="0.28" stroke="${LEG_C}"`), "historical — translucent"],
      [swDot(`fill="${LEG_C}" fill-opacity="0.15" stroke="${LEG_C}" stroke-dasharray="3 2"`), "constructed — dashed"],
      LEGEND_MECH,
    ]);

  const width = stageWidth();
  const types = TYPE_ORDER.filter(t => f.some(s => s.type === t));
  const cols = Math.min(3, types.length);
  const rowsN = Math.ceil(types.length / cols);
  const cellW = width / cols;
  const cellH = types.length <= 3 ? 520 : 440;
  const height = rowsN * cellH + 10;

  const center = new Map(types.map((t, i) => [t, {
    x: (i % cols) * cellW + cellW / 2,
    y: Math.floor(i / cols) * cellH + cellH / 2 + 26,
  }]));

  const r = s => 5 + 8.5 * Math.log10(Math.max(s.character_count, 10) / 10);

  const svg = d3.select(stage).append("svg").attr("width", width).attr("height", height);

  const labels = svg.append("g");
  types.forEach(t => {
    const c = center.get(t);
    const n = f.filter(s => s.type === t).length;
    labels.append("text").attr("class", "gf-cluster-label")
      .attr("x", c.x).attr("y", c.y - cellH / 2 + 8).attr("text-anchor", "middle")
      .attr("fill", TYPE_COLORS[t]).text(t);
    labels.append("text").attr("class", "gf-cluster-count")
      .attr("x", c.x).attr("y", c.y - cellH / 2 + 24).attr("text-anchor", "middle")
      .text(`${n} script${n > 1 ? "s" : ""} — ${TYPE_DEFS[t]}`);
  });

  const nodes = f.map(s => ({ s, r: r(s), x: center.get(s.type).x + (Math.random() - 0.5) * 60, y: center.get(s.type).y + (Math.random() - 0.5) * 60 }));

  const node = svg.append("g").selectAll("g").data(nodes).join("g")
    .attr("class", "gf-node")
    .on("click", (e, d) => openPanel(d.s.id))
    .on("mousemove", (e, d) => showTip(
      tipHTML(d.s) + `<div class="t-sub">${fmtCount(d.s.character_count)} graphemes</div>`, e.clientX, e.clientY))
    .on("mouseleave", hideTip);

  node.append("circle")
    .attr("r", d => d.r)
    .attr("fill", d => TYPE_COLORS[d.s.type])
    .attr("fill-opacity", d => (d.s.status === "Living" ? 0.85 : d.s.status === "Historical" ? 0.28 : 0.15))
    .attr("stroke", d => TYPE_COLORS[d.s.type])
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", d => (d.s.status === "Constructed" ? "3 2" : null));

  node.filter(d => d.r >= 13 && firstGlyph(d.s.native_example)).append("text")
    .attr("class", "gf-glyph")
    .attr("text-anchor", "middle").attr("dy", "0.36em")
    .attr("font-size", d => d.r * 0.85)
    .attr("fill", d => (d.s.status === "Living" ? "#12100c" : TYPE_COLORS[d.s.type]))
    .text(d => firstGlyph(d.s.native_example));

  node.filter(d => d.r >= 24).append("text")
    .attr("text-anchor", "middle").attr("y", d => d.r + 13)
    .attr("font-size", 10).attr("fill", "#a89e8c")
    .text(d => shortName(d.s));

  currentSim = d3.forceSimulation(nodes)
    .force("x", d3.forceX(d => center.get(d.s.type).x).strength(0.09))
    .force("y", d3.forceY(d => center.get(d.s.type).y).strength(0.11))
    .force("collide", d3.forceCollide(d => d.r + 1.6).strength(0.9))
    .alphaDecay(0.035)
    .on("tick", () => node.attr("transform", d => `translate(${d.x},${d.y})`));
}

/* ————————————————————————————————————————————————
   View 4 · Atlas — geographic origins
   ———————————————————————————————————————————————— */

let worldPromise = null;
const fetchWorld = () => (worldPromise ??=
  fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
    .then(r => r.json())
    .then(t => topojson.feature(t, t.objects.countries))
    .catch(() => null));

function renderAtlas(f) {
  viewHead(
    "Where each script was born (or standardised). Dot area follows grapheme count. Constructed scripts drift in the Atlantic, homeless by design.",
    [
      LEGEND_LIVING,
      LEGEND_HIST,
      [swDot(`fill="${LEG_C}" fill-opacity="0.25" stroke="${LEG_C}" stroke-width="1.4" stroke-dasharray="2.5 1.8"`), "constructed — dashed"],
      LEGEND_MECH,
    ]);

  const width = stageWidth();
  const height = Math.max(460, Math.min(width * 0.52, window.innerHeight - topbar.offsetHeight - 150));

  const svg = d3.select(stage).append("svg").attr("width", width).attr("height", height);
  const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: "Sphere" });
  const path = d3.geoPath(projection);

  svg.append("path").datum(d3.geoGraticule10())
    .attr("class", "atlas-graticule").attr("d", path);

  const dotsG = svg.append("g");

  const draw = () => {
    const r = s => {
      const base = 3 + 1.75 * Math.log10(Math.max(s.character_count, 10) / 10);
      return s.status === "Constructed" ? Math.max(4.4, base) : base;
    };
    const nodes = f.map(s => {
      // Scripts with no homeland sit at (0,0) in the data — the Gulf of Guinea,
      // right inside the dense West African cluster. Anchor them in open water.
      const homeless = s.geography.region === "Constructed";
      const [px, py] = projection(homeless ? [-28, -14] : [s.geography.longitude, s.geography.latitude]);
      return { s, r: r(s), tx: px, ty: py, x: px, y: py };
    });

    // Nudge overlapping origins apart without leaving their region
    d3.forceSimulation(nodes)
      .force("x", d3.forceX(d => d.tx).strength(0.85))
      .force("y", d3.forceY(d => d.ty).strength(0.85))
      .force("collide", d3.forceCollide(d => d.r + 0.7))
      .stop()
      .tick(120);

    dotsG.selectAll("circle").data(nodes).join("circle")
      .attr("class", "atlas-dot")
      .attr("cx", d => d.x).attr("cy", d => d.y).attr("r", d => d.r)
      .attr("fill", d => (d.s.status === "Historical" ? "transparent" : TYPE_COLORS[d.s.type]))
      .attr("fill-opacity", d => (d.s.status === "Constructed" ? 0.25 : 1))
      .attr("stroke", d => (d.s.status === "Living" ? "rgba(15,14,11,.8)" : TYPE_COLORS[d.s.type]))
      .attr("stroke-width", d => (d.s.status === "Living" ? 0.8 : 1.4))
      .attr("stroke-dasharray", d => (d.s.status === "Constructed" ? "2.5 1.8" : null))
      .on("click", (e, d) => openPanel(d.s.id))
      .on("mousemove", (e, d) => showTip(
        tipHTML(d.s) + `<div class="t-sub">${d.s.geography.region}</div>`, e.clientX, e.clientY))
      .on("mouseleave", hideTip);
  };

  fetchWorld().then(world => {
    if (world && state.view === "atlas") {
      svg.insert("path", "g")
        .datum(world).attr("class", "atlas-land").attr("d", path);
    }
  });
  draw();
}

/* ————————————————————————————————————————————————
   View 5 · Specimens — type-foundry cards
   ———————————————————————————————————————————————— */

function renderSpecimens(f) {
  viewHead(
    "Every script set in its own hand, like a foundry’s specimen book. A dotted circle means Unicode hasn’t reached it yet — or your fonts haven’t.",
    [
      [`<span class="legend-glyph">◌</span>`, "not yet digitally encoded"],
      LEGEND_MECH,
    ]);

  const grid = document.createElement("div");
  grid.className = "specimen-grid";

  const rows = [...f].sort((a, b) => a.name.localeCompare(b.name));
  rows.forEach(s => {
    const card = document.createElement("div");
    card.className = "specimen";
    const lifespan = s.timeline.extinction_date
      ? `${era(s.timeline.invention_date)} – ${era(s.timeline.extinction_date)}`
      : `${era(s.timeline.invention_date)} – now`;

    const sampleCls = ["sample"];
    if (!s.native_example) sampleCls.push("unencoded");
    else {
      if ([...s.native_example].length > 8) sampleCls.push("long");
      if (s.directionality === "TTB") sampleCls.push("vert");
    }

    card.innerHTML = `
      <div class="code-row"><span>${s.id} · ${s.numeric_code}</span><span>${DIR_ARROW[s.directionality]} ${s.directionality}</span></div>
      <div class="${sampleCls.join(" ")}" ${s.directionality === "RTL" ? 'dir="rtl"' : ""}>${s.native_example || "no digital type yet"}</div>
      <h3>${shortName(s)}</h3>
      <div class="meta">
        <span class="dot" style="background:${TYPE_COLORS[s.type]}"></span>
        <span>${s.type} · ${lifespan}</span>
      </div>`;
    card.onclick = () => openPanel(s.id);
    grid.appendChild(card);
  });

  stage.appendChild(grid);
}

/* ————————————————————————————————————————————————
   The Nerd Detail panel
   ———————————————————————————————————————————————— */

function ancestorsOf(s) {
  const chain = [];
  let cur = s;
  const seen = new Set([s.id]);
  while (cur.parent_script && byId.has(cur.parent_script) && !seen.has(cur.parent_script)) {
    cur = byId.get(cur.parent_script);
    seen.add(cur.id);
    chain.unshift(cur);
  }
  return chain;
}

function openPanel(id) {
  const s = byId.get(id);
  if (!s) return;

  const anc = ancestorsOf(s);
  const desc = (childrenOf.get(id) || []).map(cid => byId.get(cid));
  const lifespan = s.timeline.extinction_date
    ? `extinct ${era(s.timeline.extinction_date)}`
    : "still in use";

  const heroCls = ["p-hero"];
  if (!s.native_example) heroCls.push("unencoded");
  else {
    if ([...s.native_example].length > 10) heroCls.push("long");
    if (s.directionality === "TTB") heroCls.push("vert");
  }

  const quirks = isGenericQuirk(s.typography_quirks)
    ? `A ${s.type.toLowerCase()} — <em>${TYPE_DEFS[s.type]}</em> — written ${DIR_LABEL[s.directionality]}, ` +
      `attested from ${era(s.timeline.invention_date)}${s.timeline.extinction_date ? ` until ${era(s.timeline.extinction_date)}` : " to the present day"}. ` +
      `No deeper typographic gossip on file for this one yet.`
    : s.typography_quirks;

  const chainHTML = [...anc, s].map((a, i) =>
    `<a href="#" style="padding-left:${i * 16}px" class="${a.id === s.id ? "self" : ""}" data-goto="${a.id}">${shortName(a)}
      <span style="color:var(--ink-faint);font-size:11px"> ${eraShort(a.timeline.invention_date)}</span></a>`).join("");

  const LANG_PREVIEW = 14;
  let langs = null;
  if (s.languages.length > LANG_PREVIEW) {
    langs =
      `<span class="langs-short">${s.languages.slice(0, LANG_PREVIEW).join(" · ")} · ` +
      `<a href="#" class="langs-toggle" data-langs="more">+${s.languages.length - LANG_PREVIEW} more</a></span>` +
      `<span class="langs-full" hidden>${s.languages.join(" · ")} · ` +
      `<a href="#" class="langs-toggle" data-langs="less">show fewer</a></span>`;
  } else if (s.languages.length) {
    langs = s.languages.join(" · ");
  }

  panelBody.innerHTML = `
    <div class="p-eyebrow">
      <span>${s.id} / ${s.numeric_code}</span>
      <span class="p-status ${s.status}">${s.status}</span>
    </div>
    <h2>${s.name}</h2>

    <div class="${heroCls.join(" ")}" ${s.directionality === "RTL" ? 'dir="rtl"' : ""}>${s.native_example || "not yet encoded in Unicode — no digital type exists"}</div>
    <div class="p-hero-caption">${s.native_example ? "native specimen" : ""}</div>

    <div class="p-badges">
      <span class="p-badge"><span class="dot" style="background:${TYPE_COLORS[s.type]}"></span>${s.type}</span>
      <span class="p-badge">${DIR_ARROW[s.directionality]} ${DIR_LABEL[s.directionality]}</span>
      <span class="p-badge">${s.geography.region}</span>
    </div>

    <div class="p-stats">
      <div class="p-stat"><div class="v">${fmtCount(s.character_count)}</div><div class="k">graphemes encoded</div></div>
      <div class="p-stat"><div class="v">${era(s.timeline.invention_date)}</div><div class="k">first attested</div></div>
      <div class="p-stat"><div class="v">${lifespan}</div><div class="k">status</div></div>
      <div class="p-stat"><div class="v">${s.languages.length || "—"}</div><div class="k">languages recorded</div></div>
    </div>

    <div class="p-section">
      <h4>Evolutionary line</h4>
      ${anc.length ? "" : `<p class="p-quirks" style="margin-bottom:8px">An independent invention — no known ancestor. Writing begins here.</p>`}
      <div class="p-chain">${chainHTML}</div>
      ${desc.length ? `<h4 style="margin-top:16px">Descendants (${desc.length})</h4>
        <div class="p-links">${desc.map(d => `<a href="#" data-goto="${d.id}">${shortName(d)}</a>`).join("")}</div>` : ""}
    </div>

    ${langs ? `<div class="p-section"><h4>Writes</h4><p class="p-langs">${langs}</p></div>` : ""}

    <div class="p-section">
      <h4>Typography quirks</h4>
      <p class="p-quirks">${quirks}</p>
    </div>`;

  panelBody.querySelectorAll("[data-goto]").forEach(a =>
    a.addEventListener("click", e => {
      e.preventDefault();
      openPanel(a.dataset.goto);
    }));

  panelBody.querySelectorAll(".langs-toggle").forEach(a =>
    a.addEventListener("click", e => {
      e.preventDefault();
      const expand = a.dataset.langs === "more";
      panelBody.querySelector(".langs-short").hidden = expand;
      panelBody.querySelector(".langs-full").hidden = !expand;
    }));

  panel.classList.add("open");
  panel.scrollTop = 0;
}

document.getElementById("panel-close").onclick = () => panel.classList.remove("open");
document.addEventListener("keydown", e => {
  if (e.key === "Escape") panel.classList.remove("open");
});

/* ——— Boot ——— */

buildControls();
render();
if (hashScript && byId.has(hashScript)) openPanel(hashScript);

let resizeDeb;
window.addEventListener("resize", () => {
  clearTimeout(resizeDeb);
  resizeDeb = setTimeout(render, 220);
});
