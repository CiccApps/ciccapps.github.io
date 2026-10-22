/* CiccApps · motor común · conexiones con servicios externos: Salud del iPhone (Atajo), Withings y, opcional, Strava. Después, Google Calendar.
   Las claves nunca pasan por aquí: viven en Supabase y solo las usan sus funciones.
   Uso: CiccConexiones.lista(sb).then(c => c.salud) · CiccConexiones.conectar(sb, 'withings') · CiccConexiones.resultado() */
(function () {
  'use strict';

  // Proveedores que ya tienen función en Supabase
  var ACTIVOS = { salud: true, withings: true, strava: true };

  async function lista(sb) {
    var r = await sb.from('conexiones').select('*');
    if (r.error) throw r.error;
    var porProveedor = {};
    (r.data || []).forEach(function (c) { porProveedor[c.proveedor] = c; });
    return porProveedor;
  }

  // Vuelve a esta misma página (sin el resultado de una conexión anterior)
  function aqui() {
    var u = new URL(location.href);
    ['strava', 'withings', 'google'].forEach(function (k) { u.searchParams.delete(k); });
    return u.toString();
  }

  async function llamar(sb, proveedor, cuerpo) {
    if (!ACTIVOS[proveedor]) throw new Error('Esta conexión aún no está disponible.');
    var r = await sb.functions.invoke(proveedor, { body: cuerpo });
    if (r.error) {
      var detalle = null;
      try { detalle = await r.error.context.json(); } catch (e) { /* sin cuerpo */ }
      throw new Error((detalle && detalle.mensaje) || 'No se ha podido completar. Prueba en un rato.');
    }
    return r.data;
  }

  async function conectar(sb, proveedor, volver) {
    var d = await llamar(sb, proveedor, { accion: 'inicio', volver: volver || aqui() });
    location.href = d.url;
  }
  function sincronizar(sb, proveedor, dias) { return llamar(sb, proveedor, { accion: 'sincronizar', dias: dias || 7 }); }
  function desconectar(sb, proveedor) { return llamar(sb, proveedor, { accion: 'desconectar' }); }

  // Lee el resultado al volver del servicio (?strava=ok) y limpia la dirección
  function resultado() {
    var u = new URL(location.href), r = null;
    ['strava', 'withings', 'google'].forEach(function (k) {
      if (u.searchParams.has(k)) { r = { proveedor: k, resultado: u.searchParams.get(k) }; u.searchParams.delete(k); }
    });
    if (r) history.replaceState(null, '', u.pathname + u.search + u.hash);
    return r;
  }

  window.CiccConexiones = { lista: lista, conectar: conectar, sincronizar: sincronizar, desconectar: desconectar, resultado: resultado, llamar: llamar };
})();
