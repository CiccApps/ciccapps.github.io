/* CiccApps — tarjetas para compartir: se dibujan en el móvil (canvas) y salen al menú de compartir del iPhone.
   Uso:
     CiccCompartir.abrir({
       app: 'bitacora', titulo: 'La tregua', sub: 'Terminado el 20 oct · 5 estrellas',
       opciones: [{ clave: 'nota', texto: 'Mi nota', activa: true }],
       frase: { texto: '', sugerir: async () => '…' },        // opcional: línea editable (la sugerencia puede venir de la IA)
       bloques: (op) => [ { tipo: 'eti', texto: 'Libro terminado' }, { tipo: 'titulo', texto: 'La tregua' }, … ]
     });
   También: CiccCompartir.dibujar(canvas, { app, formato, bloques }) y CiccCompartir.archivo({ … }) → Promise<File>.
   Bloques: eti, titulo, texto, cita, estrellas, cifras, imagen, imagenes, libro, svg, nota, espacio y dibujo (a medida). */
(function () {
  'use strict';

  var FORMATOS = { historia: [1080, 1920], publicacion: [1080, 1350] };
  var LETRAS = { titulo: '"Libre Caslon Display", Georgia, serif', serif: '"Libre Caslon Text", Georgia, serif', sans: '"Instrument Sans", system-ui, sans-serif' };
  // Fondo de cada app: degradado radial (claro, medio, oscuro), tinta y oro; las letras propias sustituyen a las de la marca
  var ESTILOS = {
    ciccapps: { nombre: 'CiccApps', fondo: ['#2C5246', '#1D3A32', '#0F1E1A'] },
    bitacora: { nombre: 'Bitácora', fondo: ['#6A4428', '#4B2E19', '#2A190D'] },
    platea: { nombre: 'Platea', fondo: ['#7A2534', '#5E1A26', '#2E0C12'], letras: { titulo: '"Limelight", Georgia, serif', sans: '"Manrope", system-ui, sans-serif', cifra: '700 1em "Manrope", system-ui, sans-serif' } },
    vinilo: { nombre: 'Vinilo', fondo: ['#2A3760', '#1A2440', '#0B1020'], letras: { titulo: '"DM Serif Display", Georgia, serif', serif: '"DM Serif Display", Georgia, serif', sans: '"Karla", system-ui, sans-serif' } },
    palestra: { nombre: 'Palestra', fondo: ['#A8402F', '#8B2E20', '#4A150D'] },
    sendero: { nombre: 'Sendero', fondo: ['#68675C', '#4E4D44', '#26261F'] }
  };
  var TINTA = '#F3EFE4', ORO = '#D9B878';

  function estilo(app) { var e = ESTILOS[app] || { nombre: app, fondo: ESTILOS.ciccapps.fondo }; var l = Object.assign({}, LETRAS, e.letras || {}); return { nombre: e.nombre, fondo: e.fondo, l: l }; }
  function fuente(peso, px, familia, cursiva) { return (cursiva ? 'italic ' : '') + peso + ' ' + Math.round(px) + 'px ' + familia; }

  // Carga de imágenes con permiso de lectura (TMDB y las portadas lo dan); si falla, el bloque usa su alternativa
  var cache = {};
  function imagen(src) {
    if (!src) return Promise.resolve(null);
    if (typeof src !== 'string') return Promise.resolve(src);
    if (!cache[src]) cache[src] = new Promise(function (ok) {
      var i = new Image(); i.crossOrigin = 'anonymous'; i.decoding = 'async';
      i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src;
    });
    return cache[src];
  }
  function svgImagen(svg) {
    var s = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" ');
    return imagen('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s));
  }
  async function fuentes(es) {
    if (!document.fonts || !document.fonts.load) return;
    var l = es.l, piden = ['400 40px ' + l.titulo, '400 40px ' + l.serif, 'italic 400 40px ' + l.serif, '600 40px ' + l.sans, '400 40px ' + l.sans];
    if (l.cifra) piden.push(l.cifra.replace('1em', '40px'));
    try { await Promise.all(piden.map(function (f) { return document.fonts.load(f, 'Aá«»·'); })); } catch (e) {}
  }

  // Corta el texto en líneas y las equilibra para que la última no quede con una palabra sola
  function lineas(ctx, txt, ancho, max) {
    function corta(w) {
      var pal = String(txt).split(/\s+/).filter(Boolean), r = [], l = '';
      pal.forEach(function (p) { var t = l ? l + ' ' + p : p; if (l && ctx.measureText(t).width > w) { r.push(l); l = p; } else l = t; });
      if (l) r.push(l); return r;
    }
    var r = corta(ancho);
    if (r.length > 1) { var lo = ancho * .55, hi = ancho; while (hi - lo > 4) { var m = (lo + hi) / 2; if (corta(m).length > r.length) lo = m; else hi = m; } r = corta(hi); }
    if (max && r.length > max) { r = r.slice(0, max); r[max - 1] = r[max - 1].replace(/\s*\S*$/, '') + '…'; }
    return r;
  }
  function rect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function cubre(ctx, img, x, y, w, h) { var k = Math.max(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k; ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }

  // Cada bloque se mide (alto) y se pinta en su sitio; k escala todo si no cabe
  function medir(ctx, b, W, es, k, imgs, disp) {
    var l = es.l, u = 3.86 * k, A = W * .78, X0 = 0, ls, alto;
    function texto(f, color, lh, max, ancho, extra) {
      ctx.font = f; ls = lineas(ctx, b.texto, ancho || A, max); alto = ls.length * lh;
      return { alto: alto + (extra || 0), pinta: function (y) { ctx.font = f; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ls.forEach(function (t, i) { ctx.fillText(t, W / 2 + X0, y + (i + .78) * lh); }); } };
    }
    switch (b.tipo) {
      case 'eti':
        b = Object.assign({}, b, { texto: String(b.texto).toLocaleUpperCase('es') });
        ctx.letterSpacing = (2 * u) + 'px'; var e = texto(fuente(600, 10 * u, l.sans), ORO, 14 * u, 2); ctx.letterSpacing = '0px';
        var p0 = e.pinta; e.pinta = function (y) { ctx.letterSpacing = (2 * u) + 'px'; p0(y); ctx.letterSpacing = '0px'; }; return e;
      case 'titulo': return texto(fuente(400, (b.tam || 26) * u, l.titulo), TINTA, (b.tam || 26) * 1.12 * u, 3);
      case 'texto': return texto(fuente(400, (b.tam || 13) * u, l.sans), 'rgba(243,239,228,.85)', (b.tam || 13) * 1.4 * u, 3);
      case 'cita': return texto(fuente(400, 14 * u, l.serif, true), 'rgba(243,239,228,.92)', 14 * 1.4 * u, 5);
      case 'nota': return texto(fuente(400, 8 * u, l.sans), 'rgba(243,239,228,.6)', 11 * u, 1);
      case 'estrellas': return { alto: 20 * u, pinta: function (y) { ctx.font = fuente(400, 15 * u, l.sans); ctx.fillStyle = ORO; ctx.textAlign = 'center'; ctx.letterSpacing = (3 * u) + 'px'; ctx.fillText('★★★★★'.slice(0, b.n || 5), W / 2 + 1.5 * u, y + 15 * u); ctx.letterSpacing = '0px'; } };
      case 'espacio': return { alto: (b.alto || 10) * u, pinta: function () {} };
      case 'cifras':
        var n = b.items.length, g = 10 * u, cw = (A - g * (n - 1)) / n, ch = 54 * u;
        return { alto: ch, pinta: function (y) {
          b.items.forEach(function (it, i) {
            var x = (W - A) / 2 + i * (cw + g); ctx.fillStyle = 'rgba(0,0,0,.22)'; rect(ctx, x, y, cw, ch, 8 * u); ctx.fill();
            ctx.textAlign = 'center'; ctx.fillStyle = TINTA; ctx.font = l.cifra ? l.cifra.replace('1em', Math.round(26 * u) + 'px') : fuente(400, 28 * u, l.titulo); ctx.fillText(String(it[0]), x + cw / 2, y + 30 * u);
            ctx.font = fuente(400, 10 * u, l.sans); ctx.fillStyle = 'rgba(243,239,228,.85)'; ctx.fillText(it[1], x + cw / 2, y + 45 * u);
          });
        } };
      case 'imagenes':
        var m = b.srcs.length, gg = 6 * u, iw = (A - gg * (m - 1)) / m, ih = Math.min(iw * 1.5, disp * .26 * k); iw = ih / 1.5;
        var fila = iw * m + gg * (m - 1);
        return { alto: ih, pinta: function (y) {
          b.srcs.forEach(function (s, i) {
            var x = (W - fila) / 2 + i * (iw + gg), im = imgs[s]; ctx.save(); rect(ctx, x, y, iw, ih, 4 * u); ctx.clip();
            if (im) cubre(ctx, im, x, y, iw, ih); else { ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x, y, iw, ih); }
            ctx.restore();
          });
        } };
      case 'imagen': case 'libro': case 'svg':
        // En la publicación (4:5) la imagen se limita en alto para que el texto no encoja
        var pr = b.proporcion || (b.tipo === 'svg' ? 1 : 1.5), w = A * (b.ancho || (b.tipo === 'svg' ? .78 : .58)), h = Math.min(w * pr, disp * .4 * k), im2 = imgs[b.src || b.svg]; w = h / pr;
        return { alto: h, pinta: function (y) {
          var x = (W - w) / 2;
          ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 22 * u; ctx.shadowOffsetY = 10 * u;
          if (b.tipo === 'svg') { if (im2) ctx.drawImage(im2, x, y, w, h); ctx.restore(); return; }
          rect(ctx, x, y, w, h, b.tipo === 'libro' ? 5 * u : 6 * u); ctx.fillStyle = b.color || '#2B5079'; ctx.fill(); ctx.restore();
          ctx.save(); rect(ctx, x, y, w, h, b.tipo === 'libro' ? 5 * u : 6 * u); ctx.clip();
          if (im2) cubre(ctx, im2, x, y, w, h);
          else if (b.tipo === 'libro') {
            ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x, y, w * .07, h);
            var pad = w * .12; ctx.textAlign = 'left'; ctx.fillStyle = TINTA; ctx.font = fuente(400, w * .13, l.titulo);
            var tl = lineas(ctx, b.titulo || '', w - pad * 2, 4), lh = w * .145, ty = y + h / 2 - (tl.length * lh) / 2;
            tl.forEach(function (t, i) { ctx.fillText(t, x + pad, ty + (i + .8) * lh); });
            if (b.autor) { ctx.font = fuente(400, w * .068, l.sans); ctx.globalAlpha = .85; ctx.fillText(lineas(ctx, b.autor, w - pad * 2, 1)[0], x + pad, ty + tl.length * lh + w * .1); ctx.globalAlpha = 1; }
          }
          ctx.restore();
        } };
      case 'dibujo': return { alto: (b.alto || 60) * u, pinta: function (y) { b.pinta(ctx, (W - A) / 2, y, A, (b.alto || 60) * u, u); } };
    }
    return { alto: 0, pinta: function () {} };
  }
  // Separación entre bloques (en px de la maqueta) según lo que viene antes y después
  function hueco(a, b) {
    if (!a) return 0;
    if (a.tipo === 'titulo' && b.tipo === 'texto') return 4;
    if (b.tipo === 'nota') return 6;
    if (a.tipo === 'eti' || b.tipo === 'eti') return 12;
    if (/imagen|libro|svg|cifras|imagenes/.test(a.tipo + b.tipo)) return 22;
    return 10;
  }

  async function dibujar(canvas, op) {
    var f = FORMATOS[op.formato] || FORMATOS.historia, W = f[0], H = f[1], es = estilo(op.app);
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d'), bloques = (op.bloques || []).filter(Boolean), imgs = {};
    await fuentes(es);
    await Promise.all(bloques.map(function (b) {
      if (b.tipo === 'svg') return svgImagen(b.svg).then(function (i) { imgs[b.svg] = i; });
      if (b.tipo === 'imagenes') return Promise.all(b.srcs.map(function (s) { return imagen(s).then(function (i) { imgs[s] = i; }); }));
      if (b.src) return imagen(b.src).then(function (i) { imgs[b.src] = i; });
    }));

    // Fondo, viñeta suave y marco dorado
    var g = ctx.createRadialGradient(W * .4, H * .2, 0, W * .4, H * .2, Math.max(W, H) * .95);
    g.addColorStop(0, es.fondo[0]); g.addColorStop(.55, es.fondo[1]); g.addColorStop(1, es.fondo[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var m = W * .045; ctx.strokeStyle = 'rgba(217,184,120,.55)'; ctx.lineWidth = 3; rect(ctx, m, m, W - 2 * m, H - 2 * m, 30); ctx.stroke();

    // Contenido centrado entre el margen superior y la firma; si no cabe, se reduce todo un poco
    var A = W * .78, top = H * (op.formato === 'publicacion' ? .1 : .12), fin = H - H * (op.formato === 'publicacion' ? .16 : .15), k = 1, piezas, total;
    for (var it = 0; it < 12; it++) {
      piezas = bloques.map(function (b) { return medir(ctx, b, W, es, k, imgs, fin - top); });
      total = piezas.reduce(function (s, p, i) { return s + p.alto + hueco(bloques[i - 1], bloques[i]) * 3.86 * k; }, 0);
      if (total <= fin - top) break; k *= .93;
    }
    var y = top + (fin - top - total) / 2;
    piezas.forEach(function (p, i) { y += hueco(bloques[i - 1], bloques[i]) * 3.86 * k; ctx.save(); p.pinta(y); ctx.restore(); y += p.alto; });

    // Firma: «Bitácora · una CiccApp»
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var a = es.nombre + ' ', s = '·', c = ' una CiccApp', fy = H - H * (op.formato === 'publicacion' ? .085 : .075);
    ctx.font = fuente(400, 42, LETRAS.serif, true); var wa = ctx.measureText(a).width, wc = ctx.measureText(c).width;
    ctx.font = fuente(400, 42, LETRAS.serif); var ws = ctx.measureText(s).width, x = (W - wa - ws - wc) / 2;
    ctx.textAlign = 'left'; ctx.globalAlpha = .85; ctx.fillStyle = TINTA; ctx.font = fuente(400, 42, LETRAS.serif, true); ctx.fillText(a, x, fy);
    ctx.globalAlpha = 1; ctx.fillStyle = ORO; ctx.font = fuente(400, 42, LETRAS.serif); ctx.fillText(s, x + wa, fy);
    ctx.globalAlpha = .85; ctx.fillStyle = TINTA; ctx.font = fuente(400, 42, LETRAS.serif, true); ctx.fillText(c, x + wa + ws, fy);
    ctx.globalAlpha = 1;
    return canvas;
  }

  async function archivo(op) {
    var cv = await dibujar(document.createElement('canvas'), op);
    var blob = await new Promise(function (ok) { cv.toBlob(ok, 'image/png'); });
    var nombre = (op.nombre || (estilo(op.app).nombre + ' ' + (op.formato || 'historia'))).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').toLowerCase() + '.png';
    return new File([blob], nombre, { type: 'image/png' });
  }

  // Abre el menú de compartir del sistema con la imagen; si el navegador no puede, la descarga
  async function compartir(f, titulo) {
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: titulo || '' }); return 'compartida'; }
      catch (e) { if (e && e.name === 'AbortError') return 'cancelada'; }
    }
    var a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    return 'descargada';
  }

  // Hoja «Compartir»: vista previa, formato, qué se ve en la tarjeta y la frase opcional
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reducido() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  function abrir(op) {
    if (document.querySelector('.cs-fondo')) return;
    var est = { formato: op.formato || 'historia', activas: {}, frase: (op.frase && op.frase.texto) || '' };
    (op.opciones || []).forEach(function (o) { est.activas[o.clave] = o.activa !== false; });
    var antes = document.activeElement;
    var fondo = el('div', { 'class': 'cs-fondo' }), hoja = el('div', { 'class': 'cs-hoja', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'csTit', tabindex: '-1' });
    fondo.appendChild(hoja); document.body.appendChild(fondo); document.documentElement.classList.add('cs-abierta');

    var ops = (op.opciones || []).map(function (o) {
      return '<div class="cs-ajuste"><span>' + esc(o.texto) + (o.nota ? '<small>' + esc(o.nota) + '</small>' : '') + '</span><button type="button" class="cs-sw" role="switch" data-clave="' + esc(o.clave) + '" aria-checked="' + est.activas[o.clave] + '" aria-label="' + esc(o.texto) + '"></button></div>';
    }).join('');
    hoja.innerHTML =
      '<div class="cs-cab"><h2 id="csTit">Compartir</h2><button type="button" class="cs-cerrar" aria-label="Cerrar">×</button></div>' +
      '<div class="cs-cuerpo"><div class="cs-prev"><canvas aria-label="Vista previa de la tarjeta" role="img"></canvas></div><div class="cs-ctrl">' +
      '<div class="cs-que"><b>' + esc(op.titulo || '') + '</b>' + (op.sub ? '<span>' + esc(op.sub) + '</span>' : '') + '</div>' +
      '<div class="cs-grupo"><span class="cs-eti">Formato</span><div class="cs-chips" role="group" aria-label="Formato">' +
      '<button type="button" class="cs-chip" data-f="historia" aria-pressed="' + (est.formato === 'historia') + '">Historia</button>' +
      '<button type="button" class="cs-chip" data-f="publicacion" aria-pressed="' + (est.formato === 'publicacion') + '">Publicación</button></div></div>' +
      (ops ? '<div class="cs-grupo"><span class="cs-eti">En la tarjeta</span>' + ops + '</div>' : '') +
      (op.frase ? '<div class="cs-grupo"><label class="cs-eti" for="csFrase">Una frase (opcional)</label><textarea id="csFrase" rows="2" maxlength="140" placeholder="' + esc(op.frase.pista || 'Escribe algo o deja el hueco vacío') + '">' + esc(est.frase) + '</textarea>' +
        (op.frase.sugerir ? '<button type="button" class="cs-sugerir">Sugerir una frase</button>' : '') + '</div>' : '') +
      '<button type="button" class="cs-ir">Compartir…</button><p class="cs-pie" aria-live="polite"></p></div></div>';

    var cv = hoja.querySelector('canvas'), pie = hoja.querySelector('.cs-pie'), t = null;
    function datos() { return { formato: est.formato, activas: est.activas, frase: est.frase.trim() }; }
    function spec() { return { app: op.app, formato: est.formato, bloques: op.bloques(datos()), nombre: op.nombre }; }
    function repinta() { clearTimeout(t); t = setTimeout(function () { dibujar(cv, spec()); }, 120); }
    function cerrar() {
      fondo.classList.remove('cs-dentro'); document.documentElement.classList.remove('cs-abierta'); document.removeEventListener('keydown', tecla);
      setTimeout(function () { fondo.remove(); }, reducido() ? 0 : 250); if (antes && antes.focus) antes.focus();
    }
    function tecla(e) { if (e.key === 'Escape') cerrar(); }
    document.addEventListener('keydown', tecla);
    fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });
    hoja.querySelector('.cs-cerrar').onclick = cerrar;
    hoja.querySelectorAll('.cs-chip').forEach(function (b) { b.onclick = function () { est.formato = b.dataset.f; hoja.querySelectorAll('.cs-chip').forEach(function (c) { c.setAttribute('aria-pressed', c === b); }); hoja.querySelector('.cs-prev').dataset.f = est.formato; repinta(); }; });
    hoja.querySelectorAll('.cs-sw').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('aria-checked') !== 'true'; b.setAttribute('aria-checked', v); est.activas[b.dataset.clave] = v; repinta(); }; });
    var ta = hoja.querySelector('textarea');
    if (ta) ta.oninput = function () { est.frase = ta.value; repinta(); };
    var sg = hoja.querySelector('.cs-sugerir');
    if (sg) sg.onclick = async function () {
      sg.disabled = true; sg.textContent = 'Pensando…';
      try { var f = await op.frase.sugerir(datos()); if (f) { ta.value = est.frase = String(f).trim(); repinta(); ta.focus(); } else pie.textContent = 'No ha salido ninguna frase; prueba otra vez.'; }
      catch (e) { pie.textContent = 'No se ha podido sugerir una frase ahora.'; }
      sg.disabled = false; sg.textContent = 'Sugerir otra';
    };
    hoja.querySelector('.cs-ir').onclick = async function () {
      var b = this; b.disabled = true; pie.textContent = '';
      try {
        var r = await compartir(await archivo(spec()), op.titulo);
        if (r === 'descargada') pie.textContent = 'Imagen guardada en Descargas.';
        if (r === 'compartida') { cerrar(); return; }
      } catch (e) { pie.textContent = 'No se ha podido preparar la imagen.'; }
      b.disabled = false;
    };
    hoja.querySelector('.cs-prev').dataset.f = est.formato;
    dibujar(cv, spec());
    requestAnimationFrame(function () { fondo.classList.add('cs-dentro'); });
    hoja.focus();
  }

  window.CiccCompartir = { abrir: abrir, dibujar: dibujar, archivo: archivo, compartir: compartir, estilos: ESTILOS };
})();
