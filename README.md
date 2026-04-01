# Pedigrí Familiar — Instituto del Corazón de Bucaramanga

Encuesta digital de historia familiar cardiológica con generación automática de pedigrí.

## Estructura del proyecto

```
pedigri-familiar/
├── index.html   ← Página principal
├── style.css    ← Estilos
├── app.js       ← Lógica de la aplicación
└── README.md    ← Este archivo
```

## Configuración de EmailJS

Para que la encuesta envíe correos al completarse:

1. Cree una cuenta gratuita en [emailjs.com](https://www.emailjs.com)
2. En **Email Services** conecte su cuenta Gmail (`carvajaljuanfernando@gmail.com`)
3. Cree dos **Email Templates**:
   - `template_medico`: recibe el resumen completo de la encuesta
   - `template_paciente`: confirmación al paciente
4. En `app.js`, reemplace las primeras líneas:

```js
const EMAILJS_PUBLIC_KEY        = "su_public_key";
const EMAILJS_SERVICE_ID        = "service_xxxxxxx";
const EMAILJS_TEMPLATE_MEDICO   = "template_xxxxxxx";
const EMAILJS_TEMPLATE_PACIENTE = "template_xxxxxxx";
```

### Variables disponibles en los templates de EmailJS

**Template médico:**
- `{{paciente_nombre}}` — Nombre completo del paciente
- `{{paciente_id}}` — Número de identificación
- `{{paciente_telefono}}` — Teléfono de contacto
- `{{fecha_cita}}` — Fecha de la cita
- `{{resumen_encuesta}}` — Resumen completo de la historia familiar
- `{{reply_to}}` — Correo del paciente (para responder directamente)

**Template paciente:**
- `{{paciente_nombre}}` — Nombre completo
- `{{fecha_cita}}` — Fecha de la cita
- `{{to_email}}` — Correo del paciente

## Publicar en GitHub Pages

1. Suba los archivos a un repositorio GitHub
2. Vaya a **Settings → Pages**
3. En **Source** seleccione `main` branch, carpeta `/ (root)`
4. El link quedará disponible en: `https://su-usuario.github.io/pedigri-familiar`

## Modificar el formulario

Todos los pasos y campos están en `app.js`. Las funciones principales son:
- `renderPersonal()` — Paso 1: datos personales
- `renderHijos()` — Paso 2: hijos
- `renderHermanos()` — Paso 3: hermanos
- `renderParent()` — Pasos 4 y 5: madre y padre
- `renderFamilia()` — Pasos 6 y 7: familia materna y paterna
- `renderPedigri()` — Paso 8: pedigrí y resumen
- `drawPedigree()` — Dibuja el árbol genealógico en canvas

---
Desarrollado para la Unidad Funcional de Insuficiencia Cardiaca
Instituto del Corazón de Bucaramanga · CardioUDES
