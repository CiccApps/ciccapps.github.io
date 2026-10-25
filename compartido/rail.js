/* Al girar o plegar, iOS cambia las zonas seguras (env) un poco después del resize: se vuelve a mirar al momento y otra vez al rato */
window.ccLuego = f => { const g = () => { f(); setTimeout(f, 250); setTimeout(f, 700); };
  addEventListener("resize", g); addEventListener("orientationchange", g); addEventListener("pageshow", g); };

/* Pantalla exterior del iPhone Duo, común a todas las apps que cargan este archivo (aunque no lleven barra):
   - html.cc-gira (y cc-gira-izq): girada, con la franja de la cámara a un lado. Las ventanas flotan fuera de la franja (ciccapps.css).
   - html.cc-tope: en vertical y con la app instalada, después de girar el móvil iOS a veces deja la página --cc-tope px más abajo
     (la pantalla mide más que la ventana) y por encima se ve lo de debajo, difuminado. ciccapps.css sube todo ese hueco. */
(() => {
  const html = document.documentElement, pr = document.createElement("div");
  pr.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)";
  const solo = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  const mira = () => {
    if (!pr.isConnected) document.body.appendChild(pr);
    const cs = getComputedStyle(pr), d = parseFloat(cs.paddingRight) || 0, i = parseFloat(cs.paddingLeft) || 0, apaisada = innerWidth > innerHeight;
    const girada = apaisada && innerHeight < 540; // la exterior en horizontal (la interior, girada, sigue con su franja de siempre)
    html.classList.toggle("cc-gira", girada && (d >= 44) !== (i >= 44));
    html.classList.toggle("cc-gira-izq", girada && i >= 44 && d < 44);
    const t = solo && !apaisada && d >= 44 ? Math.round(screen.height - innerHeight) : 0, si = t > 0 && t <= 40;
    html.classList.toggle("cc-tope", si);
    html.style.setProperty("--cc-tope", (si ? t : 0) + "px");
  };
  if (document.body) mira(); else addEventListener("DOMContentLoaded", mira);
  ccLuego(mira);
  // Lo fijo (el velo) no llega a esa franja de arriba: solo se ve ahí lo que va con la página. Con una ventana abierta,
  // una tira oscura del mismo tono que el velo, puesta en la página justo encima de lo visible, la tapa.
  let tira = null;
  const tapa = () => {
    const si = html.classList.contains("cc-tope") && (html.classList.contains("cc-abierta") || html.classList.contains("cl-abierta"));
    if (!si) { if (tira) { tira.remove(); tira = null; } return; }
    const t = parseFloat(html.style.getPropertyValue("--cc-tope")) || 0;
    if (!tira) { tira = document.createElement("div"); tira.setAttribute("aria-hidden", "true");
      tira.style.cssText = "position:absolute;left:0;right:0;z-index:1002;pointer-events:none;background:rgba(10,14,12,.62)"; html.appendChild(tira); }
    tira.style.top = (scrollY - t) + "px"; tira.style.height = t + "px";
  };
  new MutationObserver(tapa).observe(html, { attributes: true, attributeFilter: ["class", "style"] });
  // En el Duo, la franja de arriba (unos 20 px) la pinta iOS con el color de fondo de la página o el theme-color, no con
  // el velo, y se ve como una línea clara encima de la ventana. Mientras hay una ventana abierta se oscurecen como el velo
  // y se pone arriba una tira fija opaca de ese mismo tono, que es la que iOS toma para esa franja.
  const vel = [10, 14, 12], osc = c => { const m = String(c).match(/\d+(\.\d+)?/g); if (!m || m.length < 3 || (m.length > 3 && +m[3] === 0)) return "";
    return "rgb(" + m.slice(0, 3).map((x, k) => Math.round(+x * .385 + vel[k] * .615)).join(",") + ")"; };
  let antes = null;
  const fondo = () => {
    const cs = getComputedStyle(pr), duo = (parseFloat(cs.paddingRight) || 0) >= 44 || (parseFloat(cs.paddingLeft) || 0) >= 44;
    const si = duo && (html.classList.contains("cc-abierta") || html.classList.contains("cl-abierta"));
    if (si && !antes && document.body) {
      const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
      const b = osc(getComputedStyle(document.body).backgroundColor) || osc(getComputedStyle(html).backgroundColor) || "rgb(10,14,12)";
      const f = document.createElement("div"); f.setAttribute("aria-hidden", "true");
      f.style.cssText = "position:fixed;top:0;left:0;right:0;height:20px;z-index:1002;pointer-events:none;background:" + b;
      html.appendChild(f);
      antes = { h: html.style.backgroundColor, f, metas: metas.map(m => [m, m.content]) };
      html.style.backgroundColor = b;
      metas.forEach(m => { const h = m.content.match(/^#([0-9a-f]{6})$/i); if (h) { const n = parseInt(h[1], 16);
        m.content = "#" + [n >> 16, n >> 8 & 255, n & 255].map((x, k) => Math.round(x * .385 + vel[k] * .615).toString(16).padStart(2, "0")).join(""); } });
    } else if (!si && antes) {
      html.style.backgroundColor = antes.h; antes.f.remove(); antes.metas.forEach(([m, c]) => { m.content = c; }); antes = null;
    }
  };
  new MutationObserver(fondo).observe(html, { attributes: true, attributeFilter: ["class"] });
})();

