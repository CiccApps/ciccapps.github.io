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
          '<div class="cc-o"><span>o</span></div>' +
          '<div class="cc-gsi" id="ccGsi" aria-label="Continuar con Google"></div>' +
          '<button type="button" class="cc-google" id="ccGoogle" hidden><svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg><span>Continuar con Google</span></button>' +

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
      // Plan B: el acceso por Supabase (redirección). Se usa si el botón de Google no carga.
      $('ccGoogle').onclick = async function () {
        msg('Abriendo Google…');
        var r = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname } });
        if (r.error) msg(/not enabled|provider/i.test(r.error.message) ? 'El acceso con Google aún no está activado.' : 'No se pudo abrir Google: ' + r.error.message, true);
      };
      // Botón oficial de Google: el inicio de sesión se hace en esta web y Google muestra «ciccapps.github.io».
      botonGoogle($('ccGsi'), function (r) {
        if (r.error) { msg('No se pudo entrar con Google: ' + r.error.message, true); return; }
        raiz.remove(); resolve(r.data.user);
      }, function () { $('ccGsi').hidden = true; $('ccGoogle').hidden = false; }, msg);
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

  var CLIENTE_GOOGLE = '693301125266-00d4kr1rmcbsulbhu5br823okrpaksm4.apps.googleusercontent.com';
  function cargarGsi() {
    return new Promise(function (ok, ko) {
      if (window.google && google.accounts && google.accounts.id) return ok();
      var sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = ok; sc.onerror = ko; document.head.appendChild(sc);
      setTimeout(ko, 6000);
    });
  }
  async function nonces() {
    var a = new Uint8Array(24); crypto.getRandomValues(a);
    var crudo = Array.from(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    var h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(crudo));
    return { crudo: crudo, hash: Array.from(new Uint8Array(h), function (b) { return b.toString(16).padStart(2, '0'); }).join('') };
  }
  async function botonGoogle(caja, alEntrar, alFallar, msg) {
    try {
      await cargarGsi();
      var n = await nonces();
            google.accounts.id.initialize({
        client_id: CLIENTE_GOOGLE, nonce: n.hash, use_fedcm_for_prompt: true, itp_support: true,
        callback: async function (resp) {
          msg('Entrando…');
          alEntrar(await sb.auth.signInWithIdToken({ provider: 'google', token: resp.credential, nonce: n.crudo }));
        }
      });
      google.accounts.id.renderButton(caja, {
        type: 'standard', theme: 'outline', size: 'medium', text: 'continue_with',
        shape: 'pill', logo_alignment: 'center', locale: 'es', width: 240
      });
    } catch (e) { alFallar(); }
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
    p.innerHTML = '<a href="../" aria-label="Ir a CiccApps"><img class="cla" src="../iconos/monograma-verde.svg" alt=""><img class="osc" src="../iconos/monograma-dorado.svg" alt=""></a><span class="txt">' + esc(nombre) + ' <span class="sep">·</span> una CiccApp</span>';
    (destino || document.body).appendChild(p);
    return p;
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(function () {});
  window.CiccCuenta = { sb: sb, iniciar: iniciar, salir: salir, firma: firma };
})();
