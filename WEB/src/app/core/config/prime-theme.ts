import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const puddTheme = definePreset(Aura, {
  semantic: {
    formField: { borderRadius: '0.375rem' },
    primary: {
      50: '#f2fbf4',
      100: '#dcf3e2',
      200: '#B5E8C3',
      300: '#91d6a5',
      400: '#65bd82',
      500: '#419d61',
      600: '#30814d',
      700: '#237044',
      800: '#205936',
      900: '#1b492e',
      950: '#102c1b',
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
          color: '{primary.200}',
          contrastColor: '{primary.950}',
          hoverColor: '{primary.300}',
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
      },
      colorScheme: {
        light: {
          root: {
            primary: {
              background: '{primary.color}',
              hoverBackground: '{primary.hover.color}',
              activeBackground: '{primary.active.color}',
              borderColor: '{primary.color}',
              hoverBorderColor: '{primary.hover.color}',
              activeBorderColor: '{primary.active.color}',
              color: '{primary.contrast.color}',
              hoverColor: '{primary.contrast.color}',
              activeColor: '{primary.contrast.color}',
            },
            secondary: {
              background: 'light-dark({primary.100}, {primary.950})',
              hoverBackground: 'light-dark({primary.200}, {primary.900})',
              activeBackground: 'light-dark({primary.300}, {primary.800})',
              borderColor: 'light-dark({primary.300}, {primary.800})',
              hoverBorderColor: 'light-dark({primary.400}, {primary.600})',
              activeBorderColor: '{primary.500}',
              color: 'light-dark({primary.800}, {primary.200})',
              hoverColor: 'light-dark({primary.900}, {primary.100})',
              activeColor: 'light-dark({primary.950}, {primary.50})',
            },
          },
          text: { secondary: { color: '{text.muted.color}' }, danger: { color: '{red.700}' } },
        },
        dark: {
          root: {
            primary: {
              background: '{primary.color}',
              hoverBackground: '{primary.hover.color}',
              activeBackground: '{primary.active.color}',
              borderColor: '{primary.color}',
              hoverBorderColor: '{primary.hover.color}',
              activeBorderColor: '{primary.active.color}',
              color: '{primary.contrast.color}',
              hoverColor: '{primary.contrast.color}',
              activeColor: '{primary.contrast.color}',
            },
            secondary: {
              background: 'light-dark({primary.100}, {primary.950})',
              hoverBackground: 'light-dark({primary.200}, {primary.900})',
              activeBackground: 'light-dark({primary.300}, {primary.800})',
              borderColor: 'light-dark({primary.300}, {primary.800})',
              hoverBorderColor: 'light-dark({primary.400}, {primary.600})',
              activeBorderColor: '{primary.500}',
              color: 'light-dark({primary.800}, {primary.200})',
              hoverColor: 'light-dark({primary.900}, {primary.100})',
              activeColor: 'light-dark({primary.950}, {primary.50})',
            },
          },
          text: { secondary: { color: '{text.muted.color}' }, danger: { color: '{red.300}' } },
        },
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
        dark: { root: { background: '{primary.950}', color: '{primary.200}' } },
      },
    },
  },
});
