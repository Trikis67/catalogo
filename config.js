/* ============================================================
   CONFIGURACIÓN DE TU CATÁLOGO
   Cambia solo lo que está entre comillas.
   ============================================================ */
window.CATALOGO = {
  /* Datos de Supabase (Project Settings > API Keys). La clave "publishable"
     (o "anon") es pública por diseño: la seguridad la dan las reglas de
     setup.sql. NUNCA pegues aquí la clave "secret" ni "service_role". */
  supabaseUrl: "https://fvkkhngnkscqbipfkqjq.supabase.co",
  supabaseKey: "sb_publishable_-IaDZHtDyPOzhkjuLMZT8A_CEX_FzfV",

  /* Textos de la tienda */
  brand: "El Rack de las Playeras",
  hero: "Playeras por talla",
  tagline: "Elige tu talla, agrega al pedido y confirma por WhatsApp.",

  /* WhatsApp: código de país + número, sin espacios ni signos (Guatemala = 502) */
  whatsapp: "50255940361",
  whatsappLabel: "+502 5594 0361",

  /* Números que aparecen en "Contacto" (cada uno es un botón verde de WhatsApp).
     Los pedidos del carrito se envían al número de "whatsapp" de arriba. */
  contactos: [
    { label: "+502 5594 0361", whatsapp: "50255940361" },
    { label: "+502 5471 9056", whatsapp: "50254719056" }
  ],

  /* Redes sociales (se muestran en "Redes") */
  tiktok: "https://www.tiktok.com/@playeron12?_r=1&_t=ZS-9ARYRwki83x",
  facebook: "https://www.facebook.com/share/14po1MjVLiP/",

  currency: "Q",

  /* Frases que corren en la franja azul (puedes dejar la lista vacía: []) */
  ticker: ["Pedidos por WhatsApp", "Envíos a domicilio", "Escríbenos para confirmar existencias"]
};
