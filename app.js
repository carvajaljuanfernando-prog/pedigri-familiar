/* ============================================================
   HISTORIA FAMILIAR — INSTITUTO DEL CORAZÓN DE BUCARAMANGA
   app.js — HTML puro, sin dependencias de build
   ============================================================ */

// ── EMAILJS CONFIG ────────────────────────────────────────────
// Reemplace estos valores con los de su cuenta EmailJS
const EMAILJS_PUBLIC_KEY       = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID       = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_MEDICO  = "YOUR_TEMPLATE_MEDICO";
const EMAILJS_TEMPLATE_PACIENTE= "YOUR_TEMPLATE_PACIENTE";
const CORREO_MEDICO            = "carvajaljuanfernando@gmail.com";

// ── PASOS ─────────────────────────────────────────────────────
const STEPS = [
  "① Datos Personales",
  "② Sus Hijos",
  "③ Hermanos/as",
  "④ Su Madre",
  "⑤ Su Padre",
  "⑥ Familia Materna",
  "⑦ Familia Paterna",
  "⑧ Pedigrí"
];

const ETHNICS = [
  "Blanco","Latinoamericano","Asiático - Chino","Asiático - Japonés",
  "Otro grupo asiático","Árabe","Negro - Caribeño","Negro - Africano",
  "Mezcla - blanco/negro caribeño","Mezcla - blanco/negro africano",
  "Mezcla - blanco/asiático","Mezcla - otro grupo","Otro grupo étnico"
];

// ── ESTADO ────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9);

const emptyPerson = () => ({
  id: uid(), nombre:"", sexo:"", fechaNac:"", edad:"",
  vivo:"si", causaMuerte:"", edadMuerte:"", autopsia:"",
  problemasCorazon:"no", descripcionCorazon:""
});
const emptyHijo = () => ({
  id:uid(), nombre:"", sexo:"", fechaNac:"", edad:"",
  fallecido:false, causaMuerte:"", edadMuerte:"", autopsia:"",
  problemaCardiaco:false, descripcionProblema:""
});
const emptyHermano = () => ({
  id:uid(), nombre:"", sexo:"", fechaNac:"", edad:"",
  medioHermano:false, mismoProgenitor:"",
  fallecido:false, causaMuerte:"", edadMuerte:"", autopsia:"",
  problemaCardiaco:false, descripcionProblema:""
});
const emptyTio = () => ({
  id:uid(), nombre:"", sexo:"", fechaNac:"", edad:"",
  fallecido:false, causaMuerte:"", edadMuerte:"",
  problemaCardiaco:false, descripcionProblema:""
});
const emptyPrimo = () => ({
  id:uid(), nombre:"", parentesco:"", nombrePadre:"", problemaCardiaco:""
});

let state = {
  step: 0,
  submitted: false,
  sending: false,
  sendError: "",
  personal: {
    apellidos:"", nombre:"", fechaNac:"", sexo:"H",
    estadoCivil:"", identificacion:"", direccion:"",
    municipio:"", departamento:"", telefonoFijo:"",
    email:"", telefonoMovil:"", otroTelefono:"",
    grupoEtnico:"", vivoFueraColombia:"no", paises:"",
    nHC:"", fechaCita:"",
    medicoNombre:"", medicoCentro:"", medicoTel:"",
    contactoNombre:"", contactoRelacion:"", contactoMovil:""
  },
  hijos:    [emptyHijo()],
  hermanos: [emptyHermano()],
  madre: { ...emptyPerson(), id:"madre" },
  padre: { ...emptyPerson(), id:"padre" },
  famMadre: {
    tios:   [emptyTio()],
    abuela: { ...emptyPerson(), id:"abMat" },
    abuelo: { ...emptyPerson(), id:"abMatP" },
    primos: [emptyPrimo()]
  },
  famPadre: {
    tios:   [emptyTio()],
    abuela: { ...emptyPerson(), id:"abPat" },
    abuelo: { ...emptyPerson(), id:"abPatP" },
    primos: [emptyPrimo()]
  }
};

// ── HELPERS ───────────────────────────────────────────────────
const esc = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
const calcAge = d => { if(!d) return ""; return Math.floor((Date.now()-new Date(d))/(365.25*24*3600*1000)); };
const yn = v => v==="si"?"Sí":v==="no"?"No":v==="no_se"?"No lo sé":v||"—";
const firstName = n => n ? n.split(" ")[0] : "";
const birthYear = d => {
  if(!d) return "";
  return d.includes("/") ? d.split("/").pop() : d.split("-")[0];
};
const isAff = p => p && (p.problemaCardiaco===true || p.problemasCorazon==="si" || (p.descripcionCorazon && p.descripcionCorazon.trim()));

function deepGet(obj, path) {
  return path.split(".").reduce((o,k) => (o==null?null:o[k]), obj);
}
function deepSet(obj, path, val) {
  const parts = path.split(".");
  let o = obj;
  for (let i = 0; i < parts.length-1; i++) o = o[parts[i]];
  o[parts[parts.length-1]] = val;
}

// ── RENDER ENGINE ─────────────────────────────────────────────
function render() {
  renderNav();
  renderStepNav();
  if (state.submitted) { renderSubmitted(); return; }
  renderStep();
  renderNavBar();
  setTimeout(attachEvents, 0);
  if (state.step === 7) setTimeout(drawPedigree, 60);
}

function renderStepNav() {
  const nav = document.getElementById("step-nav");
  nav.innerHTML = STEPS.map((s,i) => {
    let cls = "step-btn";
    if (i === state.step) cls += " active";
    else if (i < state.step) cls += " done";
    return `<button class="${cls}" data-goto="${i}">${s}</button>`;
  }).join("");
}

function renderNav() {
  // step nav click handled in attachEvents
}

function renderStep() {
  const main = document.getElementById("main-content");
  const funcs = [
    renderPersonal, renderHijos, renderHermanos,
    () => renderParent("madre","Su Madre","M"),
    () => renderParent("padre","Su Padre","H"),
    () => renderFamilia("famMadre","Familia Materna","maternos","materna","madre"),
    () => renderFamilia("famPadre","Familia Paterna","paternos","paterna","padre"),
    renderPedigri
  ];
  main.innerHTML = funcs[state.step]();
}

function renderNavBar() {
  const nb = document.getElementById("nav-bar");
  const canNext = state.step===0
    ? (state.personal.nombre && state.personal.apellidos && state.personal.fechaNac)
    : true;
  const isLast = state.step === STEPS.length-1;
  nb.innerHTML = `
    ${state.step > 0 ? `<button class="btn" id="btn-prev">← Anterior</button>` : `<div></div>`}
    ${!isLast
      ? `<button class="btn btn-primary" id="btn-next" ${canNext?"":"disabled"}>Siguiente →</button>`
      : `<button class="btn btn-primary" id="btn-send">${state.sending?'<span class="spinner"></span>Enviando…':'✓ Enviar Encuesta'}</button>`
    }
  `;
  if (state.step===0 && !canNext) {
    nb.insertAdjacentHTML("beforeend",`<p style="color:#b91c1c;font-size:11px;text-align:right;margin-top:6px;width:100%">* Complete nombre, apellidos y fecha de nacimiento para continuar</p>`);
  }
  if (state.sendError) {
    nb.insertAdjacentHTML("beforeend",`<div class="error-box" style="width:100%">⚠ ${esc(state.sendError)}</div>`);
  }
}

