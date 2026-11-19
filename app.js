// ===== EDIT THESE: the 16 buttons (label + points; negative = decreases score) =====
const BUTTONS = [
  {label: "brush teeth & make bed",          points:   5},
  {label: "30 mins exercise",           points:   5},
  {label: "apply sun protection",             points:   2},
  {label: "350 cals under 2,500",       points:   5},
  {label: "30 mins great work",         points:   5},
  {label: "30 mins good work",          points:   2},
  {label: "30 mins reading", note: "(after 7 or on we)", points: 2},
  {label: "brush teeth and apply hair serum",  points:   5},
  {label: "350 cals over 2,500",        points:  -5},
  {label: "food after 8",    note: "(outside social setting)", points:  -5},
  {label: "food after 9",    note: "(outside social setting)", points: -10},
  {label: "food after 9.30", note: "(outside social setting)", points: -15},
  {label: "youtube video",   note: "(before 7 pm)",            points:  -5},
  {label: "youtube video",   note: "(after first or after 9 pm)",     points: -10},
  {label: "youtube video",   note: "(after second or after 9.30 pm)", points: -15},
  {label: "cigarette",       note: "(outside social setting)", points: -10},
];
// ====================================================================================

const KEY = "dailyScore.v1";
const $ = s => document.querySelector(s);
const pad = n => String(n).padStart(2, "0");
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

// state: { scores: {"YYYY-MM-DD": number}, undo: {date, stack:[points]} }
let state = load();
function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.scores) return s; } catch (e) {}
  return { scores: {}, undo: { date: dayKey(), stack: [] } };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

// Each day's score is written to history on every tap, so it is stored at day's end by
// construction. "Today" is simply the entry for the current date (0 if none) -> auto-reset at midnight.
let today = dayKey();
function rollover() {
  const k = dayKey();
  if (k !== today) { today = k; }
  if (state.undo.date !== today) state.undo = { date: today, stack: [] };
  render();
}
const score = () => state.scores[today] || 0;

function press(points) {
  rollover();
  state.scores[today] = score() + points;
  state.undo.stack.push(points);
  save(); render();
  if (navigator.vibrate) navigator.vibrate(10);
}
function undo() {
  rollover();
  const p = state.undo.stack.pop();
  if (p === undefined) return;
  state.scores[today] = score() - p;
  save(); render();
}

function render() {
  const s = score(), el = $("#score");
  el.innerHTML = (s > 0 ? "+ " : s < 0 ? "- " : "") + Math.abs(s) + "<small>pts</small>";
  el.className = s > 0 ? "pos" : s < 0 ? "neg" : "";
  $("#date").textContent = new Date().toLocaleDateString(undefined, {weekday:"long", month:"long", day:"numeric"});
  $("#undo").disabled = !state.undo.stack.length;
  if ($("#tab-graph").classList.contains("active")) drawChart();
}

// ---- buttons
BUTTONS.forEach(b => {
  const el = document.createElement("button");
  el.className = "sc " + (b.points >= 0 ? "p" : "n");
  el.innerHTML = '<span class="lbl"></span><span class="note"></span><b></b>';
  el.querySelector(".lbl").textContent = b.label;
  el.querySelector(".note").textContent = b.note || "";
  el.querySelector("b").textContent = (b.points > 0 ? "+ " : "- ") + Math.abs(b.points) + " pts";
  el.onclick = () => press(b.points);
  $("#buttons").appendChild(el);
});
$("#undo").onclick = undo;

// ---- tabs
document.querySelectorAll("nav button").forEach(b => b.onclick = () => {
  document.querySelectorAll("nav button").forEach(x => x.classList.toggle("active", x === b));
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.id === "tab-" + b.dataset.tab));
  render();
});

// ---- chart
let range = 30;
document.querySelectorAll(".chip").forEach(c => c.onclick = () => {
  range = +c.dataset.range;
  document.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x === c));
  drawChart();
});
function series() {
  let rows = Object.keys(state.scores).sort().map(d => [d, state.scores[d]]);
  if (!rows.some(r => r[0] === today)) rows.push([today, 0]);
  if (range) rows = rows.slice(-range);
  return rows;
}
function drawChart() {
  const cv = $("#chart"), dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const g = cv.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
  const rows = series(), vals = rows.map(r => r[1]);
  const L = 36, R = 12, T = 14, B = 26;
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  if (hi === lo) { hi += 1; lo -= 1; }
  const pw = W - L - R, ph = H - T - B;
  const X = i => L + (rows.length === 1 ? pw / 2 : i * pw / (rows.length - 1));
  const Y = v => T + (hi - v) * ph / (hi - lo);
  g.font = "11px system-ui"; g.fillStyle = "#8f7a66"; g.strokeStyle = "#e6d5ba"; g.lineWidth = 1;
  const step = Math.max(1, Math.ceil((hi - lo) / 5));
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) {
    g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(W - R, Y(v)); g.stroke();
    g.textAlign = "right"; g.fillText(v, L - 6, Y(v) + 4);
  }
  g.strokeStyle = "#8f7a66"; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(W - R, Y(0)); g.stroke();
  g.strokeStyle = "#d97757"; g.lineWidth = 2.5; g.lineJoin = "round"; g.beginPath();
  rows.forEach((r, i) => i ? g.lineTo(X(i), Y(r[1])) : g.moveTo(X(i), Y(r[1]))); g.stroke();
  rows.forEach((r, i) => { g.fillStyle = r[1] >= 0 ? "#4f8a4b" : "#c2452d"; g.beginPath(); g.arc(X(i), Y(r[1]), 3.5, 0, 7); g.fill(); });
  g.fillStyle = "#8f7a66"; g.textAlign = "center";
  [0, rows.length - 1].forEach(i => { if (rows[i]) { g.textAlign = i ? "right" : "left"; g.fillText(rows[i][0].slice(5), X(i), H - 8); } });
  const tot = vals.reduce((a, b) => a + b, 0);
  $("#stats").textContent = `${rows.length} day(s) · total ${tot} · average ${(tot / rows.length).toFixed(1)} · best ${Math.max(...vals)} · worst ${Math.min(...vals)}`;
}
addEventListener("resize", () => $("#tab-graph").classList.contains("active") && drawChart());

// ---- export / share
const csv = () => "date,score\n" + Object.keys(state.scores).sort().map(d => `${d},${state.scores[d]}`).join("\n") + "\n";
const json = () => JSON.stringify(state.scores, null, 2);
const msg = t => { $("#msg").textContent = t; };
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$("#dl-csv").onclick = () => { download("daily-scores.csv", csv(), "text/csv"); msg("CSV downloaded."); };
$("#dl-json").onclick = () => { download("daily-scores.json", json(), "application/json"); msg("JSON downloaded."); };
$("#share").onclick = async () => {
  try {
    const file = new File([csv()], "daily-scores.csv", { type: "text/csv" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: "Daily scores" });
    else if (navigator.share) await navigator.share({ title: "Daily scores", text: csv() });
    else { await navigator.clipboard.writeText(csv()); msg("Sharing isn't supported here; CSV copied to clipboard."); }
  } catch (e) { if (e.name !== "AbortError") msg("Couldn't share: " + e.message); }
};

// ---- lifecycle
document.addEventListener("visibilitychange", () => !document.hidden && rollover());
setInterval(rollover, 30000);
rollover();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
