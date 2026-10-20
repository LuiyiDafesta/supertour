# VALIDACIÓN FORENSE Y PLAN DE CORRECCIÓN — SUPERTOURCHANNEL
**Fase 2 de Auditoría Técnica**  
**Fecha:** 19 de Octubre de 2026  
**Equipo Auditor:** Arquitectura de Software, Seguridad Web & PostgreSQL/Supabase, DevOps & Cloud Infrastructure, QA & Testing  
**Estado:** Diagnóstico Forense y Planificación sin Modificación de Código de Producción  

---

## 1. TABLA RESUMEN DE HALLAZGOS FORENSES

| ID | Estado Forense | Archivo(s) y Líneas | Categoría | Severidad |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **CONFIRMADO** | `upload.php:12-15`<br>`delete.php:12-15`<br>`_source/public/delete.php:12-15` | Credenciales expuestas | **CRÍTICA** |
| **SEC-02** | **CONFIRMADO** | `delete.php:2-49, 120-188`<br>`_source/public/delete.php:2-49, 120-188` | Autenticación / Borrado no autorizado | **CRÍTICA** |
| **SEC-03** | **CONFIRMADO** | `upload.php:2-36, 91-105` | Autenticación / Carga arbitraria | **CRÍTICA** |
| **SEC-04** | **CONFIRMADO** | `_source/src/pages/AdminDashboard.tsx:228-237`<br>`_source/src/App.tsx:19` | Control de acceso / Consola admin | **CRÍTICA** |
| **SEC-05** | **CONFIRMADO** | `20260522080000_create_supertour_schema.sql:35-39, 48-52`<br>`20260525162254_create_analytics_and_surveys.sql:43-47`<br>`20260525165207_alter_surveys_schema.sql:37-41` | Autorización RLS / Base de Datos | **CRÍTICA** |
| **SEC-06** | **CONFIRMADO** | `_source/src/pages/SurveyPage.tsx:200-224`<br>`20260525162254_create_analytics_and_surveys.sql:33-35` | Privacidad / Exposición PII de menores | **CRÍTICA** |
| **SEC-07** | **CONFIRMADO** | `_source/src/components/AnalyticsTracker.tsx:26-47, 58-78`<br>`_source/src/pages/AdminDashboard.tsx:1186-1218` | Inyección de código / Stored XSS | **CRÍTICA** |
| **SEC-08** | **CONFIRMADO** | `_source/src/pages/SchoolDetailPage.tsx:214-245, 295-310`<br>`20260522080000_create_supertour_schema.sql:30-32, 43-45` | Control de acceso / Exposición PIN | **ALTA** |
| **BUG-01** | **CONFIRMADO** | `_source/src/components/Navbar.tsx:68, 81` | Runtime Crash / TypeScript | **ALTA** |
| **BUG-02** | **CONFIRMADO** | `_source/src/components/Uploader.tsx:159-170`<br>`_source/src/pages/AdminDashboard.tsx:471-479, 621-625, 1273-1276` | Integridad de datos / Corrupción de fotos | **ALTA** |
| **BUG-03** | **CONFIRMADO** | `_source/src/pages/SchoolDetailPage.tsx:80`<br>`20260525162254_create_analytics_and_surveys.sql:7` | Integridad DB / Constraint Violation | **MEDIA** |
| **BUG-04** | **CONFIRMADO** | `_source/src/pages/SchoolDetailPage.tsx:418-426`<br>`20260525162254_create_analytics_and_surveys.sql:38-47` | Lógica de negocio / Votación RLS | **MEDIA** |
| **ARC-01** | **CONFIRMADO** | `_source/src/components/PremiumCalendar.tsx:15, 147-155, 181-185, 208-215` | Arquitectura / Rigidez temporal | **MEDIA** |
| **OPS-01** | **CONFIRMADO** | `.htaccess:1-8` | Seguridad de Infraestructura / Webroot | **MEDIA** |
| **SEO-01** | **CONFIRMADO** | `index.html:16, 19, 26, 29`<br>`_source/index.html:16, 19, 26, 29` | Configuración / Dominio Staging | **BAJA** |
| **QA-01** | **CONFIRMADO** | `_source/package.json:10, 12`<br>`_source/tsconfig.app.json:27-29` | Calidad de código / Linter, Tests & Types | **BAJA** |

---

## 2. VALIDACIÓN FORENSE INDIVIDUAL

### SEC-01 — Credenciales de Backblaze B2 en Código Versionado
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `upload.php`, líneas 12 a 15.
  - `delete.php`, líneas 12 a 15.
  - `_source/public/delete.php`, líneas 12 a 15.
  - `_source/dist/delete.php`, líneas 12 a 15.
  - Historial Git: Confirmada presencia en commits `c99d4bc` y `1cec096`.
- **Evidencia (sin revelar secretos):**
  ```php
  // Backblaze B2 Credentials
  $keyId = "00429a18...";          // Master Application Key ID hardcodeado
  $applicationKey = "K004dFQAr..."; // Master Application Key Secret hardcodeado
  $bucketId = "9299dad1580a...";    // Bucket ID
  $bucketName = "SupertourLow";     // Bucket Name
  ```
- **Explicación Técnica:** Las credenciales maestras de la API B2 residen en texto plano en la raíz del servidor web y en archivos estáticos públicos que Vite copia a `dist/`. Cualquier persona con acceso al código o que descargue los archivos PHP sin ejecución (por ejemplo, si el módulo PHP del servidor se desactiva accidentalmente o se lee vía exposición de fuentes) obtiene control absoluto del bucket B2.
- **Impacto Real:** Robo de credenciales con privilegios para leer, alterar, descargar y purgar todo el contenido multimedia de la empresa, así como generar sobrecostos de almacenamiento y transferencia.
- **Pendiente de Verificar Fuera del Repositorio:** Comprobar en el panel de Backblaze B2 si esta `applicationKey` tiene alcance restringido a un solo bucket o permisos sobre toda la cuenta, y si se encuentra activa actualmente.

---

### SEC-02 — Borrado Físico de Objetos sin Autenticación (`delete.php`)
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `delete.php`, líneas 1 a 49 y 120 a 188.
  - `_source/public/delete.php`, líneas 1 a 49 y 120 a 188.