function renderSubmitted() {
  document.getElementById("main-content").innerHTML = `
  <div class="success-wrap">
    <div class="success-card">
      <div class="success-heart">♥</div>
      <p class="success-title">Encuesta Enviada</p>
      <p style="color:#6b3a1e;font-size:13.5px;line-height:1.8;margin-bottom:16px">
        Gracias, <strong>${esc(state.personal.nombre)}</strong>. Su historia familiar fue registrada exitosamente.
      </p>
      <div class="success-info">
        <p style="font-size:12.5px;line-height:1.9">📬 Copia al equipo médico:<br><strong>${CORREO_MEDICO}</strong></p>
        ${state.personal.email
          ? `<p style="font-size:12.5px;line-height:1.9;margin-top:8px">📩 Confirmación enviada a:<br><strong>${esc(state.personal.email)}</strong></p>`
          : `<p style="font-size:11px;color:#8b5e3c;margin-top:8px">(No registró correo electrónico — no se envió confirmación al paciente)</p>`
        }
      </div>
      <p style="font-size:11.5px;color:#8b5e3c;margin-bottom:24px;line-height:1.8">
        Consultas: <strong>fallacardiaca@institutodelcorazon.com</strong><br>
        Tel. <strong>317-401-38-88</strong> · Lina María Niño
      </p>
      <button class="btn" id="btn-reset">Iniciar nueva encuesta</button>
    </div>
  </div>`;
  document.getElementById("nav-bar").innerHTML = "";
}

// ── FIELD HELPERS ─────────────────────────────────────────────
function fld(lbl, inp, req=false) {
  return `<div><label class="lbl">${lbl}${req?'<span class="req"> *</span>':''}</label>${inp}</div>`;
}
function tinp(bind, ph="", type="text") {
  const val = esc(deepGet(state, bind)||"");
  return `<input type="${type}" value="${val}" placeholder="${ph}" data-bind="${bind}"${type==="date"?' max="2099-12-31"':""}>`;
}
function tsel(bind, opts) {
  const val = deepGet(state, bind)||"";
  const os = opts.map(o=>`<option value="${o.v}"${val===o.v?" selected":""}>${o.l}</option>`).join("");
  return `<select data-bind="${bind}">${os}</select>`;
}
function radio(group, val, bind, lbl) {
  const cur = deepGet(state, bind)||"";
  return `<label><input type="radio" name="${group}" value="${val}"${cur===val?" checked":""} data-bind="${bind}"> ${lbl}</label>`;
}
function arrInp(arrKey, idx, field, ph="", type="text") {
  const val = esc(getArrVal(arrKey,idx,field)||"");
  return `<input type="${type}" value="${val}" placeholder="${ph}" data-arr="${arrKey}" data-idx="${idx}" data-field="${field}"${type==="date"?' max="2099-12-31"':""}>`;
}
function arrSel(arrKey, idx, field, opts) {
  const val = getArrVal(arrKey,idx,field)||"";
  const os = opts.map(o=>`<option value="${o.v}"${val===o.v?" selected":""}>${o.l}</option>`).join("");
  return `<select data-arr="${arrKey}" data-idx="${idx}" data-field="${field}">${os}</select>`;
}
function arrTa(arrKey, idx, field, ph="", rows=2) {
  const val = esc(getArrVal(arrKey,idx,field)||"");
  return `<textarea data-arr="${arrKey}" data-idx="${idx}" data-field="${field}" rows="${rows}" placeholder="${ph}">${val}</textarea>`;
}
function arrRadio(group, val, arrKey, idx, field, lbl) {
  const cur = getArrVal(arrKey,idx,field);
  const checked = (val==="true"?true:val==="false"?false:val)=== cur;
  return `<label><input type="radio" name="${group}" value="${val}"${checked?" checked":""} data-arr="${arrKey}" data-idx="${idx}" data-field="${field}" data-boolval="${val}"> ${lbl}</label>`;
}

function getArrVal(arrKey, idx, field) {
  const arr = deepGet(state, arrKey);
  return arr && arr[idx] ? arr[idx][field] : "";
}

// ── STEP RENDERERS ────────────────────────────────────────────

function renderPersonal() {
  const p = state.personal;
  return `
  <div class="warn">
    <strong>Estimado/a paciente:</strong> Próximamente será atendido/a en la Clínica de Insuficiencia Cardiaca del Instituto del Corazón de Bucaramanga. Por favor diligencie este formulario <strong>antes de su cita</strong>. La información es completamente <strong>CONFIDENCIAL</strong>.<br>
    Dudas: <strong>fallacardiaca@institutodelcorazon.com</strong> &nbsp;·&nbsp; Tel. <strong>317-401-38-88</strong> (Lina María Niño)
  </div>

  <div class="card">
    <p class="sec-title">Datos Personales</p>
    <p class="sec-sub">Para la admisión de sus datos en el sistema</p>
    <div class="g2" style="margin-bottom:12px">
      ${fld("Apellidos",tinp("personal.apellidos","Apellidos"),true)}
      ${fld("Nombre(s)",tinp("personal.nombre","Nombres"),true)}
      ${fld("Fecha de nacimiento",tinp("personal.fechaNac","","date"),true)}
      ${fld("N.º Historia Clínica",tinp("personal.nHC","N.º HC"))}
      ${fld("Fecha de la cita",tinp("personal.fechaCita","","date"))}
      ${fld("N.º Identificación",tinp("personal.identificacion","Cédula / Pasaporte"))}
    </div>
    <div style="margin-bottom:12px">
      <label class="lbl">Sexo <span class="req">*</span></label>
      <div class="ir">
        ${radio("sexo","H","personal.sexo","Hombre")}
        ${radio("sexo","M","personal.sexo","Mujer")}
      </div>
    </div>
    <div style="margin-bottom:12px">
      <label class="lbl">Estado civil</label>
      <div class="ir">
        ${["Soltero/a","Casado/a","Separado/a","Divorciado/a","Viudo/a"].map(ec=>radio("ec",ec,"personal.estadoCivil",ec)).join("")}
      </div>
    </div>
    <div class="g2" style="margin-bottom:0">
      <div class="gca">${fld("Dirección",tinp("personal.direccion","Calle, carrera, barrio"))}</div>
      ${fld("Municipio",tinp("personal.municipio","Municipio"))}
      ${fld("Departamento",tinp("personal.departamento","Departamento"))}
      ${fld("Teléfono fijo",tinp("personal.telefonoFijo","Teléfono fijo"))}
      ${fld("Teléfono móvil",tinp("personal.telefonoMovil","Celular"))}
      ${fld("Otro teléfono",tinp("personal.otroTelefono","Otro número"))}
      ${fld("Correo electrónico",tinp("personal.email","correo@ejemplo.com","email"))}
    </div>
  </div>

  <div class="card">
    <p class="sec-title">Médico de Atención Primaria</p>
    <p class="sec-sub">Hospital o centro de salud al que acude a citas generales</p>
    <div class="g2">
      ${fld("Nombre del médico",tinp("personal.medicoNombre","Dr./Dra."))}
      ${fld("Centro de salud",tinp("personal.medicoCentro","Nombre del centro"))}
      ${fld("Teléfono",tinp("personal.medicoTel","Teléfono"))}
    </div>
  </div>

  <div class="card">
    <p class="sec-title">Persona de Contacto</p>
    <p class="sec-sub">Esposo/a, hijo/a, padre/madre</p>
    <div class="g2">
      ${fld("Nombre",tinp("personal.contactoNombre","Nombre completo"))}
      ${fld("Relación con usted",tinp("personal.contactoRelacion","Esposa, hijo, madre…"))}
      ${fld("Teléfono móvil",tinp("personal.contactoMovil","Celular"))}
    </div>
  </div>

  <div class="card">
    <p class="sec-title">Grupo Étnico</p>
    <p class="sec-sub">Cómo se ve usted a sí mismo según su cultura, religión, color de piel, lengua y orígenes</p>
    <div class="tags" style="margin-bottom:14px">
      ${ETHNICS.map(e=>`<button class="tag${p.grupoEtnico===e?" on":""}" data-ethnic="${esc(e)}">${p.grupoEtnico===e?"✓ ":""}${esc(e)}</button>`).join("")}
    </div>
    <div style="margin-bottom:10px">
      <label class="lbl">¿Ha vivido previamente fuera de Colombia?</label>
      <div class="ir">
        ${radio("extranj","si","personal.vivoFueraColombia","Sí")}
        ${radio("extranj","no","personal.vivoFueraColombia","No")}
      </div>
    </div>
    ${p.vivoFueraColombia==="si"
      ? fld("¿Dónde y cuánto tiempo?",`<textarea data-bind="personal.paises" placeholder="Ej: Venezuela 2 años, España 5 años…" rows="2">${esc(p.paises)}</textarea>`)
      : ""}
  </div>`;
}

