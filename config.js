/* ============================================================
   CONFIGURACIÓN DE TU CATÁLOGO
   Cambia solo lo que está entre comillas.
   ============================================================ */
window.CATALOGO = {
  /* Datos de Supabase (Project Settings > API). La clave "anon" o
     "publishable" es pública por diseño: la seguridad la dan las
     reglas que crea el archivo setup.sql. NUNCA pegues aquí la
     clave "service_role" ni "secret". */
  supabaseUrl: "https://TU-PROYECTO.supabase.co",
  supabaseKey: "TU_CLAVE_ANON_PUBLICA",

  /* Textos de la tienda */
  brand: "Tu Catálogo",
  kicker: "Catálogo de temporada",
  hero: "Playeras por talla",
  tagline: "Elige tu talla, agrega al pedido y confirma por WhatsApp.",
  ticker: ["Pedidos por WhatsApp", "Envíos a todo el país", "Tallas S a XL", "Precios en quetzales"],

  /* WhatsApp: código de país + número, sin espacios ni signos (Guatemala = 502) */
  whatsapp: "50200000000",
  whatsappLabel: "+502 0000 0000",

  currency: "Q",

  /* Frases que corren en la franja azul (puedes dejar la lista vacía: []) */
  ticker: ["Pedidos por WhatsApp", "Entrega a domicilio o recoger", "Escríbenos para confirmar existencias"]
};
