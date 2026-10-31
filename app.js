'use strict';

/* ---------- Stato e salvataggio ---------- */

const KEY = 'scheda-palestra-v1';
const $app = document.getElementById('app');
let SCHEDA = null;
let AIUTO = {};
let D = load();
const UI = { helpTab: 'coach', problem: 'fastidio', helpDay: null, histDay: null, chartEx: null, sw: null };

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && d.v === 1) return d;
  } catch (e) { /* dati assenti o corrotti */ }
  return { v: 1, sessions: [], current: null, notes: {}, day: null };
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(D)); }
  catch (e) { toast('Impossibile salvare i dati'); }
}

/* ---------- Utilità ---------- */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (v) => (v == null || v === '' || isNaN(v)) ? '—' : String(Math.round(v * 100) / 100).replace('.', ',');
const roundTo = (v, step) => Math.round(v / step) * step;
const firstNum = (r) => { const m = /\d+/.exec(r || ''); return m ? +m[0] : null; };
const mmss = (sec) => { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
const dateIt = (t, opts) => new Date(t).toLocaleDateString('it-IT', opts);

const dayById = (id) => SCHEDA.days.find((d) => d.id === id);
function exById(id) {
  for (const d of SCHEDA.days) { const e = d.exercises.find((x) => x.id === id); if (e) return e; }
  return null;
}
function allExercises() {
  const seen = new Map();
  SCHEDA.days.forEach((d) => d.exercises.forEach((e) => { if (!seen.has(e.id)) seen.set(e.id, e); }));
  return [...seen.values()];
}
function nextDayId() {
  const last = D.sessions[D.sessions.length - 1];
  if (!last) return SCHEDA.days[0].id;
  const i = SCHEDA.days.findIndex((d) => d.id === last.day);
  return SCHEDA.days[(i + 1) % SCHEDA.days.length].id;
}
function lastSessionWith(exId) {
  for (let i = D.sessions.length - 1; i >= 0; i--) {
    const s = D.sessions[i];
    if (s.sets[exId] && s.sets[exId].length) return s;
  }
  return null;
}
const isTrial = () => !SCHEDA.days.every((d) => D.sessions.some((s) => s.day === d.id));
const topKg = (rows) => { const ks = (rows || []).map((r) => r.kg).filter((k) => k != null); return ks.length ? Math.max(...ks) : null; };

function summarize(ex, rows, timer) {
  if (!rows || !rows.length) return '';
  if (ex.total) {
    const reps = rows.reduce((a, r) => a + (r.reps || 0), 0);
    const t = timer && timer.end ? ' in ' + mmss((timer.end - timer.start) / 1000) : '';
    return reps + ' rip con ' + fmt(rows[0].kg) + ' kg' + t;
  }
  return rows.map((r) => {
    if (ex.unit === 'sec') return r.sec + '″';
    if (ex.unit === 'rip') return r.reps + ' rip';
    return fmt(r.kg) + '×' + r.reps;
  }).join(' · ');
}

const ICON = {
  check: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1115" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  tick: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="color:var(--accent)"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  next: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>',
  help: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/></svg>',
  play: '<svg width="20" height="20" viewBox="0 0 24 24" fill="#0F1115" aria-hidden="true"><path d="M7 4.5v15l12-7.5z"/></svg>',
  chat: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4DA3FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;margin-top:1px"><path d="M4 5h16v11H8l-4 4z"/></svg>',
  warn: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF8A3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17h.01"/></svg>',
  pen: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4DA3FF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none;margin-top:1px"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  video: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/></svg>',
  chev: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9AA0A8" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'
};

function tagHtml(ex) {
  const m = SCHEDA.methods[ex.method];
  return m && m.label ? `<span class="tag tag-${esc(ex.method)}">${esc(m.label)}</span>` : '';
}
function seg(items, current, act, cls = '') {
  return `<div class="seg ${cls}" role="tablist">${items.map((it) =>
    `<button type="button" role="tab" aria-selected="${it.id === current}" data-act="${act}" data-id="${esc(it.id)}">${esc(it.label)}</button>`).join('')}</div>`;
}
const dayItems = () => SCHEDA.days.map((d) => ({ id: d.id, label: d.num + ' · ' + (d.name.length > 5 ? d.name.slice(0, 4) : d.name) }));

/* ---------- Sessione in corso ---------- */

function newSession(dayId) {
  return { day: dayId, start: Date.now(), idx: 0, warm: false, sets: {}, timers: {}, done: {}, draft: {}, rest: null };
}
function ensureCurrent(dayId) {
  const cur = D.current;
  if (cur && cur.day === dayId) return cur;
  if (cur && Object.keys(cur.sets).length) {
    const old = dayById(cur.day);
    if (!confirm(`Hai un allenamento ${old.name} in corso. Vuoi abbandonarlo e iniziare ${dayById(dayId).name}?`)) return null;
  }
  D.current = newSession(dayId);
  save();
  return D.current;
}

function draftFor(ex, cur) {
  const logged = cur.sets[ex.id] || [];
  const i = logged.length;
  const dr = cur.draft[ex.id];
  if (dr && dr.row === i) return dr;

  const last = lastSessionWith(ex.id);
  const lastRows = last ? last.sets[ex.id] : [];
  const tpl = ex.sets ? ex.sets[i] : null;
  const lastRow = ex.total ? lastRows[0] : lastRows[i];
  const prevSame = tpl ? [...logged].reverse().find((r) => r.k === tpl.k) : logged[logged.length - 1];
  const prevAny = logged[logged.length - 1];

  let kg = null;
  if (tpl && tpl.auto && prevAny && prevAny.kg) kg = roundTo(prevAny.kg * tpl.auto, ex.step || 2.5);
  else if (lastRow && lastRow.kg != null) kg = lastRow.kg;
  else if (prevSame && prevSame.kg != null) kg = prevSame.kg;
  else if (ex.method !== 'superset' && prevAny && prevAny.kg != null) kg = prevAny.kg;

  let reps;
  if (tpl && tpl.r === 'max/2' && logged[0] && logged[0].reps) reps = Math.ceil(logged[0].reps / 2);
  else if (lastRow && lastRow.reps != null) reps = lastRow.reps;
  else reps = firstNum(tpl ? tpl.r : null) ?? (prevSame && prevSame.reps) ?? 10;

  const sec = (lastRow && lastRow.sec) || (prevSame && prevSame.sec) || 30;
  cur.draft[ex.id] = { row: i, kg, reps, sec };
  return cur.draft[ex.id];
}

function startRest(sec) {
  if (!D.current || !sec) return;
  D.current.rest = { end: Date.now() + sec * 1000, fired: false };
  save();
  tickRest();
}

function finishSession() {
  const cur = D.current;
  if (!cur) return;
  const hasData = Object.values(cur.sets).some((r) => r.length);
  if (!hasData) {
    if (!confirm('Non hai registrato nessuna serie. Chiudere senza salvare?')) return;
    D.current = null; D.day = null; save(); location.hash = '#/oggi'; return;
  }
  if (!confirm('Terminare e salvare l\'allenamento?')) return;
  D.sessions.push({ id: Date.now(), day: cur.day, start: cur.start, end: Date.now(), warm: cur.warm, sets: cur.sets, timers: cur.timers });
  D.current = null;
  D.day = null;
  save();
  releaseWakeLock();
  toast('Allenamento salvato');
  location.hash = '#/storico';
}

/* ---------- Schermata: oggi ---------- */

function viewOggi() {
  const dayId = D.day || (D.current && D.current.day) || nextDayId();
  const day = dayById(dayId);
  const cur = D.current && D.current.day === dayId ? D.current : null;
  const warmOn = !!(cur && cur.warm);
  const doneOf = (ex) => {
    if (!cur) return false;
    if (cur.done[ex.id]) return true;
    const rows = cur.sets[ex.id] || [];
    if (ex.total) return rows.reduce((a, r) => a + (r.reps || 0), 0) >= ex.total;
    return ex.sets && rows.length >= ex.sets.length;
  };
  const doneCount = day.exercises.filter(doneOf).length;

  return `<div class="screen">
    <header class="head">
      <span class="eyebrow">${esc(dateIt(Date.now(), { weekday: 'long', day: 'numeric', month: 'long' }))}</span>
      <h1 class="h1">Giorno ${day.num} · ${esc(day.name)}</h1>
      <span class="sub">${esc(day.sub)}</span>
    </header>
    ${seg(dayItems(), dayId, 'pick-day')}
    ${isTrial() ? `<div class="outline blue">${ICON.pen}<div class="stack" style="gap:3px">
        <strong style="font-size:15px">Settimana di prova</strong>
        <span class="small" style="color:var(--text-2)">Trova i carichi giusti e annotali: dalla volta successiva l'app te li ripropone.</span>
      </div></div>` : ''}
    <section class="card">
      <div class="row between">
        <span class="h2">Riscaldamento · sempre</span>
        <button type="button" class="check" aria-pressed="${warmOn}" aria-label="Riscaldamento fatto" data-act="toggle-warm" data-day="${dayId}">${ICON.check}</button>
      </div>
      ${SCHEDA.warmup.map((w) => `<div class="row" style="align-items:flex-start">
        <span class="num" style="flex:none;width:40px;font-size:22px;color:var(--accent)">${esc(w.badge)}</span>
        <div class="stack" style="gap:4px">
          <span style="font-size:14px;line-height:1.45;color:#E2E5E9">${esc(w.text)}</span>
          ${w.mobility ? `<a href="#/mobilita" class="btn-secondary" style="min-height:44px;margin-top:4px">Come si fanno + timer</a>` : ''}
          ${w.video ? `<a href="${esc(w.video)}" target="_blank" rel="noopener" style="font-size:14px;font-weight:600">Guarda il video →</a>` : ''}
        </div>
      </div>`).join('')}
    </section>
    <section class="stack">
      <div class="row between"><h2 class="h2">Esercizi</h2><span class="small">${doneCount} di ${day.exercises.length} fatti</span></div>
      ${day.exercises.map((ex, i) => {
        const done = doneOf(ex);
        return `<div class="ex ${done ? 'done' : ''}">
          <button type="button" class="check" aria-pressed="${done}" aria-label="Segna ${esc(ex.name)} come fatto" data-act="toggle-done" data-day="${dayId}" data-id="${esc(ex.id)}">${ICON.check}</button>
          <button type="button" class="ex-body" data-act="open-ex" data-day="${dayId}" data-i="${i}">
            <span class="ex-name">${esc(ex.name)}</span>
            <span class="ex-scheme">${esc(ex.scheme)}</span>
            <span class="ex-meta">${tagHtml(ex)}<span>${esc(ex.equip)}</span></span>
          </button>
          <a class="icon-btn" href="#/aiuto/${esc(ex.id)}" aria-label="Aiuto su ${esc(ex.name)}" style="width:36px;height:36px;color:var(--muted)">${ICON.help}</a>
        </div>`;
      }).join('')}
    </section>
    <button type="button" class="btn-primary" data-act="start" data-day="${dayId}">${ICON.play}${cur ? 'Riprendi allenamento' : 'Inizia allenamento'}</button>
  </div>`;
}

/* ---------- Schermata: mobilità ---------- */

function circState() {
  const M = SCHEDA.mobility;
  const c = UI.circ;
  const n = M.exercises.length;
  const total = M.work * n * M.rounds;
  if (!c) return { started: false, total };
  const el = c.acc + (c.running ? Date.now() - c.start : 0);
  const sec = el / 1000;
  if (sec >= total) return { started: true, finished: true, total };
  const idx = Math.floor(sec / M.work);
  return { started: true, running: c.running, idx, ex: idx % n, round: Math.floor(idx / n) + 1, left: M.work - (sec % M.work), total };
}

function viewMobilita() {
  const M = SCHEDA.mobility;
  const st = circState();
  const video = (SCHEDA.warmup.find((w) => w.mobility) || {}).video;
  let timer;
  if (!st.started) {
    timer = `<section class="card" style="align-items:center;text-align:center">
      <span class="num" style="font-size:56px">${mmss(st.total)}</span>
      <span class="small">${M.exercises.length} esercizi × ${M.work}″ × ${M.rounds} giri, senza pause. Suona a ogni cambio.</span>
      <button type="button" class="btn-primary" data-act="circ-start">${ICON.play}Avvia circuito</button>
    </section>`;
  } else if (st.finished) {
    timer = `<section class="card" style="align-items:center;text-align:center">
      <span class="num" style="font-size:40px;color:var(--accent)">Circuito completato</span>
      <span class="small">Ora puoi passare agli esercizi della scheda.</span>
      <a href="#/oggi" class="btn-primary">Vai alla scheda</a>
      <button type="button" class="link" data-act="circ-reset">Ricomincia</button>
    </section>`;
  } else {
    const cur = M.exercises[st.ex];
    const next = M.exercises[(st.ex + 1) % M.exercises.length];
    const isLast = st.idx === M.exercises.length * M.rounds - 1;
    timer = `<section class="card" style="align-items:center;text-align:center;border:2px solid var(--accent)">
      <span class="eyebrow">Giro ${st.round} di ${M.rounds} · esercizio ${st.ex + 1} di ${M.exercises.length}</span>
      <span style="font-size:20px;font-weight:700">${esc(cur.name)}</span>
      <span class="num" id="circ-time" style="font-size:72px;color:var(--accent)">${Math.ceil(st.left)}</span>
      <img src="${esc(cur.img)}" alt="" style="width:100%;max-width:340px;border-radius:14px">
      <span class="small">${isLast ? 'Ultimo esercizio!' : 'Poi: ' + esc(next.name)}</span>
      <div class="grid2" style="width:100%">
        <button type="button" class="btn-secondary" data-act="circ-pause">${st.running ? 'Pausa' : 'Riprendi'}</button>
        <button type="button" class="btn-secondary" data-act="circ-reset">Ricomincia</button>
      </div>
    </section>`;
  }

  return `<div class="screen">
    <header class="row">
      <a class="icon-btn" href="#/oggi" aria-label="Torna alla scheda">${ICON.back}</a>
      <div class="head" style="gap:2px">
        <h1 class="h1 sm">Mobilità</h1>
        <span class="small">Riscaldamento · ${M.work}″ per esercizio × ${M.rounds} giri NO STOP</span>
      </div>
    </header>
    ${timer}
    <section class="stack">
      <h2 class="h2">Gli esercizi</h2>
      ${M.exercises.map((e, n) => `<article class="card" ${st.started && !st.finished && st.ex === n ? 'style="border:1px solid var(--accent)"' : ''}>
        <div class="row"><span class="num" style="font-size:26px;color:var(--accent);width:24px">${n + 1}</span><span style="font-size:17px;font-weight:700">${esc(e.name)}</span></div>
        <img src="${esc(e.img)}" alt="" style="width:100%;border-radius:14px">
        <ol class="steps" style="gap:6px">${e.steps.map((s, k) => `<li style="padding:10px 12px;background:#15181D"><span class="n">${k + 1}</span><span style="font-size:14px">${esc(s)}</span></li>`).join('')}</ol>
      </article>`).join('')}
    </section>
    ${video ? `<a class="help-link" href="${esc(video)}" target="_blank" rel="noopener">${ICON.video}<span>Video originale del coach</span>${ICON.chev}</a>` : ''}
  </div>`;
}

/* ---------- Schermata: allenamento ---------- */

function viewAllena() {
  const cur = D.current;
  if (!cur) { location.hash = '#/oggi'; return ''; }
  const day = dayById(cur.day);
  const ex = day.exercises[cur.idx];
  const logged = cur.sets[ex.id] || [];
  const last = lastSessionWith(ex.id);
  const isLastEx = cur.idx === day.exercises.length - 1;
  const method = SCHEDA.methods[ex.method];
  const nextEx = day.exercises[cur.idx + 1];

  const lastLine = last
    ? `Ultima volta (${esc(dateIt(last.start, { day: 'numeric', month: 'short' }))}): ${esc(summarize(ex, last.sets[ex.id], last.timers && last.timers[ex.id]))}`
    : (ex.unit === 'kg'
      ? 'Prima volta: parti leggero e sali di carico serie dopo serie finché trovi quello giusto. Lo ricorderò per la prossima volta.'
      : 'Prima volta: registra ripetizioni o secondi, saranno il tuo punto di partenza.');

  let body;
  let complete;
  if (ex.total) {
    const sum = logged.reduce((a, r) => a + (r.reps || 0), 0);
    complete = sum >= ex.total;
    const tm = cur.timers[ex.id];
    const dr = draftFor(ex, cur);
    body = `
      <section class="card" style="align-items:center">
        <div class="big-counter"><span class="num">${sum}</span><span class="num" style="font-size:32px;color:var(--muted)">/ ${ex.total}</span></div>
        <div class="chrono" id="chrono">${tm ? mmss(((tm.end || Date.now()) - tm.start) / 1000) : '0:00'}</div>
        <span class="small">${logged.length ? 'Blocchi: ' + logged.map((r) => r.reps).join(' + ') : 'Dividi le ripetizioni come vuoi, nel minor tempo possibile.'}</span>
      </section>
      ${complete ? `<div class="hint"><strong style="color:var(--accent)">Fatto!</strong> ${ex.total} ripetizioni in ${mmss((tm.end - tm.start) / 1000)}.</div>` : `
      ${!tm ? `<button type="button" class="btn-secondary" data-act="chrono-start">Avvia cronometro</button>` : ''}
      <section class="grid2">
        ${stepperKg(ex, dr)}
        ${stepperReps(dr, 'Rip del blocco')}
      </section>
      <button type="button" class="btn-primary" data-act="log-block">Aggiungi blocco</button>`}
      ${logged.length ? `<button type="button" class="link" data-act="undo">Annulla ultimo blocco</button>` : ''}`;
  } else {
    const i = logged.length;
    complete = i >= ex.sets.length;
    const dr = complete ? null : draftFor(ex, cur);
    const tplCur = ex.sets[i];
    const rows = ex.sets.map((tpl, n) => {
      const l = logged[n];
      const isCur = n === i;
      const kCls = /back/i.test(tpl.k) ? 'blue' : /drop/i.test(tpl.k) ? 'orange' : '';
      let val;
      if (l) val = summarize(ex, [l]);
      else if (isCur) val = ex.unit === 'sec' ? dr.sec + '″' : ex.unit === 'rip' ? dr.reps + ' rip' : fmt(dr.kg) + ' kg × ' + dr.reps;
      else val = tpl.r === 'max' ? 'max' : tpl.r === 'max/2' ? 'metà del max' : tpl.r + ' rip';
      const status = l ? 'Fatta' : isCur ? 'In corso' : (/back|drop/i.test(tpl.k) ? 'a cedimento' : (ex.method === 'backoff' || ex.method === 'backoff8') ? 'no cedimento' : '');
      return `<div class="set ${l ? '' : isCur ? 'current' : 'todo'}">
        <span class="set-n">${n + 1}</span><span class="set-k ${kCls}">${esc(tpl.k)}</span>
        <span class="set-v">${esc(val)}</span><span class="set-s">${status}</span></div>`;
    }).join('');

    let hint = '';
    if (!complete && tplCur.auto && logged.length) {
      const prevKg = logged[logged.length - 1].kg;
      const pct = prevKg && dr.kg != null ? Math.round((1 - dr.kg / prevKg) * 100) : Math.round((1 - tplCur.auto) * 100);
      hint = `<div class="hint"><strong style="color:${tplCur.auto < 0.81 ? 'var(--orange)' : 'var(--blue)'}">${tplCur.auto < 0.81 ? 'Drop set' : 'Back-off'}:</strong> carico ridotto del ${pct}% → ${fmt(dr.kg)} kg. Ora fino a cedimento.</div>`;
    } else if (!complete && ex.method === 'superset') {
      hint = `<div class="hint">Giro ${Math.floor(i / 2) + 1} di ${ex.sets.length / 2}: <strong>${esc(tplCur.k)}</strong>${tplCur.rest ? ', poi recupero' : ', poi subito l\'altro esercizio'}.</div>`;
    }

    let inputs = '';
    if (!complete) {
      if (ex.unit === 'kg') inputs = `<section class="grid2">${stepperKg(ex, dr)}${stepperReps(dr, 'Ripetizioni')}</section>`;
      else if (ex.unit === 'rip') inputs = `<section class="grid2" style="grid-template-columns:minmax(0,1fr)">${stepperReps(dr, 'Ripetizioni')}</section>`;
      else inputs = `<section class="stack">${stepperSec(dr)}
        <button type="button" class="btn-secondary" data-act="sw">${UI.sw ? 'Ferma cronometro' : 'Avvia cronometro'}</button>
        ${UI.sw ? `<div class="chrono" id="sw">${mmss((Date.now() - UI.sw) / 1000)}</div>` : ''}</section>`;
    }
    body = `<section class="stack" style="gap:8px" aria-label="Serie">${rows}</section>${hint}${inputs}
      ${!complete ? `<button type="button" class="btn-primary" data-act="log-set">Serie ${i + 1} fatta</button>` : ''}
      ${logged.length ? `<button type="button" class="link" data-act="undo">Annulla ultima serie</button>` : ''}`;
  }

  const cta = complete
    ? (isLastEx
      ? `<button type="button" class="btn-primary" data-act="finish">Termina allenamento</button>`
      : `<button type="button" class="btn-primary" data-act="go" data-i="${cur.idx + 1}">Prossimo: ${esc(nextEx.name)} →</button>`)
    : '';

  return `<div class="screen">
    <header class="row between">
      <a class="icon-btn" href="#/oggi" aria-label="Torna alla scheda">${ICON.back}</a>
      <span class="eyebrow">${esc(day.name)} · ${cur.idx + 1} di ${day.exercises.length}</span>
      <a class="icon-btn" href="#/aiuto/${esc(ex.id)}" aria-label="Aiuto su questo esercizio">${ICON.help}</a>
    </header>
    <div class="head" style="gap:6px">
      <h1 class="h1">${esc(ex.name)}</h1>
      <span class="sub">${esc(ex.equip)} · ${esc(ex.scheme)}</span>
      <span class="small">${lastLine}</span>
    </div>
    ${method && ex.method !== 'normale' ? `<div class="note">${ICON.chat}<span><strong>Coach:</strong> ${esc(ex.note || method.text)}</span></div>` : ex.note ? `<div class="note">${ICON.chat}<span><strong>Coach:</strong> ${esc(ex.note)}</span></div>` : ''}
    ${ex.video ? `<a class="help-link" href="${esc(ex.video)}" target="_blank" rel="noopener">${ICON.video}<span>Video del coach</span>${ICON.chev}</a>` : ''}
    ${body}
    ${cta}
    <div class="row" style="gap:10px">
      <button type="button" class="btn-secondary" data-act="go" data-i="${cur.idx - 1}" ${cur.idx === 0 ? 'disabled' : ''} aria-label="Esercizio precedente">${ICON.back} Prec.</button>
      <button type="button" class="btn-secondary" data-act="go" data-i="${cur.idx + 1}" ${isLastEx ? 'disabled' : ''} aria-label="Esercizio successivo">Succ. ${ICON.next}</button>
    </div>
    <a class="help-link" href="#/aiuto/${esc(ex.id)}" data-problem="1">${ICON.warn}<span>Qualcosa non va? Fastidio, macchina occupata…</span>${ICON.chev}</a>
    ${!isLastEx || !complete ? `<button type="button" class="btn-secondary btn-danger" data-act="finish">Termina allenamento</button>` : ''}
  </div>`;
}

function stepperKg(ex, dr) {
  return `<div class="stepper">
    <label for="in-kg">Peso (kg)</label>
    <input id="in-kg" type="text" inputmode="decimal" placeholder="—" value="${dr.kg == null ? '' : fmt(dr.kg)}" autocomplete="off">
    <div class="btns">
      <button type="button" data-act="kg" data-d="-1" aria-label="Diminuisci peso">−</button>
      <button type="button" data-act="kg" data-d="1" aria-label="Aumenta peso">+</button>
    </div>
  </div>`;
}
function stepperReps(dr, label) {
  return `<div class="stepper">
    <label for="in-reps">${esc(label)}</label>
    <input id="in-reps" type="text" inputmode="numeric" value="${dr.reps ?? ''}" autocomplete="off">
    <div class="btns">
      <button type="button" data-act="reps" data-d="-1" aria-label="Diminuisci ripetizioni">−</button>
      <button type="button" data-act="reps" data-d="1" aria-label="Aumenta ripetizioni">+</button>
    </div>
  </div>`;
}
function stepperSec(dr) {
  return `<div class="stepper">
    <label for="in-sec">Secondi</label>
    <input id="in-sec" type="text" inputmode="numeric" value="${dr.sec}" autocomplete="off">
    <div class="btns">
      <button type="button" data-act="sec" data-d="-5" aria-label="Meno 5 secondi">−5</button>
      <button type="button" data-act="sec" data-d="5" aria-label="Più 5 secondi">+5</button>
    </div>
  </div>`;
}

/* ---------- Schermata: storico ---------- */

function viewStorico() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)).getTime();
  const weekSessions = D.sessions.filter((s) => s.start >= monday);
  let nextMarked = false;
  const week = SCHEDA.days.map((d) => {
    const done = weekSessions.some((s) => s.day === d.id);
    let cls = done ? 'done' : '';
    if (!done && !nextMarked) { cls = 'next'; nextMarked = true; }
    return `<div class="week-card ${cls}"><span class="num" style="font-size:24px">${esc(d.name.length > 5 ? d.name.slice(0, 4) : d.name)}</span>
      <span class="small">${done ? 'Fatto' : cls === 'next' ? 'Prossimo' : 'Da fare'}</span></div>`;
  }).join('');

  // Grafico
  const kgEx = allExercises().filter((e) => e.unit === 'kg' && D.sessions.some((s) => topKg(s.sets[e.id]) != null));
  if (!UI.chartEx || !kgEx.find((e) => e.id === UI.chartEx)) {
    UI.chartEx = kgEx.length ? kgEx.reduce((a, e) => (count(e.id) > count(a.id) ? e : a), kgEx[0]).id : null;
  }
  function count(id) { return D.sessions.filter((s) => topKg(s.sets[id]) != null).length; }
  let chart;
  if (!UI.chartEx) {
    chart = `<section class="card empty-chart">
      <div class="ghost" aria-hidden="true"><div style="height:24px"></div><div style="height:38px"></div><div style="height:52px"></div><div style="height:64px"></div></div>
      <strong style="font-size:16px">I grafici arrivano dopo i primi allenamenti</strong>
      <span class="small" style="max-width:280px">Per ogni esercizio vedrai come salgono i carichi rispetto alla settimana di prova.</span>
    </section>`;
  } else {
    const ex = exById(UI.chartEx);
    const pts = D.sessions.filter((s) => topKg(s.sets[ex.id]) != null).slice(-10).map((s) => ({ t: s.start, kg: topKg(s.sets[ex.id]) }));
    const max = Math.max(...pts.map((p) => p.kg));
    const min = Math.min(...pts.map((p) => p.kg)) * 0.8;
    const diff = pts[pts.length - 1].kg - pts[0].kg;
    chart = `<section class="card">
      <div class="chips scroll">${kgEx.map((e) => `<button type="button" class="chip" aria-pressed="${e.id === ex.id}" data-act="chart-ex" data-id="${esc(e.id)}">${esc(e.name)}</button>`).join('')}</div>
      <div class="row between" style="align-items:baseline">
        <div class="row" style="gap:6px;align-items:baseline"><span class="num" style="font-size:40px">${fmt(pts[pts.length - 1].kg)}</span><span class="small">kg · carico massimo</span></div>
        ${pts.length > 1 ? `<span style="font-size:14px;font-weight:600;color:${diff >= 0 ? 'var(--accent)' : 'var(--orange)'}">${diff >= 0 ? '+' : ''}${fmt(diff)} kg</span>` : ''}
      </div>
      ${pts.length < 2 ? `<span class="small">Il grafico compare dalla seconda volta che fai questo esercizio.</span>` : `
      <div class="chart" role="img" aria-label="${esc(ex.name)}: da ${fmt(pts[0].kg)} a ${fmt(pts[pts.length - 1].kg)} kg">
        ${pts.map((p, n) => {
          const h = max === min ? 80 : Math.round(16 + (p.kg - min) / (max - min) * 90);
          const lastP = n === pts.length - 1;
          return `<div class="col"><span class="val">${lastP ? fmt(p.kg) : ''}</span><div class="bar ${lastP ? 'last' : ''}" style="height:${h}px"></div><span class="lbl">${esc(dateIt(p.t, { day: 'numeric', month: 'numeric' }))}</span></div>`;
        }).join('')}
      </div>`}
    </section>`;
  }

  // Carichi per giorno
  const hd = UI.histDay || (D.current && D.current.day) || nextDayId();
  const loads = dayById(hd).exercises.map((ex) => {
    const s = lastSessionWith(ex.id);
    let pill;
    if (!s) pill = `<span class="pill empty">${ex.unit === 'kg' ? 'kg da registrare' : ex.unit === 'sec' ? 'secondi da registrare' : 'rip da registrare'}</span>`;
    else {
      const rows = s.sets[ex.id];
      let v;
      if (ex.unit === 'kg') v = fmt(topKg(rows)) + ' kg';
      else if (ex.unit === 'sec') v = Math.max(...rows.map((r) => r.sec || 0)) + '″';
      else v = Math.max(...rows.map((r) => r.reps || 0)) + ' rip';
      pill = `<span class="pill val">${v}</span>`;
    }
    return `<div class="load"><span class="name">${esc(ex.name)}</span>${pill}</div>`;
  }).join('');

  // Sessioni
  const prevMax = {};
  const records = new Map();
  D.sessions.forEach((s) => {
    let rec = false;
    Object.keys(s.sets).forEach((id) => {
      const k = topKg(s.sets[id]);
      if (k == null) return;
      if (prevMax[id] != null && k > prevMax[id]) rec = true;
      prevMax[id] = Math.max(prevMax[id] ?? -Infinity, k);
    });
    records.set(s.id, rec);
  });
  const sessions = [...D.sessions].reverse().map((s) => {
    const d = dayById(s.day) || { num: '?', name: s.day, exercises: [] };
    const mins = Math.round((s.end - s.start) / 60000);
    const lines = Object.keys(s.sets).filter((id) => s.sets[id].length).map((id) => {
      const ex = exById(id) || { name: id, unit: 'kg' };
      return `<div class="session-line"><strong>${esc(ex.name)}:</strong> ${esc(summarize(ex, s.sets[id], s.timers && s.timers[id]))}</div>`;
    }).join('');
    return `<details class="session">
      <summary>
        <div class="day-badge">${d.num}</div>
        <div class="stack" style="gap:3px;flex:1">
          <span style="font-size:15px;font-weight:600">${esc(dateIt(s.start, { weekday: 'short', day: 'numeric', month: 'long' }))} · ${esc(d.name)}</span>
          <span class="small">${Object.keys(s.sets).length} esercizi · ${mins} min</span>
        </div>
        ${records.get(s.id) ? '<span class="pill rec">Record</span>' : ''}
      </summary>
      <div class="session-body">${lines}
        <button type="button" class="link" style="color:#FF8F8F" data-act="del-session" data-id="${s.id}">Elimina allenamento</button>
      </div>
    </details>`;
  }).join('');

  return `<div class="screen">
    <header class="head">
      <span class="eyebrow">${isTrial() ? 'Settimana di prova' : 'I tuoi progressi'}</span>
      <h1 class="h1">Storico</h1>
    </header>
    <section class="stack"><h2 class="h2">Questa settimana</h2><div class="grid3">${week}</div></section>
    ${chart}
    <section class="stack">
      <h2 class="h2">${isTrial() ? 'Carichi di partenza' : 'Ultimi carichi'}</h2>
      ${seg(dayItems(), hd, 'hist-day')}
      ${loads}
    </section>
    <section class="stack">
      <h2 class="h2">Allenamenti</h2>
      ${sessions || '<p class="small">Ancora nessun allenamento salvato.</p>'}
    </section>
    <section class="stack">
      <h2 class="h2">Backup</h2>
      <span class="small">I dati restano solo su questo telefono. Esporta un backup ogni tanto (es. su File o iCloud Drive).</span>
      <div class="grid2">
        <button type="button" class="btn-secondary" data-act="export">Esporta</button>
        <button type="button" class="btn-secondary" data-act="import">Importa</button>
      </div>
    </section>
  </div>`;
}