function personBlock(arrKey, idx, title) {
  const p = deepGet(state, arrKey)[idx];
  const pid = p.id;
  const isHermano = arrKey === "hermanos";
  const showSexo = true;
  return `
  <div class="pblock">
    <div class="pblock-header">
      <span class="pblock-title">${title}</span>
      <button class="btn btn-danger" data-remove="${arrKey}" data-idx="${idx}">✕ Eliminar</button>
    </div>
    <div class="g3" style="margin-bottom:10px">
      <div class="gc12">${fld("Nombre completo", arrInp(arrKey,idx,"nombre","Nombre y apellidos"))}</div>
      ${fld("Sexo", arrSel(arrKey,idx,"sexo",[{v:"",l:"—"},{v:"H",l:"Hombre"},{v:"M",l:"Mujer"}]))}
      ${fld("Fecha de nacimiento", arrInp(arrKey,idx,"fechaNac","","date"))}
      ${fld("Edad", arrInp(arrKey,idx,"edad","años","number"))}
    </div>
    ${isHermano ? `
    <div style="margin-bottom:10px">
      <label class="lbl">¿Es medio hermano/a?</label>
      <div class="ir">
        <label><input type="checkbox" ${p.medioHermano?"checked":""} data-arr="${arrKey}" data-idx="${idx}" data-field="medioHermano" data-type="bool"> Sí, es medio hermano/a</label>
      </div>
    </div>
    ${p.medioHermano ? `<div style="margin-bottom:10px">${fld("¿Comparten progenitor?", arrSel(arrKey,idx,"mismoProgenitor",[{v:"",l:"—"},{v:"madre",l:"Misma madre"},{v:"padre",l:"Mismo padre"}]))}</div>` : ""}
    ` : ""}
    <div style="margin-bottom:10px">
      <label class="lbl">¿Ha fallecido?</label>
      <div class="ir">
        ${arrRadio("fall_"+pid,"false",arrKey,idx,"fallecido","No")}
        ${arrRadio("fall_"+pid,"true",arrKey,idx,"fallecido","Sí, fallecido/a")}
      </div>
    </div>
    ${p.fallecido ? `
    <div class="g3" style="margin-bottom:10px">
      <div class="gc12">${fld("Causa de la muerte", arrInp(arrKey,idx,"causaMuerte","Causa de fallecimiento"))}</div>
      ${fld("Edad al fallecer", arrInp(arrKey,idx,"edadMuerte","años","number"))}
      ${fld("¿Autopsia?", arrSel(arrKey,idx,"autopsia",[{v:"",l:"—"},{v:"si",l:"Sí"},{v:"no",l:"No"},{v:"no_se",l:"No lo sé"}]))}
    </div>` : ""}
    <div class="hr"></div>
    <div style="margin-bottom:8px">
      <label class="lbl">¿Ha tenido o tiene problemas de corazón?</label>
      <div class="ir">
        ${arrRadio("cor_"+pid,"false",arrKey,idx,"problemaCardiaco","No")}
        ${arrRadio("cor_"+pid,"true",arrKey,idx,"problemaCardiaco","Sí")}
        ${arrRadio("cor_"+pid,"no_se",arrKey,idx,"problemaCardiaco","No lo sé")}
      </div>
    </div>
    ${p.problemaCardiaco===true ? fld("Describa el problema cardiaco y la edad de diagnóstico", arrTa(arrKey,idx,"descripcionProblema","Ej: Marcapasos a los 65 años, infarto a los 50…")) : ""}
  </div>`;
}

function renderHijos() {
  return `<div class="card">
    <p class="sec-title">Sus Hijos</p>
    <p class="sec-sub">Por favor indique nombre, sexo y fecha de nacimiento de cada hijo/a</p>
    ${state.hijos.map((_,i) => personBlock("hijos",i,`Hijo/a ${i+1}`)).join("")}
    <button class="btn-add" data-add="hijos">+ Agregar hijo/a</button>
  </div>`;
}

function renderHermanos() {
  return `<div class="card">
    <p class="sec-title">Sus Hermanos y Hermanas</p>
    <p class="sec-sub">Enumere a todos sus hermanos/as, vivos o fallecidos. Si tiene hermanastros/as, indíquelo.</p>
    ${state.hermanos.map((_,i) => personBlock("hermanos",i,`Hermano/a ${i+1}`)).join("")}
    <button class="btn-add" data-add="hermanos">+ Agregar hermano/a</button>
  </div>`;
}

