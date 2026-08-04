// exporters.js — TXT Suno, MD, JSON, PDF (impresión), MIDI (SMF), PNG social
window.VATE = window.VATE || {};
VATE.exporters = (function () {
  const U = () => VATE.utils, C = () => VATE.config;

  function sunoText(st, o = { meta: true, cues: true }) {
    const out = [];
    st.sections.forEach(s => {
      const meta = o.meta && s.meta ? ' | ' + s.meta : '';
      out.push('[' + s.tag + meta + ']');
      let lines = (s.lyrics || '').split('\n');
      if (!o.cues) lines = lines.map(l => l.replace(/\([^)]+\)\s*/g, ''));
      const body = lines.join('\n').trim();
      if (body) out.push(body);
      out.push('');
    });
    return out.join('\n').trim();
  }

  function repeatedWords(st) {
    const freq = {};
    st.sections.forEach(s => U().words(s.lyrics).forEach(w => {
      if (w.length > 3 && !C().STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1;
    }));
    return new Set(Object.keys(freq).filter(w => freq[w] >= 4));
  }

  function toTXT(st) { U().download(U().txtBlob(sunoText(st)), U().slug(st.title) + '-suno.txt'); }

  function toMD(st) {
    const g = C().GENRES[st.genre] || C().GENRES.pop;
    let md = '# ' + (st.title || 'Sin título') + '\n\n';
    md += '> Género: ' + g.name + ' · BPM: ' + st.bpm + ' · Generado con VATE Studio\n\n';
    st.sections.forEach(s => {
      md += '## [' + s.tag + ']' + (s.meta ? ' (' + s.meta + ')' : '') + '\n\n';
      md += 'ánimo: ' + s.mood + ' · dinámica: ' + s.dynamics + '' + (s.instruments ? ' · 🎸 ' + s.instruments : '') + '\n\n';
      md += (s.lyrics || '') + '\n\n';
    });
    U().download(U().txtBlob(md, 'text/markdown'), U().slug(st.title) + '.md');
  }

  function toJSON(st, onlyStructure) {
    const data = {
      app: 'vate-studio', version: 1, exportedAt: new Date().toISOString(),
      title: st.title, genre: st.genre, bpm: st.bpm,
      sections: st.sections.map(s => onlyStructure
        ? { tag: s.tag, meta: s.meta, mood: s.mood, dynamics: s.dynamics, instruments: s.instruments }
        : s)
    };
    U().download(U().txtBlob(JSON.stringify(data, null, 2), 'application/json'),
      U().slug(st.title) + (onlyStructure ? '.plantilla.json' : '.proyecto.json'));
  }

  function toPDF(st) {
    const g = C().GENRES[st.genre] || C().GENRES.pop;
    const body = st.sections.map(s =>
      `<div style="margin-bottom:20px;border-left:4px solid #d4a94e;padding-left:14px">
        <h2 style="font-size:22px;color:#d4a94e;margin:0">[${U().esc(s.tag)}${s.meta ? ' | ' + U().esc(s.meta) : ''}]</h2>
        <p style="color:#666;font-size:14px">ánimo: ${U().esc(s.mood)} · dinámica: ${U().esc(s.dynamics)}${s.instruments ? ' · 🎸 ' + U().esc(s.instruments) : ''}</p>
        <pre style="font-family:monospace;font-size:15px;white-space:pre-wrap">${U().esc(s.lyrics || '')}</pre>
      </div>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${U().esc(st.title || 'Canción')}</title>
      <style>body{font-family:Georgia,serif;color:#222;padding:40px;max-width:900px;margin:auto}h1{font-size:36px;margin:0}
      .sub{color:#8a6a1f;font-size:18px}</style></head><body>
      <h1>🪶 ${U().esc(st.title || 'Sin título')}</h1>
      <p class="sub">${g.name} · ${st.bpm} BPM · VATE Studio</p>
      ${body}
    </body></html>`;
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    const d = f.contentDocument;
    d.open(); d.write(html); d.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 4000); }, 350);
  }

  // ── MIDI SMF formato 0 ──
  function toMIDI(st) {
    const bpm = Math.max(40, Math.min(220, st.bpm || 100));
    const PPQ = 480;
    const bytes = [], tr = [];
    const u16 = (a, v) => a.push(v >> 8 & 255, v & 255);
    const u32 = (a, v) => a.push(v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255);
    const str = (a, s) => { for (const c of s) a.push(c.charCodeAt(0) & 127); };
    const vl = v => { const b = [v & 0x7f]; v >>= 7; while (v > 0) { b.unshift((v & 0x7f) | 0x80); v >>= 7; } return b; };
    const mspq = Math.round(60000000 / bpm);
    tr.push(0, 0xFF, 0x51, 0x03, mspq >> 16 & 255, mspq >> 8 & 255, mspq & 255);
    tr.push(0, 0xFF, 0x58, 0x04, 4, 2, 24, 8);
    tr.push(0, 0xC0, 0);
    const roots = { Intro:48, Verse:45, 'Pre-Chorus':47, Chorus:50, Hook:52, Bridge:43, Refrain:50, Interlude:48, Solo:55, Breakdown:41, 'Ad-libs':50, Outro:48 };
    const pat = [0, 7, 12, 7, 0, 7, 5, 7, 0, 7, 12, 7, 3, 7, 5, 7];
    st.sections.forEach(sec => {
      const root = roots[sec.tag] ?? 48;
      for (let i = 0; i < 16; i++) {
        const t = sec.lyrics ? sec.lyrics.length + 100 + i * 12 : 0;
        tr.push(t, 0x90, root + pat[i % pat.length], 80);
        tr.push(t + 60, 0x80, root + pat[i % pat.length], 0);
      }
    });
    tr.push(0, 0xFF, 0x2F, 0);
    str(bytes, 'MThd'); u32(bytes, 6); u16(bytes, 0); u16(bytes, 1); u16(bytes, PPQ);
    str(bytes, 'MTrk'); u32(bytes, tr.length); bytes.push(...tr);
    U().download(new Blob([new Uint8Array(bytes)], { type: 'audio/midi' }), U().slug(st.title) + '.mid');
  }

  // ── PNG para redes ──
  function toPNG(st) {
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
    const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 1350);
    g.addColorStop(0, '#0d0f16'); g.addColorStop(1, '#1d2334');
    x.fillStyle = g; x.fillRect(0, 0, 1080, 1350);
    for (let i = 0; i < 30; i++) {
      x.fillStyle = 'rgba(212,169,78,.02)';
      x.beginPath(); x.arc(Math.random() * 1080, Math.random() * 1350, 12 + Math.random() * 50, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = '#d4a94e'; x.font = '700 60px Georgia,serif';
    const title = (st.title || 'Sin título').toUpperCase();
    x.fillText(title, 70, 140);
    x.fillStyle = '#e9e7df'; x.font = '32px monospace';
    const g2 = C().GENRES[st.genre] || C().GENRES.pop;
    x.fillText(g2.name + ' · ' + st.bpm + ' BPM', 70, 198);
    x.fillStyle = '#96a0b5'; x.font = '24px monospace';
    x.fillText('letra compuesta en VATE Studio', 70, 248);

    let y = 330;
    const wrap = t => { const ws = t.split(' '); let line = ''; const out = [];
      ws.forEach(w => { if ((line + w).length > 44) { out.push(line); line = w + ' '; } else line += w + ' '; });
      out.push(line); return out; };
    outer:
    for (const s of st.sections) {
      if (y > 1180) break;
      x.fillStyle = '#d4a94e'; x.font = '700 30px monospace';
      x.fillText('[' + s.tag + ']', 70, y); y += 46;
      x.fillStyle = '#e9e7df'; x.font = '28px monospace';
      for (const l of (s.lyrics || '').split('\n')) {
        for (const ln of wrap(l)) {
          if (y > 1180) break outer;
          x.fillText(ln.trim(), 90, y); y += 40;
        }
      }
      y += 26;
    }
    x.fillStyle = 'rgba(233,231,223,.45)'; x.font = '24px monospace';
    x.fillText('compuesto con VATE Studio · 2026', 70, 1290);
    cv.toBlob(b => {
      const file = new File([b], U().slug(st.title) + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: st.title || 'VATE Studio' }).catch(() => U().download(b, file.name));
      } else U().download(b, file.name);
    });
  }

  return { sunoText, repeatedWords, toTXT, toMD, toJSON, toPDF, toMIDI, toPNG };
})();