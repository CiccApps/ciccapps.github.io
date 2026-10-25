/* Pantalla exterior del iPhone Duo, común a todas las apps que cargan este archivo (aunque no lleven barra):
   - html.cc-gira (y cc-gira-izq): girada, con la franja de la cámara a un lado. Las ventanas flotan fuera de la franja (ciccapps.css).
   - html.cc-tope: en vertical, instalada con la barra de estado «default», iOS reserva arriba una franja que no es de la página
     (--cc-tope px). La ventana sube ese hueco para que se vea el mismo margen arriba que a los lados, y mientras está abierta
     el color de esa franja (theme-color) se oscurece como el velo. */
(() => {
  const html = document.documentElement, pr = document.createElement("div");
  pr.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;top:0;left:0;width:0;height:0;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)";
  const solo = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  const mira = () => {
    if (!pr.isConnected) document.body.appendChild(pr);
    const cs = getComputedStyle(pr), d = parseFloat(cs.paddingRight) || 0, i = parseFloat(cs.paddingLeft) || 0, apaisada = innerWidth > innerHeight;
    html.classList.toggle("cc-gira", apaisada && (d >= 44) !== (i >= 44));
    html.classList.toggle("cc-gira-izq", apaisada && i >= 44 && d < 44);
    const t = solo && !apaisada && d >= 44 ? Math.round(screen.height - innerHeight) : 0;
    html.classList.toggle("cc-tope", t > 0 && t <= 40);
    html.style.setProperty("--cc-tope", (t > 0 && t <= 40 ? t : 0) + "px");
  };
  // la franja de iOS no la cubre el velo: se oscurece su color mientras hay una ventana abierta
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')], orig = metas.map(m => m.content);
  const oscuro = hex => { const n = parseInt(hex.slice(1), 16), c = [n >> 16, n >> 8 & 255, n & 255], v = [10, 14, 12];
    return "#" + c.map((x, k) => Math.round(x * .385 + v[k] * .615).toString(16).padStart(2, "0")).join(""); };
  let abierta = false;
  const tinta = () => { const a = html.classList.contains("cc-tope") && (html.classList.contains("cc-abierta") || html.classList.contains("cl-abierta"));
    if (a === abierta) return; abierta = a; metas.forEach((m, k) => { if (/^#[0-9a-f]{6}$/i.test(orig[k])) m.content = a ? oscuro(orig[k]) : orig[k]; }); };
  const va = () => { mira(); tinta(); };
  if (document.body) va(); else addEventListener("DOMContentLoaded", va);
  addEventListener("resize", va);
  new MutationObserver(tinta).observe(html, { attributes: true, attributeFilter: ["class"] });
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
    const cs = getComputedStyle(pr), d = parseFloat(cs.paddingRight) || 0, i = parseFloat(cs.paddingLeft) || 0, apaisada = innerWidth > innerHeight;
    let m = "";
    if (o.puede && !o.puede()) m = "";
    else if (d >= 44 && (!apaisada || i < 44)) m = apaisada ? "r-der" : "r-duo";
    else if (apaisada && i >= 44 && d < 44) m = "r-izq";
    else if (cabe()) m = "r-ancha";
    else if (o.boton !== false) m = "r-boton";
    MODOS.forEach(k => r.classList.toggle(k, k === m));
    r.classList.toggle("si", !!m);
    html.classList.toggle("con-rail", m === "r-duo" || m === "r-der" || m === "r-izq");
    html.classList.toggle("rail-boton", m === "r-boton");
    if (m !== "r-boton") abre(false);
    return m;
  };
  ver(); addEventListener("resize", ver);
  return ver;
};