/* ---------- Schermata: aiuto ---------- */

function viewAiutoList() {
  const hd = UI.helpDay || (D.current && D.current.day) || nextDayId();
  return `<div class="screen">
    <header class="head">
      <span class="eyebrow">Tecnica e problemi</span>
      <h1 class="h1">Aiuto</h1>
      <span class="sub">Scegli un esercizio</span>
    </header>
    ${seg(dayItems(), hd, 'help-day')}
    <section class="stack">
      ${dayById(hd).exercises.map((ex) => `<a class="help-link" href="#/aiuto/${esc(ex.id)}">
        <div class="stack" style="gap:3px;flex:1"><span style="font-size:15px;font-weight:600">${esc(ex.name)}</span><span class="small">${esc(ex.equip)}</span></div>${ICON.chev}</a>`).join('')}
    </section>
  </div>`;
}

function viewAiuto(id) {
  const ex = exById(id);
  if (!ex) return viewAiutoList();
  const h = AIUTO[id] || { muscles: '', setup: [], errors: [], joint: { label: 'Fastidio', tips: [] }, cue: [], alt: [] };
  const method = SCHEDA.methods[ex.method] || SCHEDA.methods.normale;
  const tabs = [{ id: 'coach', label: 'Coach' }, { id: 'setup', label: 'Regola' }, { id: 'errors', label: 'Errori' }, { id: 'help', label: 'Aiuto' }];
  const tip = (t) => `<div class="tip">${ICON.tick}<span>${esc(t)}</span></div>`;

  const isBO = ex.method === 'backoff' || ex.method === 'backoff8';
  const methodTips = {
    backoff: ['Le serie pesanti sono impegnative ma ti fermi 1–2 rip prima del cedimento.', 'Poi togli il 15–20%: l\'app ti propone già il carico (−18%).', 'Le serie di back-off vanno fino al cedimento.'],
    drop: ['Fai la terza serie quasi a cedimento.', 'Subito, senza pausa, riduci il carico del 20% (l\'app lo calcola).', 'Continua fino a non riuscire più: quella è la serie "max rip".'],
    totali: ['Non devi farle tutte di fila: dividile in blocchi.', 'Avvia il cronometro e aggiungi ogni blocco man mano.', 'Obiettivo: arrivare al totale nel minor tempo possibile. La prossima volta prova a battere il tempo.'],
    superset: ['Leg curl e subito dopo stacchi rumeni, senza pausa.', 'Recupera solo dopo gli stacchi, poi ricomincia il giro.', 'Prepara i manubri vicino alla macchina prima di iniziare.'],
    max: ['Fai più ripetizioni (o secondi) possibili con tecnica pulita.', 'Rispetta i 2″ di tenuta dove richiesti.', 'Registra il numero: è il tuo progresso.'],
    maxhalf: ['Prima serie: più ripetizioni possibili.', 'Poi 3 serie della metà di quel numero (l\'app lo propone).', '2″ di tenuta in alto su ogni rip.']
  };
  const mt = methodTips[isBO ? 'backoff' : ex.method] || ['Arriva vicino al cedimento mantenendo la tecnica.', 'Quando completi tutte le ripetizioni con margine, aumenta il carico la volta dopo.'];

  const heavy = {
    backoff: ['Sulle pesanti scendi di 5 kg finché fai 6 rip pulite.', 'Il back-off deve farti arrivare a cedimento tra 12 e 15: se ne fai più di 15, togli meno peso.'],
    drop: ['Scendi di una piastra e fai tutte le 12–15 rip.', 'Se completi tutto con margine per 2 volte di fila, risali.'],
    totali: ['Usa un carico con cui faresti 10–12 rip consecutive a cedimento.', 'Se ti servono più di 6–7 blocchi, il carico è troppo alto.']
  }[isBO ? 'backoff' : ex.method] || ['Riduci il carico finché la tecnica resta pulita.', 'Meglio una ripetizione in meno che una fatta male.'];

  const problems = {
    fastidio: { label: h.joint.label, title: 'Prova a sistemare così', tips: h.joint.tips },
    occupata: { label: 'Macchina occupata', title: 'Alternative equivalenti', tips: h.alt },
    muscolo: { label: 'Non sento il muscolo', title: 'Più controllo, meno carico', tips: [...h.cue, 'Rallenta: 2″ in salita, 3″ in discesa.'] },
    metodo: { label: 'Non capisco il metodo', title: method.label || 'Come funziona', tips: mt },
    peso: { label: 'Peso troppo pesante', title: 'Scala il carico', tips: heavy }
  };
  if (!problems[UI.problem]) UI.problem = 'fastidio';
  const p = problems[UI.problem];

  let content;
  if (UI.helpTab === 'coach') {
    content = `<section class="stack">
      <div class="card tight" style="gap:8px">
        ${method.label ? `<span class="tag tag-${esc(ex.method)}" style="align-self:flex-start">${esc(method.label)}</span>` : ''}
        <span style="font-size:15px;line-height:1.5;color:#E2E5E9">${esc(ex.note || method.text)}</span>
      </div>
      <div class="card tight"><span class="small">Schema</span><span class="num" style="font-size:24px">${esc(ex.scheme)}</span></div>
      ${ex.video ? `<a class="help-link" href="${esc(ex.video)}" target="_blank" rel="noopener">${ICON.video}<span>Video del coach</span>${ICON.chev}</a>` : ''}
      ${isBO ? `<p class="small">"Belle cariche ma no cedimento" = finisci l'ultima ripetizione sapendo che ne avresti fatte ancora 1–2.</p>` : ''}
    </section>`;
  } else if (UI.helpTab === 'setup') {
    content = `<section class="stack">
      <ol class="steps">${h.setup.map((s, n) => `<li><span class="n">${n + 1}</span><span>${esc(s)}</span></li>`).join('')}</ol>
      <label for="note-${esc(ex.id)}" class="h2" style="margin-top:6px">Le mie regolazioni</label>
      <textarea id="note-${esc(ex.id)}" data-note="${esc(ex.id)}" placeholder="Es. sedile tacca 4, schienale 2, piedi al centro">${esc(D.notes[ex.id] || '')}</textarea>
      <span class="small">Si salva da solo. ${ex.equip.indexOf('Macchina') === 0 ? 'Se la macchina Technogym ha un QR code, inquadralo con la fotocamera per il video ufficiale.' : ''}</span>
    </section>`;
  } else if (UI.helpTab === 'errors') {
    content = `<ul class="steps errs">${h.errors.map((e) => `<li><strong>${esc(e.t)}</strong><span>${esc(e.f)}</span></li>`).join('')}</ul>`;
  } else {
    content = `<section class="stack" style="gap:12px">
      <span style="font-size:15px;font-weight:600">Che problema hai?</span>
      <div class="chips">${Object.keys(problems).map((k) => `<button type="button" class="chip" aria-pressed="${k === UI.problem}" data-act="problem" data-id="${k}">${esc(problems[k].label)}</button>`).join('')}</div>
      <div class="card"><span style="font-size:16px;font-weight:700;color:var(--accent)">${esc(p.title)}</span>${p.tips.map(tip).join('')}</div>
      <p class="small" style="margin:0;font-size:12px">Se senti dolore acuto fermati e chiedi all'istruttore. Questi consigli non sostituiscono un professionista.</p>
    </section>`;
  }

  return `<div class="screen">
    <header class="row">
      <button type="button" class="icon-btn" data-act="back" aria-label="Indietro">${ICON.back}</button>
      <div class="head" style="gap:2px">
        <h1 class="h1 sm">${esc(ex.name)}</h1>
        <span class="small">${esc(ex.equip)}${h.muscles ? ' · ' + esc(h.muscles) : ''}</span>
      </div>
    </header>
    ${seg(tabs, UI.helpTab, 'help-tab', 'soft')}
    ${content}
  </div>`;
}

/* ---------- Router ---------- */

function route() {
  if (!SCHEDA) return;
  const h = location.hash || '#/oggi';
  const [, page, arg] = h.split('/');
  let html;
  let tab = page;
  if (page === 'allena') html = viewAllena();
  else if (page === 'mobilita') { html = viewMobilita(); tab = 'oggi'; }
  else if (page === 'storico') html = viewStorico();
  else if (page === 'aiuto') html = arg ? viewAiuto(decodeURIComponent(arg)) : viewAiutoList();
  else { html = viewOggi(); tab = 'oggi'; }
  if (page === 'allena') tab = 'oggi';
  if (html) $app.innerHTML = html;
  document.querySelectorAll('#tabbar a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  tickRest();
}

function rerender(keepScroll = true) {
  const y = window.scrollY;
  route();
  if (keepScroll) window.scrollTo(0, y);
}

/* ---------- Azioni ---------- */

const A = {
  'pick-day'(d) { D.day = d.id; save(); rerender(); },
  'hist-day'(d) { UI.histDay = d.id; rerender(); },
  'help-day'(d) { UI.helpDay = d.id; rerender(); },
  'help-tab'(d) { UI.helpTab = d.id; rerender(); },
  'problem'(d) { UI.problem = d.id; rerender(); },
  'chart-ex'(d) { UI.chartEx = d.id; rerender(); },
  'back'() { if (history.length > 1) history.back(); else location.hash = '#/aiuto'; },

  'toggle-warm'(d) {
    const cur = ensureCurrent(d.day); if (!cur) return;
    cur.warm = !cur.warm; save(); rerender();
  },
  'toggle-done'(d) {
    const cur = ensureCurrent(d.day); if (!cur) return;
    cur.done[d.id] = !cur.done[d.id]; save(); rerender();
  },
  'open-ex'(d) {
    const cur = ensureCurrent(d.day); if (!cur) return;
    cur.idx = +d.i; save(); requestWakeLock(); location.hash = '#/allena'; window.scrollTo(0, 0);
  },
  'start'(d) {
    const cur = ensureCurrent(d.day); if (!cur) return;
    const day = dayById(d.day);
    if (!Object.keys(cur.sets).length) {
      const firstTodo = day.exercises.findIndex((e) => !cur.done[e.id]);
      cur.idx = firstTodo < 0 ? 0 : firstTodo;
    }
    save(); requestWakeLock(); location.hash = '#/allena'; window.scrollTo(0, 0);
  },
  'go'(d) {
    const cur = D.current; const day = dayById(cur.day);
    const i = +d.i; if (i < 0 || i >= day.exercises.length) return;
    const ex = day.exercises[cur.idx];
    if ((cur.sets[ex.id] || []).length) cur.done[ex.id] = true;
    cur.idx = i; UI.sw = null; save(); rerender(false); window.scrollTo(0, 0);
  },
  'kg'(d) {
    const { ex, dr } = currentDraft(); const step = ex.step || 2.5;
    const base = dr.kg ?? 0;
    dr.kg = Math.max(0, Math.round((base + step * +d.d) * 100) / 100);
    save(); rerender();
  },
  'reps'(d) { const { dr } = currentDraft(); dr.reps = Math.max(0, (dr.reps || 0) + +d.d); save(); rerender(); },
  'sec'(d) { const { dr } = currentDraft(); dr.sec = Math.max(0, (dr.sec || 0) + +d.d); save(); rerender(); },
  'sw'() {
    if (UI.sw) { const { dr } = currentDraft(); dr.sec = Math.round((Date.now() - UI.sw) / 1000); UI.sw = null; save(); }
    else UI.sw = Date.now();
    rerender();
  },
  'log-set'() {
    const { ex, dr, cur } = currentDraft();
    readInputs(dr);
    if (ex.unit === 'kg' && (dr.kg == null || isNaN(dr.kg))) { toast('Inserisci il peso'); document.getElementById('in-kg')?.focus(); return; }
    const logged = cur.sets[ex.id] = cur.sets[ex.id] || [];
    const tpl = ex.sets[logged.length];
    logged.push({ k: tpl.k, kg: ex.unit === 'kg' ? dr.kg : null, reps: ex.unit === 'sec' ? null : dr.reps, sec: ex.unit === 'sec' ? dr.sec : null, t: Date.now() });
    delete cur.draft[ex.id];
    if (logged.length >= ex.sets.length) cur.done[ex.id] = true;
    save();
    if (tpl.rest) startRest(tpl.rest);
    else cur.rest = null;
    rerender();
  },
  'chrono-start'() {
    const { ex, cur } = currentDraft();
    cur.timers[ex.id] = { start: Date.now(), end: null }; save(); rerender();
  },
  'log-block'() {
    const { ex, dr, cur } = currentDraft();
    readInputs(dr);
    if (!dr.reps) { toast('Inserisci le ripetizioni del blocco'); return; }
    if (!cur.timers[ex.id]) cur.timers[ex.id] = { start: Date.now(), end: null };
    const logged = cur.sets[ex.id] = cur.sets[ex.id] || [];
    logged.push({ k: 'Blocco', kg: dr.kg, reps: dr.reps, t: Date.now() });
    const sum = logged.reduce((a, r) => a + r.reps, 0);
    dr.row = logged.length;
    if (sum >= ex.total) { cur.timers[ex.id].end = Date.now(); cur.done[ex.id] = true; beep(); }
    else dr.reps = Math.min(dr.reps, ex.total - sum);
    save(); rerender();
  },
  'undo'() {
    const { ex, cur } = currentDraft();
    const logged = cur.sets[ex.id] || [];
    logged.pop();
    if (!logged.length) delete cur.sets[ex.id];
    delete cur.draft[ex.id];
    cur.done[ex.id] = false;
    if (ex.total && cur.timers[ex.id]) cur.timers[ex.id].end = null;
    save(); rerender();
  },
  'finish'() { finishSession(); },
  'circ-start'() { UI.circ = { start: Date.now(), acc: 0, running: true, lastIdx: 0 }; requestWakeLock(); beep(); rerender(); },
  'circ-pause'() {
    const c = UI.circ; if (!c) return;
    if (c.running) { c.acc += Date.now() - c.start; c.running = false; } else { c.start = Date.now(); c.running = true; }
    rerender();
  },
  'circ-reset'() { UI.circ = null; rerender(); },
  'rest-add'() { if (D.current && D.current.rest) { D.current.rest.end = Math.max(D.current.rest.end, Date.now()) + 15000; D.current.rest.fired = false; save(); tickRest(); } },
  'rest-skip'() { if (D.current) { D.current.rest = null; save(); tickRest(); } },
  'del-session'(d) {
    if (!confirm('Eliminare questo allenamento dallo storico?')) return;
    D.sessions = D.sessions.filter((s) => String(s.id) !== d.id); save(); rerender();
  },
  'export'() { exportBackup(); },
  'import'() { document.getElementById('import-file').click(); }
};

function currentDraft() {
  const cur = D.current; const ex = dayById(cur.day).exercises[cur.idx];
  return { cur, ex, dr: draftFor(ex, cur) };
}
function readInputs(dr) {
  const kg = document.getElementById('in-kg');
  const reps = document.getElementById('in-reps');
  const sec = document.getElementById('in-sec');
  if (kg) dr.kg = kg.value.trim() === '' ? null : parseFloat(kg.value.replace(',', '.'));
  if (reps) dr.reps = parseInt(reps.value, 10) || 0;
  if (sec) dr.sec = parseInt(sec.value, 10) || 0;
}

document.addEventListener('click', (e) => {
  unlockAudio();
  const b = e.target.closest('[data-act]');
  if (b && A[b.dataset.act]) { e.preventDefault(); A[b.dataset.act](b.dataset, b); return; }
  const pl = e.target.closest('[data-problem]');
  if (pl) { UI.helpTab = 'help'; }
  const tabLink = e.target.closest('#tabbar a, a[href^="#/aiuto/"]');
  if (tabLink && tabLink.getAttribute('href').startsWith('#/aiuto/') && !pl) UI.helpTab = 'coach';
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset.note) { D.notes[t.dataset.note] = t.value; save(); return; }
  if (D.current && (t.id === 'in-kg' || t.id === 'in-reps' || t.id === 'in-sec')) {
    const { dr } = currentDraft(); readInputs(dr); save();
  }
});

window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

/* ---------- Recupero, cronometri, suono ---------- */

const $rest = document.getElementById('restbar');
function tickRest() {
  const r = D.current && D.current.rest;
  if (!r) { $rest.hidden = true; $rest.classList.remove('finished'); return; }
  const left = (r.end - Date.now()) / 1000;
  $rest.hidden = false;
  if (left > 0) {
    $rest.classList.remove('finished');
    document.getElementById('rest-label').textContent = 'Recupero';
    document.getElementById('rest-time').textContent = mmss(left);
  } else {
    $rest.classList.add('finished');
    document.getElementById('rest-label').textContent = 'Recupero finito';
    document.getElementById('rest-time').textContent = 'Vai!';
    if (!r.fired) { r.fired = true; save(); beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]); }
    if (left < -6) { D.current.rest = null; save(); $rest.hidden = true; }
  }
}
setInterval(() => {
  tickRest();
  const c = document.getElementById('chrono');
  if (c && D.current) {
    const ex = dayById(D.current.day).exercises[D.current.idx];
    const tm = D.current.timers[ex.id];
    if (tm && !tm.end) c.textContent = mmss((Date.now() - tm.start) / 1000);
  }
  const sw = document.getElementById('sw');
  if (sw && UI.sw) sw.textContent = mmss((Date.now() - UI.sw) / 1000);
  if (UI.circ && UI.circ.running) {
    const st = circState();
    const idx = st.finished ? Infinity : st.idx;
    if (idx !== UI.circ.lastIdx) {
      UI.circ.lastIdx = idx;
      beep(); if (navigator.vibrate) navigator.vibrate(200);
      if (st.finished) { UI.circ.running = false; UI.circ.acc = st.total * 1000; }
      if (location.hash === '#/mobilita') rerender();
    } else {
      const t = document.getElementById('circ-time');
      if (t) t.textContent = Math.ceil(st.left);
    }
  }
}, 250);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tickRest(); if (D.current && location.hash === '#/allena') requestWakeLock(); } });

let audioCtx = null;
function unlockAudio() {
  if (audioCtx) { if (audioCtx.state === 'suspended') audioCtx.resume(); return; }
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
}
function beep() {
  if (!audioCtx) return;
  [0, 0.25, 0.5].forEach((d) => {
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
    const t = audioCtx.currentTime + d;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.4, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.start(t); o.stop(t + 0.2);
  });
}

let wakeLock = null;
async function requestWakeLock() {
  try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); } }
  catch (e) { wakeLock = null; }
}
function releaseWakeLock() { if (wakeLock) { wakeLock.release(); wakeLock = null; } }

/* ---------- Backup ---------- */

async function exportBackup() {
  const data = JSON.stringify({ app: 'scheda-palestra', exported: new Date().toISOString(), data: D }, null, 2);
  const name = 'backup-palestra-' + new Date().toISOString().slice(0, 10) + '.json';
  const file = new File([data], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Backup palestra' }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

document.getElementById('import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = '';
  if (!f) return;
  try {
    const parsed = JSON.parse(await f.text());
    const data = parsed.data || parsed;
    if (!data || data.v !== 1 || !Array.isArray(data.sessions)) throw new Error('formato');
    if (!confirm(`Il backup contiene ${data.sessions.length} allenamenti. Sostituire i dati attuali?`)) return;
    D = data; save(); toast('Backup importato'); rerender(false);
  } catch (err) { toast('File di backup non valido'); }
});

/* ---------- Toast e avvio ---------- */

let toastT = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
}

Promise.all([
  fetch('scheda.json').then((r) => r.json()),
  fetch('aiuto.json').then((r) => r.json()).catch(() => ({}))
]).then(([s, a]) => {
  SCHEDA = s; AIUTO = a;
  if (!location.hash) location.replace('#/oggi');
  route();
}).catch(() => {
  $app.innerHTML = '<p class="loading">Impossibile caricare la scheda. Controlla la connessione e riapri l\'app.</p>';
});

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
