import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // src-tauri/target et src-tauri/gen sont des artefacts de compilation Rust : les
  // parcourir n'ajouterait aucun probleme (la regle ne cible que **/*.{ts,tsx}) mais
  // allongerait inutilement chaque passage du lint.
  // Les dossiers GENERES : ni ecrits ni relus a la main. Le bureau avait deja les siens ;
  // le projet Android en apporte autant — app/build porte notamment le native-bridge.js de
  // Capacitor, que le premier APK a fait entrer dans le decompte du lint.
  // android/app/src/main/assets/public est la copie de dist posee par la synchronisation
  {
    ignores: [
      'dist',
      'src-tauri/target',
      'src-tauri/gen',
      'android/build',
      'android/.gradle',
      'android/app/build',
      'android/capacitor-cordova-android-plugins',
      'android/app/src/main/assets/public',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
          allowExportNames: ['useTheme', 'STATUS_CFG', 'buildStructureCrmText'],
        },
      ],
    },
  }
);