- **Evidencia:**
  ```php
  header("Access-Control-Allow-Origin: *");
  ...
  $rawInput = file_get_contents('php://input');
  $inputData = json_decode($rawInput, true);
  // Lee 'urls', 'url' o 'filename' y procede a llamar b2_delete_file_version sin ningún token ni cookie
  ```
- **Explicación Técnica:** El script expone `Access-Control-Allow-Origin: *`, acepta peticiones `POST` anónimas por JSON o Formulario, extrae las rutas de archivo relativas y ejecuta llamadas recursivas a `b2_list_file_versions` y `b2_delete_file_version` utilizando las credenciales maestras de Backblaze. No existe verificación de sesión de Supabase, validación de JWT, CSRF token ni filtrado de origen.
- **Impacto Real:** Destrucción maliciosa o accidental irreversible de todo el archivo fotográfico y audiovisual de la empresa. Un script de 5 líneas ejecutado por un atacante puede borrar miles de archivos de egresados en minutos.
- **Pendiente de Verificar Fuera del Repositorio:** Verificar si el bucket `SupertourLow` cuenta con *Object Lock* o reglas de retención de versiones habilitadas en Backblaze que impidan el borrado inmediato.

---

### SEC-03 — Carga Arbitraria de Archivos a B2 sin Autenticación (`upload.php`)
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `upload.php`, líneas 1 a 36 y 91 a 115.
- **Evidencia:**
  ```php
  header("Access-Control-Allow-Origin: *");
  ...
  if (!isset($_FILES['file'])) { ... }
  $fileName = isset($_POST['filename']) ? $_POST['filename'] : basename($file['name']);
  $fileName = preg_replace('/[^a-zA-Z0-9.\-\_\/]/', '_', $fileName);
  ...
  $fileData = file_get_contents($file['tmp_name']);
  // Envía el archivo crudo a B2 con el tipo MIME declarado por el cliente ($file['type'])
  ```
- **Explicación Técnica:** Cualquier cliente web puede enviar un formulario multipart a `https://<dominio>/upload.php`. No se valida la sesión del usuario. No se valida el tipo real del archivo mediante inspección de magic bytes (solo se reenvía `$file['type']` provisto por el atacante). Se permite el carácter `/` en el nombre, facilitando la creación de carpetas arbitrarias en el almacenamiento. Además, `file_get_contents` carga el archivo completo en la memoria RAM de PHP, provocando denegación de servicio (OOM) con archivos grandes.
- **Impacto Real:** Alojamiento de contenido malicioso, distribución de malware bajo el subdominio legítimo de la empresa (`media.supertourchannel.com.ar`), saturación del espacio de almacenamiento y facturación no controlada.
- **Pendiente de Verificar Fuera del Repositorio:** Verificar los límites de subida de PHP (`upload_max_filesize`, `post_max_size`, `memory_limit`) en el servidor de producción.

---

### SEC-04 — Ausencia de Protección de Ruta en `/admin`
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/pages/AdminDashboard.tsx`, líneas 228 a 237.
  - `_source/src/App.tsx`, línea 19.
- **Evidencia:**
  ```tsx
  // Check auth session
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        console.log('No admin session. Offline mode active for easy local testing.');
      }
    };
    checkUser();
  }, [navigate]);
  ```
- **Explicación Técnica:** La ruta `/admin` en `App.tsx` no posee ningún *route guard*. Al montar el componente `AdminDashboard`, si la sesión de Supabase no existe, únicamente se emite un `console.log`. No se ejecuta ninguna redirección (`navigate('/login')`). A continuación, el componente ejecuta `loadSchools()` que, gracias al RLS público de la tabla `schools`, descarga de Supabase todos los colegios reales, fechas de viaje y códigos de grupo.
- **Impacto Real:** Acceso público a la consola administrativa. Un atacante puede visualizar todos los viajes, colegios, fechas, métricas y enlaces, además de disparar llamadas de borrado físico contra `delete.php` (que no requiere autenticación).
- **Pendiente de Verificar Fuera del Repositorio:** Ninguno (comprobado 100% en código fuente estático).

---

### SEC-05 — Políticas RLS Inseguras para Usuarios Autenticados
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/supabase/migrations/20260522080000_create_supertour_schema.sql`, líneas 35-39 y 48-52.
  - `_source/supabase/migrations/20260525162254_create_analytics_and_surveys.sql`, líneas 43-47.
  - `_source/supabase/migrations/20260525165207_alter_surveys_schema.sql`, líneas 37-41.
- **Evidencia:**
  ```sql
  CREATE POLICY "Allow authenticated admins all access to schools" 
  ON public.schools FOR ALL TO authenticated 
  USING (true) WITH CHECK (true);

  CREATE POLICY "Allow authenticated admins all access to gallery_photos" 
  ON public.gallery_photos FOR ALL TO authenticated 
  USING (true) WITH CHECK (true);

  CREATE POLICY "Allow authenticated admins all to settings" 
  ON public.supertour_settings FOR ALL TO authenticated 
  USING (true) WITH CHECK (true);
  ```
- **Explicación Técnica:** Las políticas asignan permisos de mutación completos (`FOR ALL`: `INSERT`, `UPDATE`, `DELETE`) al rol genérico `authenticated` de PostgreSQL con la condición trivial `USING (true)`. En la arquitectura de Supabase, cualquier usuario que cree una cuenta (si el registro público de auth está activo o si se crea un usuario de prueba) pertenece automáticamente al rol `authenticated`. No existe verificación de rol (`role = 'admin'`), claim específico ni pertenencia a una tabla de administradores.
- **Impacto Real:** Elevación de privilegios: cualquier persona con una cuenta válida en Supabase puede eliminar o modificar todas las escuelas, fotos, encuestas y configuraciones del sistema.
- **Pendiente de Verificar Fuera del Repositorio:** Verificar en el panel de Supabase Auth si el registro público de usuarios (`Enable Signup`) está habilitado o deshabilitado en el proyecto de producción `dbsbfjeqldmtgfqjbptu`.

---

