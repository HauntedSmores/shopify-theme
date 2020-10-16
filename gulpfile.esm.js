import path from 'path'
import { src, dest, series, watch } from 'gulp'
import flatmap from 'gulp-flatmap'
import gulpif from 'gulp-if'
import size from 'gulp-size'
import babel from 'gulp-babel'
import webpack from 'webpack-stream'
import named from 'vinyl-named'
import uglify from 'gulp-uglify'
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

const touch = () => through2.obj( function( file, enc, cb ) {
  if ( file.stat ) {
    file.stat.atime = file.stat.mtime = file.stat.ctime = new Date()
  }
  cb( null, file )
})

const snippetPath = 'snippets/theme-scripts.liquid'

const delete_snippet = () => {
  return del(snippetPath)
}

const end_snippet = (cb) => {
  const content = [
    "{% endif %}",
    "{{ 'theme.js' | asset_url | script_tag }}"
  ].join("\n\n")

  fs.appendFileSync(snippetPath, content)
  cb()
}

const transpile = series(delete_snippet, () => {
  return src('src/scripts/**/*.js')
    .pipe(flatmap((stream, file) => {
        const fileExists = fs.existsSync(snippetPath)
        const is_theme = file.stem === 'theme'

        if (!is_theme) {
          const content = [
            `{% ${fileExists ? "elsif" : "if"} template == "${file.stem}" %}`,
            `{{ "${file.basename}" | asset_url | script_tag }}\n`
          ].join("\n    ")
          
          fs.appendFileSync(snippetPath, content)
        }

        return stream
      }))
    .pipe(sourcemaps.init())
    .pipe(babel({
			presets: ['@babel/preset-env']
    }))
    .pipe(named())
    .pipe(webpack({
      mode: process.env.NODE_ENV
    }))
    .pipe(gulpif(process.env.NODE_ENV === 'development', sourcemaps.write()))
    .pipe(touch())
    .pipe(dest('assets/'))
}, end_snippet)

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

  // const {store, theme_id} = config.development
  
  // bs.init({
  //   proxy: `https://${config.shop}/?preview_theme_id=${theme_id}`,
  //   files: 'theme_ready',
  //   reloadDelay: 1300,
  //   open: false,
  //   snippetOptions: {
  //     rule: {
  //         match: /<\/body>/i,
  //         fn: function (snippet, match) {
  //             return snippet + match
  //         }
  //     }
  //   }
  // })
  cb()
}

export const watch_theme = (cb) => {
  watch('src/**/*.js', transpile)
  watch('src/**/*.styl', styles)
  // themekit.command('watch', { notify: 'theme_ready' })
}

export const dev = series(transpile, styles, sync, watch_theme)

export const build = series(set_prod, transpile, styles)