/* CiccApps — conexión con Supabase y pantalla de acceso compartida.
   Uso: CiccCuenta.iniciar({ app: 'Bitácora', icono: '../iconos/bitacora-192.png', lema: '¿Qué leo hoy?' }).then(({ sb, usuario }) => …) */
(function () {
  'use strict';
  var URL_SB = 'https://chgrpztvvbhawzdqscru.supabase.co';
  var CLAVE = 'sb_publishable_Pa4OqudjThAd6DD9sOlKyA_wO1qnrtG'; // clave pública: la seguridad la ponen las reglas de la base de datos
  var sb = window.supabase.createClient(URL_SB, CLAVE, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });

  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function pantalla(op) {
    return new Promise(function (resolve) {
      var modo = 'entrar';
      var raiz = el('div', { 'class': 'cc-acceso', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'ccTit' });
      raiz.innerHTML =
        '<div class="cc-caja">' +
          '<div class="cc-cabeza"><img src="' + esc(op.icono) + '" alt=""><h1 id="ccTit">' + esc(op.app) + '</h1><p>' + esc(op.lema || 'una CiccApp') + '</p></div>' +
          '<div class="cc-modos" role="group" aria-label="Acceso"><button type="button" id="ccM1" aria-pressed="true">Entrar</button><button type="button" id="ccM2" aria-pressed="false">Crear cuenta</button></div>' +
          '<form class="cc-form" id="ccForm" novalidate>' +
            '<div class="cc-campo"><label for="ccEmail">Correo</label><input id="ccEmail" type="email" autocomplete="email" inputmode="email" required></div>' +
            '<div class="cc-campo"><label for="ccPass">Contraseña</label><input id="ccPass" type="password" autocomplete="current-password" minlength="8" required></div>' +
            '<button class="cc-enviar" id="ccEnviar" type="submit">Entrar</button>' +
            '<p class="cc-msg" id="ccMsg" aria-live="polite"></p>' +
          '</form>' +
          '<div class="cc-pie"><button type="button" class="cc-enlace" id="ccOlvido">He olvidado la contraseña</button></div>' +
        '</div>';
      document.body.appendChild(raiz);
      var $ = function (id) { return raiz.querySelector('#' + id); };
      function msg(t, error) { $('ccMsg').textContent = t || ''; $('ccMsg').className = 'cc-msg' + (error ? ' error' : ''); }
      function setModo(m) {
        modo = m;
        $('ccM1').setAttribute('aria-pressed', m === 'entrar'); $('ccM2').setAttribute('aria-pressed', m === 'crear');
        $('ccEnviar').textContent = m === 'entrar' ? 'Entrar' : 'Crear cuenta';
        $('ccPass').setAttribute('autocomplete', m === 'entrar' ? 'current-password' : 'new-password');
        msg('');
      }
      $('ccM1').onclick = function () { setModo('entrar'); };
      $('ccM2').onclick = function () { setModo('crear'); };
      $('ccOlvido').onclick = async function () {
        var email = $('ccEmail').value.trim();
        if (!email) { msg('Escribe tu correo y vuelve a pulsar.', true); $('ccEmail').focus(); return; }
        var r = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
        msg(r.error ? 'No se pudo enviar: ' + r.error.message : 'Te hemos enviado un correo para cambiar la contraseña.', !!r.error);
      };
      $('ccForm').onsubmit = async function (e) {
        e.preventDefault();
        var email = $('ccEmail').value.trim(), pass = $('ccPass').value;
        if (!email || pass.length < 8) { msg('Escribe tu correo y una contraseña de al menos 8 caracteres.', true); return; }
        $('ccEnviar').disabled = true; msg(modo === 'entrar' ? 'Entrando…' : 'Creando tu cuenta…');
        var r = modo === 'entrar'
          ? await sb.auth.signInWithPassword({ email: email, password: pass })
          : await sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: location.origin + location.pathname } });
        $('ccEnviar').disabled = false;
        if (r.error) {
          var t = r.error.message || '';
          if (/invalid login/i.test(t)) t = 'El correo o la contraseña no son correctos.';
          else if (/not confirmed/i.test(t)) t = 'Confirma tu correo con el enlace que te enviamos y vuelve a entrar.';
          else if (/already registered/i.test(t)) t = 'Ese correo ya tiene cuenta. Pulsa «Entrar».';
          msg(t, true); return;
        }
        if (!r.data.session) { msg('Cuenta creada. Abre el correo que te hemos enviado para confirmarla y después entra aquí.'); setModo('entrar'); return; }
        raiz.remove(); resolve(r.data.session.user);
      };
      setTimeout(function () { $('ccEmail').focus(); }, 50);
    });
  }

  async function iniciar(op) {
    var s = await sb.auth.getSession();
    var usuario = s.data.session ? s.data.session.user : await pantalla(op);
    return { sb: sb, usuario: usuario };
  }
  async function salir() { await sb.auth.signOut(); location.reload(); }

  // Firma al pie: «Bitácora · una CiccApp»
  function firma(nombre, destino) {
    var p = el('p', { 'class': 'cc-firma' });
    p.innerHTML = '<a href="../" aria-label="Ir a CiccApps"><img class="cla" src="../iconos/monograma-verde.svg" alt=""><img class="osc" src="../iconos/monograma-dorado.svg" alt=""></a>' + esc(nombre) + ' <span class="sep">·</span> una CiccApp';
    (destino || document.body).appendChild(p);
    return p;
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
  window.CiccCuenta = { sb: sb, iniciar: iniciar, salir: salir, firma: firma };
})();