### SEC-06 — Exposición de Datos Personales (PII) de Menores en `analytics_events`
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/pages/SurveyPage.tsx`, líneas 200 a 224.
  - `_source/supabase/migrations/20260525162254_create_analytics_and_surveys.sql`, líneas 32 a 35.
- **Evidencia:**
  En `SurveyPage.tsx`:
  ```tsx
  await trackEvent({
    event_type: 'survey_vote',
    metadata: {
      name: passengerName,
      email: passengerEmail,
      phone: passengerPhone || 'No provisto',
      answers: answersList, ...
    }
  });
  ```
  En la migración SQL:
  ```sql
  CREATE POLICY "Allow public read access to analytics_events"
  ON public.analytics_events FOR SELECT
  USING (true);
  ```
- **Explicación Técnica:** Las respuestas de encuestas de egresados (estudiantes de primaria menores de edad) se almacenan en el campo `metadata` (JSONB) de `public.analytics_events`. Simultáneamente, la política RLS otorga permiso `SELECT` público e irrestricto (`USING (true)`).
- **Impacto Real:** Fuga masiva de datos personales sensibles (nombres completos, correos y números telefónicos de menores y sus tutores). Cualquier persona puede descargar la base completa ejecutando una consulta GET anónima contra la API REST de Supabase con la `anon key` pública. Infracción grave de la Ley 25.326 de Protección de Datos Personales de la República Argentina y estándares internacionales.
- **Pendiente de Verificar Fuera del Repositorio:** Verificar cuántos registros con PII residen actualmente en la tabla `analytics_events` en la base de producción.

---

### SEC-07 — Inyección de Código / Stored XSS en `supertour_settings`
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/components/AnalyticsTracker.tsx`, líneas 20 a 46 y 51 a 77.
  - `_source/src/pages/AdminDashboard.tsx`, líneas 1186 a 1218.
- **Evidencia:**
  En `AnalyticsTracker.tsx`:
  ```tsx
  const container = document.createElement('div');
  container.innerHTML = data.value; // data.value viene directo de supertour_settings
  const scripts = container.querySelectorAll('script');
  scripts.forEach(script => {
    const newScript = document.createElement('script');
    ...
    newScript.textContent = script.textContent;
    document.head.appendChild(newScript);
  });
  ```
- **Explicación Técnica:** El código toma el texto almacenado en la columna `value` de `public.supertour_settings` para las claves `visitor_tracking_script` y `anychat_script`, lo analiza como HTML no sanitizado, extrae los elementos `<script>` y los adjunta al `head` y `body` del documento. Dado que `supertour_settings` puede ser escrita por cualquier usuario autenticado (SEC-05), este es un canal directo de Stored Cross-Site Scripting (XSS).
- **Impacto Real:** Ejecución de JavaScript arbitrario en el navegador de todos los visitantes del sitio (egresados, padres y administradores). Permite robo de sesiones, redirecciones maliciosas a sitios de phishing y captura de pulsaciones de teclado.
- **Pendiente de Verificar Fuera del Repositorio:** Inspeccionar el contenido actual de la tabla `supertour_settings` en producción para verificar si hay scripts cargados actualmente.

---

### SEC-08 — Validación de `group_code` en Cliente y Galería Pública
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/pages/SchoolDetailPage.tsx`, líneas 214-224, 233-245 y 295-310.
  - `_source/supabase/migrations/20260522080000_create_supertour_schema.sql`, líneas 30-32 y 43-45.
- **Evidencia:**
  En `SchoolDetailPage.tsx`:
  ```tsx
  // Se consultan todos los campos incluyendo group_code con SELECT público
  const { data: schoolData } = await supabase.from('schools').select('*').eq('id', id).single();
  ...
  // Las fotos se descargan en memoria independientemente de si está desbloqueado
  const { data: photoData } = await supabase.from('gallery_photos').select('*').eq('school_id', id);
  ...
  // La comparación del PIN se hace 100% en el navegador
  const expected = (school.group_code || '').trim().toUpperCase();
  const entered = pinInput.trim().toUpperCase();
  if (entered && entered === expected) { setIsUnlocked(true); }
  ```
- **Explicación Técnica:** La protección de acceso a la galería mediante código de grupo (PIN) es una simulación visual en la interfaz de React. El backend envía el `group_code` en el payload JSON inicial de la escuela. Las fotos de la galería se solicitan de inmediato y se cargan en el estado del componente antes de que el usuario ingrese ningún código. Además, la tabla `gallery_photos` tiene RLS `FOR SELECT USING (true)`.
- **Impacto Real:** El PIN no ofrece ninguna protección criptográfica ni confidencialidad real. Cualquier usuario que inspeccione la pestaña "Red" de las herramientas de desarrollador puede ver el código del viaje y los enlaces directos a todas las fotografías sin ingresar el PIN.
- **Pendiente de Verificar Fuera del Repositorio:** Definir con el cliente de negocio si el PIN tiene como objetivo únicamente una barrera amigable de navegación o confidencialidad estricta.

---

### BUG-01 — Crash en Tiempo de Ejecución en `Navbar.tsx` (`navigate is not defined`)
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/components/Navbar.tsx`, líneas 68 y 81.
- **Evidencia:**
  ```tsx
  const handleScrollToDestinos = (e: React.MouseEvent) => {
    ...
    navigate('/'); // Línea 68: 'navigate' no existe en el ámbito
  };
  const handleScrollToNosotros = (e: React.MouseEvent) => {
    ...
    navigate('/'); // Línea 81: 'navigate' no existe en el ámbito
  };
  ```
  Salida del compilador TypeScript (`npx tsc -b --noEmit`):
  ```
  src/components/Navbar.tsx(68,7): error TS2552: Cannot find name 'navigate'. Did you mean 'navigator'?
  src/components/Navbar.tsx(81,7): error TS2552: Cannot find name 'navigate'. Did you mean 'navigator'?
  ```
- **Explicación Técnica:** La función `navigate()` es llamada cuando el usuario navega desde cualquier página que no sea la raíz (`/colegio/:id`, `/admin`, `/login`, `/encuesta/:id`) e intenta pulsar los botones "Destinos" o "Nosotros". Dado que `useNavigate` no fue importado de `react-router-dom` ni inicializado como variable (`const navigate = useNavigate()`), JavaScript lanza un `ReferenceError` fatal no controlado que desmonta el árbol de componentes de React.
- **Impacto Real:** Pantalla blanca / crash de la aplicación cada vez que un usuario intenta volver al inicio o navegar a destinos desde la galería de su colegio.
- **Pendiente de Verificar Fuera del Repositorio:** Ninguno (comprobado localmente con el compilador TypeScript).

