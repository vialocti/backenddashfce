# Integración JWT entre `backenddash` y `fcemuidash`

## Contexto / problema

`backenddash` protege todas sus rutas con un middleware JWT global
(`app.use(verificarToken)` en [`src/app.js`](../src/app.js)), pero el frontend
`fcemuidash` no enviaba ningún header `Authorization`. El login de `fcemuidash`
usa Firebase Authentication solo para controlar el acceso a la UI de React —
nunca habló con el backend de datos para obtener un JWT. Resultado: cualquier
llamada de `fcemuidash` al backend devolvía `401 Token no provisto`.

## Modelo elegido

No es un JWT por usuario. El backend ya tenía pensado un esquema de
**token de aplicación de larga duración**: un JWT que identifica a la app
cliente (`{ app: "fcemuidash" }`), no a una persona, firmado con
`JWT_SECRET` y con expiración larga (365 días). Se generó y conectó ese
token.

## Cambios en `backenddash`

No se modificó código nuevo — se usó lo que ya existía:

- [`src/middlewares/authMiddleware.js`](../src/middlewares/authMiddleware.js):
  valida `Authorization: Bearer <token>` con `jwt.verify(token, process.env.JWT_SECRET)`.
- [`src/app.js`](../src/app.js) línea 45: `app.use(verificarToken)` aplicado
  antes de todas las rutas (`/dbingreso`, `/alutivos`, `/cursadas`, `/utiles`,
  `/rendimiento`, `/examenes`, `/aluinfo`, `/datosanalisis`, `/procesos`, etc.).
- [`scripts/generateToken.js`](../scripts/generateToken.js): script CLI que
  genera el token de app. Uso:

  ```bash
  npx babel-node scripts/generateToken.js <nombreApp> [duracion]
  # ejemplo real usado:
  npx babel-node scripts/generateToken.js fcemuidash 365d
  ```

  Firma `{ app: appName }` con `process.env.JWT_SECRET` (definido en el
  `.env` de este repo, no versionado). El token generado para `fcemuidash`
  expira en 365 días desde la fecha de generación (2026-08-13).

## Cambios en `fcemuidash`

### 1. Cliente centralizado — `src/utils/apiClient.js` (nuevo)

Lee el token desde `process.env.REACT_APP_API_TOKEN` y expone `attachAuth`,
que agrega un interceptor de request que setea el header `Authorization`.
Al importarse, también aplica el interceptor a la instancia global de axios
(`attachAuth(axios)`), cubriendo todos los archivos de servicio que llaman
`axios.get(...)` directamente en vez de crear su propia instancia.

```js
import axios from 'axios'

const API_TOKEN = process.env.REACT_APP_API_TOKEN

export const attachAuth = (instance) => {
    instance.interceptors.request.use((config) => {
        if (API_TOKEN) {
            config.headers.Authorization = `Bearer ${API_TOKEN}`
        }
        return config
    })
    return instance
}

attachAuth(axios)
```

### 2. Import de arranque — `src/index.js`

Se agregó `import './utils/apiClient';` antes de `import App` para que el
interceptor quede activo antes de que se dispare cualquier llamada a la API.

### 3. Instancias propias de axios

Tres archivos de `src/services/` creaban su propia instancia con
`axios.create(...)` (no heredan los defaults/interceptors del axios global),
así que se les agregó `attachAuth` explícitamente:

- `src/services/servicesUtils.js`
- `src/services/servicesExamenes.js`
- `src/services/servicesChatGpt.js`

```js
const api = attachAuth(axios.create({
    baseURL: URI_UTL,
    timeout: 60000,
}));
```

Los demás archivos de `src/services/` (`servicesAcademica.js`,
`servicesAlumnos.js`, `servicesCursadas.js`, `servicesEgresados.js`,
`servicesIngresantes.js`, `servicesInscriptos.js`, `servicesPersonal.js`,
`servicesProcesos.js`, `servicesRendimiento.js`) llaman `axios.get(...)`
directo sobre la instancia global, así que quedan cubiertos solo con el
`attachAuth(axios)` de `apiClient.js`.

### 4. Variable de entorno — `.env`

Se agregó `REACT_APP_API_TOKEN` con el token generado. El archivo está en
`.gitignore`, no se commitea.

### 5. Sub-proyecto `admindashfce` (sin tocar)

`src/components/admindashfce/` tiene su propia copia de los servicios con
`axios.create()` pero **no está importado desde ningún lado del app
principal** — está inactivo/no usado. Se dejó sin modificar; si en algún
momento se activa, va a necesitar el mismo tratamiento (importar
`attachAuth` desde `../../../../utils/apiClient` o duplicar la lógica).

## Verificación hecha (localhost)

Con el backend corriendo local (`localhost:5000`, mismo `.env`/`JWT_SECRET`
con el que se firmó el token) y `constantes.js` de `fcemuidash` apuntando a
`localhost:5000`:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/utiles
# 401 (sin token)

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/utiles \
  -H "Authorization: Bearer $TOKEN"
# 404 (pasa el middleware; 404 es porque /utiles no tiene handler en la raíz)
```

El salto de `401` a `404` confirma que `verificarToken` acepta el token —
el `JWT_SECRET` con el que se firmó coincide con el que valida localhost.

## Pendiente de verificar

- **`JWT_SECRET` en el servidor remoto (`200.12.136.75:5000`)**: la
  verificación de arriba es contra el backend local. Si el deploy remoto
  corre con un `.env` distinto (secreto distinto), este mismo token va a
  fallar allá con `403 Token invalido o expirado` aunque el frontend mande
  el header correctamente. Antes de volver a apuntar `constantes.js` al
  host remoto, confirmar que comparte el secreto, o regenerar el token con
  el secreto real de esa instancia.
- **Probar en el navegador**: levantar `fcemuidash` (`npm start`, reiniciando
  si ya estaba corriendo antes de este cambio, porque Create React App
  inlinea las `REACT_APP_*` al arrancar) y confirmar en la pestaña Network
  que las llamadas devuelven 200 y llevan el header `Authorization`.
- El token expira en 365 días (2027-08-13 aprox.). Después de esa fecha hay
  que regenerar con el mismo script y actualizar `REACT_APP_API_TOKEN`.
