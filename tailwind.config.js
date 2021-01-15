module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  purge: ["./**/*.liquid"],
  variants: {},
  plugins: [],
  corePlugins: [
    'padding',
    'margin',
    'width',
    'backgroundColor',
    'fontFamily',
    'fontSize',
    'fontStyle',
    'fontWeight',
    'textColor',
    'textAlign',
    'opacity',
    'justifyContent',
    'alignItems',
    'display',
    'objectFit',
    'zIndex'
  ]
}