---

### BUG-02 — Sustitución Silenciosa de Fotos Reales por Imágenes de Stock de Unsplash
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/components/Uploader.tsx`, líneas 159 a 170.
  - `_source/src/pages/AdminDashboard.tsx`, líneas 471 a 479, 621 a 625 y 1273 a 1276.
- **Evidencia:**
  En `Uploader.tsx`:
  ```tsx
  } catch (uploadError: any) {
    console.warn('Fallo en la subida real a Backblaze B2, utilizando simulación de desarrollo:', uploadError);
    const unsplashTags = { ... };
    webUrl = unsplashTags[item.category];
    hdUrl = unsplashTags[item.category].replace('w=800', 'w=1600');
    await new Promise((r) => setTimeout(r, 500));
  }
  // Continúa ejecutando el insert en Supabase gallery_photos con la URL de Unsplash
  // Marca el ítem en la interfaz con status: 'exito' (progress: 100)
  ```
  En `AdminDashboard.tsx` (L478):
  ```tsx
  setGroupPhotoStatus('Éxito (Simulado) ✅');
  ```
- **Explicación Técnica:** Ante cualquier error de red, fallo del script PHP o timeout con Backblaze, el bloque `catch` sustituye las URLs por enlaces de imágenes genéricas de Unsplash, inserta estas fotos falsas en la tabla `gallery_photos` de Supabase y marca la subida como exitosa en la interfaz de usuario.
- **Impacto Real:** Pérdida definitiva de fotos de egresados. El administrador cree que las fotos fueron cargadas con éxito y cierra la ventana o descarta los archivos locales, cuando en realidad se guardaron fotos de stock y el material original se perdió.
- **Pendiente de Verificar Fuera del Repositorio:** Inspeccionar la base de producción para comprobar si existen actualmente registros en `gallery_photos` o `schools` que contengan `images.unsplash.com`.

---

### BUG-03 — Incompatibilidad entre `banner_click` y Restricción CHECK de PostgreSQL
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/pages/SchoolDetailPage.tsx`, línea 80.
  - `_source/src/lib/analytics.ts`, línea 5.
  - `_source/supabase/migrations/20260525162254_create_analytics_and_surveys.sql`, línea 7.
- **Evidencia:**
  En TypeScript (`analytics.ts`):
  ```ts
  event_type: 'calendar_click' | 'school_view' | 'photo_click' | 'photo_download' | 'survey_vote' | 'banner_click';
  ```
  En PostgreSQL (`20260525162254_create_analytics_and_surveys.sql`):
  ```sql
  CHECK (event_type IN ('calendar_click', 'school_view', 'photo_click', 'photo_download', 'survey_vote'))
  ```
- **Explicación Técnica:** La interfaz de TypeScript incluye `'banner_click'` y `SchoolDetailPage.tsx` despacha este evento cuando el usuario hace clic en el banner publicitario. Sin embargo, la migración de la base de datos solo admite 5 tipos de eventos y no incluye `'banner_click'`.
- **Impacto Real:** Cada clic en el banner provoca un error de base de datos (`violates check constraint "analytics_events_event_type_check"`). La métrica comercial nunca se registra en PostgreSQL.
- **Pendiente de Verificar Fuera del Repositorio:** Verificar en la base de producción si la tabla `analytics_events` ya fue alterada manualmente o si conserva la restricción de la migración.

---

### BUG-04 — Votación de Encuestas Bloqueada por RLS en Producción
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/pages/SchoolDetailPage.tsx`, líneas 418 a 426.
  - `_source/supabase/migrations/20260525162254_create_analytics_and_surveys.sql`, líneas 38 a 47.
- **Evidencia:**
  En `SchoolDetailPage.tsx`:
  ```tsx
  const { error } = await supabase
    .from('surveys')
    .update({ options: updatedOptions })
    .eq('id', activeSurvey.id);
  ```
  En la migración RLS:
  ```sql
  -- Solo hay política SELECT para usuarios anónimos
  CREATE POLICY "Allow public read access to surveys" ON public.surveys FOR SELECT USING (true);
  -- UPDATE solo está permitido para authenticated
  CREATE POLICY "Allow authenticated admins all access to surveys" ON public.surveys FOR ALL TO authenticated USING (true);
  ```
- **Explicación Técnica:** Cuando un pasajero anónimo vota en la encuesta rápida del colegio, el código ejecuta una mutación `UPDATE` sobre la tabla `surveys`. Las políticas RLS rechazan la operación por falta de privilegios (`new row violates row-level security policy`). El bloque `catch` atrapa el error y almacena el voto únicamente en el `localStorage` del navegador local.
- **Impacto Real:** Los votos de las encuestas nunca se registran centralizadamente en la base de datos de producción; la funcionalidad es puramente cosmética e individual para cada navegador.
- **Pendiente de Verificar Fuera del Repositorio:** Verificar en Supabase si se han registrado votos reales en la columna `options` de la tabla `surveys`.

---

### ARC-01 — Rigidez Temporal del Calendario (Limitado a Oct-Dic 2026)
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/src/components/PremiumCalendar.tsx`, líneas 15, 147-155, 181-185 y 208-215.
- **Evidencia:**
  ```tsx
  const [selectedMonth, setSelectedMonth] = useState<9 | 10 | 11>(10);
  ...
  const monthData = {
    9: { name: 'Octubre', days: 31, startOffset: 4, year: 2026, monthStr: '10' },
    10: { name: 'Noviembre', days: 30, startOffset: 0, year: 2026, monthStr: '11' },
    11: { name: 'Diciembre', days: 31, startOffset: 2, year: 2026, monthStr: '12' },
  };
  ...
  return schoolDateOnly.startsWith(`2026-${monthStr}-`);
  ```
