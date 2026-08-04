// utils.js — helpers generales
window.VATE = window.VATE || {};
VATE.utils = (function () {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const fmt = n => (n || 0).toLocaleString('es');
  const slug = s => (s || 'vate-cancion').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'vate-cancion';

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  const txtBlob = (s, type = 'text/plain') => new Blob([s], { type: type + ';charset=utf-8' });

  let toastT;
  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(() => el.classList.remove('show'), 2600);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e2) {}
      ta.remove(); return true;
    }
  }

  const words = t => (t || '').toLowerCase().match(/[a-záéíóúñü]+/g) || [];
  const lineSylls = line => VATE.lexicon.syllabify ? words(line).reduce((a, w) => a + VATE.lexicon.syllabify(w).count, 0) : 0;

  // similitud de estructuras (Levenshtein sobre tags)
  function seqSim(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(
          d[i-1][j] + 1,
          d[i][j-1] + 1,
          d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1)
        );
      }
    }
    const maxLen = Math.max(m, n);
    return maxLen === 0 ? 1 : 1 - d[m][n] / maxLen;
  }

  return { $, $$, esc, uid, debounce, fmt, slug, download, txtBlob, toast, copy, words, lineSylls, seqSim };
})();