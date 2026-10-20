import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

export const puddTheme = definePreset(Aura, {
  semantic: {
    formField: { borderRadius: '0.375rem', paddingX: '0.875rem', paddingY: '0.6875rem' },
    primary: {
      50: '#f1f7f1',
      100: '#dfeedd',
      200: '#b9d9b7',
      300: '#95c1a3',
      400: '#72a58c',
      500: '#4e8977',
      600: '#326d63',
      700: '#1e5550',
      800: '#17433e',
      900: '#153934',
      950: '#102b27',
    },
    colorScheme: {
      light: {
        text: { color: '{surface.900}', mutedColor: '{surface.600}' },
        content: { borderColor: '{surface.200}' },
        formField: {
          borderColor: '{surface.500}',
          hoverBorderColor: '{primary.600}',
          placeholderColor: '{surface.600}',
        },
        primary: {
          color: '{primary.700}',
          contrastColor: '{primary.50}',
          hoverColor: '{primary.800}',
          activeColor: '{primary.900}',
        },
        surface: {
          0: '#ffffff',
          50: '#f5f4ef',
          100: '#eeeee6',
          200: '#d8ded6',
          300: '#b6c3ba',
          400: '#879a8f',
          500: '#697e71',
          600: '#506357',
          700: '#3e5146',
          800: '#2e4036',
          900: '#21352b',
          950: '#14251e',
        },
      },
      dark: {
        text: { color: '{surface.50}', mutedColor: '{surface.400}' },
        content: { borderColor: '{surface.700}' },
        formField: {
          borderColor: '{surface.500}',
          hoverBorderColor: '{primary.300}',
          placeholderColor: '{surface.400}',
        },
        primary: {
          color: '{primary.200}',
          contrastColor: '{primary.950}',
          hoverColor: '{primary.300}',
          activeColor: '{primary.400}',
        },
        surface: {
          0: '#ffffff',
          50: '#f4f5f8',
          100: '#e9ecf1',
          200: '#d9dde4',
          300: '#c1c6cf',
          400: '#a8adb8',
          500: '#7a818d',
          600: '#535965',
          700: '#353943',
          800: '#23262e',
          900: '#181a1f',
          950: '#101114',
        },
      },
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '0.375rem',
        paddingY: '0.6875rem',
        gap: '0.5rem',
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
              background: '{surface.100}',
              hoverBackground: '{surface.200}',
              activeBackground: '{surface.300}',
              borderColor: '{surface.300}',
              hoverBorderColor: '{surface.400}',
              activeBorderColor: '{surface.500}',
              color: '{surface.800}',
              hoverColor: '{surface.900}',
              activeColor: '{surface.950}',
            },
          },
          text: { secondary: { color: '{text.muted.color}' }, danger: { color: '{red.700}' } },
          outlined: { secondary: { color: '{surface.700}', borderColor: '{surface.400}' } },
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
              background: '{surface.800}',
              hoverBackground: '{surface.700}',
              activeBackground: '{surface.600}',
              borderColor: '{surface.600}',
              hoverBorderColor: '{surface.500}',
              activeBorderColor: '{surface.400}',
              color: '{surface.100}',
              hoverColor: '{surface.50}',
              activeColor: '{surface.0}',
            },
          },
          text: { secondary: { color: '{text.muted.color}' }, danger: { color: '{red.300}' } },
          outlined: { secondary: { color: '{surface.200}', borderColor: '{surface.500}' } },
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
        borderRadius: '0.5rem',
        shadow: '0 0 0 1px {content.border.color}',
      },
      body: { padding: '1.25rem', gap: '1rem' },
      colorScheme: {
        dark: {
          root: { shadow: '0 0 0 1px {surface.700}' },
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