function renderParent(key, title, defaultSexo) {
  const p = state[key];
  return `<div class="card">
    <p class="sec-title">${title}</p>
    <p class="sec-sub">Información sobre la historia médica de su ${key}</p>
    <div class="pblock">
      <div class="g3" style="margin-bottom:10px">
        <div class="gc12">${fld("Nombre completo", tinp(key+".nombre","Nombre y apellidos"))}</div>
        ${fld("Fecha de nacimiento", tinp(key+".fechaNac","","date"))}
        ${fld("Edad", tinp(key+".edad","años","number"))}
      </div>
      <div style="margin-bottom:10px">
        <label class="lbl">¿Está vivo/a?</label>
        <div class="ir">
          ${radio("vivo_"+key,"si",key+".vivo","Sí, vivo/a")}
          ${radio("vivo_"+key,"no",key+".vivo","No, fallecido/a")}
        </div>
      </div>
      ${p.vivo==="no" ? `
      <div class="g3" style="margin-bottom:10px">
        <div class="gc12">${fld("Causa de la muerte", tinp(key+".causaMuerte","Causa de fallecimiento"))}</div>
        ${fld("Edad al fallecer", tinp(key+".edadMuerte","años","number"))}
        ${fld("¿Autopsia?", tsel(key+".autopsia",[{v:"",l:"—"},{v:"si",l:"Sí"},{v:"no",l:"No"},{v:"no_se",l:"No lo sé"}]))}
      </div>` : ""}
      <div class="hr"></div>
      <div style="margin-bottom:8px">
        <label class="lbl">¿Tuvo problemas de corazón?</label>
        <div class="ir">
          ${radio("cor_"+key,"no",key+".problemasCorazon","No")}
          ${radio("cor_"+key,"si",key+".problemasCorazon","Sí")}
          ${radio("cor_"+key,"no_se",key+".problemasCorazon","No lo sé")}
        </div>
      </div>
      ${p.problemasCorazon==="si"
        ? fld("Describa el problema y la edad aproximada de diagnóstico",
            `<textarea data-bind="${key}.descripcionCorazon" rows="2" placeholder="Ej: Marcapasos a los 65 años, infarto a los 72 años…">${esc(p.descripcionCorazon)}</textarea>`)
        : ""}
    </div>
  </div>`;
}

function tioBlock(famKey, i) {
  const t = state[famKey].tios[i];
  const pid = t.id;
  return `
  <div class="pblock">
    <div class="pblock-header">
      <span class="pblock-title">Tío/a ${i+1}</span>
      <button class="btn btn-danger" data-remove-tio="${famKey}" data-idx="${i}">✕</button>
    </div>
    <div class="g3" style="margin-bottom:10px">
      <div class="gc12">${fld("Nombre completo", `<input type="text" value="${esc(t.nombre)}" placeholder="Nombre y apellidos" data-tio="${famKey}" data-idx="${i}" data-field="nombre">`)}</div>
      ${fld("Sexo", `<select data-tio="${famKey}" data-idx="${i}" data-field="sexo"><option value="">—</option><option value="H"${t.sexo==="H"?" selected":""}>Hombre</option><option value="M"${t.sexo==="M"?" selected":""}>Mujer</option></select>`)}
      ${fld("Fecha de nacimiento", `<input type="date" value="${esc(t.fechaNac)}" data-tio="${famKey}" data-idx="${i}" data-field="fechaNac">`)}
      ${fld("Edad", `<input type="number" min="0" max="130" value="${esc(t.edad)}" placeholder="años" data-tio="${famKey}" data-idx="${i}" data-field="edad">`)}
    </div>
    <div style="margin-bottom:8px">
      <label class="lbl">¿Ha fallecido?</label>
      <div class="ir">
        <label><input type="radio" name="tfall_${pid}" value="false" ${!t.fallecido?"checked":""} data-tio="${famKey}" data-idx="${i}" data-field="fallecido" data-boolval="false"> No</label>
        <label><input type="radio" name="tfall_${pid}" value="true" ${t.fallecido?"checked":""} data-tio="${famKey}" data-idx="${i}" data-field="fallecido" data-boolval="true"> Sí</label>
      </div>
    </div>
    ${t.fallecido ? `
    <div class="g3" style="margin-bottom:10px">
      <div class="gc12">${fld("Causa de la muerte", `<input type="text" value="${esc(t.causaMuerte)}" data-tio="${famKey}" data-idx="${i}" data-field="causaMuerte">`)}</div>
      ${fld("Edad al fallecer", `<input type="number" min="0" value="${esc(t.edadMuerte)}" placeholder="años" data-tio="${famKey}" data-idx="${i}" data-field="edadMuerte">`)}
    </div>` : ""}
    <div class="hr"></div>
    <div style="margin-bottom:8px">
      <label class="lbl">¿Ha tenido problemas cardiacos?</label>
      <div class="ir">
        <label><input type="radio" name="tcor_${pid}" value="false" ${!t.problemaCardiaco?"checked":""} data-tio="${famKey}" data-idx="${i}" data-field="problemaCardiaco" data-boolval="false"> No</label>
        <label><input type="radio" name="tcor_${pid}" value="true" ${t.problemaCardiaco===true?"checked":""} data-tio="${famKey}" data-idx="${i}" data-field="problemaCardiaco" data-boolval="true"> Sí</label>
        <label><input type="radio" name="tcor_${pid}" value="no_se" ${t.problemaCardiaco==="no_se"?"checked":""} data-tio="${famKey}" data-idx="${i}" data-field="problemaCardiaco" data-boolval="no_se"> No lo sé</label>
      </div>
    </div>
    ${t.problemaCardiaco===true ? fld("Describa el problema cardiaco", `<textarea data-tio="${famKey}" data-idx="${i}" data-field="descripcionProblema" rows="2">${esc(t.descripcionProblema)}</textarea>`) : ""}
  </div>`;
}

