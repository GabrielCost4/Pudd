import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const puddTheme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#f4faee',
      100: '#e6f5d6',
      200: '#d3edb7',
      300: '#c0ed99',
      400: '#a6d87a',
      500: '#8abb60',
      600: '#6b9848',
      700: '#507335',
      800: '#3d582b',
      900: '#304625',
      950: '#182610',
    },
    colorScheme: {
      dark: {
        primary: {
          color: '{primary.300}',
          contrastColor: '#182610',
          hoverColor: '{primary.200}',
          activeColor: '{primary.400}',
        },
        surface: {
          0: '#ffffff',
          50: '#f4f5f4',
          100: '#e4e7e5',
          200: '#ccd2ce',
          300: '#adb6af',
          400: '#939b98',
          500: '#6d7771',
          600: '#48524b',
          700: '#303a33',
          800: '#1c2420',
          900: '#131a16',
          950: '#0c110e',
        },
      },
    },
  },
});
