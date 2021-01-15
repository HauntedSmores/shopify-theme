import path from 'path'
import { src, dest, series, watch, lastRun } from 'gulp'
import flatmap from 'gulp-flatmap'
import gulpif from 'gulp-if'
import size from 'gulp-size'
import babel from 'gulp-babel'
import webpack from 'webpack-stream'
import named from 'vinyl-named'
import stylus from 'gulp-stylus'
import postcss from 'gulp-postcss'
import nano from 'gulp-cssnano'
import tailwind from 'tailwindcss'
import themekit from '@shopify/themekit'
import browserSync from 'browser-sync'
import fs from 'fs'
import del from 'del'
import yaml from 'yaml'
import sourcemaps from 'gulp-sourcemaps'
import through2 from 'through2'

process.env.NODE_ENV = 'development'

const configFile = fs.readFileSync('./config.yml', 'utf-8')
const config = yaml.parse(configFile)

const bs = browserSync.create()

/*
Necessary for themekit to see file updates
  - https://github.com/gulpjs/gulp/issues/2193
  - https://github.com/gulpjs/vinyl/issues/105
*/
const touch = () => through2.obj( function( file, enc, cb ) {
  if ( file.stat ) {
    file.stat.atime = file.stat.mtime = file.stat.ctime = new Date()
  }
  cb( null, file )
})

const clear = () => {
  return del('assets/**')
}

const snippetPath = 'snippets/theme-scripts.liquid'

const delete_snippet = () => {
  return del(snippetPath)
}

const start_snippet = (cb) => {
  const content = "{{ 'layout-' | append: layout | append: '.js' | asset_url | script_tag }}\n"
  fs.appendFileSync(snippetPath, content)
  cb()
}

const transpile = (cb) => {
  const sources = ['src/scripts/templates/**/*.js', 'src/scripts/layout/*.js']
  let test = false;
  return src(sources, {since: lastRun(transpile)})
    .pipe(sourcemaps.init())
    .pipe(babel({
			presets: ['@babel/preset-env']
    }))
    .pipe(named(file => {
      const basename = path.basename(file.path, '.js')
      return file.path.includes("layout") ? `layout-${basename}` : basename
    }))
    .pipe(webpack({
      mode: process.env.NODE_ENV,
      watch: process.env.NODE_ENV == "development",
      optimization: {
        splitChunks: {
          chunks: (chunk) => !chunk.name.includes("layout"),
          minSize: 0,
          minChunks: 1,
          automaticNameDelimiter: "@"
        }
      }
    }, null, cb()))
    .pipe(flatmap((stream, file) => {
      const files = file.stem.split("@").filter(stem => stem != "vendors").map(file => `template == \"${file}\"`)
      const content = [
        `\n{% if ${files.join(" or ")} %}`,
        `\t{{ "${file.basename}" | asset_url | script_tag }}`,
        `{% endif %}\n`
      ].join("\n")
      fs.appendFileSync(snippetPath, content)
      return stream
    }))
    .pipe(gulpif(process.env.NODE_ENV === 'development', sourcemaps.write()))
    .pipe(touch())
    .pipe(dest('assets/'))
}

export const js = series(delete_snippet, start_snippet, transpile)

const styles = () => {
  return src('src/styles/theme.styl')
    .pipe(gulpif(process.env.NODE_ENV === 'development', sourcemaps.init()))
    .pipe(stylus())
    .pipe(postcss([tailwind]))
    .pipe(gulpif(process.env.NODE_ENV === 'production', nano()))
    .pipe(gulpif(process.env.NODE_ENV === 'development', sourcemaps.write()))
    .pipe(size({showFiles: true}))
    .pipe(touch())
    .pipe(dest('assets'))
}

const set_prod = (cb) => {
  process.env.NODE_ENV = 'production'
  cb()
}

const sync = (cb) => {

  const {store, theme_id} = config.development
  
  bs.init({
    proxy: `https://${store}/?preview_theme_id=${theme_id}`,
    files: 'theme_ready',
    reloadDelay: 1000,
    open: false,
    snippetOptions: {
      rule: {
          match: /<\/body>/i,
          fn: function (snippet, match) {
              return snippet + match
          }
      }
    }
  })
  cb()
}

export const watch_theme = (cb) => {
  watch('src/**/*.styl', styles)
  themekit.command('watch', { notify: 'theme_ready', 'allow-live': true })
  cb()
}

export const dev = series(js, styles, sync, watch_theme)

export const build = series(set_prod, clear, js, styles)