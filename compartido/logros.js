/* CiccApps — logros comunes: medalla, aviso de «logro desbloqueado» y vitrina.
   Uso:
     CiccLogros.iniciar({ sb, app: 'bitacora', color: '#4B2E19', catalogo: LOGROS, motivos: { ... } });
     CiccLogros.evaluar({ racha: 12, paginas_total: 3400 });   // cada vez que cambian los datos
     CiccLogros.vitrina();                                     // desde el botón «Vitrina»
   Cada entrada del catálogo: { clave, nombre, texto, metrica, niveles: [7, 30, 100] o [1], unidad: 'días', unidad1: 'día', motivo, secreto, especial }.
   Medalla especial (el lucero de la marca en vez de rombos y canto de rayos): la llevan los secretos y los que marquen especial: true.
   Y entre todas, «Gran Colección»: todas las vitrinas completas, la de cada app y la de los logros comunes.
   Cada app tiene además, sin declararlo, «Vitrina completa»: todas sus medallas en oro. Se cambia con todos: { nombre, texto, motivo } o se quita con todos: false.
   Los colores y letras salen de las variables --cl-* (con las de la marca, --cc-*, por defecto). */
(function () {
  'use strict';

  // Metales envejecidos (oscuro, medio, claro): bronce viejo, plata con pátina y el oro viejo de la marca
  var METAL = { 1: ['#4E3119', '#8A6238', '#B48A5C'], 2: ['#545A55', '#9AA09A', '#C9CCC3'], 3: ['#7A5A22', '#C2A160', '#E6D09A'] };
  var NIVEL = { 1: 'Bronce', 2: 'Plata', 3: 'Oro' };
  var ORO_CLARO = ['#7A5A22', '#D4B470', '#F0DFAE']; // la medalla especial, un oro algo más luminoso
  var MOTIVOS = {
    llama: '<path d="M12 2.5c1.2 4 6 5.6 6 11a6 6 0 0 1-12 0c0-3 1.8-4.4 3-6.2.2 2 1.2 3.2 2.3 3.4-.4-3 .2-5.6.7-8.2z"/>',
    rosa: '<path d="M12 1.5l2.2 8.3 8.3 2.2-8.3 2.2L12 22.5l-2.2-8.3L1.5 12l8.3-2.2z"/>',
    estrella: '<path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/>',
    libro: '<path d="M2.5 5.5c3.3-1.2 6.6-1 9.5 1.2 2.9-2.2 6.2-2.4 9.5-1.2v13c-3.3-1.2-6.6-1-9.5 1.2-2.9-2.2-6.2-2.4-9.5-1.2z" fill="none" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 6.7v13" fill="none" stroke-width="1.6"/>',
    pluma: '<path d="M20.5 3.5C12 4 6.5 9.5 5.5 18.5l-2 2" fill="none" stroke-width="1.7" stroke-linecap="round"/><path d="M5.8 17.5c4.2-.2 9.6-3.4 12-9.5" fill="none" stroke-width="1.7" stroke-linecap="round"/>',
    pagina: '<path d="M5.5 2.5h9l4 4v15h-13z" fill="none" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h5" fill="none" stroke-width="1.6" stroke-linecap="round"/>',
    calendario: '<rect x="3" y="4.5" width="18" height="16" rx="2" fill="none" stroke-width="1.6"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4" fill="none" stroke-width="1.6" stroke-linecap="round"/><path d="M7.5 15l3 3 6-6" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    laurel: '<path d="M12 21.5V9" fill="none" stroke-width="1.6" stroke-linecap="round"/><path d="M12 9c-1.6-2-1.6-4.4 0-6.5 1.6 2.1 1.6 4.5 0 6.5zM12 13.5c-2.6.2-4.5-1.2-5.3-3.6 2.5-.3 4.4 1.1 5.3 3.6zM12 13.5c2.6.2 4.5-1.2 5.3-3.6-2.5-.3-4.4 1.1-5.3 3.6zM12 18c-2.6.2-4.5-1.2-5.3-3.6 2.5-.3 4.4 1.1 5.3 3.6zM12 18c2.6.2 4.5-1.2 5.3-3.6-2.5-.3-4.4 1.1-5.3 3.6z"/>',
    corona: '<path d="M3 18.5h18l1.2-11-5.7 4.3L12 4l-4.5 7.8L1.8 7.5z" stroke-linejoin="round"/><path d="M3.5 21h17" fill="none" stroke-width="1.6" stroke-linecap="round"/>',
    monograma: '<text x="9.6" y="18" text-anchor="middle" font-family="Georgia, serif" font-size="17" stroke="none">C</text><text x="14.4" y="18" text-anchor="middle" font-family="Georgia, serif" font-size="17" stroke="none">C</text>',
    llave: '<circle cx="7.5" cy="12" r="4.3" fill="none" stroke-width="1.8"/><path d="M11.8 12h10M18.5 12v3.5M21.8 12v2.5" fill="none" stroke-width="1.8" stroke-linecap="round"/>',
    secreto: '<text x="12" y="18.5" text-anchor="middle" font-family="Georgia, serif" font-size="20" stroke="none">?</text>'
  };
  // Logros entre apps: se cuentan con metricas_comunes() en Supabase y se guardan con app = 'ciccapps'
  var COMUNES = [
    { clave: 'mente_cuerpo', nombre: 'Mente y cuerpo', texto: 'Días con lectura y entreno o salida', metrica: 'dias_mente_cuerpo', niveles: [10, 50, 150], unidad: 'días', unidad1: 'día', motivo: 'laurel' }
  ];
  // Apps con logros: cuentan para «Gran Colección» (añadir aquí cada app nueva que los tenga)
  var APPS_CON_LOGROS = ['bitacora', 'platea', 'vinilo', 'palestra', 'sendero'];
  var GRAN = { clave: 'gran_coleccion', nombre: 'Gran Colección', texto: 'Todas las medallas de todas las CiccApps en oro', metrica: '_gran', niveles: [APPS_CON_LOGROS.length + 1], unidad: 'vitrinas', unidad1: 'vitrina', motivo: 'monograma', especial: true };
  COMUNES.push(GRAN);
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  var cfg = null, usuario = null, estado = {}, cola = [], avisando = false, listo = null, n = 0;

  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { return Number(v).toLocaleString('es-ES', { maximumFractionDigits: 1 }); }
  function hoy() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function fecha(iso) { if (!iso) return ''; var p = String(iso).slice(0, 10).split('-'); return Number(p[2]) + ' ' + MESES[Number(p[1]) - 1] + (p[0] !== String(new Date().getFullYear()) ? ' ' + p[0] : ''); }
  function clave(app, c) { return app + '/' + c; }
  // «Vitrina completa»: todas las medallas de la app en oro (los secretos incluidos)
  function completa() {
    if (cfg.todos === false || !(cfg.catalogo || []).length) return [];
    var t = cfg.todos || {}, n0 = cfg.catalogo.length;
    return [{ clave: '_todos', nombre: t.nombre || 'Vitrina completa', texto: t.texto || 'Todas las medallas de ' + (cfg.nombre || 'la app') + ' en oro', metrica: '_todos', niveles: [n0], unidad: 'oros', unidad1: 'oro', motivo: t.motivo || 'corona', especial: true }];
  }
  function catalogo() { return (cfg.catalogo || []).concat(completa()); }
  function especial(l) { return !!(l && (l.especial || l.secreto)); }
  function nombreNivel(l, k) { return especial(l) ? 'Especial' : NIVEL[k]; }
  function todos() { return catalogo().map(function (l) { return { app: cfg.app, l: l }; }).concat(COMUNES.map(function (l) { return { app: 'ciccapps', l: l }; })); }
  function fila(app, c) { return estado[clave(app, c)] || { nivel: 0, visto: 0, progreso: 0, fechas: {} }; }
  function reducido() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  // Medalla en SVG: disco del color de la app, canto del metal del nivel y rombos del mismo metal con filete claro
  function aclara(hex, f) {
    var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    function t(v) { return Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)); }
    return 'rgb(' + t(r) + ',' + t(g) + ',' + t(b) + ')';
  }
  function medalla(o) {
    var id = 'cl' + (n++), niv = o.nivel || 0, m = o.especial && niv ? ORO_CLARO : METAL[niv], c = o.color || (cfg && cfg.color) || '#1D3A32';
    var motivo = (o.secreto ? MOTIVOS.secreto : ((cfg && cfg.motivos && cfg.motivos[o.motivo]) || MOTIVOS[o.motivo] || MOTIVOS.estrella));
    var s = '<svg class="cl-medalla" viewBox="0 0 100 100" aria-hidden="true" focusable="false">';
    if (m) {
      s += '<defs><linearGradient id="' + id + 'c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + m[2] + '"/><stop offset=".45" stop-color="' + m[1] + '"/><stop offset="1" stop-color="' + m[0] + '"/></linearGradient>' +
        '<radialGradient id="' + id + 'd" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="' + aclara(c, .28) + '"/><stop offset=".6" stop-color="' + c + '"/><stop offset="1" stop-color="' + aclara(c, -.35) + '"/></radialGradient></defs>' +
        (o.especial ? '<path d="' + rayos() + '" fill="url(#' + id + 'c)" stroke="' + m[0] + '" stroke-opacity=".5" stroke-width=".6" stroke-linejoin="round"/>' +
          '<circle cx="50" cy="50" r="43" fill="none" stroke="#F0DFAE" stroke-opacity=".8" stroke-width=".8"/>'
        : '<circle cx="50" cy="50" r="47" fill="url(#' + id + 'c)"/>' +
          '<circle cx="50" cy="50" r="44.5" fill="none" stroke="' + m[0] + '" stroke-opacity=".55" stroke-width="2.4" stroke-dasharray="1.1 1.6"/>') +
        '<circle cx="50" cy="50" r="40" fill="url(#' + id + 'd)"/>' +
        '<circle cx="50" cy="50" r="36" fill="none" stroke="#D9B878" stroke-opacity=".75" stroke-width=".9"/>' +
        '<g transform="translate(32 26) scale(1.5)" fill="#E8CF97" stroke="#E8CF97">' + motivo + '</g>';
      if (o.especial) s += '<path d="' + LUCERO + '" fill="url(#' + id + 'c)" stroke="#EADBB4" stroke-width=".8" stroke-linejoin="round"/>'; // el lucero de la marca
      else for (var i = 0; i < niv; i++) {
        var x = 50 + (i - (niv - 1) / 2) * 10.5;
        s += '<path d="M' + x + ' 69l4 4.4-4 4.4-4-4.4z" fill="url(#' + id + 'c)" stroke="#EADBB4" stroke-width=".9"/>';
      }
    } else {
      var p = Math.max(0, Math.min(1, o.progreso || 0)), L = 2 * Math.PI * 44;
      s += (o.especial ? '<path d="' + rayos() + '" fill="var(--cl-vacio)" stroke="var(--cl-relieve)" stroke-width=".8" stroke-linejoin="round"/>' : '<circle cx="50" cy="50" r="47" fill="var(--cl-vacio)"/>') +
        '<circle cx="50" cy="50" r="44" fill="none" stroke="var(--cl-relieve)" stroke-width="3"/>';
      if (p > 0) s += '<circle cx="50" cy="50" r="44" fill="none" stroke="var(--cl-oro)" stroke-width="3" stroke-linecap="round" stroke-dasharray="' + (L * p).toFixed(1) + ' ' + L.toFixed(1) + '" transform="rotate(-90 50 50)"/>';
      s += '<circle cx="50" cy="50" r="36" fill="none" stroke="var(--cl-relieve)" stroke-width=".9"/>' +
        '<g transform="translate(32 28) scale(1.5)" fill="var(--cl-relieve)" stroke="var(--cl-relieve)">' + motivo + '</g>';
    }
    return s + '</svg>';
  }

  // Canto de la medalla especial: 32 rayos, como el de una condecoración
  // Lucero: la estrella fina de cuatro puntas de la marca (la del sello), bajo el motivo
  var LUCERO = 'M50 65.6Q51.3 73.2 58.9 74.5Q51.3 75.8 50 83.4Q48.7 75.8 41.1 74.5Q48.7 73.2 50 65.6z';
  var RAYOS = null;
  function rayos() {
    if (RAYOS) return RAYOS;
    var d = '';
    for (var i = 0; i < 64; i++) { var a = Math.PI * i / 32 - Math.PI / 2, r = i % 2 ? 45.2 : 48.6; d += (i ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(2) + ' ' + (50 + r * Math.sin(a)).toFixed(2); }
    return (RAYOS = d + 'z');
  }

  // Nivel que corresponde a un valor, y lo que falta para el siguiente
  function nivelDe(l, v) { var k = 0; (l.niveles || []).forEach(function (u) { if (v >= u) k++; }); return Math.min(k, 3); }
  function nivelVisible(l, k) { return (l.niveles || []).length === 1 && k ? 3 : k; } // una distinción de un solo nivel se acuña en oro
  function siguiente(l, f) {
    var niv = l.niveles || [], k = Math.min(f.nivel, niv.length);
    if (k >= niv.length) return null;
    var falta = niv[k] - (f.progreso || 0), base = k ? niv[k - 1] : 0;
    return { meta: niv[k], falta: Math.max(0, falta), nivel: niv.length === 1 ? 3 : k + 1, parte: Math.max(0, Math.min(1, ((f.progreso || 0) - base) / (niv[k] - base))) };
  }
  function unidad(l, v) { var u = Number(v) === 1 && l.unidad1 ? l.unidad1 : l.unidad; return u ? ' ' + u : ''; } // «1 día», «2 días»

  // Arranque: lee lo conseguido de esta app y de los logros entre apps
  function iniciar(op) {
    cfg = op || {};
    listo = (async function () {
      try {
        var u = await cfg.sb.auth.getUser(); usuario = u.data && u.data.user ? u.data.user.id : null;
        var r = await cfg.sb.from('logros').select('*').in('app', [cfg.app, 'ciccapps']);
        (r.data || []).forEach(function (f) { estado[clave(f.app, f.clave)] = f; });
        var mc = await cfg.sb.rpc('metricas_comunes');
        if (mc && mc.data) await comparar('ciccapps', COMUNES, mc.data, false);
      } catch (e) { /* sin conexión: se vuelve a intentar en la siguiente evaluación */ }
    })();
    return listo;
  }

  // Compara cifras con umbrales, guarda lo que cambia y avisa de lo nuevo
  async function comparar(app, catalogo, metricas, estreno) {
    var cambios = [], nuevos = [];
    catalogo.forEach(function (l) {
      if (!(l.metrica in metricas)) return;
      var v = Number(metricas[l.metrica]) || 0, f = fila(app, l.clave), k = nivelVisible(l, nivelDe(l, v));
      var g = { user_id: usuario, app: app, clave: l.clave, nivel: Math.max(f.nivel, k), progreso: v, fechas: Object.assign({}, f.fechas), visto: f.visto };
      for (var i = f.nivel + 1; i <= g.nivel; i++) if (!g.fechas[i]) g.fechas[i] = hoy();
      if (g.nivel > g.visto) { nuevos.push({ l: l, f: g }); g.visto = g.nivel; }
      if (g.nivel !== f.nivel || g.progreso !== Number(f.progreso) || g.visto !== f.visto) { cambios.push(g); estado[clave(app, l.clave)] = g; }
    });
    if (cambios.length && usuario) {
      try { await cfg.sb.from('logros').upsert(cambios, { onConflict: 'user_id,app,clave' }); } catch (e) {}
    }
    if (estreno && nuevos.length > 1) avisar({ resumen: nuevos });
    else nuevos.forEach(function (x) { avisar(x); });
    return nuevos;
  }

  async function evaluar(metricas) {
    if (!cfg) return [];
    if (listo) await listo;
    var estreno = !(cfg.catalogo || []).some(function (l) { return estado[clave(cfg.app, l.clave)]; });
    var nuevos = await comparar(cfg.app, cfg.catalogo || [], metricas || {}, estreno), c = completa();
    if (c.length) {
      var oros = cfg.catalogo.filter(function (l) { return fila(cfg.app, l.clave).nivel >= 3; }).length;
      nuevos = nuevos.concat(await comparar(cfg.app, c, { _todos: oros }, false));
    }
    return nuevos.concat(await gran());
  }

  // «Gran Colección»: cuántas vitrinas están completas (cada app con logros y la de los comunes)
  async function gran() {
    if (!usuario) return [];
    var hechas = {};
    try {
      var r = await cfg.sb.from('logros').select('app,nivel').eq('clave', '_todos').in('app', APPS_CON_LOGROS);
      (r.data || []).forEach(function (f) { if (f.nivel >= 3) hechas[f.app] = 1; });
    } catch (e) { return []; }
    if (fila(cfg.app, '_todos').nivel >= 3) hechas[cfg.app] = 1;
    if (COMUNES.every(function (l) { return l === GRAN || fila('ciccapps', l.clave).nivel >= 3; })) hechas.ciccapps = 1;
    return comparar('ciccapps', [GRAN], { _gran: Object.keys(hechas).length }, false);
  }

  // Aviso: baja desde arriba, la medalla gira, dura cinco segundos y al tocarlo abre la vitrina
  function avisar(x) { cola.push(x); if (!avisando) siguienteAviso(); }
  function siguienteAviso() {
    var x = cola.shift(); if (!x) { avisando = false; return; }
    avisando = true;
    var a = el('div', { 'class': 'cl-aviso', role: 'status', 'aria-live': 'polite', tabindex: '0' });
    if (x.resumen) {
      var pila = x.resumen.slice().sort(function (a, b) { return b.f.nivel - a.f.nivel; }).slice(0, 3).map(function (y) { return medalla({ nivel: y.f.nivel, motivo: y.l.motivo, especial: especial(y.l) }); }).join('');
      a.innerHTML = '<span class="cl-pila">' + pila + '</span><span class="cl-aviso-txt"><span class="cl-eti">Tu historial ya cuenta</span><b>' + x.resumen.length + ' medallas desbloqueadas</b><span>Toca para verlas en la vitrina</span></span>';
    } else {
      var eti = x.l.secreto ? 'Logro secreto · Medalla especial' : especial(x.l) ? 'Medalla especial' : 'Logro desbloqueado · ' + NIVEL[x.f.nivel];
      a.innerHTML = medalla({ nivel: x.f.nivel, motivo: x.l.motivo, especial: especial(x.l) }) + '<span class="cl-aviso-txt"><span class="cl-eti">' + eti + '</span><b>' + esc(x.l.nombre) + '</b><span>' + esc(texto(x.l, x.f)) + '</span></span>';
    }
    document.body.appendChild(a);
    requestAnimationFrame(function () { a.classList.add('cl-dentro'); });
    var y0 = null, t = setTimeout(cerrar, 5000);
    function cerrar() { clearTimeout(t); a.classList.remove('cl-dentro'); a.classList.add('cl-fuera'); setTimeout(function () { a.remove(); siguienteAviso(); }, reducido() ? 150 : 350); }
    a.addEventListener('click', function () { cerrar(); vitrina(); });
    a.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cerrar(); vitrina(); } if (e.key === 'Escape') cerrar(); });
    a.addEventListener('touchstart', function (e) { y0 = e.touches[0].clientY; }, { passive: true });
    a.addEventListener('touchmove', function (e) { if (y0 != null && e.touches[0].clientY - y0 < -24) { y0 = null; cerrar(); } }, { passive: true });
  }
  // «30 días seguidos leyendo»: la cifra del nivel conseguido y el texto del logro
  function texto(l, f) {
    var niv = l.niveles || [];
    if (niv.length === 1) return l.texto;
    var u = niv[Math.min(f.nivel, niv.length) - 1];
    return num(u) + unidad(l, u) + ' · ' + l.texto.charAt(0).toLowerCase() + l.texto.slice(1);
  }

  // Columnas de la vitrina: las que caben, sin dejar una medalla sola en la última fila
  function columnas(total, ancho) {
    var base = ancho < 560 ? 3 : ancho < 900 ? 4 : 6;
    var prueba = [base, base + 1, base - 1, base - 2];
    for (var i = 0; i < prueba.length; i++) { var c = prueba[i]; if (c >= 2 && (total <= c || total % c !== 1)) return c; }
    return base;
  }

  // Vitrina: hoja desde abajo en el móvil y ventana centrada en el ordenador
  function vitrina() {
    if (!cfg || document.querySelector('.cl-vitrina')) return;
    var antes = document.activeElement;
    var fondo = el('div', { 'class': 'cl-vitrina' });
    var hoja = el('div', { 'class': 'cl-hoja', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'clTit', tabindex: '-1' });
    fondo.appendChild(hoja); document.body.appendChild(fondo);
    document.documentElement.classList.add('cl-abierta');
    function cerrar() { fondo.classList.remove('cl-dentro'); setTimeout(function () { fondo.remove(); }, reducido() ? 0 : 250); document.documentElement.classList.remove('cl-abierta'); document.removeEventListener('keydown', tecla); if (antes && antes.focus) antes.focus(); }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', tecla);
    fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });

    function lista() {
      var app = todos().filter(function (x) { return x.app === cfg.app; }), comunes = todos().filter(function (x) { var f = fila(x.app, x.l.clave); return x.app !== cfg.app && (f.nivel || f.progreso); });
      var hay = app.concat(comunes), con = hay.filter(function (x) { return fila(x.app, x.l.clave).nivel; });
      var pend = hay.filter(function (x) { return siguiente(x.l, fila(x.app, x.l.clave)); });
      var total = hay.length, ganadas = con.length;
      function rejilla(xs, modo) {
        var c = columnas(xs.length, hoja.clientWidth || innerWidth);
        return '<div class="cl-rejilla" style="--cl-cols:' + c + '">' + xs.map(function (x) {
          var f = fila(x.app, x.l.clave), s = siguiente(x.l, f), nota;
          if (modo === 'con') nota = nombreNivel(x.l, f.nivel) + '<br>' + fecha(f.fechas && f.fechas[f.nivel]);
          else if (x.l.secreto && !f.nivel) nota = 'Sigue y<br>lo verás';
          else if ((x.l.niveles || []).length === 1 && x.l.niveles[0] === 1) nota = 'Por<br>conseguir';
          else if ((x.l.niveles || []).length === 1) nota = (s.falta === 1 ? 'Falta ' : 'Faltan ') + num(s.falta) + unidad(x.l, s.falta);
          else nota = (s.falta === 1 ? 'Falta ' : 'Faltan ') + num(s.falta) + unidad(x.l, s.falta) + '<br>para ' + NIVEL[s.nivel].toLowerCase();
          var secreto = x.l.secreto && !f.nivel;
          return '<button type="button" class="cl-med" data-app="' + x.app + '" data-clave="' + esc(x.l.clave) + '">' +
            (modo === 'con' ? medalla({ nivel: f.nivel, motivo: x.l.motivo, especial: especial(x.l) }) : medalla({ nivel: 0, motivo: x.l.motivo, progreso: s ? s.parte : 0, secreto: secreto, especial: especial(x.l) })) +
            '<b>' + (secreto ? 'Secreto' : esc(x.l.nombre)) + '</b><small>' + nota + '</small></button>';
        }).join('') + '</div>';
      }
      hoja.innerHTML = '<div class="cl-cab cl-con-barra"><div>' + (cfg.nombre ? '<span class="cl-ante">' + esc(cfg.nombre) + '</span>' : '') + '<h2 id="clTit">Vitrina</h2>' +
        '<span class="cl-cuenta"><b>' + ganadas + '</b> de ' + total + ' medallas</span></div><button type="button" class="cl-cerrar" aria-label="Cerrar">×</button>' +
        '<div class="cl-barra"><i style="width:' + (total ? Math.round(ganadas / total * 100) : 0) + '%"></i></div></div><div class="cc-cuerpo">' +
        (con.length ? '<div class="cl-grupo"><span class="cl-eti">Conseguidas</span>' + rejilla(con, 'con') + '</div>' : '<p class="cl-vacio-txt">Aún no tienes medallas. La primera llega antes de lo que crees.</p>') +
        (pend.length ? '<div class="cl-grupo"><span class="cl-eti">Pendientes</span>' + rejilla(pend, 'pend') + '</div>' : '') + '</div>';
      hoja.querySelector('.cl-cerrar').onclick = cerrar;
      hoja.querySelectorAll('.cl-med').forEach(function (b) { b.onclick = function () { detalle(b.dataset.app, b.dataset.clave); }; });
    }
    function detalle(app, c) {
      var x = todos().filter(function (y) { return y.app === app && y.l.clave === c; })[0]; if (!x) return;
      var l = x.l, f = fila(app, c), s = siguiente(l, f), secreto = l.secreto && !f.nivel, niv = l.niveles || [];
      var filas = niv.map(function (u, i) {
        var k = niv.length === 1 ? 3 : i + 1, ok = f.nivel >= k;
        return '<li class="' + (ok ? 'cl-ok' : '') + '"><span>' + nombreNivel(l, k) + '</span><span>' + (secreto ? '?' : niv.length === 1 && u === 1 ? '' : num(u) + unidad(l, u)) + '</span><span>' + (ok ? fecha(f.fechas && f.fechas[k]) : '—') + '</span></li>';
      }).join('');
      hoja.innerHTML = '<div class="cl-cab"><button type="button" class="cl-volver">‹ Vitrina</button><button type="button" class="cl-cerrar" aria-label="Cerrar">×</button></div>' +
        '<div class="cc-cuerpo"><div class="cl-detalle">' + medalla(f.nivel ? { nivel: f.nivel, motivo: l.motivo, especial: especial(l) } : { nivel: 0, motivo: l.motivo, progreso: s ? s.parte : 0, secreto: secreto, especial: especial(l) }) +
        '<h2 id="clTit">' + (secreto ? 'Logro secreto' : esc(l.nombre)) + '</h2><p>' + (secreto ? 'Se revela al conseguirlo.' : esc(l.texto)) + '</p>' +
        (s && !secreto && niv.length > 1 ? '<p class="cl-falta">' + (s.falta === 1 ? 'Falta ' : 'Faltan ') + num(s.falta) + unidad(l, s.falta) + ' para ' + NIVEL[s.nivel].toLowerCase() + '</p>' : '') +
        (s && niv.length === 1 && niv[0] > 1 ? '<p class="cl-falta">' + (s.falta === 1 ? 'Falta ' : 'Faltan ') + num(s.falta) + unidad(l, s.falta) + '</p>' : '') +
        '<ul class="cl-niveles">' + filas + '</ul></div></div>';
      hoja.querySelector('.cl-cerrar').onclick = cerrar;
      hoja.querySelector('.cl-volver').onclick = function () { lista(); hoja.focus(); };
      hoja.scrollTop = 0; hoja.focus();
    }
    lista();
    requestAnimationFrame(function () { fondo.classList.add('cl-dentro'); });
    hoja.focus();
  }

  // Medallas conseguidas (para la línea de la portada)
  function total() { return Object.keys(estado).filter(function (k) { return estado[k].nivel > 0; }).length; }

  window.CiccLogros = { iniciar: iniciar, evaluar: evaluar, vitrina: vitrina, medalla: medalla, total: total, columnas: columnas };
})();
