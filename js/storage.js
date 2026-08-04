// storage.js — persistencia local
window.VATE = window.VATE || {};
VATE.storage = (function () {
  'use strict';
  
  const K = { 
    cur: 'vate.project', 
    proj: 'vate.projects', 
    prefs: 'vate.prefs' 
  };
  
  const get = (k, d) => { 
    try { 
      const v = JSON.parse(localStorage.getItem(k)); 
      return v ?? d; 
    } catch (e) { 
      return d; 
    } 
  };
  
  const set = (k, v) => { 
    try { 
      localStorage.setItem(k, JSON.stringify(v)); 
      return true; 
    } catch (e) { 
      return false; 
    } 
  };

  const newSection = (tag = 'Verse', extra = {}) => {
    return Object.assign(
      { 
        id: VATE.utils.uid(), 
        tag, 
        meta: '', 
        mood: 'neutral', 
        dynamics: 'mf', 
        instruments: '', 
        lyrics: '' 
      }, 
      extra
    );
  };

  function blank() {
    return {
      title: '', 
      genre: 'pop', 
      bpm: 100,
      sections: [newSection('Intro'), newSection('Verse'), newSection('Chorus')],
      ideas: [], 
      moodboard: { images: [], colors: [] }, 
      versions: [], 
      updatedAt: Date.now()
    };
  }

  function demo() {
    const s = blank();
    s.title = 'Neón en la Piel';
    s.genre = 'pop'; 
    s.bpm = 112;
    s.sections = [
      Object.assign(newSection('Intro', { 
        meta: 'pads brillantes, arpegio', 
        mood: 'esperanzador', 
        dynamics: 'mp', 
        instruments: 'sinte + vinilo' 
      }), { 
        lyrics: '(luces de la ciudad encendiéndose…)' 
      }),
      Object.assign(newSection('Verse', { 
        meta: 'voz cercana', 
        mood: 'nostalgico', 
        dynamics: 'mf' 
      }), { 
        lyrics: 'Guardo tu nombre en el neón de un bar\nla ciudad canta lo que no sé hablar\ncaminamos sin mapa ni porqué\nel semáforo en ámbar dijo: ve' 
      }),
      Object.assign(newSection('Pre-Chorus', { 
        meta: 'riser, palmas', 
        mood: 'energico', 
        dynamics: 'f' 
      }), { 
        lyrics: 'Y si el miedo pregunta, dile que no\nque esta noche el corazón mandó' 
      }),
      Object.assign(newSection('Chorus', { 
        meta: 'full mix, belted', 
        mood: 'alegre', 
        dynamics: 'ff' 
      }), { 
        lyrics: 'Neón en la piel, fuego en la voz\nsomos el verso que nadie escribió\nbaila conmigo lo que queda de ayer\nneón en la piel, ¡y que lo vea el amanecer!' 
      }),
      Object.assign(newSection('Bridge', { 
        meta: 'solo piano', 
        mood: 'triste', 
        dynamics: 'p' 
      }), { 
        lyrics: '(whispered) y si se apaga la luz…\nque nos alumbre el recuerdo' 
      }),
      Object.assign(newSection('Chorus', { 
        meta: 'modulación + ad-libs', 
        mood: 'alegre', 
        dynamics: 'ff' 
      }), { 
        lyrics: 'Neón en la piel, fuego en la voz\nsomos el verso que nadie escribió\nbaila conmigo lo que queda de ayer\nneón en la piel, ¡y que lo vea el amanecer!' 
      }),
      Object.assign(newSection('Outro', { 
        mood: 'nostalgico', 
        dynamics: 'mp' 
      }), { 
        lyrics: '(el neón parpadea… fade)' 
      })
    ];
    return s;
  }

  const loadCurrent = () => get(K.cur, null);
  const saveCurrent = (s) => { 
    s.updatedAt = Date.now(); 
    return set(K.cur, s); 
  };
  const loadProjects = () => get(K.proj, []);
  const saveProjects = (p) => set(K.proj, p);
  const prefs = { 
    get: () => get(K.prefs, {}), 
    set: (p) => set(K.prefs, p) 
  };

  return { 
    newSection, 
    blank, 
    demo, 
    loadCurrent, 
    saveCurrent, 
    loadProjects, 
    saveProjects, 
    prefs 
  };
})();

console.log('✅ storage.js cargado correctamente');
