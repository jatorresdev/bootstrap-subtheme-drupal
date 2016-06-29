'use strict';

import plugins  from 'gulp-load-plugins';
import yargs    from 'yargs';
import gulp     from 'gulp';
import rimraf   from 'rimraf';
import yaml     from 'js-yaml';
import fs       from 'fs';

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
gulp.task('build',
  gulp.series(clean, gulp.parallel(bower, less, javascript, images, copy)));

// Watch for file changes
gulp.task('default',
  gulp.series('build', watch));

// Delete the "dist" folder
// This happens every time a build starts
function clean(done) {
  rimraf(PATHS.dist, done);
}

// Copy files out of the assets folder
// This task skips over the "img", "js", and "less" folders, which are parsed separately
function copy() {
  return gulp.src(PATHS.assets)
    .pipe(gulp.dest(PATHS.dist + '/assets'));
}

// Compile Sass into CSS
// In production, the CSS is compressed
function less() {
  return gulp.src('src/assets/less/style.less')
    .pipe($.sourcemaps.init())
    .pipe($.less()
      .on('error', errorHandler)
    )
    .pipe($.autoprefixer({
      browsers: COMPATIBILITY
    }))
    .pipe($.if(PRODUCTION, $.cssnano()))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/assets/css'));
}

// Combine JavaScript into one file
// In production, the file is minified
function javascript() {
  return gulp.src(PATHS.javascript)
    .pipe($.sourcemaps.init())
    .pipe($.babel())
    .pipe($.concat('js.js'))
    .pipe($.if(PRODUCTION, $.uglify()
      .on('error', errorHandler)
    ))
    .pipe($.if(!PRODUCTION, $.sourcemaps.write()))
    .pipe(gulp.dest(PATHS.dist + '/assets/js'));
}

// Copy images to the "dist" folder
// In production, the images are compressed
function images() {
  return gulp.src('src/assets/img/**/*')
    .pipe($.if(PRODUCTION, $.imagemin({
      progressive: true
    })))
    .pipe(gulp.dest(PATHS.dist + '/assets/img'));
}

function bower() {
  return gulp.src($.mainBowerFiles({
    "overrides": {
      "bootstrap": {
        main: [
          './dist/js/*' + $.if(PRODUCTION, '.min.js', '.js'),
          './dist/css/*' + $.if(PRODUCTION, '.min.css', '*'),
          './dist/fonts/*.*'
        ]
      }
    }
  }), {base: PATHS.bower})
    .pipe(gulp.dest(PATHS.dist + '/libs'));
}

// Watch for changes to static assets, pages, Sass, and JavaScript
function watch() {
  gulp.watch(PATHS.assets, copy);
  gulp.watch(PATHS.bower, bower);
  gulp.watch('src/assets/less/**/*.less', gulp.series(less));
  gulp.watch('src/assets/js/**/*.js', gulp.series(javascript));
  gulp.watch('src/assets/img/**/*', gulp.series(images));
}
