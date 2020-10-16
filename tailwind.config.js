const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  purge: ["./**/*.liquid"],
  theme: {
    extend: {}
  },
  variants: {},
  plugins: [],
}