function renderFamilia(famKey, title, sufTios, sufFam, parentLabel) {
  const fam = state[famKey];
  const abKey = famKey+".abuela";
  const abPKey = famKey+".abuelo";
  const ab = fam.abuela;
  const abP = fam.abuelo;
  return `<div class="card">
    <p class="sec-title">${title}</p>

    <p style="font-size:13.5px;font-weight:600;color:#6b3a1e;margin-bottom:10px">1. Tíos y tías — hermanos/as de su ${parentLabel}</p>
    ${fam.tios.map((_,i) => tioBlock(famKey,i)).join("")}
    <button class="btn-add" style="margin-bottom:20px" data-add-tio="${famKey}">+ Agregar tío/a ${sufTios}</button>

    <div class="hr"></div>
    <p style="font-size:13.5px;font-weight:600;color:#6b3a1e;margin:14px 0 10px">2. Su abuela ${sufFam} — madre de su ${parentLabel}</p>
    <div class="pblock">
      <div class="g3" style="margin-bottom:10px">
        <div class="gc12">${fld("Nombre completo", tinp(abKey+".nombre","Nombre y apellidos"))}</div>
        ${fld("Fecha de nacimiento", tinp(abKey+".fechaNac","","date"))}
      </div>
      <div style="margin-bottom:8px">
        <label class="lbl">¿Está viva?</label>
        <div class="ir">
          ${radio("vivo_ab_"+famKey,"si",abKey+".vivo","Sí, viva")}
          ${radio("vivo_ab_"+famKey,"no",abKey+".vivo","No, fallecida")}
        </div>
      </div>
      ${ab.vivo==="no" ? `<div class="g2" style="margin-bottom:10px">
        ${fld("Causa de la muerte", tinp(abKey+".causaMuerte","Causa de fallecimiento"))}
        ${fld("Edad al fallecer", tinp(abKey+".edadMuerte","años","number"))}
      </div>` : ""}
      <div class="hr"></div>
      <div style="margin-bottom:8px">
        <label class="lbl">¿Tuvo problemas de corazón?</label>
        <div class="ir">
          ${radio("cor_ab_"+famKey,"no",abKey+".problemasCorazon","No / No lo sé")}
          ${radio("cor_ab_"+famKey,"si",abKey+".problemasCorazon","Sí")}
        </div>
      </div>
      ${ab.problemasCorazon==="si"
        ? fld("Describa el problema y la edad de diagnóstico", `<textarea data-bind="${abKey}.descripcionCorazon" rows="2" placeholder="Ej: Marcapasos a los 65 años…">${esc(ab.descripcionCorazon)}</textarea>`)
        : ""}
    </div>

    <p style="font-size:13.5px;font-weight:600;color:#6b3a1e;margin:14px 0 10px">3. Su abuelo ${sufFam} — padre de su ${parentLabel}</p>
    <div class="pblock">
      <div class="g3" style="margin-bottom:10px">
        <div class="gc12">${fld("Nombre completo", tinp(abPKey+".nombre","Nombre y apellidos"))}</div>
        ${fld("Fecha de nacimiento", tinp(abPKey+".fechaNac","","date"))}
      </div>
      <div style="margin-bottom:8px">
        <label class="lbl">¿Está vivo?</label>
        <div class="ir">
          ${radio("vivo_abp_"+famKey,"si",abPKey+".vivo","Sí, vivo")}
          ${radio("vivo_abp_"+famKey,"no",abPKey+".vivo","No, fallecido")}
        </div>
      </div>
      ${abP.vivo==="no" ? `<div class="g2" style="margin-bottom:10px">
        ${fld("Causa de la muerte", tinp(abPKey+".causaMuerte","Causa de fallecimiento"))}
        ${fld("Edad al fallecer", tinp(abPKey+".edadMuerte","años","number"))}
      </div>` : ""}
      <div class="hr"></div>
      <div style="margin-bottom:8px">
        <label class="lbl">¿Tuvo problemas de corazón?</label>
        <div class="ir">
          ${radio("cor_abp_"+famKey,"no",abPKey+".problemasCorazon","No / No lo sé")}
          ${radio("cor_abp_"+famKey,"si",abPKey+".problemasCorazon","Sí")}
        </div>
      </div>
      ${abP.problemasCorazon==="si"
        ? fld("Describa el problema", `<textarea data-bind="${abPKey}.descripcionCorazon" rows="2">${esc(abP.descripcionCorazon)}</textarea>`)
        : ""}
    </div>

    <p style="font-size:13.5px;font-weight:600;color:#6b3a1e;margin:14px 0 10px">4. Otros familiares ${sufTios} con problemas cardiacos (primos u otros)</p>
    ${fam.primos.map((pr,i) => `
    <div class="primo-row" style="margin-bottom:8px">
      ${fld(i===0?"Nombre":"", `<input type="text" value="${esc(pr.nombre)}" data-primo="${famKey}" data-idx="${i}" data-field="nombre" placeholder="Nombre">`)}
      ${fld(i===0?"Parentesco":"", `<input type="text" value="${esc(pr.parentesco)}" data-primo="${famKey}" data-idx="${i}" data-field="parentesco" placeholder="primo, sobrino…">`)}
      ${fld(i===0?"Nombre padre/tutor":"", `<input type="text" value="${esc(pr.nombrePadre)}" data-primo="${famKey}" data-idx="${i}" data-field="nombrePadre">`)}
      ${fld(i===0?"Problema cardiaco":"", `<input type="text" value="${esc(pr.problemaCardiaco)}" data-primo="${famKey}" data-idx="${i}" data-field="problemaCardiaco">`)}
      <div style="${i===0?"padding-top:22px":""}">
        <button class="btn btn-danger" data-remove-primo="${famKey}" data-idx="${i}">✕</button>
      </div>
    </div>`).join("")}
    <button class="btn-add" data-add-primo="${famKey}">+ Agregar familiar ${sufTios}</button>
  </div>`;
}

function renderPedigri() {
  const afectados = countAfectados();
  const p = state.personal;
  return `
  <div class="card">
    <p class="sec-title">Pedigrí Familiar</p>
    <p class="sec-sub">Árbol genealógico generado automáticamente. Los símbolos con fondo rosado indican antecedentes cardiacos reportados.</p>
    <canvas id="pedigree-canvas" width="820" height="580"></canvas>
  </div>
  <div class="card">
    <p style="font-family:'Playfair Display',serif;font-size:16px;font-style:italic;margin-bottom:14px">Resumen de la Encuesta</p>
    <div class="rrow"><span class="rlbl">Paciente</span><span class="rval">${esc(p.nombre)} ${esc(p.apellidos)}</span></div>
    <div class="rrow"><span class="rlbl">Fecha de nacimiento</span><span class="rval">${p.fechaNac||"—"}</span></div>
    <div class="rrow"><span class="rlbl">Sexo</span><span class="rval">${p.sexo==="H"?"Hombre":"Mujer"}</span></div>
    <div class="rrow"><span class="rlbl">Identificación</span><span class="rval">${p.identificacion||"—"}</span></div>
    <div class="rrow"><span class="rlbl">Municipio</span><span class="rval">${p.municipio||"—"}${p.departamento?", "+p.departamento:""}</span></div>
    <div class="rrow"><span class="rlbl">Hijos registrados</span><span class="rval">${state.hijos.filter(h=>h.nombre).length}</span></div>
    <div class="rrow"><span class="rlbl">Hermanos/as registrados</span><span class="rval">${state.hermanos.filter(h=>h.nombre).length}</span></div>
    <div class="rrow"><span class="rlbl">Familiares con antecedentes cardiacos</span><span class="rval red">${afectados} persona(s)</span></div>
    <div class="warn" style="margin-top:16px;margin-bottom:0">
      Al enviar esta encuesta autorizo al Instituto del Corazón de Bucaramanga el uso de mi información de salud y antecedentes familiares con fines diagnósticos y de atención médica, bajo estricta confidencialidad conforme a la normatividad colombiana vigente.
    </div>
  </div>`;
}

function countAfectados() {
  return [
    ...state.hijos.filter(h=>h.problemaCardiaco===true),
    ...state.hermanos.filter(h=>h.problemaCardiaco===true),
    ...(state.madre.problemasCorazon==="si"?[1]:[]),
    ...(state.padre.problemasCorazon==="si"?[1]:[]),
    ...state.famMadre.tios.filter(t=>t.problemaCardiaco===true),
    ...state.famPadre.tios.filter(t=>t.problemaCardiaco===true),
    ...(state.famMadre.abuela.problemasCorazon==="si"?[1]:[]),
    ...(state.famMadre.abuelo.problemasCorazon==="si"?[1]:[]),
    ...(state.famPadre.abuela.problemasCorazon==="si"?[1]:[]),
    ...(state.famPadre.abuelo.problemasCorazon==="si"?[1]:[]),
  ].length;
}