- **Explicación Técnica:** El calendario no calcula dinámicamente los días, semanas ni años. Posee una estructura de datos estática limitada a 3 meses (Octubre, Noviembre, Diciembre) del año 2026 con desfases fijos (`startOffset`). Además, las consultas de filtrado contienen la cadena literal `2026-`.
- **Impacto Real:** Si un colegio viaja en 2027 o en cualquier mes fuera del último trimestre de 2026, el viaje nunca aparecerá en el calendario y las familias no podrán acceder a sus fotos desde la portada.
- **Pendiente de Verificar Fuera del Repositorio:** Confirmar con el equipo comercial las fechas de los viajes contratados para determinar si hay salidas fuera de este rango.

---

### OPS-01 — Exposición Pública del Directorio Fuente `_source`
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `.htaccess`, líneas 1 a 8.
- **Evidencia:**
  ```apache
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
  ```
- **Explicación Técnica:** La regla de reescritura SPA ignora cualquier solicitud hacia un archivo existente (`!-f`). Como la carpeta `_source` se encuentra dentro del directorio raíz del servidor web (DocumentRoot), archivos como `/_source/package.json`, `/_source/tsconfig.json` y las migraciones SQL en `/_source/supabase/migrations/*.sql` son servidos como archivos estáticos directamente a cualquier cliente HTTP.
- **Impacto Real:** Divulgación de la arquitectura interna, nombres de tablas, dependencias y estructura de base de datos a atacantes. Si el archivo `_source/.env` fuese copiado al servidor, sus variables de entorno quedarían expuestas de inmediato.
- **Pendiente de Verificar Fuera del Repositorio:** Comprobar mediante una petición HTTP `GET` si el servidor de producción actual tiene restringido el acceso a directorios que comienzan con guión bajo (`_`).

---

### SEO-01 — Metadatos OpenGraph y Twitter Apuntando a Dominio de Pruebas
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `index.html`, líneas 16, 19, 26, 29.
  - `_source/index.html`, líneas 16, 19, 26, 29.
- **Evidencia:**
  ```html
  <meta property="og:url" content="https://pruebas.supertourchannel.com.ar/" />
  <meta property="og:image" content="https://pruebas.supertourchannel.com.ar/st-logo-og.png" />
  <meta name="twitter:url" content="https://pruebas.supertourchannel.com.ar/" />
  <meta name="twitter:image" content="https://pruebas.supertourchannel.com.ar/st-logo-og.png" />
  ```
- **Explicación Técnica:** Las etiquetas de OpenGraph y Twitter en los archivos HTML base conservan la URL del entorno de staging (`pruebas.supertourchannel.com.ar`). Aunque el hook `useSEO.ts` intenta actualizar dinámicamente algunas etiquetas en el cliente, los rastreadores y scrapers de redes sociales (WhatsApp, Facebook, Twitter) no ejecutan JavaScript y leen exclusivamente el HTML estático inicial.
- **Impacto Real:** Al compartir el enlace de la web por WhatsApp o redes sociales, la vista previa muestra el dominio de pruebas en lugar del dominio oficial de producción.
- **Pendiente de Verificar Fuera del Repositorio:** Ninguno (comprobado en código fuente).

---

### QA-01 — Errores de Typecheck, Lint, Tests y Vulnerabilidades en Dependencias
- **Estado:** CONFIRMADO.
- **Archivos y Líneas:**
  - `_source/package.json`, líneas 10 y 12.
  - `_source/tsconfig.app.json`, líneas 27 a 29.
  - `_source/src/lib/supabase.ts`, líneas 3 y 4.
  - `_source/package-lock.json`.
- **Evidencia:**
  1. **TypeScript (`npx tsc -b --noEmit`):**
     - `src/components/Navbar.tsx:68,81`: `Cannot find name 'navigate'`.
     - `src/lib/supabase.ts:3,4`: `Property 'env' does not exist on type 'ImportMeta'` (causado por la omisión de `"vite/client"` en el campo `"types"` de `tsconfig.app.json`).
  2. **ESLint (`npm run lint`):**
     - Error de ejecución de ESLint 9 por falta de archivo de configuración `eslint.config.js`.
  3. **Vitest (`npm test`):**
     - Código de salida 1: `No test files found, exiting with code 1` (0 tests unitarios).
  4. **Auditoría de Dependencias (`npm audit`):**
     - 26 vulnerabilidades detectadas (2 críticas, 15 altas, 9 moderadas). Incluye vulnerabilidad de Prototype Pollution con potencial RCE en `tinypool` (utilizado por el entorno de pruebas/compilación).
- **Explicación Técnica:** La suite de herramientas de calidad no se encuentra operativa. Vite compila exitosamente únicamente porque `@vitejs/plugin-react-swc` elimina los tipos sin verificar la validez del código TypeScript.
- **Impacto Real:** Riesgo severo de regresiones inadvertidas, fallos de ejecución en runtime no detectados por compilación básica y ausencia de integración continua.
- **Pendiente de Verificar Fuera del Repositorio:** Ninguno.

---

## 3. EVALUACIÓN CRÍTICA DE SOLUCIONES Y RIESGOS DE IMPLEMENTACIÓN

Antes de modificar el código, se han evaluado los riesgos que implicaría aplicar soluciones simplistas o incorrectas a los hallazgos:

### 1. Validación de Roles de Administrador (Falso Positivo de Dominio de Email)
- **Riesgo:** Utilizar una condición SQL como `auth.jwt() ->> 'email' LIKE '%@supertour%'` es una vulnerabilidad grave. Si el registro público en Supabase Auth está abierto, cualquier usuario puede registrarse con correos como `usuario@supertour.fake.com` o `admin@supertour.com` si no hay verificación de correo obligatoria.
- **Riesgo con `auth.jwt() ->> 'role' = 'admin'`:** En Supabase, el campo `role` del JWT es administrado por GoTrue y su valor por defecto es `'authenticated'`. No cambia a `'admin'` a menos que se use la clave de servicio interna. Usar esta condición bloquearía a los administradores legítimos.
- **Solución Correcta:** Crear una tabla administrativa protegida (`public.admin_users`) vinculada a `auth.users(id)` o utilizar `raw_app_meta_data` (`app_metadata ->> 'is_admin' = 'true'`), accesible únicamente a través de funciones con `SECURITY DEFINER`.

