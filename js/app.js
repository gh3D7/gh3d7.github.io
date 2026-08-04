// app.js — orquestación UI de VATE Studio
(function () {
  'use strict';
  const C = VATE.config, L = VATE.lexicon, U = VATE.utils, S = VATE.storage, E = VATE.exporters;
  const $ = U.$;
  let state = S.loadCurrent() || S.demo();
  let activeId = state.sections[0] ? state.sections[0].id : null;
  let metro = { on: false, timer: null, beat: 0 };
  let deferred = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    L.ensure();
    fillSelects(); bindTop(); bindNav(); bindEditorTools(); bindSections(); bindEstructura();
    bindPreview(); bindInspira(); bindHistory(); bindAssistant(); bindPWA(); bindModal();
    $('#projectTitle').value = state.title || '';
    setView('editor'); renderAll();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
    U.toast('🪶 VATE listo · diccionario: ' + U.fmt(L.size()) + ' palabras');
  }

  // ═══════════ renders ═══════════
  function renderAll() {
    renderSections(); renderMini(); renderTimeline(); renderInstr(); renderFamous();
    renderAnalysis(); renderPreview(); renderIdeas(); renderMoodboard(); renderVersions();
    renderProjects(); updateBpmUI();
    $('#lexSize').textContent = '📝 ' + U.fmt(L.size()) + ' palabras en el diccionario local';
  }

  function cardHTML(sec, idx) {
    const t = C.TAGS[sec.tag] || C.TAGS['Verse'];
    return `<div class="sec-card" data-id="${sec.id}" style="--sc:${t.color}">
      <div class="sec-head">
        <span class="sec-idx">${idx + 1}</span>
        <select class="sec-tag">${Object.keys(C.TAGS).map(k => `<option value="${k}"${k===sec.tag?' selected':''}>${k}</option>`).join('')}</select>
        <input class="sec-meta" placeholder="Metadatos (ej. belted, piano)" value="${U.esc(sec.meta)}">
        <div class="sec-acts">
          <button class="ibtn sec-up" title="Subir">↑</button>
          <button class="ibtn sec-down" title="Bajar">↓</button>
          <button class="ibtn sec-duplicate" title="Duplicar">⧉</button>
          <button class="ibtn sec-del danger" title="Eliminar">✕</button>
        </div>
      </div>
      <div class="sec-tools">
        <select class="sec-mood">${C.MOODS.map(m => `<option value="${m.id}"${m.id===sec.mood?' selected':''}>${m.label}</option>`).join('')}</select>
        <span class="mood-dot" style="background:${C.moodColor(sec.mood)}"></span>
        <span class="tsep"></span>
        <select class="sec-dyn">${C.DYNAMICS.map(d => `<option value="${d}"${d===sec.dynamics?' selected':''}>${d}</option>`).join('')}</select>
        <span class="tsep"></span>
        ${C.CUES.map(c => `<button class="chip cue-btn" data-cue="${c}">${c}</button>`).join('')}
        <span class="tsep"></span>
        <button class="chip respiro-btn">∿ respiro</button>
        <button class="chip ai-verse-btn">✨ verso</button>
      </div>
      <textarea class="sec-lyrics" placeholder="${t.hint || 'Escribe tu letra…'}">${U.esc(sec.lyrics)}</textarea>
      <div class="sec-foot">
        <span class="sec-syl-all">—</span>
        <span class="sec-syl-line">${(sec.lyrics||'').split('\n').length} líneas</span>
      </div>
    </div>`;
  }

  function renderSections() {
    $('#sectionsList').innerHTML = state.sections.map(cardHTML).join('');
    state.sections.forEach(sec => {
      const card = document.querySelector('.sec-card[data-id="' + sec.id + '"]');
      if (card) updateSylFoot(card, sec, null);
    });
  }

  function updateSylFoot(card, sec, caretLine) {
    const lines = (sec.lyrics || '').split('\n');
    const counts = lines.map(l => l.trim() ? U.lineSylls(l) : 0);
    const all = card.querySelector('.sec-syl-all');
    const cur = card.querySelector('.sec-syl-line');
    all.textContent = counts.filter(Boolean).join('·') || '—';
    if (caretLine != null && lines[caretLine] && lines[caretLine].trim())
      cur.textContent = 'línea ' + (caretLine + 1) + ': ' + counts[caretLine] + ' sílabas (aprox.)';
    else cur.textContent = lines.length + ' líneas';
  }

  function renderMini() {
    const max = Math.max(...state.sections.map(s => (s.lyrics || '').length), 1);
    $('#miniStruct').innerHTML = state.sections.map(s => {
      const t = C.TAGS[s.tag] || C.TAGS['Verse'];
      return `<div class="mini-item" data-id="${s.id}">
        <span class="dot" style="background:${t.color}"></span>
        <span>${U.esc(s.tag)}</span>
        <div class="bar"><span style="width:${Math.min(100, (s.lyrics||'').length / max * 100)}%;background:${t.color}"></span></div>
      </div>`;
    }).join('');
  }

  function renderTimeline() {
    $('#timeline').innerHTML = state.sections.map(s => {
      const t = C.TAGS[s.tag] || C.TAGS['Verse'];
      const w = 52 + Math.min(140, (s.lyrics || '').length / 4);
      return `<div class="tl-block" data-id="${s.id}" style="background:${t.color};min-width:${w}px">
        <span class="mood" style="background:${C.moodColor(s.mood)}"></span>
        <span>${U.esc(s.tag)}</span>
      </div>`;
    }).join('');
  }

  function renderInstr() {
    $('#instrTable').innerHTML = state.sections.map(s => {
      const t = C.TAGS[s.tag] || C.TAGS['Verse'];
      return `<div class="instr-row">
        <span class="tag" style="color:${t.color}">${U.esc(s.tag)}</span>
        <input class="field instr-in" data-id="${s.id}" value="${U.esc(s.instruments || '')}" placeholder="Instrumentos...">
        <button class="btn instr-sug" data-id="${s.id}">✨</button>
      </div>`;
    }).join('');
  }

  function renderFamous() {
    const mine = state.sections.map(s => s.tag);
    const rows = C.FAMOUS.map(f => ({ f, sim: U.seqSim(mine, f.s) })).sort((a, b) => b.sim - a.sim).slice(0, 4);
    $('#famousList').innerHTML = rows.map(r =>
      `<div class="fam-row">
        <span>${U.esc(r.f.t)} · ${U.esc(r.f.a)}</span>
        <span>${Math.round(r.sim * 100)}%</span>
        <div class="bar"><span style="width:${Math.round(r.sim * 100)}%"></span></div>
      </div>`).join('');
  }

  function renderAnalysis() {
    const txt = E.sunoText(state, { meta: true, cues: true });
    const allW = [];
    state.sections.forEach(s => allW.push(...U.words(s.lyrics)));
    const lines = state.sections.reduce((a, s) => a + (s.lyrics || '').split('\n').filter(l => l.trim()).length, 0);
    const freq = {};
    allW.forEach(w => { if (!C.STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1; });
    const uniq = Object.keys(freq);
    $('#statChars').textContent = U.fmt(txt.length);
    const cb = $('#charBar');
    cb.style.width = Math.min(100, txt.length / 5000 * 100) + '%';
    cb.classList.toggle('over', txt.length > 5000);
    $('#charNote').textContent = txt.length > 5000 ? '⚠ supera el límite Suno (5000)' : txt.length > 4000 ? '⚠ cerca del límite' : 'límite Suno: 5000';
    $('#statLines').textContent = U.fmt(lines);
    $('#statWords').textContent = U.fmt(allW.length);
    $('#statUnique').textContent = U.fmt(uniq.length);
    // pegajosidad
    const lineFreq = {};
    state.sections.forEach(s => (s.lyrics || '').split('\n').forEach(l => { const k = l.trim().toLowerCase(); if (k) lineFreq[k] = (lineFreq[k] || 0) + 1; }));
    let chorLines = 0, chorRep = 0;
    state.sections.filter(s => /chorus|hook|refrain/i.test(s.tag)).forEach(s =>
      (s.lyrics || '').split('\n').forEach(l => { if (l.trim()) { chorLines++; if (lineFreq[l.trim().toLowerCase()] > 1) chorRep++; } }));
    const sticky = chorLines ? Math.min(100, Math.round(chorRep / chorLines * 100)) : 0;
    $('#stickyScore').textContent = sticky;
    $('#stickyBar').style.width = sticky + '%';
    // densidad
    $('#densityList').innerHTML = state.sections.map(s => {
      const ls = (s.lyrics || '').split('\n').filter(l => l.trim());
      const w = U.words(s.lyrics).length;
      const d = ls.length ? (w / ls.length).toFixed(1) : 0;
      return `<div class="dens-row"><span>${U.esc(s.tag)}</span><div class="bar"><span style="width:${Math.min(100, d*10)}%"></span></div><span>${d}</span></div>`;
    }).join('');
    // frecuencia
    const top = uniq.sort((a, b) => freq[b] - freq[a]).slice(0, 8);
    $('#freqList').innerHTML = top.map(w =>
      `<div class="freq-row"><span>${U.esc(w)}</span><div class="bar"><span style="width:${Math.min(100, freq[w]/4*100)}%"></span></div><span>${freq[w]}</span></div>`).join('') || 'Escribe letra para ver frecuencias.';
    // arco emocional
    const svg = $('#arcSvg');
    const n = state.sections.length || 1;
    const pts = state.sections.map((s, i) => [40 + i * (520 / Math.max(1, n - 1)), 120 - C.moodVal(s.mood) * 13]);
    svg.innerHTML = `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="var(--gold)" stroke-width="3" />
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="var(--gold2)" /><text x="${p[0]}" y="${p[1]-14}" text-anchor="middle" fill="var(--muted)" font-size="11">${U.esc(state.sections[i].tag)}</text>`).join('')}
      <text x="40" y="130" fill="var(--muted)" font-size="12">inicio</text>
      <text x="560" y="130" text-anchor="end" fill="var(--muted)" font-size="12">final</text>`;
  }

  function renderPreview() {
    const o = { meta: $('#optMeta').checked, cues: $('#optCues').checked, syl: $('#optSyl').checked, rep: $('#optRep').checked };
    const rep = o.rep ? E.repeatedWords(state) : new Set();
    $('#previewBox').innerHTML = state.sections.map(sec => {
      const t = C.TAGS[sec.tag] || C.TAGS['Verse'];
      const lines = (sec.lyrics || '').split('\n');
      const body = lines.map(l => {
        let html = U.esc(l);
        rep.forEach(w => { html = html.replace(new RegExp('\\b(' + w + ')\\b', 'gi'), '<mark class="rep">$1</mark>'); });
        html = o.cues ? html.replace(/\(([^)]+)\)/g, '<span class="cue">($1)</span>') : html.replace(/\([^)]+\)\s*/g, '');
        const syl = o.syl && l.trim() ? `<span class="syl">${U.lineSylls(l)} síl.</span>` : '';
        return `<div class="pv-line">${html || '&nbsp;'}${syl}</div>`;
      }).join('');
      return `<div class="pv-sec" style="--sc:${t.color}">
        <div class="pv-head"><span class="pv-tag">[${U.esc(sec.tag)}${o.meta && sec.meta ? ' | ' + U.esc(sec.meta) : ''}]</span><span class="dyn">${U.esc(sec.dynamics)}</span></div>
        ${body}
      </div>`;
    }).join('') || 'Nada que previsualizar aún…';
    const total = E.sunoText(state, { meta: true, cues: true }).length;
    const pc = $('#pvChars');
    pc.textContent = total + ' / 5000';
    pc.classList.toggle('warn', total > 4000 && total <= 5000);
    pc.classList.toggle('over', total > 5000);
  }

  function renderIdeas() {
    $('#ideaList').innerHTML = state.ideas.map(i =>
      `<div class="idea-item"><span>${U.esc(i.text)}</span><button class="idea-use" data-id="${i.id}">→</button><button class="idea-del" data-id="${i.id}">✕</button></div>`).join('') || 'Anota frases sueltas y llévalas a tus secciones.';
  }

  function renderMoodboard() {
    const mb = state.moodboard;
    $('#mbGrid').innerHTML = mb.colors.map(c => `<div class="mb-item" style="background:${c}"><button class="x mb-del" data-k="c" data-id="${c}">✕</button></div>`).join('') +
      mb.images.map(im => `<div class="mb-item"><img src="${im.src}" alt="mood"><button class="x mb-del" data-k="i" data-id="${im.id}">✕</button></div>`).join('') || 'Sube imágenes o colores que inspiren la canción.';
  }

  function renderVersions() {
    $('#versionList').innerHTML = [...state.versions].reverse().map(v =>
      `<div class="ver-item"><span class="t"><b>${U.esc(v.label || 'Versión automática')}</b><small>${new Date(v.ts).toLocaleString('es')} · ${v.sections} secciones</small></span><button class="ver-restore" data-id="${v.id}">↩ Restaurar</button><button class="ver-del" data-id="${v.id}">✕</button></div>`).join('') || 'Las versiones se capturan solas al hacer cambios grandes.';
  }

  function renderProjects() {
    $('#projList').innerHTML = S.loadProjects().map(p =>
      `<div class="ver-item"><span class="t"><b>${U.esc(p.name)}</b><small>${new Date(p.updatedAt).toLocaleString('es')}</small></span><button class="proj-load" data-id="${p.id}">Abrir</button><button class="proj-del" data-id="${p.id}">✕</button></div>`).join('') || 'Guarda proyectos para alternar entre canciones.';
  }

  function updateBpmUI() {
    $('#bpmInput').value = state.bpm; $('#bpmRange').value = state.bpm;
    const g = C.GENRES[state.genre] || C.GENRES.pop;
    const avg = Math.round((g.bpm[0] + g.bpm[1]) / 2);
    $('#bpmSuggest').innerHTML = '🎼 ' + g.name + ': rango típico ' + g.bpm[0] + '–' + g.bpm[1] + ' BPM · sugerido ' + avg + ' · estilo: ' + g.style + '';
  }

  // ═══════════ bindings ═══════════
  const save = U.debounce(() => {
    const ok = S.saveCurrent(state);
    $('#saveStatus').textContent = ok ? 'Guardado ✓' : '⚠ sin espacio';
    maybeSnapshot();
  }, 700);
  const refresh = U.debounce(() => { renderPreview(); renderAnalysis(); renderMini(); renderTimeline(); }, 500);

  function maybeSnapshot() {
    const last = state.versions[state.versions.length - 1];
    const now = JSON.stringify(state.sections);
    if (!last || Math.abs(now.length - last.size) > 80) {
      state.versions.push({ id: U.uid(), ts: Date.now(), label: '', size: now.length, sections: state.sections.length, data: JSON.parse(JSON.stringify(state.sections)), title: state.title });
      if (state.versions.length > 40) state.versions.shift();
      renderVersions();
    }
  }

  function fillSelects() {
    $('#tagSelect').innerHTML = Object.keys(C.TAGS).map(k => `<option value="${k}">${k}</option>`).join('');
    $('#templateSelect').innerHTML = '<option value="">🎼 Plantillas de género…</option>' + C.TEMPLATES.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    const themes = Object.keys(C.INSPIRE).map(k => `<option value="${k}">${k}</option>`).join('');
    $('#aiTheme').innerHTML = themes; $('#aiTheme2').innerHTML = themes;
  }

  function bindTop() {
    $('#projectTitle').addEventListener('input', e => { state.title = e.target.value; save(); refresh(); });
    $('#themeBtn').addEventListener('click', () => {
      const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = t;
      try { localStorage.setItem('vate.theme', t); } catch (e) {}
      $('#themeBtn').textContent = t === 'dark' ? '🌙' : '☀️';
    });
    $('#themeBtn').textContent = document.documentElement.dataset.theme === 'dark' ? '🌙' : '☀️';
  }

  function setView(v) {
    document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === 'view-' + v));
    document.querySelectorAll('.nav-btn[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    $('#sideNav').classList.remove('open');
    if (v === 'preview') renderPreview();
    if (v === 'analisis') renderAnalysis();
    if (v === 'estructura') { renderTimeline(); renderFamous(); renderInstr(); }
    if (v === 'historial') { renderVersions(); renderProjects(); }
    if (v === 'inspiracion') { renderIdeas(); renderMoodboard(); }
  }

  function bindNav() {
    document.addEventListener('click', e => {
      const nb = e.target.closest('.nav-btn[data-view]');
      if (nb) setView(nb.dataset.view);
      const mi = e.target.closest('.mini-item');
      if (mi) { setView('editor'); scrollToCard(mi.dataset.id); }
      const tl = e.target.closest('.tl-block');
      if (tl) { setView('editor'); scrollToCard(tl.dataset.id); }
    });
    $('#navToggle').addEventListener('click', () => $('#sideNav').classList.toggle('open'));
  }

  function scrollToCard(id) {
    activeId = id;
    document.querySelectorAll('.sec-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
    const el = document.querySelector('.sec-card[data-id="' + id + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function bindEditorTools() {
    $('#addSectionBtn').addEventListener('click', () => {
      const sec = S.newSection($('#tagSelect').value);
      sec.instruments = C.INSTR[sec.tag] || '';
      state.sections.push(sec); activeId = sec.id;
      renderSections(); renderMini(); renderTimeline(); save();
      scrollToCard(sec.id); U.toast('＋ Sección ' + sec.tag);
    });
    $('#templateSelect').addEventListener('change', e => {
      const t = C.TEMPLATES.find(x => x.id === e.target.value);
      if (!t) return;
      if (!confirm('Cargar plantilla "' + t.name + '" reemplazará la estructura actual. ¿Continuar?')) { e.target.value = ''; return; }
      state.genre = t.genre;
      const g = C.GENRES[t.genre];
      state.bpm = Math.round((g.bpm[0] + g.bpm[1]) / 2);
      state.sections = t.sections.map(s => S.newSection(s.tag, { meta: s.meta, mood: s.mood, dynamics: s.dyn, instruments: s.instruments }));
      activeId = state.sections[0].id;
      renderAll(); updateBpmUI(); save();
      U.toast('🎼 Plantilla ' + t.name + ' cargada');
      e.target.value = '';
    });
    $('#clearBtn').addEventListener('click', () => {
      if (!confirm('¿Empezar una canción en blanco?')) return;
      state = S.blank(); activeId = state.sections[0].id;
      $('#projectTitle').value = '';
      renderAll(); save();
    });
    $('#importBtn').addEventListener('click', openImport);
  }

  function bindSections() {
    const list = $('#sectionsList');
    list.addEventListener('input', e => {
      const card = e.target.closest('.sec-card'); if (!card) return;
      const sec = state.sections.find(s => s.id === card.dataset.id); if (!sec) return;
      if (e.target.classList.contains('sec-lyrics')) {
        sec.lyrics = e.target.value;
        const line = e.target.value.slice(0, e.target.selectionStart).split('\n').length - 1;
        updateSylFoot(card, sec, line);
        activeId = sec.id;
      }
      else if (e.target.classList.contains('sec-meta')) sec.meta = e.target.value;
      save(); refresh();
    });
    list.addEventListener('change', e => {
      const card = e.target.closest('.sec-card'); if (!card) return;
      const sec = state.sections.find(s => s.id === card.dataset.id); if (!sec) return;
      if (e.target.classList.contains('sec-tag')) {
        sec.tag = e.target.value;
        card.style.setProperty('--sc', (C.TAGS[sec.tag] || C.TAGS['Verse']).color);
        card.querySelector('.sec-lyrics').placeholder = (C.TAGS[sec.tag] || {}).hint || '';
      }
      if (e.target.classList.contains('sec-mood')) { sec.mood = e.target.value; card.querySelector('.mood-dot').style.background = C.moodColor(sec.mood); }
      if (e.target.classList.contains('sec-dyn')) sec.dynamics = e.target.value;
      save(); refresh();
    });
    list.addEventListener('click', e => {
      const card = e.target.closest('.sec-card'); if (!card) return;
      const id = card.dataset.id;
      const idx = state.sections.findIndex(s => s.id === id);
      activeId = id;
      document.querySelectorAll('.sec-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
      const ta = card.querySelector('.sec-lyrics');
      if (e.target.classList.contains('sec-up') && idx > 0) { [state.sections[idx - 1], state.sections[idx]] = [state.sections[idx], state.sections[idx - 1]]; renderSections(); refresh(); save(); }
      else if (e.target.classList.contains('sec-down') && idx < state.sections.length - 1) { [state.sections[idx], state.sections[idx + 1]] = [state.sections[idx + 1], state.sections[idx]]; renderSections(); refresh(); save(); }
      else if (e.target.classList.contains('sec-del')) { if (confirm('Eliminar sección?')) { state.sections.splice(idx, 1); renderSections(); refresh(); save(); } }
      else if (e.target.classList.contains('sec-duplicate')) { const copy = JSON.parse(JSON.stringify(sec)); copy.id = U.uid(); state.sections.splice(idx + 1, 0, copy); renderSections(); refresh(); save(); U.toast('⧉ Sección duplicada'); }
      else if (e.target.classList.contains('cue-btn')) { insertCue(ta, e.target.dataset.cue); }
      else if (e.target.classList.contains('respiro-btn')) { insertAt(ta, '\n(…respiro…)\n'); }
      else if (e.target.classList.contains('ai-verse-btn')) {
        const th = guessTheme(state);
        const bank = C.INSPIRE[th] || C.INSPIRE.amor;
        const line = bank[Math.floor(Math.random() * bank.length)];
        insertAt(ta, '\n' + line);
        U.toast('✨ Verso IA: "' + line + '"');
      }
    });
    list.addEventListener('focus', e => { if (e.target.classList.contains('sec-lyrics')) updateAssistant(); });
    list.addEventListener('click', e => { if (e.target.classList.contains('sec-lyrics')) updateAssistant(); });
  }

  function guessTheme(st) {
    const txt = (st.sections.map(s => s.lyrics).join(' ') + ' ' + st.title).toLowerCase();
    let best = 'amor', score = -1;
    const probes = { amor: ['amor', 'beso', 'quiero', 'contigo'], desamor: ['adiós', 'olvido', 'dolor', 'sin ti'], noche: ['noche', 'luna', 'neón', 'oscur'], ciudad: ['ciudad', 'calle', 'barrio'], mar: ['mar', 'ola', 'sal'], libertad: ['libre', 'volar', 'correr'], sueños: ['sueño', 'soñar', 'despierto'], fiesta: ['fiesta', 'baila', 'brindis'] };
    for (const k in probes) { const sc = probes[k].reduce((a, p) => a + (txt.includes(p) ? 1 : 0), 0); if (sc > score) { score = sc; best = k; } }
    return best;
  }
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function activeTextarea() {
    return document.querySelector('.sec-card[data-id="' + activeId + '"] .sec-lyrics') || document.querySelector('.sec-lyrics');
  }
  function insertAt(ta, text) {
    if (!ta) return;
    ta.focus();
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function insertCue(ta, cue) {
    if (!ta) return;
    const v = ta.value, s = ta.selectionStart;
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    ta.setRangeText('(' + cue + ') ', ls, ls, 'end');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    U.toast('🎙 (' + cue + ') al inicio de la línea');
  }

  function bindEstructura() {
    const sync = v => { state.bpm = Math.max(40, Math.min(220, +v || 100)); updateBpmUI(); save(); };
    $('#bpmInput').addEventListener('input', e => sync(e.target.value));
    $('#bpmRange').addEventListener('input', e => sync(e.target.value));
    $('#metroBtn').addEventListener('click', () => {
      metro.on = !metro.on;
      $('#metroBtn').textContent = metro.on ? '■ Detener' : '▶ Metrónomo';
      if (metro.on) {
        metro.beat = 0;
        metro.timer = setInterval(() => {
          const ac = metro.ac || (metro.ac = new (window.AudioContext || window.webkitAudioContext)());
          const o = ac.createOscillator(), g = ac.createGain();
          o.frequency.value = metro.beat % 4 === 0 ? 1200 : 800;
          g.gain.setValueAtTime(.25, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .09);
          o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .1);
          const dot = $('#metroDot');
          dot.classList.add('on'); setTimeout(() => dot.classList.remove('on'), 110);
          metro.beat++;
        }, 60000 / state.bpm);
      } else { clearInterval(metro.timer); }
    });
    $('#instrTable').addEventListener('input', e => {
      if (!e.target.classList.contains('instr-in')) return;
      const sec = state.sections.find(s => s.id === e.target.dataset.id);
      if (sec) { sec.instruments = e.target.value; save(); }
    });
    $('#instrTable').addEventListener('click', e => {
      if (!e.target.classList.contains('instr-sug')) return;
      const sec = state.sections.find(s => s.id === e.target.dataset.id);
      if (sec) { sec.instruments = C.INSTR[sec.tag] || 'piano + pads'; renderInstr(); save(); U.toast('✨ Instrumentación sugerida'); }
    });
  }

  function bindPreview() {
    ['optMeta', 'optCues', 'optSyl', 'optRep'].forEach(id => $('#' + id).addEventListener('change', renderPreview));
    $('#copyBtn').addEventListener('click', async () => { await U.copy(E.sunoText(state)); U.toast('✅ ¡Copiado para Suno!'); });
    $('#txtBtn').addEventListener('click', () => { E.toTXT(state); U.toast('📄 TXT exportado'); });
    $('#mdBtn').addEventListener('click', () => { E.toMD(state); U.toast('📝 Markdown exportado'); });
    $('#pdfBtn').addEventListener('click', () => { E.toPDF(state); U.toast('🖨 Abriendo impresión/PDF…'); });
    $('#jsonBtn').addEventListener('click', () => { E.toJSON(state, false); U.toast('💾 Proyecto JSON exportado'); });
    $('#jsonTplBtn').addEventListener('click', () => { E.toJSON(state, true); U.toast('🧩 Plantilla de estructura exportada'); });
    $('#midiBtn').addEventListener('click', () => { E.toMIDI(state); U.toast('🎹 MIDI exportado'); });
    $('#pngBtn').addEventListener('click', () => { E.toPNG(state); U.toast('🖼 PNG generado'); });
    $('#shareBtn').addEventListener('click', async () => {
      const txt = E.sunoText(state);
      if (navigator.share) { navigator.share({ title: state.title || 'VATE', text: txt }).catch(() => {}); }
      else { await U.copy(txt); U.toast('📋 Copiado (compartir no disponible)'); }
    });
  }

  function bindInspira() {
    const addIdea = () => {
      const v = $('#ideaInput').value.trim();
      if (!v) return;
      state.ideas.push({ id: U.uid(), text: v });
      $('#ideaInput').value = '';
      renderIdeas(); save();
    };
    $('#ideaAdd').addEventListener('click', addIdea);
    $('#ideaInput').addEventListener('keydown', e => { if (e.key === 'Enter') addIdea(); });
    $('#ideaList').addEventListener('click', e => {
      const use = e.target.closest('.idea-use');
      const del = e.target.closest('.idea-del');
      if (use) {
        const it = state.ideas.find(i => i.id === use.dataset.id);
        if (it) { insertAt(activeTextarea(), '\n' + it.text); U.toast('→ Idea insertada en ' + (state.sections.find(s => s.id === activeId) || {}).tag); }
      }
      if (del) { state.ideas = state.ideas.filter(i => i.id !== del.dataset.id); renderIdeas(); save(); }
    });
    const genAI = listEl => {
      const th = $(listEl === '#aiList' ? '#aiTheme' : '#aiTheme2').value;
      const bank = C.INSPIRE[th];
      const out = [pick(bank), pick(bank), pick(bank)];
      $(listEl).innerHTML = out.map(l => `<div class="idea-item"><span>${U.esc(l)}</span><button class="ai-use" data-l="${U.esc(l)}">→</button></div>`).join('');
    };
    $('#aiBtn').addEventListener('click', () => genAI('#aiList'));
    $('#aiBtn2').addEventListener('click', () => genAI('#aiList2'));
    ['#aiList', '#aiList2'].forEach(sel => $(sel).addEventListener('click', e => {
      const b = e.target.closest('.ai-use');
      if (b) { insertAt(activeTextarea(), '\n' + b.dataset.l); U.toast('✨ Verso insertado'); }
    }));
    $('#titleBtn').addEventListener('click', () => {
      const freq = {};
      state.sections.forEach(s => U.words(s.lyrics).forEach(w => { if (w.length > 4 && !C.STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1; }));
      const kw = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, 6);
      const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
      const t = [];
      if (kw[0]) t.push(cap(kw[0]), cap(kw[0]) + ' y ' + (kw[1] || 'Ceniza'), 'Sin ' + cap(kw[0]), cap(kw[0]) + ' Eterno', (kw[1] ? cap(kw[1]) + ' de ' : '') + cap(kw[0] || 'Medianoche'), 'Neón sobre ' + cap(kw[0] || 'el Silencio'), 'El Último ' + cap(kw[0] || 'Verso'), cap(kw[0] || 'Aurora') + ' en ' + cap(kw[1] || 'la Piel'));
      $('#titleList').innerHTML = (t.length ? t : ['Medianoche Dorada', 'Versos de Neón', 'La Piel del Eco']).map(x => `<div class="idea-item"><span>${U.esc(x)}</span><button class="title-use" data-l="${U.esc(x)}">✓</button></div>`).join('');
    });
    $('#titleList').addEventListener('click', e => {
      const b = e.target.closest('.title-use');
      if (b) { state.title = b.dataset.l; $('#projectTitle').value = b.dataset.l; save(); refresh(); U.toast('🏷 Título aplicado'); }
    });
    // moodboard
    $('#mbAddColor').addEventListener('click', () => { state.moodboard.colors.push($('#mbColor').value); renderMoodboard(); save(); });
    $('#mbFile').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        const cv = document.createElement('canvas');
        const sc = Math.min(1, 480 / img.width);
        cv.width = img.width * sc; cv.height = img.height * sc;
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        state.moodboard.images.push({ id: U.uid(), src: cv.toDataURL('image/jpeg', .72) });
        URL.revokeObjectURL(url);
        renderMoodboard(); save(); U.toast('🖼 Imagen añadida al moodboard');
      };
      img.src = url;
      e.target.value = '';
    });
    $('#mbGrid').addEventListener('click', e => {
      const b = e.target.closest('.mb-del'); if (!b) return;
      if (b.dataset.k === 'c') state.moodboard.colors = state.moodboard.colors.filter(c => c !== b.dataset.id);
      else state.moodboard.images = state.moodboard.images.filter(i => i.id !== b.dataset.id);
      renderMoodboard(); save();
    });
  }

  function bindHistory() {
    $('#manualVerBtn').addEventListener('click', () => {
      state.versions.push({ id: U.uid(), ts: Date.now(), label: '📌 Manual', size: JSON.stringify(state.sections).length, sections: state.sections.length, data: JSON.parse(JSON.stringify(state.sections)), title: state.title });
      renderVersions(); save(); U.toast('📌 Versión marcada');
    });
    $('#versionList').addEventListener('click', e => {
      const r = e.target.closest('.ver-restore');
      const d = e.target.closest('.ver-del');
      if (r) {
        const v = state.versions.find(x => x.id === r.dataset.id);
        if (v && confirm('¿Restaurar esta versión?')) {
          state.sections = JSON.parse(JSON.stringify(v.data));
          if (v.title) { state.title = v.title; $('#projectTitle').value = v.title; }
          activeId = state.sections[0] ? state.sections[0].id : null;
          renderAll(); save(); U.toast('↩ Versión restaurada');
        }
      }
      if (d) { state.versions = state.versions.filter(x => x.id !== d.dataset.id); renderVersions(); save(); }
    });
    $('#saveProjBtn').addEventListener('click', () => {
      const projs = S.loadProjects();
      const name = state.title || 'Canción sin título';
      const existing = projs.find(p => p.name === name);
      if (existing) { existing.data = JSON.parse(JSON.stringify(state)); existing.updatedAt = Date.now(); }
      else projs.push({ id: U.uid(), name, updatedAt: Date.now(), data: JSON.parse(JSON.stringify(state)) });
      S.saveProjects(projs); renderProjects(); U.toast('💾 Proyecto "' + name + '" guardado');
    });
    $('#projList').addEventListener('click', e => {
      const l = e.target.closest('.proj-load');
      const d = e.target.closest('.proj-del');
      const projs = S.loadProjects();
      if (l) {
        const p = projs.find(x => x.id === l.dataset.id);
        if (p && confirm('Abrir "' + p.name + '" (se guarda antes lo actual)')) {
          S.saveCurrent(state);
          state = JSON.parse(JSON.stringify(p.data));
          activeId = state.sections[0] ? state.sections[0].id : null;
          $('#projectTitle').value = state.title || '';
          renderAll(); save(); U.toast('📂 "' + p.name + '" abierto');
        }
      }
      if (d && confirm('¿Eliminar proyecto?')) { S.saveProjects(projs.filter(x => x.id !== d.dataset.id)); renderProjects(); }
    });
    $('#importProjFile').addEventListener('change', e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result);
          if (data.app === 'vate-studio' && Array.isArray(data.sections)) {
            state = Object.assign(S.blank(), data);
            state.sections = state.sections.map(s => S.newSection(s.tag || 'Verse', s));
            activeId = state.sections[0].id;
            $('#projectTitle').value = state.title || '';
            renderAll(); save(); U.toast('📂 Proyecto importado');
          } else if (Array.isArray(data.sections)) {
            state.sections = data.sections.map(s => S.newSection(s.tag || 'Verse', s));
            activeId = state.sections[0].id; renderAll(); save(); U.toast('🧩 Estructura importada');
          } else U.toast('⚠ JSON no reconocido');
        } catch (err) { U.toast('⚠ JSON inválido'); }
      };
      r.readAsText(f); e.target.value = '';
    });
  }

  // ═══════════ asistente ═══════════
  function bindAssistant() {
    document.querySelectorAll('.atab').forEach(b => b.addEventListener('click', () => {
      document.querySelectorAll('.atab').forEach(x => x.classList.toggle('active', x === b));
      document.querySelectorAll('.apanel').forEach(p => p.classList.toggle('active', p.id === 'ap-' + b.dataset.atab));
    }));
    $('#assistFab').addEventListener('click', () => $('#assistant').classList.toggle('open'));
    $('#assistClose').addEventListener('click', () => $('#assistant').classList.remove('open'));
    $('#sinonInput').addEventListener('input', U.debounce(() => showSynonyms($('#sinonInput').value), 250));
    $('#metInput').addEventListener('input', U.debounce(() => showMetric($('#metInput').value), 250));
    $('#aiInlineBtn').addEventListener('click', () => {
      const th = guessTheme(state);
      const bank = C.INSPIRE[th] || C.INSPIRE.amor;
      const out = [pick(bank), pick(bank), pick(bank)];
      $('#aiInlineList').innerHTML = out.map(l => `<div class="idea-item"><span>${U.esc(l)}</span><button class="ai-use" data-l="${U.esc(l)}">→</button></div>`).join('');
    });
    $('#aiInlineList').addEventListener('click', e => {
      const b = e.target.closest('.ai-use');
      if (b) { insertAt(activeTextarea(), '\n' + b.dataset.l); U.toast('✨ Verso insertado'); }
    });
  }

  function updateAssistant() {
    const ta = activeTextarea();
    if (!ta) return;
    const v = ta.value, s = ta.selectionStart;
    const lineStart = v.lastIndexOf('\n', s - 1) + 1;
    let lineEnd = v.indexOf('\n', s); if (lineEnd < 0) lineEnd = v.length;
    const line = v.slice(lineStart, lineEnd);
    const words = line.trim().split(/\s+/);
    const lastWord = words.length ? words[words.length - 1].replace(/[^a-záéíóúüñ]/gi, '') : '';
    const sel = v.slice(ta.selectionStart, ta.selectionEnd).trim();
    // rimas
    if (lastWord && lastWord.length > 2) {
      const r = L.findRhymes(lastWord);
      $('#rhymeWord').textContent = lastWord;
      $('#rhymeCons').innerHTML = r.cons.map(w => `<button class="chip rw" data-w="${w}">${w}</button>`).join('') || 'sin coincidencias…';
      $('#rhymeAson').innerHTML = r.ason.map(w => `<button class="chip rw" data-w="${w}">${w}</button>`).join('') || '';
    }
    // sinónimos de selección
    if (sel && !sel.includes(' ')) { $('#sinonInput').value = sel; showSynonyms(sel); }
    // métrica de selección o línea
    showMetric(sel || line);
    // bindings de inserción de chips (una vez)
    if (!updateAssistant.bound) {
      updateAssistant.bound = true;
      $('#rhymeCons').addEventListener('click', e => { const b = e.target.closest('.rw'); if (b) { insertAt(activeTextarea(), b.dataset.w); U.toast('＋ ' + b.dataset.w); } });
      $('#rhymeAson').addEventListener('click', e => { const b = e.target.closest('.rw'); if (b) { insertAt(activeTextarea(), b.dataset.w); U.toast('＋ ' + b.dataset.w); } });
      $('#sinonList').addEventListener('click', e => { const b = e.target.closest('.rw'); if (b) { insertAt(activeTextarea(), b.dataset.w); U.toast('＋ ' + b.dataset.w); } });
    }
  }

  function showSynonyms(w) {
    w = (w || '').trim().split(/\s+/)[0] || '';
    const list = w ? L.synonyms(w) : [];
    $('#sinonList').innerHTML = list.length ? list.map(x => `<button class="chip rw" data-w="${x}">${x}</button>`).join('') : `<span class="hint">${w ? 'Sin sinónimos locales para "' + U.esc(w) + '".' : 'Escribe o selecciona una palabra.'}</span>`;
  }

  function showMetric(text) {
    text = (text || '').trim();
    if (!text) { $('#metResult').innerHTML = '—'; return; }
    const ws = U.words(text);
    if (!ws.length) return;
    if (ws.length === 1) {
      const p = L.pronounce(ws[0]);
      $('#metResult').innerHTML = p ? `<b>${U.esc(ws[0])}</b> → ${p.shown}\n${p.count} sílabas · ${p.tipo}` : '—';
    } else {
      const counts = ws.map(w => L.syllabify(w).count);
      $('#metResult').innerHTML = ws.map((w, i) => `<b>${U.esc(w)}</b> ${counts[i]}`).join(' · ') + '\n≈ ' + counts.reduce((a, b) => a + b, 0) + ' sílabas en la línea';
    }
  }

  // ═══════════ modal importar ═══════════
  function bindModal() {
    $('#modalClose').addEventListener('click', () => $('#modal').hidden = true);
    $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modal').hidden = true; });
  }
  function openImport() {
    $('#modalTitle').textContent = '📥 Importar texto Suno';
    $('#modalBody').innerHTML = '<p class="hint">Pega tu letra con etiquetas [Verse], [Chorus]… y la convertiré en secciones editables.</p>' +
      '<textarea id="impTxt" placeholder="Pega aquí..."></textarea>' +
      '<div class="row"><button class="btn gold" id="impGo">Analizar</button><button class="btn" id="impDemo">Cargar ejemplo</button></div>';
    $('#modal').hidden = false;
    $('#impGo').addEventListener('click', () => {
      const secs = parseSuno($('#impTxt').value);
      if (!secs) { U.toast('⚠ No se detectaron secciones'); return; }
      state.sections = secs; activeId = secs[0].id;
      renderAll(); save(); $('#modal').hidden = true;
      U.toast('📥 ' + secs.length + ' secciones importadas');
    });
    $('#impDemo').addEventListener('click', () => {
      $('#impTxt').value = '[Intro | pads]\n(luces encendiéndose…)\n\n[Verse | voz cercana]\nCamino por el borde de tu voz\nla ciudad se apaga cuando dices no\n\n[Chorus | belted]\nY si caemos, caemos cantando\nel eco nos va a recordar';
    });
  }
  function parseSuno(text) {
    const lines = (text || '').split('\n');
    const secs = []; let cur = null;
    for (const ln of lines) {
      const m = ln.match(/^\s*\[([^\]|]+)(?:\|([^\]]*))?\]\s*$/);
      if (m) {
        cur = S.newSection(m[1].trim(), { meta: (m[2] || '').trim() });
        secs.push(cur); continue;
      }
      if (!cur) {
        if (!ln.trim()) continue;
        cur = S.newSection('Verse'); secs.push(cur);
      }
      cur.lyrics += (cur.lyrics ? '\n' : '') + ln;
    }
    return secs.length ? secs : null;
  }

  // ═══════════ PWA ═══════════
  function bindPWA() {
    const badge = $('#netBadge');
    const net = () => { badge.textContent = navigator.onLine ? '● online' : '● offline'; badge.classList.toggle('off', !navigator.onLine); badge.title = navigator.onLine ? 'Conectado' : 'Offline: todo sigue funcionando'; };
    window.addEventListener('online', net); window.addEventListener('offline', net); net();
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
    $('#installBtn').addEventListener('click', async () => {
      if (!deferred) return;
      deferred.prompt();
      const r = await deferred.userChoice;
      if (r.outcome === 'accepted') { $('#installBtn').hidden = true; U.toast(' App instalada'); }
      deferred = null;
    });
    window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; U.toast('📲 ¡Instalada!'); });
  }
})();