// ── PEDIGREE CANVAS ───────────────────────────────────────────
function drawPedigree() {
  const canvas = document.getElementById("pedigree-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = "#faf7f2"; ctx.fillRect(0,0,W,H);
  ctx.strokeStyle = "rgba(139,90,60,0.05)"; ctx.lineWidth = 1;
  for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  const SZ=40, R=20;

  function node(x,y,male,aff,dead,proband,n1,n2) {
    if(aff||proband){
      const gc=ctx.createRadialGradient(x,y,2,x,y,R*2.2);
      gc.addColorStop(0,aff?"rgba(185,28,28,0.15)":"rgba(124,58,30,0.18)");
      gc.addColorStop(1,"transparent");
      ctx.fillStyle=gc; ctx.beginPath();
      male?ctx.rect(x-R*1.8,y-R*1.8,R*3.6,R*3.6):ctx.arc(x,y,R*1.8,0,Math.PI*2);
      ctx.fill();
    }
    ctx.save();
    ctx.lineWidth = proband?2.5:1.8;
    ctx.strokeStyle = aff?"#b91c1c":proband?"#7c3a1e":"#5c3317";
    ctx.fillStyle   = aff?"#fecaca":proband?"#fde8d8":"#fdf6ee";
    ctx.beginPath();
    male?ctx.rect(x-R,y-R,SZ,SZ):ctx.arc(x,y,R,0,Math.PI*2);
    ctx.fill(); ctx.stroke();
    if(aff&&!proband){
      ctx.fillStyle="#b91c1c"; ctx.beginPath();
      male?ctx.rect(x-R,y-R,SZ/2,SZ):ctx.arc(x,y,R,Math.PI/2,3*Math.PI/2);
      ctx.fill();
      ctx.strokeStyle="#b91c1c"; ctx.lineWidth=1.8; ctx.beginPath();
      male?ctx.rect(x-R,y-R,SZ,SZ):ctx.arc(x,y,R,0,Math.PI*2);
      ctx.stroke();
    }
    if(dead){
      ctx.strokeStyle="#374151"; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(x-R-5,y+R+5); ctx.lineTo(x+R+5,y-R-5); ctx.stroke();
    }
    if(proband){
      ctx.fillStyle="#7c3a1e"; ctx.font="bold 18px serif"; ctx.textAlign="left";
      ctx.fillText("↗",x+R+2,y+5);
    }
    ctx.restore();
    ctx.textAlign="center"; ctx.fillStyle="#3b1f0e";
    if(n1){ctx.font="10px 'Source Serif 4',serif"; ctx.fillText(n1.length>14?n1.slice(0,13)+"…":n1,x,y+R+15);}
    if(n2){ctx.font="9px 'Source Serif 4',serif"; ctx.fillStyle="#6b3a1e"; ctx.fillText(n2,x,y+R+26);}
  }
  function ln(x1,y1,x2,y2){ctx.save();ctx.strokeStyle="#8b5e3c";ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.restore();}
  function couple(x1,y1,x2,y2){ln(x1,y1,x2,y2);return{mx:(x1+x2)/2,my:(y1+y2)/2};}
  function desc(px,py,cx,cy){const my=py+(cy-py)*0.5;ln(px,py,px,my);ln(px,my,cx,my);ln(cx,my,cx,cy);}

  const genY=[65,185,310,430];
  ["Generación IV — Bisabuelos","Generación III — Abuelos","Generación II — Padres/Tíos","Generación I — Paciente/Hermanos/Hijos"].forEach((g,i)=>{
    ctx.fillStyle="rgba(92,51,23,0.3)"; ctx.font="italic 9.5px 'Source Serif 4',serif"; ctx.textAlign="left";
    ctx.fillText(g,6,genY[i]+4);
  });

  const s = state;
  // Abuelos maternos
  const abMatX1=W*0.17, abMatX2=W*0.29, abPatX1=W*0.62, abPatX2=W*0.74, abY=genY[0];
  node(abMatX1,abY,false,isAff(s.famMadre.abuela),s.famMadre.abuela.vivo==="no",false, firstName(s.famMadre.abuela.nombre)||"Ab.Mat.", birthYear(s.famMadre.abuela.fechaNac)?`*${birthYear(s.famMadre.abuela.fechaNac)}`:"");
  node(abMatX2,abY,true, isAff(s.famMadre.abuelo),s.famMadre.abuelo.vivo==="no",false, firstName(s.famMadre.abuelo.nombre)||"Ab.Mat.", "");
  couple(abMatX1+R,abY,abMatX2-R,abY);
  node(abPatX1,abY,false,isAff(s.famPadre.abuela),s.famPadre.abuela.vivo==="no",false, firstName(s.famPadre.abuela.nombre)||"Ab.Pat.","");
  node(abPatX2,abY,true, isAff(s.famPadre.abuelo),s.famPadre.abuelo.vivo==="no",false, firstName(s.famPadre.abuelo.nombre)||"Ab.Pat.","");
  couple(abPatX1+R,abY,abPatX2-R,abY);

  // Padres + tíos
  const madreX=W*0.36, padreX=W*0.52, parY=genY[1];
  const abMatMid=(abMatX1+abMatX2)/2, abPatMid=(abPatX1+abPatX2)/2;
  node(madreX,parY,false,isAff(s.madre),s.madre.vivo==="no",false, firstName(s.madre.nombre)||"Madre", birthYear(s.madre.fechaNac)?`*${birthYear(s.madre.fechaNac)}`:"");
  desc(abMatMid,abY+R,madreX,parY-R);
  node(padreX,parY,true, isAff(s.padre),s.padre.vivo==="no",false, firstName(s.padre.nombre)||"Padre", birthYear(s.padre.fechaNac)?`*${birthYear(s.padre.fechaNac)}`:"");
  desc(abPatMid,abY+R,padreX,parY-R);
  const {mx:parMid,my:parMidY} = couple(madreX+R,parY,padreX-R,parY);

  s.famMadre.tios.filter(t=>t.nombre).slice(0,2).forEach((t,i)=>{
    const tx=W*0.06+i*(SZ+18);
    node(tx,parY,t.sexo==="H",t.problemaCardiaco===true,t.fallecido,false,firstName(t.nombre),"");
    desc(abMatMid,abY+R,tx,parY-R);
  });
  s.famPadre.tios.filter(t=>t.nombre).slice(0,2).forEach((t,i)=>{
    const tx=W*0.77+i*(SZ+18);
    node(tx,parY,t.sexo==="H",t.problemaCardiaco===true,t.fallecido,false,firstName(t.nombre),"");
    desc(abPatMid,abY+R,tx,parY-R);
  });

  // Probando + hermanos
  const probX=W*0.46, probY=genY[2];
  const male = s.personal.sexo!=="M";
  node(probX,probY,male,false,false,true, firstName(s.personal.nombre)||"Paciente", birthYear(s.personal.fechaNac)?`*${birthYear(s.personal.fechaNac)}`:"");
  desc(parMid,parMidY+2,probX,probY-R);
  s.hermanos.filter(h=>h.nombre).slice(0,3).forEach((h,i)=>{
    const hx=W*0.08+i*(SZ+22);
    node(hx,probY,h.sexo==="H",h.problemaCardiaco===true,h.fallecido,false,firstName(h.nombre),"");
    desc(parMid,parMidY+2,hx,probY-R);
  });

  // Hijos
  const hijFiltrados = s.hijos.filter(h=>h.nombre);
  if(hijFiltrados.length>0){
    const spX = probX+(male?70:-70);
    node(spX,probY,!male,false,false,false,"Cónyuge","");
    const {mx:pm} = couple(Math.min(probX,spX)+R,probY,Math.max(probX,spX)-R,probY);
    const hijoY = genY[3];
    const startX = pm-((hijFiltrados.length-1)*(SZ+16))/2;
    hijFiltrados.slice(0,5).forEach((h,i)=>{
      const hx = startX+i*(SZ+16);
      node(hx,hijoY,h.sexo==="H",h.problemaCardiaco===true,h.fallecido,false,firstName(h.nombre),"");
      desc(pm,probY+R,hx,hijoY-R);
    });
  }

  // Leyenda
  const lx=W-168, ly=H-155;
  ctx.fillStyle="rgba(250,247,242,0.95)"; ctx.strokeStyle="rgba(139,90,60,0.25)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(lx-10,ly-10,162,152,6); ctx.fill(); ctx.stroke();
  ctx.fillStyle="#3b1f0e"; ctx.font="bold 10px 'Source Serif 4',serif"; ctx.textAlign="left";
  ctx.fillText("CONVENCIONES",lx,ly+4);
  [
    {sq:true,c:"#fdf6ee",s:"#5c3317",l:"Hombre sano"},
    {sq:false,c:"#fdf6ee",s:"#5c3317",l:"Mujer sana"},
    {sq:true,c:"#fecaca",s:"#b91c1c",l:"Con cardiopatía"},
    {dead:true,l:"Fallecido/a"},
    {proband:true,l:"Paciente índice"}
  ].forEach((item,i)=>{
    const iy=ly+20+i*25;
    if(item.dead){
      ctx.strokeStyle="#5c3317";ctx.fillStyle="#fdf6ee";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.rect(lx,iy,16,16);ctx.fill();ctx.stroke();
      ctx.strokeStyle="#374151";ctx.beginPath();ctx.moveTo(lx-3,iy+19);ctx.lineTo(lx+19,iy-3);ctx.stroke();
    } else if(item.proband){
      ctx.strokeStyle="#7c3a1e";ctx.fillStyle="#fde8d8";ctx.lineWidth=1.5;
      ctx.beginPath();ctx.rect(lx,iy,16,16);ctx.fill();ctx.stroke();
      ctx.fillStyle="#7c3a1e";ctx.font="bold 12px serif";ctx.textAlign="left";ctx.fillText("↗",lx+18,iy+12);
    } else if(item.sq){
      ctx.strokeStyle=item.s;ctx.fillStyle=item.c;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.rect(lx,iy,16,16);ctx.fill();ctx.stroke();
    } else {
      ctx.strokeStyle=item.s;ctx.fillStyle=item.c;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.arc(lx+8,iy+8,8,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.fillStyle="#3b1f0e";ctx.font="10px 'Source Serif 4',serif";ctx.textAlign="left";
    ctx.fillText(item.l,lx+28,iy+11);
  });

  ctx.fillStyle="#3b1f0e"; ctx.font="italic 11px 'Playfair Display',serif"; ctx.textAlign="center";
  ctx.fillText(`Pedigrí Familiar — ${s.personal.nombre||"Paciente"} ${s.personal.apellidos||""}`,W/2,20);
  ctx.fillStyle="rgba(92,51,23,0.4)"; ctx.font="9px 'Source Serif 4',serif";
  ctx.fillText("Instituto del Corazón de Bucaramanga · Unidad de Insuficiencia Cardiaca",W/2,34);
}

// ── ATTACH EVENTS ─────────────────────────────────────────────
function attachEvents() {
  // Step nav
  document.querySelectorAll("[data-goto]").forEach(btn => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.goto);
      if(i <= state.step) { state.step = i; render(); }
    });
  });

  // Prev / Next / Send
  const prev = document.getElementById("btn-prev");
  const next = document.getElementById("btn-next");
  const send = document.getElementById("btn-send");
  const reset = document.getElementById("btn-reset");
  if(prev) prev.addEventListener("click", () => { state.step--; render(); });
  if(next) next.addEventListener("click", () => { if(canNext()) { state.step++; render(); } });
  if(send) send.addEventListener("click", handleEnviar);
  if(reset) reset.addEventListener("click", () => { Object.assign(state,{step:0,submitted:false,sendError:"",sending:false}); render(); });

  // Ethnic tags
  document.querySelectorAll("[data-ethnic]").forEach(btn => {
    btn.addEventListener("click", () => {
      const e = btn.dataset.ethnic;
      state.personal.grupoEtnico = state.personal.grupoEtnico===e?"":e;
      render();
    });
  });

  // data-bind inputs
  document.querySelectorAll("[data-bind]").forEach(el => {
    const bind = el.dataset.bind;
    const ev = el.tagName==="SELECT"||el.type==="radio"||el.type==="checkbox"?"change":"input";
    el.addEventListener(ev, () => {
      const val = el.type==="checkbox" ? el.checked : el.value;
      deepSet(state, bind, val);
      if(bind.includes("vivo")||bind.includes("problemasCorazon")||bind.includes("vivoFueraColombia")) render();
    });
  });

  // data-arr inputs (hijos / hermanos)
  document.querySelectorAll("[data-arr]").forEach(el => {
    const arrKey=el.dataset.arr, idx=parseInt(el.dataset.idx), field=el.dataset.field;
    const arr = deepGet(state, arrKey);
    const ev = el.tagName==="SELECT"||el.type==="radio"||el.type==="checkbox"?"change":"input";
    el.addEventListener(ev, () => {
      let val;
      if(el.type==="radio") {
        const bv = el.dataset.boolval;
        val = bv==="true"?true:bv==="false"?false:bv;
      } else if(el.type==="checkbox") {
        val = el.checked;
      } else {
        val = el.value;
      }
      arr[idx][field] = val;
      if(["fallecido","problemaCardiaco","medioHermano"].includes(field)) render();
    });
  });

  // data-tio inputs
  document.querySelectorAll("[data-tio]").forEach(el => {
    const famKey=el.dataset.tio, idx=parseInt(el.dataset.idx), field=el.dataset.field;
    const ev = el.tagName==="SELECT"||el.type==="radio"?"change":"input";
    el.addEventListener(ev, () => {
      let val;
      if(el.type==="radio"){const bv=el.dataset.boolval;val=bv==="true"?true:bv==="false"?false:bv;}
      else val=el.value;
      state[famKey].tios[idx][field]=val;
      if(["fallecido","problemaCardiaco"].includes(field)) render();
    });
  });

  // data-primo inputs
  document.querySelectorAll("[data-primo]").forEach(el => {
    const famKey=el.dataset.primo, idx=parseInt(el.dataset.idx), field=el.dataset.field;
    el.addEventListener("input", () => { state[famKey].primos[idx][field]=el.value; });
  });

  // Add / Remove buttons
  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key=btn.dataset.add;
      if(key==="hijos") state.hijos.push(emptyHijo());
      else state.hermanos.push(emptyHermano());
      render();
    });
  });
  document.querySelectorAll("[data-remove]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key=btn.dataset.remove, idx=parseInt(btn.dataset.idx);
      if(key==="hijos") state.hijos.splice(idx,1);
      else state.hermanos.splice(idx,1);
      render();
    });
  });
  document.querySelectorAll("[data-add-tio]").forEach(btn => {
    btn.addEventListener("click", () => { state[btn.dataset.addTio].tios.push(emptyTio()); render(); });
  });
  document.querySelectorAll("[data-remove-tio]").forEach(btn => {
    btn.addEventListener("click", () => { state[btn.dataset.removeTio].tios.splice(parseInt(btn.dataset.idx),1); render(); });
  });
  document.querySelectorAll("[data-add-primo]").forEach(btn => {
    btn.addEventListener("click", () => { state[btn.dataset.addPrimo].primos.push(emptyPrimo()); render(); });
  });
  document.querySelectorAll("[data-remove-primo]").forEach(btn => {
    btn.addEventListener("click", () => { state[btn.dataset.removePrimo].primos.splice(parseInt(btn.dataset.idx),1); render(); });
  });
}

