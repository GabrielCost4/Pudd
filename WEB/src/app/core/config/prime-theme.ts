import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const puddTheme = definePreset(Aura, {
  semantic: {
    formField: { borderRadius: '0.375rem' },
    primary: {
      50: '#f1f5ea',
      100: '#e0e4ce',
      200: '#c3d3ba',
      300: '#9bbdaa',
      400: '#6e9987',
      500: '#4e8374',
      600: '#286a61',
      700: '#114d4d',
      800: '#103e3f',
      900: '#0e3031',
      950: '#0a2425',
    },
    colorScheme: {
      light: {
        text: { mutedColor: '{surface.600}' },
        primary: {
          color: '{primary.700}',
          contrastColor: '{primary.100}',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        surface: {
          0: '#ffffff',
          50: '#eef0f4',
          100: '#e4e7ed',
          200: '#d5dae3',
          300: '#bfc6d2',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      dark: {
        text: { mutedColor: '{surface.400}' },
        primary: {
          color: '{primary.300}',
          contrastColor: '{primary.950}',
          hoverColor: '{primary.200}',
          activeColor: '{primary.400}',
        },
        surface: {
          0: '#ffffff',
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '0.375rem',
        label: { fontWeight: '600' },
        primary: {
          background: '{primary.700}',
          hoverBackground: '{primary.800}',
          activeBackground: '{primary.900}',
          borderColor: 'light-dark({primary.700}, {primary.400})',
          hoverBorderColor: 'light-dark({primary.800}, {primary.300})',
          activeBorderColor: 'light-dark({primary.900}, {primary.400})',
          color: '{primary.100}',
          hoverColor: '{primary.100}',
          activeColor: '{primary.100}',
        },
        secondary: {
          background: 'light-dark({primary.100}, #2d3839)',
          hoverBackground: 'light-dark({primary.200}, #3a4948)',
          activeBackground: 'light-dark({primary.300}, #475b55)',
          borderColor: 'light-dark({surface.200}, {surface.600})',
          hoverBorderColor: 'light-dark({primary.400}, {surface.500})',
          activeBorderColor: '{primary.400}',
          color: 'light-dark(#27191c, {primary.100})',
          hoverColor: 'light-dark({primary.900}, {primary.50})',
          activeColor: 'light-dark({primary.950}, {primary.50})',
        },
      },
      text: {
        secondary: { color: '{text.muted.color}' },
        danger: { color: 'light-dark({red.700}, {red.300})' },
      },
    },
    toast: { root: { width: 'min(24rem, calc(100vw - 2.5rem))' } },
    fileupload: {
      root: { borderRadius: '0.5rem' },
      header: { padding: '0', borderWidth: '0' },
      content: { padding: '1rem', highlightBorderColor: '{primary.color}' },
    },
    card: {
      root: {
        borderRadius: '0.625rem',
        shadow: '0 0 0 1px {content.border.color}',
      },
      body: { padding: '1.5rem', gap: '1rem' },
      colorScheme: {
        dark: {
          root: { shadow: '0 0 0 1px {surface.800}' },
        },
      },
    },
    avatar: {
      root: { background: '{primary.100}', color: '{primary.800}' },
      lg: { width: '3rem', height: '3rem', fontSize: '1.25rem' },
      xl: { width: '7rem', height: '7rem', fontSize: '2.75rem' },
      colorScheme: {
        light: { root: { background: '{primary.100}', color: '{primary.800}' } },
        dark: { root: { background: '{primary.950}', color: '{primary.300}' } },
      },
    },
    sidebar: {
      header: { padding: '1.5rem 1.25rem', gap: '0.5rem' },
      footer: { padding: '1rem', gap: '0.625rem' },
      layout: { background: 'light-dark({surface.50}, {surface.950})' },
      main: { background: 'light-dark({surface.50}, {surface.950})' },
      menu: { gap: '0.375rem' },
      menuButton: {
        height: '2.875rem',
        borderRadius: '0.375rem',
        padding: '0.75rem 1rem',
        gap: '0.875rem',
        fontWeight: '600',
        icon: { color: 'currentColor', focusColor: 'currentColor' },
      },
      colorScheme: {
        light: {
          menuButton: {
            activeBackground: '{primary.700}',
            activeColor: '{primary.100}',
            focusBackground: '{primary.100}',
            focusColor: '{primary.900}',
          },
        },
        dark: {
          menuButton: {
            activeBackground: '{primary.700}',
            activeColor: '{primary.100}',
            focusBackground: '{surface.700}',
            focusColor: '{primary.100}',
          },
        },
      },
    },
  },
});
