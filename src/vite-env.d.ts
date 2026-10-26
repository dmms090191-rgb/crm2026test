/// <reference types="vite/client" />

/**
 * La version du produit, gravee au build par vite.config.ts depuis
 * src-tauri/tauri.conf.json. Une application installee ne peut pas la deviner autrement :
 * contrairement au site, elle ne se recharge pas depuis un serveur.
 */
declare const __VERSION_TALVEX__: string;