/* Barra lateral común (<nav class="rail">): decide dónde va según la pantalla y la coloca (Miguel, 25/10/2026).
   - Duo exterior en vertical (franja segura de 44 px o más a la derecha): en la franja, como siempre (r-duo).
   - Duo exterior girado: en la franja que deja la cámara. Con la cámara abajo a la derecha, a la derecha y desde arriba (r-der);
     con la cámara arriba a la izquierda, a la izquierda y desde abajo (r-izq). En las tres, html.con-rail.
   - Pantalla ancha con margen libre a la derecha del contenido (Duo interior, iPad, ordenador): columna junto al contenido (r-ancha).
   - El resto (iPhone normal, o sin sitio en el margen): un botón abajo a la derecha que la despliega (r-boton), salvo con boton:false.
   Uso: const ver = ccRail(nav, { puede: () => …, junto: () => elemento del contenido, boton: false }); ver() vuelve a decidir. */
window.ccRail = (r, o = {}) => {
  const html = document.documentElement, pr = document.createElement("div");
  pr.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)";
  document.body.appendChild(pr);
  const ab = document.createElement("button");
  ab.type = "button"; ab.className = "rail-abrir"; ab.title = "Ir a…";
  ab.setAttribute("aria-label", "Ir a…"); ab.setAttribute("aria-expanded", "false");
  ab.innerHTML = '<svg class="l" viewBox="0 0 24 24"><path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/></svg>' +
    '<svg class="x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const abre = si => { r.classList.toggle("abierta", si); ab.setAttribute("aria-expanded", si ? "true" : "false"); };
  ab.onclick = e => { e.stopPropagation(); abre(!r.classList.contains("abierta")); };
  r.addEventListener("click", e => { if (e.target.closest("[data-ir]")) abre(false); });
  document.addEventListener("click", e => { if (!r.contains(e.target)) abre(false); });
  addEventListener("keydown", e => { if (e.key === "Escape") abre(false); });
  // margen libre a la derecha del contenido: cabe si deja la columna (44 px) con 16 px a cada lado
  const cabe = () => {
    const c = o.junto && o.junto(), w = html.clientWidth;
    if (!c || w < 700) return false;
    const b = c.getBoundingClientRect(), libre = w - (b.right - (parseFloat(getComputedStyle(c).paddingRight) || 0));
    if (libre < 76) return false;
    r.style.setProperty("--rail-x", Math.round(libre - Math.min(32, (libre - 44) / 2) - 44) + "px");
    return true;
  };
  const MODOS = ["r-duo", "r-der", "r-izq", "r-ancha", "r-boton"];
  const ver = () => {
    if (!r.contains(ab)) r.appendChild(ab); // por si la app rehace los botones
    const cs = getComputedStyle(pr), d = parseFloat(cs.paddingRight) || 0, i = parseFloat(cs.paddingLeft) || 0;
    const girada = innerWidth > innerHeight && innerHeight < 540; // solo la exterior girada; la interior en horizontal mantiene su franja
    let m = "";
    if (o.puede && !o.puede()) m = "";
    else if (d >= 44 && !girada) m = "r-duo";
    else if (girada && d >= 44 && i < 44) m = "r-der";
    else if (girada && i >= 44 && d < 44) m = "r-izq";
    else if (cabe()) m = "r-ancha";
    else if (o.boton !== false) m = "r-boton";
    MODOS.forEach(k => r.classList.toggle(k, k === m));
    r.classList.toggle("si", !!m);
    html.classList.toggle("con-rail", m === "r-duo" || m === "r-der" || m === "r-izq");
    html.classList.toggle("rail-boton", m === "r-boton");
    if (m !== "r-boton") abre(false);
    return m;
  };
  ver(); ccLuego(ver);
  return ver;
};
