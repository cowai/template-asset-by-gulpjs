const gulp = require('gulp');
const $ = require('gulp-load-plugins')();
const del = require('del');
const runSequence = require('run-sequence');
const browserify = require('browserify');
var through2 = require('through2');

const ENV = process.env.NODE_ENV ? process.env.NODE_ENV.trim() : 'development';

const AUTOPREFIXER_BROWSERS = [
  'ie >= 11',
  'last 2 ff versions',
  'last 2 edge versions',
  'last 2 chrome versions',
  'last 2 safari versions',
  'ios >= 9',
  'android >= 5.0'
];

const SRC = {
  ROOT: './src/*.*',
  COMPONENTS: './src/components/**/*.*',
  IMAGES: './src/images/**/*.+(jpg|jpeg|png|gif|svg)',
  SCRIPTS: './src/scripts/**/*.js',
  STYLES: './src/styles/**/*.*'
};

const DEST = {
  ROOT: './dist',
  COMPONENTS: './dist/components',
  IMAGES: './dist/images',
  SCRIPTS: './dist/scripts',
  STYLES: './dist/styles'
};

gulp.task('root', () => {
  gulp.src(SRC.ROOT)
    .pipe(gulp.dest(DEST.ROOT));
});

gulp.task('components', () => {
  gulp.src(SRC.COMPONENTS)
    .pipe(gulp.dest(DEST.COMPONENTS));
});

gulp.task('images', () => {
  gulp.src(SRC.IMAGES)
    .pipe($.changed(DEST.IMAGES))
    .pipe($.plumber({
      errorHandler: $.notify.onError('Error: <%= error.message %>')
    }))
    .pipe($.imagemin())
    .pipe(gulp.dest(DEST.IMAGES));
});

gulp.task('scripts', () => {
  gulp.src(SRC.SCRIPTS)
    .pipe($.plumber({
      errorHandler: $.notify.onError('Error: <%= error.message %>')
    }))
    .pipe(through2.obj(function (file, encode, callback) {
      browserify(file.path, {
        debug: true,
        paths:['./node_module', './src/']
      })
        .on('error', $.util.log)
        .transform('babelify', {
          presets: 'es2015',
          sourceMaps: true
        })
        .bundle(function (err, res) {
          if (err) {
            $.util.log(err.message);
            $.util.log(err.stack);
          }
          file.contents = res;
          callback(null, file);
        });
    }))
    .pipe($.if(ENV === 'development', $.sourcemaps.init({loadMaps: true})))
    .pipe($.uglify())
    .pipe($.if(ENV === 'development', $.sourcemaps.write('../sourcemaps')))
    .pipe(gulp.dest(DEST.SCRIPTS));
});


gulp.task('styles', () => {
  gulp.src(SRC.STYLES)
    .pipe($.plumber({
      errorHandler: $.notify.onError('Error: <%= error.message %>')
    }))
    .pipe($.if(ENV === 'development', $.sourcemaps.init()))
    .pipe($.sass())
    .pipe($.if(ENV === 'development', $.sourcemaps.write({
      includeContent: false
    })))
    .pipe($.if(ENV === 'development', $.sourcemaps.identityMap()))
    .pipe($.autoprefixer({
      browsers: AUTOPREFIXER_BROWSERS
    }))
    .pipe($.cssmin())
    .pipe($.if(ENV === 'development', $.sourcemaps.write('../sourcemaps')))
    .pipe(gulp.dest(DEST.STYLES));
});

gulp.task('clean', () => del(DEST.ROOT));

/**
 * Defaultタスク。
 * BuildタスクとWatchタスクを実行します。
 * このタスクは開発時のみ使用します。
 */
gulp.task('default', ['build', 'watch']);

/**
 * Watchタスク。
 * srcフォルダ内の全ファイルを監視し、変更があった場合各タスクを実行します。
 * このタスクは開発時のみ使用します。
 */
gulp.task('watch', () => {
  gulp.watch(SRC.ROOT, ['root']);
  gulp.watch(SRC.COMPONENTS, ['components']);
  gulp.watch(SRC.IMAGES, ['images']);
  gulp.watch(SRC.SCRIPTS, ['scripts']);
  gulp.watch(SRC.STYLES, ['styles']);
});

/**
 * Buildタスク。
 * distフォルダをクリーンしたのち、srcフォルダの各ファイルをdistフォルダに出力します。
 * このタスクは開発・本番ともに使用します。
 */
gulp.task('build', () => {
  runSequence('clean', ['root', 'components', 'images', 'scripts', 'styles']);
});
