var gulp = require('gulp');
var use = require('./index.js');
var File = require('vinyl');

gulp.task('default', function() {

  gulp.src('./*.*')
    .pipe(use(function(file) {
      return 'string'
    }))
    .pipe(use(function(file) {
      console.log(String(file.contents))
    }))
    .pipe(gulp.dest('./folder/'))
});
