# Catálogo con panel de administrador

Una tienda tipo catálogo con carrito y pedido por WhatsApp, más un panel privado para subir camisas con **código (#), marca, tallas, precio y foto**.

- Cada foto lleva un **código** que empieza con `#` (por ejemplo `#014`) para encontrarla y administrarla fácil.
- Una misma foto puede tener **varias tallas** (por ejemplo L y XL): se sube una sola vez.
- Las **marcas** se eligen de una lista o se escribe una nueva; en la tienda las camisas de una misma marca salen juntas.

- La tienda y el panel son páginas fijas: se publican gratis en **GitHub Pages**.
- Los productos y las fotos se guardan en **Supabase** (plan gratuito, sin tarjeta).
- Solo tú puedes agregar, cambiar o borrar productos. Cualquiera puede verlos.

Archivos:

| Archivo | Para qué sirve |
|---|---|
| `index.html`, `style.css`, `store.js` | La tienda que ven tus clientes |
| `admin.html`, `admin.css`, `admin.js` | El panel donde subes camisas |
| `config.js` | Tus datos: Supabase, nombre de la tienda y WhatsApp |
| `setup.sql` | Instalación nueva: crea la tabla, la carpeta de fotos y las reglas de seguridad |
| `migracion.sql` | Si ya habías ejecutado una versión anterior: agrega códigos y varias tallas sin perder nada |
| `favicon.svg`, `apple-touch-icon.png` | El ícono de la pestaña del navegador y de la pantalla de inicio del celular |

Mientras no conectes Supabase, la tienda muestra productos de ejemplo.

---

## Paso 1. Crear el proyecto en Supabase

1. Entra a **supabase.com** y crea una cuenta (puedes usar tu cuenta de GitHub).
2. Pulsa **New project**. Ponle un nombre, inventa una contraseña de base de datos (guárdala) y elige la región más cercana, por ejemplo *East US*.
3. Espera uno o dos minutos a que termine de crearse.

## Paso 2. Crear la tabla y las reglas

1. Abre `setup.sql` en cualquier editor de texto.
2. Usa buscar y reemplazar: cambia **TU_CORREO@gmail.com** por el correo con el que vas a entrar al panel. Aparece varias veces, cámbialas todas.
3. En Supabase abre **SQL Editor**, pulsa **New query**, pega todo el contenido y pulsa **Run**.
4. Debe decir que se ejecutó con éxito. Si lo vuelves a correr no pasa nada, es seguro.

### ¿Ya ejecutaste una versión anterior de setup.sql?

No lo repitas. En su lugar abre `migracion.sql`, pégalo en **SQL Editor → New query** y pulsa **Run**. No necesita tu correo y no borra tus camisas: a las que ya tienes les asigna un código (`#001`, `#002`...) y convierte su talla a la lista nueva de tallas. Si lo ejecutas dos veces no pasa nada.

## Paso 3. Crear tu usuario administrador

1. En Supabase abre **Authentication → Users**.
2. Pulsa **Add user → Create new user**. Escribe **el mismo correo** del paso 2 y una contraseña. Marca la opción de confirmar el correo automáticamente (*Auto Confirm User*).
3. **Importante:** busca la opción **Allow new users to sign up** (en *Authentication → Sign In / Providers*, o en *Settings*) y **apágala**. Así nadie más puede crear cuentas. Aunque alguien lo lograra, las reglas del paso 2 solo dejan escribir a tu correo.

## Paso 4. Copiar tus claves a config.js

1. En Supabase abre **Project Settings → API** (en algunas versiones está en **Connect**).
2. Copia la **Project URL** y la clave pública (**anon key** o **publishable key**).
3. Abre `config.js` y pégalas en `supabaseUrl` y `supabaseKey`.
4. Cambia también `brand` (nombre de tu tienda), `whatsapp` (código de país y número sin espacios, por ejemplo `50255551234`) y `whatsappLabel` (como quieres que se vea el número).

La clave pública es segura de publicar. **Nunca pegues la clave `service_role` ni `secret`.**

## Paso 5. Publicarlo en GitHub Pages

1. En **github.com** crea un repositorio nuevo, por ejemplo `catalogo`. Déjalo **público** (GitHub Pages gratis lo requiere).
2. Pulsa **Add file → Upload files** y sube los archivos de esta carpeta (no la carpeta zip, sus archivos). Pulsa **Commit changes**.
3. Ve a **Settings → Pages**. En *Build and deployment* elige **Deploy from a branch**, rama **main**, carpeta **/ (root)** y guarda.
4. Espera un minuto. GitHub te mostrará la dirección, parecida a `https://tu-usuario.github.io/catalogo/`.

Tu tienda queda en esa dirección y el panel en `.../admin.html`.

## Paso 6. Subir tus camisas

1. Abre `tu-direccion/admin.html` e inicia sesión con tu correo y contraseña.
2. El **código** se propone solo (`#001`, `#002`...). Puedes cambiarlo, pero debe empezar con `#` y no repetirse.
3. En **marca** escribe una nueva o toca una de las que ya existen. Si escribes "nautica" y ya existe "Náutica", se guarda como "Náutica" para que queden juntas.
4. En **tallas** marca todas las que tiene esa foto (puedes elegir varias). El botón "S a XL" marca las cuatro de una vez.
5. Escribe el **precio**, elige la **foto** y pulsa **Subir camisa**. Aparece al instante en la tienda. Si vas a subir varias de la misma marca, la marca se queda escrita.
6. En la lista (agrupada por marca) puedes buscar por `#código`, marcar una camisa como **Agotado** o **Disponible**, **Editar** (por ejemplo para agregarle una talla) o **Borrar**.

En la tienda, cada camisa muestra sus tallas como botones y el cliente elige la suya antes de agregar al pedido.

Consejos para las fotos: mejor verticales (como 4 por 5) y con buena luz. El panel las reduce solo antes de subirlas.

---

## Cosas que conviene saber

- **Proyecto en pausa.** Un proyecto gratuito de Supabase se pausa si pasa una semana sin actividad. Si la tienda deja de cargar, entra a Supabase y pulsa **Restore project**. Si tienes visitas o entras al panel seguido no suele pasar.
- **Límites del plan gratuito.** Alcanzan para cientos de camisas con fotos reducidas. Si un día llegas al límite, Supabase te avisa.
- **Respaldo.** En **Table Editor → productos** puedes descargar tus datos como CSV cuando quieras.
- **Cambiar la dirección.** Puedes usar un dominio propio desde *Settings → Pages* en GitHub.
- **Los pedidos** no se guardan en ningún sitio: cada pedido llega como un mensaje de WhatsApp a tu número.

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| La tienda dice "Vista de ejemplo" | `config.js` aún tiene los valores de ejemplo, o no lo subiste a GitHub |
| "No se pudieron cargar los productos" | La URL o la clave están mal copiadas, o el proyecto está en pausa |
| El panel dice "Correo o contraseña incorrectos" | El usuario se creó en **Authentication → Users**; revisa el correo y la contraseña |
| "No tienes permiso" al subir | El correo con el que entras no es el que pusiste en `setup.sql`. Corrígelo y vuelve a ejecutar el archivo |
| La foto no se sube | Ejecuta `setup.sql` completo otra vez; crea la carpeta `productos` y sus permisos |
| El panel dice "Falta ejecutar migracion.sql" | La tabla aún no tiene códigos ni tallas múltiples: ejecuta `migracion.sql` en SQL Editor |
| "Ese código ya existe" | Cada foto necesita un código distinto; usa el que propone el panel |
| El número de WhatsApp no cambió en la página | ¿Subiste `config.js`? Después de subirlo recarga con Ctrl+F5 (el navegador guarda copias viejas) |
| Cambié algo en GitHub y no se ve | Espera un par de minutos y recarga con Ctrl+F5 |
