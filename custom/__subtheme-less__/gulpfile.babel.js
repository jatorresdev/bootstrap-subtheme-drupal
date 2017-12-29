'use strict';

import plugins from "gulp-load-plugins";
import yargs from "yargs";
import gulp from "gulp";
import rimraf from "rimraf";
import yaml from "js-yaml";
import fs from "fs";

// Load all Gulp plugins into one variable
const $ = plugins({
  pattern: ['gulp-*', 'gulp.*', 'main-bower-files']
});

// Check for --production flag
const PRODUCTION = !!(yargs.argv.production);

// Load settings from settings.yml
const {COMPATIBILITY, PATHS} = loadConfig();

// Manage errors
let errorHandler = function (errorObject, callback) {
  $.notify.onError(errorObject.toString().split(': ').join(':\n')).apply(this, arguments);
  if (typeof this.emit === 'function') {
    this.emit('end');
  }
};

function loadConfig() {
  let ymlFile = fs.readFileSync('config.yml', 'utf8');
  return yaml.load(ymlFile);
}

// Build the "build" folder by running all of the below tasks
gulp.task('build', gulp.series(clean, gulp.parallel(bower, scssMobile, scssDesktop, javascript, images, copy)));

// Watch for file changes
gulp.task('default', gulp.series('build', watch));

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
  rimraf(PATHS.dist.root, done);
}

// Copy files out of the assets folder
// This task skips over the "images", "js", and "scss" folders, which are
// parsed separately
function copy() {
  return gulp.src(PATHS.src.folders)
    .pipe(gulp.dest(PATHS.dist.assets));
}

// Compile Scss into CSS
// In production, the CSS is compressed
function scssMobile() {
  return gulp.src(PATHS.src.scss.mobile)
    .pipe($.sourcemaps.init())
    .pipe($.sass()
      .on('error', errorHandler)
    )
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    .pipe($.if(PRODUCTION, $.cssnano()))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist.assets + '/css'));
}

function scssDesktop() {
  return gulp.src(PATHS.src.scss.desktop)
    .pipe($.sourcemaps.init())
    .pipe($.sass()
      .on('error', errorHandler)
    )
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    .pipe($.if(PRODUCTION, $.cssnano()))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist.assets + '/css'));
}

// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
  return gulp.src(PATHS.src.js)
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.concat('js.js'))
    .pipe($.if(PRODUCTION, $.uglify()
      .on('error', errorHandler)
    ))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist.assets + '/js'));
}

// Copy images to the "dist" folder
// In production, the images are compressed
function images() {
  return gulp.src(PATHS.src.images + '/**/*')
    .pipe($.if(PRODUCTION, $.imagemin({
      progressive: true
    })))
    .pipe(gulp.dest(PATHS.dist.assets + '/images'));
}

function bower() {
  return gulp.src($.mainBowerFiles({
    "overrides": {
      "bootstrap-sass": {
        main: [
          './assets/javascripts/bootstrap.min.js',
          './assets/fonts/bootstrap/*.*'
        ]
      }
    }
  }), {base: PATHS.bower})
    .pipe(gulp.dest(PATHS.dist.libs));
}

// Watch for changes to static assets, pages, scss, and JavaScript
function watch() {
  gulp.watch(PATHS.src.folders, copy);
  gulp.watch(PATHS.bower, bower);
  gulp.watch('source/assets/scss/**/*.scss', gulp.series(scssMobile, scssDesktop));
  gulp.watch('source/assets/js/**/*.js', gulp.series(javascript));
  gulp.watch('source/assets/images/**/*', gulp.series(images));
}