function canNext() {
  if(state.step===0) return state.personal.nombre && state.personal.apellidos && state.personal.fechaNac;
  return true;
}

// ── EMAIL ─────────────────────────────────────────────────────
function buildResumen() {
  const p = state.personal;
  let r = `ENCUESTA HISTORIA FAMILIAR — INSTITUTO DEL CORAZÓN DE BUCARAMANGA\n`;
  r += `Fecha de envío: ${new Date().toLocaleString("es-CO")}\n`;
  r += `${"─".repeat(50)}\n`;
  r += `PACIENTE: ${p.nombre} ${p.apellidos}\n`;
  r += `ID: ${p.identificacion||"—"} | Nac: ${p.fechaNac||"—"} | Sexo: ${p.sexo==="H"?"Hombre":"Mujer"}\n`;
  r += `Tel: ${p.telefonoMovil||p.telefonoFijo||"—"} | Email: ${p.email||"—"}\n`;
  r += `Dirección: ${p.direccion||"—"}, ${p.municipio||"—"}, ${p.departamento||"—"}\n`;
  r += `Médico primario: ${p.medicoNombre||"—"} — ${p.medicoCentro||"—"}\n`;
  r += `Contacto emergencia: ${p.contactoNombre||"—"} (${p.contactoRelacion||"—"}) ${p.contactoMovil||""}\n`;
  r += `Grupo étnico: ${p.grupoEtnico||"—"}\n\n`;
  r += `MADRE: ${state.madre.nombre||"—"} | Viva: ${yn(state.madre.vivo)} | Corazón: ${yn(state.madre.problemasCorazon)}\n`;
  if(state.madre.problemasCorazon==="si") r+=`  ♥ ${state.madre.descripcionCorazon||"—"}\n`;
  r += `PADRE: ${state.padre.nombre||"—"} | Vivo: ${yn(state.padre.vivo)} | Corazón: ${yn(state.padre.problemasCorazon)}\n`;
  if(state.padre.problemasCorazon==="si") r+=`  ♥ ${state.padre.descripcionCorazon||"—"}\n`;
  r += `\nHIJOS (${state.hijos.filter(h=>h.nombre).length}):\n`;
  state.hijos.filter(h=>h.nombre).forEach((h,i)=>{
    r+=`  ${i+1}. ${h.nombre} | Sexo: ${h.sexo==="H"?"H":"M"} | Nac: ${h.fechaNac||"—"}\n`;
    if(h.fallecido) r+=`     Fallecido — Causa: ${h.causaMuerte||"—"} — Edad: ${h.edadMuerte||"—"}\n`;
    if(h.problemaCardiaco===true) r+=`     ♥ ${h.descripcionProblema||"—"}\n`;
  });
  r += `\nHERMANOS (${state.hermanos.filter(h=>h.nombre).length}):\n`;
  state.hermanos.filter(h=>h.nombre).forEach((h,i)=>{
    r+=`  ${i+1}. ${h.nombre} | Sexo: ${h.sexo==="H"?"H":"M"}\n`;
    if(h.fallecido) r+=`     Fallecido — Causa: ${h.causaMuerte||"—"}\n`;
    if(h.problemaCardiaco===true) r+=`     ♥ ${h.descripcionProblema||"—"}\n`;
  });
  r += `\nFAMILIA MATERNA:\n`;
  r += `  Abuela: ${state.famMadre.abuela.nombre||"—"} | Corazón: ${yn(state.famMadre.abuela.problemasCorazon)}\n`;
  if(state.famMadre.abuela.problemasCorazon==="si") r+=`    ♥ ${state.famMadre.abuela.descripcionCorazon||"—"}\n`;
  r += `  Abuelo: ${state.famMadre.abuelo.nombre||"—"} | Corazón: ${yn(state.famMadre.abuelo.problemasCorazon)}\n`;
  state.famMadre.tios.filter(t=>t.nombre).forEach((t,i)=>{
    r+=`  Tío/a ${i+1}: ${t.nombre}\n`;
    if(t.problemaCardiaco===true) r+=`    ♥ ${t.descripcionProblema||"—"}\n`;
  });
  r += `\nFAMILIA PATERNA:\n`;
  r += `  Abuela: ${state.famPadre.abuela.nombre||"—"} | Corazón: ${yn(state.famPadre.abuela.problemasCorazon)}\n`;
  r += `  Abuelo: ${state.famPadre.abuelo.nombre||"—"} | Corazón: ${yn(state.famPadre.abuelo.problemasCorazon)}\n`;
  state.famPadre.tios.filter(t=>t.nombre).forEach((t,i)=>{
    r+=`  Tío/a ${i+1}: ${t.nombre}\n`;
    if(t.problemaCardiaco===true) r+=`    ♥ ${t.descripcionProblema||"—"}\n`;
  });
  r += `\n${"─".repeat(50)}\n`;
  r += `TOTAL FAMILIARES CON ANTECEDENTES CARDÍACOS: ${countAfectados()}\n`;
  return r;
}

async function handleEnviar() {
  state.sendError = ""; state.sending = true; render();
  const p = state.personal;
  const resumen = buildResumen();
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_MEDICO, {
      to_email:        CORREO_MEDICO,
      paciente_nombre: `${p.nombre} ${p.apellidos}`,
      paciente_id:     p.identificacion||"—",
      paciente_telefono: p.telefonoMovil||p.telefonoFijo||"—",
      fecha_cita:      p.fechaCita||"—",
      resumen_encuesta: resumen,
      reply_to:        p.email||CORREO_MEDICO,
    });
    if(p.email) {
      await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_PACIENTE, {
        to_email:        p.email,
        paciente_nombre: `${p.nombre} ${p.apellidos}`,
        fecha_cita:      p.fechaCita||"su próxima consulta",
        reply_to:        "fallacardiaca@institutodelcorazon.com",
      });
    }
    state.submitted = true;
  } catch(err) {
    state.sendError = "No se pudo enviar la encuesta. Verifique su conexión o contacte al instituto. (" + (err.text||err.message||"Error desconocido") + ")";
  }
  state.sending = false; render();
}

// ── INIT ─────────────────────────────────────────────────────
emailjs.init(EMAILJS_PUBLIC_KEY);
render();