### 2. Uso Seguro de `SECURITY DEFINER`
- **Riesgo:** Una función con `SECURITY DEFINER` se ejecuta con los privilegios de su creador (superusuario `postgres`). Si no se define explícitamente `SET search_path = public, pg_temp`, un atacante puede manipular esquemas para secuestrar la ejecución.
- **Solución Correcta:** Toda función `SECURITY DEFINER` debe incluir obligatoriamente `SET search_path = public, pg_temp;`, validar estrictamente los tipos y rangos de los parámetros de entrada y revocar permisos innecesarios: `REVOKE ALL ON FUNCTION ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated;`.

### 3. Evitar Escrituras Anónimas Generales en Tablas Sensibles
- **Riesgo:** Para solucionar BUG-04 (fallo al votar encuestas), conceder permiso `UPDATE` al rol `anon` en la tabla `surveys` permitiría a cualquier script malicioso modificar las preguntas, borrar las opciones o manipular los resultados.
- **Solución Correcta:** No otorgar `UPDATE` a `anon`. La votación anónima debe gestionarse mediante una función RPC atómica (`vote_survey_option(survey_id, option_index)`) que incremente numéricamente el contador de la opción de forma segura.

### 4. Validación de Archivos en el Servidor (MIME Spoofing)
- **Riesgo:** Confiar en `$_FILES['file']['type']` en PHP no protege contra la subida de ejecutables o scripts maliciosos, ya que esta cabecera es manipulada libremente por el cliente HTTP.
- **Solución Correcta:** En `upload.php`, inspeccionar el contenido real del archivo con la extensión `fileinfo` (`finfo_file(FILEINFO_MIME_TYPE, $file['tmp_name'])`) y contrastar contra una lista blanca estricta (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`).

### 5. Peligro de `npm audit fix --force`
- **Riesgo:** Ejecutar `npm audit fix --force` fuerza la instalación de `tailwindcss@4.x` y versiones incompatibles de paquetes que eliminan `tailwind.config.ts`, rompiendo por completo los estilos visuales de la aplicación.
- **Solución Correcta:** Mantener Tailwind CSS en la rama 3.4 y utilizar la directiva `overrides` de `package.json` para parchar únicamente dependencias indirectas aisladas (`braces`, `nanoid`), probando la compilación paso a paso.

### 6. Preservación del Contenido Multimedia Existente
- **Riesgo:** Reconfigurar rutas de almacenamiento o scripts de borrado podría desvincular o purgar accidentalmente fotos ya asociadas a colegios existentes en la base de datos.
- **Solución Correcta:** Los cambios en `cdn.ts`, `upload.php` y `delete.php` deben ser drop-in replacements que respeten exactamente las estructuras de URL actuales (`https://media.supertourchannel.com.ar/SupertourLow/...`) sin eliminar ni renombrar archivos en Backblaze B2.

---

## 4. PLAN DE CORRECCIÓN POR LOTES MÍNIMOS

```
LOTE A: Credenciales y Endpoints PHP (Seguridad Crítica de Almacenamiento)
   |
LOTE B: Políticas RLS y Privacidad de Datos (Seguridad de Base de Datos y PII)
   |
LOTE C: Control de Acceso Administrativo (Protección de Consola y Roles)
   |
LOTE D: Estabilidad Funcional y Galerías (Corrección de Crashes y Pérdida de Fotos)
   |
LOTE E: Eventos, Encuestas y Calendario (Consistencia de Métricas y Votaciones)
   |
LOTE F: Exposición de Fuentes y Configuración (Servidor Web y Metatags)
   |
LOTE G: Calidad, Tipos y Pruebas (Typecheck, Lint y Tests)
```

---

### LOTE A: Credenciales y Endpoints PHP
*Objetivo:* Eliminar credenciales maestras del código fuente y exigir autenticación estricta por JWT en operaciones de almacenamiento.

- **Archivos a Modificar:**
  - `upload.php`
  - `delete.php`
  - `_source/public/delete.php`
- **Cambios Mínimos:**
  1. Extraer credenciales B2 a variables de entorno del servidor (`getenv('B2_KEY_ID')`, `getenv('B2_APPLICATION_KEY')`, etc.) o archivo de configuración PHP fuera de la raíz web.
  2. Implementar middleware de autenticación en ambos scripts: extraer la cabecera `Authorization: Bearer <token>`, verificar el token contra el endpoint de usuario de Supabase (`GET https://<url>/auth/v1/user`), y rechazar con `HTTP 401` si el token es inválido o no pertenece a un usuario autorizado.
  3. En `upload.php`: incorporar validación de magic bytes con `finfo_file` e imponer límite máximo de tamaño de archivo.
  4. En `delete.php`: restringir CORS a `https://supertourchannel.com.ar` y limitar el número máximo de eliminaciones por lote a 50 para evitar timeouts de PHP.
- **Dependencias:** Requiere que las variables de entorno de B2 estén definidas en el servidor de hosting.
- **Riesgos de Regresión:** Si la cabecera `Authorization` no es enviada por el frontend, las subidas del panel de administración fallarán con 401.
- **Pruebas de Aceptación:**
  - `POST /upload.php` sin cabecera `Authorization` devuelve `HTTP 401 Unauthorized`.
  - `POST /delete.php` sin cabecera `Authorization` devuelve `HTTP 401 Unauthorized`.
  - Subida con usuario administrador autenticado completa con éxito y devuelve URL del CDN.
- **Procedimiento de Rollback:** Restaurar los archivos PHP desde la copia de seguridad previa al despliegue.

---

### LOTE B: Políticas RLS y Privacidad de Datos Personales
*Objetivo:* Proteger los datos personales de los egresados y blindar las tablas de base de datos contra mutaciones no autorizadas.

- **Archivos a Modificar:**
  - Archivo de migración SQL nuevo: `_source/supabase/migrations/20261019000000_security_and_rls_hardening.sql`.
- **Cambios Mínimos:**
  1. Revocar el `SELECT` público sobre `public.analytics_events`:
     ```sql
     DROP POLICY IF EXISTS "Allow public read access to analytics_events" ON public.analytics_events;
     CREATE POLICY "Allow admin read access to analytics_events" 
     ON public.analytics_events FOR SELECT TO authenticated 
     USING (public.is_admin());
     ```
  2. Crear tabla `public.admin_users` y función `public.is_admin()` con `SECURITY DEFINER` y `search_path = public, pg_temp`.
  3. Modificar las políticas de escritura (`INSERT`, `UPDATE`, `DELETE`) en `schools`, `gallery_photos` y `supertour_settings` para exigir `USING (public.is_admin()) WITH CHECK (public.is_admin())` en lugar de `TO authenticated USING (true)`.
  4. Proteger la columna `group_code`: crear una vista o restringir la selección para que `group_code` no se exponga a usuarios anónimos.
- **Dependencias:** Debe ejecutarse antes de habilitar accesos de usuarios regulares.
- **Riesgos de Regresión:** Si el usuario que administra el panel no es insertado en `public.admin_users`, no podrá cargar ni editar escuelas.
- **Pruebas de Aceptación:**
  - Consulta `GET /rest/v1/analytics_events` con la `anon key` devuelve array vacío (`[]`).
  - Usuario anónimo o autenticado no-admin no puede modificar filas en `schools` ni `supertour_settings`.
- **Procedimiento de Rollback:** Ejecutar script SQL de reversión que restablezca las políticas anteriores.

---

### LOTE C: Control de Acceso Administrativo y Autorización en Frontend
*Objetivo:* Impedir la visualización y operación de `/admin` a usuarios no autenticados y propagar el JWT a las llamadas PHP.

- **Archivos a Modificar:**
  - `_source/src/App.tsx`
  - `_source/src/pages/AdminDashboard.tsx`
  - `_source/src/lib/cdn.ts`
  - `_source/src/components/Uploader.tsx`
- **Cambios Mínimos:**
  1. Crear componente `ProtectedRoute` que valide la existencia y vigencia de la sesión mediante `supabase.auth.getSession()` y `supabase.auth.onAuthStateChange()`.
  2. Redirigir de inmediato a `/login` ante la ausencia de sesión activa.
  3. En `cdn.ts` (`deleteFromB2`) y `Uploader.tsx` (`uploadToB2`), obtener el `access_token` de la sesión actual y adjuntarlo en la cabecera `Authorization: Bearer ${session.access_token}` de los `fetch` hacia `/upload.php` y `/delete.php`.
  4. Eliminar el modo simulado de prueba local que ejecutaba `console.log('No admin session. Offline mode active...')`.
- **Dependencias:** Requiere que Lote A esté preparado para recibir la cabecera `Authorization`.
- **Riesgos de Regresión:** Si la sesión expira mientras el usuario está subiendo un lote grande de fotos, las subidas restantes devolverán 401. Debe implementarse refresco de token si expira.
- **Pruebas de Aceptación:**
  - Navegar a `/admin` en pestaña de incógnito redirige a `/login`.
  - Iniciar sesión correctamente permite visualizar la consola y cargar archivos pasando el token en los headers.
- **Procedimiento de Rollback:** Revertir los commits de `ProtectedRoute` y los llamados `fetch`.

---

### LOTE D: Estabilidad Funcional y Galerías
*Objetivo:* Subsanar el crash de runtime en la barra de navegación y erradicar la corrupción de galerías con fotos de Unsplash.

- **Archivos a Modificar:**
  - `_source/src/components/Navbar.tsx`
  - `_source/src/components/Uploader.tsx`
  - `_source/src/pages/AdminDashboard.tsx`
- **Cambios Mínimos:**
  1. En `Navbar.tsx`: importar `useNavigate` de `react-router-dom` e inicializar `const navigate = useNavigate();` en la raíz del componente.
  2. En `Uploader.tsx`: eliminar el bloque `catch` que asignaba URLs de Unsplash. Ante un error de subida, asignar `status: 'error'`, registrar el mensaje de error exacto devuelto por el servidor, mantener el archivo en la cola y habilitar un botón de "Reintentar".
  3. En `AdminDashboard.tsx`: eliminar las asignaciones de fallback a Unsplash en las líneas 474-475, 623-624 y 1274-1275, propagando el error visual al usuario y conservando el estado previo.
- **Dependencias:** Ninguna (cambios puramente frontend).
- **Riesgos de Regresión:** Ninguno.
- **Pruebas de Aceptación:**
  - Desde `/colegio/<id>`, hacer clic en "Destinos" y "Nosotros" en el menú: la aplicación navega sin errores en la consola de JavaScript.
  - Provocar un fallo intencional de red durante la subida: la foto se marca como fallida, se muestra el error y no se inserta ninguna URL de Unsplash en la base de datos.
- **Procedimiento de Rollback:** Revertir los cambios en los tres archivos afectados mediante Git.

---

### LOTE E: Eventos, Encuestas y Calendario
*Objetivo:* Asegurar la consistencia de métricas comerciales, el funcionamiento real de las votaciones y la visibilidad de viajes.

- **Archivos a Modificar:**
  - Migración SQL (`_source/supabase/migrations/20261019000000_security_and_rls_hardening.sql`)
  - `_source/src/pages/SchoolDetailPage.tsx`
  - `_source/src/components/PremiumCalendar.tsx`
- **Cambios Mínimos:**
  1. En PostgreSQL: actualizar la restricción CHECK de `analytics_events` para admitir `'banner_click'`.
  2. En PostgreSQL: crear función RPC segura para registrar votos:
     ```sql
     CREATE OR REPLACE FUNCTION public.vote_survey_option(p_survey_id UUID, p_option_index INT)
     RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
     BEGIN
       UPDATE public.surveys
       SET options = jsonb_set(
         options,
         array[p_option_index::text, 'votes'],
         to_jsonb(COALESCE((options->p_option_index->>'votes')::int, 0) + 1)
       )
       WHERE id = p_survey_id;
     END;
     $$;
     GRANT EXECUTE ON FUNCTION public.vote_survey_option TO anon, authenticated;
     ```
  3. En `SchoolDetailPage.tsx`: invocar `supabase.rpc('vote_survey_option', { ... })` en lugar del `UPDATE` directo rechazado por RLS.
  4. En `PremiumCalendar.tsx`: parametrizar el año dinámicamente y habilitar la selección de meses según las fechas de los viajes cargados.
- **Dependencias:** Requiere aplicar la migración SQL en Supabase.
- **Riesgos de Regresión:** La manipulación de JSONB en `options` debe verificar que el índice de la opción exista antes de actualizar.
- **Pruebas de Aceptación:**
  - Un usuario anónimo vota en la encuesta: el valor de votos se incrementa en la tabla `surveys` de Supabase.
  - Clic en el banner registra exitosamente el evento `'banner_click'` en `analytics_events`.
- **Procedimiento de Rollback:** Restaurar la función RPC y el componente `SchoolDetailPage.tsx`.

---

### LOTE F: Exposición de Fuentes y Configuración de Producción
*Objetivo:* Proteger los archivos fuente del servidor web y corregir los metadatos de redes sociales.

- **Archivos a Modificar:**
  - `.htaccess`
  - `index.html`
  - `_source/index.html`
- **Cambios Mínimos:**
  1. En `.htaccess`: agregar regla de denegación de acceso para el directorio `_source` y archivos de configuración:
     ```apache
     # Bloquear acceso a codigo fuente y archivos sensibles
     RewriteRule ^_source/ - [F,L]
     <FilesMatch "^\.|\.(env|sql|log|json|lock|ts|tsx)$">
       Order allow,deny
       Deny from all
     </FilesMatch>
     ```
  2. En `index.html` y `_source/index.html`: reemplazar las referencias a `https://pruebas.supertourchannel.com.ar/` por `https://supertourchannel.com.ar/`.
- **Dependencias:** Ninguna.
- **Riesgos de Regresión:** Verificar que Apache no bloquee la carga de `assets/*.js` o `assets/*.css`.
- **Pruebas de Aceptación:**
  - Petición `GET /_source/package.json` devuelve `HTTP 403 Forbidden`.
  - Compartir enlace en WhatsApp muestra previsualización con dominio de producción.
- **Procedimiento de Rollback:** Restaurar el archivo `.htaccess` original.

---

### LOTE G: Calidad, Tipos, Lint y Pruebas
*Objetivo:* Garantizar la reproducibilidad de la compilación, eliminar errores de TypeScript y establecer pruebas automatizadas.

- **Archivos a Modificar:**
  - `_source/tsconfig.app.json`
  - `_source/package.json`
  - `_source/eslint.config.js` (nuevo)
  - `_source/src/lib/__tests__/cdn.test.ts` (nuevo)
- **Cambios Mínimos:**
  1. En `tsconfig.app.json`: añadir `"vite/client"` al array `"types"` para resolver los errores de `import.meta.env` en `supabase.ts`.
  2. Crear archivo `eslint.config.js` compatible con ESLint 9 para que `npm run lint` ejecute sin errores.
  3. Crear una prueba unitaria inicial en Vitest para validar las funciones críticas de transformación de URLs en `cdn.ts` (`toCdnUrl`, `normalizeSchoolWithCdn`).
  4. Resolver dependencias dev mediante `overrides` en `package.json` sin forzar la actualización de Tailwind CSS v4.
- **Dependencias:** Requiere que Lote D esté aplicado para que `tsc` pase sin errores de `navigate`.
- **Riesgos de Regresión:** Ninguno (afecta únicamente al entorno de desarrollo y build).
- **Pruebas de Aceptación:**
  - `npx tsc -b --noEmit` completa con código 0 y 0 errores.
  - `npm run lint` completa con código 0.
  - `npm test` ejecuta y aprueba los tests unitarios.
- **Procedimiento de Rollback:** Revertir los archivos de configuración de TypeScript y ESLint.

---

## 5. LISTA DE PRIMEROS CAMBIOS PROPUESTOS (ORDEN DE IMPLEMENTACIÓN)

Siguiendo el principio de **menor riesgo, máxima reversibilidad y resolución de bloqueantes críticos**, se propone el siguiente orden estricto de ejecución una vez otorgada la autorización:

1. **[Lote D - Paso 1] Corregir `Navbar.tsx` (BUG-01):**  
   *Justificación:* Es un cambio de 2 líneas de bajísimo riesgo que resuelve de inmediato el crash fatal de navegación del usuario.  
   *Dependencias:* Ninguna.
2. **[Lote G - Paso 1] Corregir `tsconfig.app.json` (QA-01):**  
   *Justificación:* Agrega `"vite/client"` a `types`, permitiendo que `npx tsc -b --noEmit` valide tipos limpiamente antes de tocar lógica de negocio.  
   *Dependencias:* BUG-01 resuelto.
3. **[Lote D - Paso 2] Eliminar Unsplash y asegurar cola de subidas (BUG-02):**  
   *Justificación:* Detiene inmediatamente el riesgo de pérdida o corrupción de fotos de egresados durante las pruebas.  
   *Dependencias:* Ninguna.
4. **[Lote F - Paso 1] Blindar `.htaccess` y corregir metadatos SEO (OPS-01, SEO-01):**  
   *Justificación:* Oculta `_source/` de accesos públicos en el servidor y actualiza dominios en el HTML sin riesgo de romper la lógica de la app.  
   *Dependencias:* Ninguna.
5. **[Lote C - Paso 1] Implementar `ProtectedRoute` en `/admin` (SEC-04):**  
   *Justificación:* Cierra el acceso anónimo no autorizado a la consola administrativa.  
   *Dependencias:* Ninguna.
6. **[Lote A - Paso 1] Securizar `upload.php` y `delete.php` (SEC-01, SEC-02, SEC-03):**  
   *Justificación:* Requiere coordinar la inyección de variables de entorno en el servidor y adjuntar el Bearer token en el frontend (`cdn.ts`, `Uploader.tsx`). Elimina la mayor vulnerabilidad de infraestructura del proyecto.  
   *Dependencias:* Lote C activo para contar con tokens de sesión válidos.
7. **[Lote B - Paso 1] Aplicar migración RLS y protección de PII (SEC-05, SEC-06):**  
   *Justificación:* Requiere aplicar script SQL en Supabase, crear `admin_users` y revocar lectura pública de `analytics_events`.  
   *Dependencias:* Ninguna en código; requiere confirmación de cuentas de administrador en Supabase.
8. **[Lote E - Paso 1] Constraint de eventos y RPC de encuestas (BUG-03, BUG-04):**  
   *Justificación:* Migración SQL y actualización de llamada en `SchoolDetailPage.tsx`.  
   *Dependencias:* Lote B.

---
*Fin del informe de validación forense. En espera de instrucciones y autorización para proceder con los lotes de implementación.*
