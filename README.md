# gulp-use

> Tap into the gulp pipeline and use vanilla functions to for all your esoteric vinyl transformation needs

[![Build Status](https://travis-ci.org/axdg/gulp-use.svg?branch=master)](https://travis-ci.org/axdg/gulp-use) [![Circle CI](https://circleci.com/gh/axdg/gulp-use/tree/master.svg?style=shield)](https://circleci.com/gh/axdg/gulp-use/tree/master) [![Coverage Status](https://coveralls.io/repos/github/axdg/gulp-use/badge.svg?branch=master)](https://coveralls.io/github/axdg/gulp-use?branch=master)

There are plenty of [high](https://github.com/search?q=%40sindresorhus+gulp-) [quality](https://github.com/search?utf8=%E2%9C%93&q=%40contra+gulp-&type=Repositories&ref=searchresults) gulp plugins for performing the common file transformations that one might need from their build system. For the less common transformations, or those that are super specific specific to your needs, you can use 'gulp-use' to tap into the stream and perform file transformations. 

The typical use case for this module is to map over the stream, but it also comes in very handy when you need to implement some sort of assymetric flow in the pipeline. Such as where a single file is split into multiple files, or multiple files (or their properties) are condensed into a single file - take a look at the examples.

## Installation

Install package with NPM and add it to your development dependencies:

`npm install --save-dev gulp-use`

## Usage

```js
var gulp = require('gulp');
var use = require('gulp-use');

gulp.task('default', function() {
  return gulp.src('./src/*.js')
    .pipe(gulp-use(function(file) {
      file.contents = Buffer.concat(
        file.contents, 
        new Buffer('//* last build; ' + Date.now() + '*/');
      );
      return file;
    }))
    .pipe(gulp.dest('./dist/'))
});

```

## API

### use(transform [,flush] [,name])

#### transform

Type: `function`

A syncronous function that is passed a vinyl file object. As in the example above, the returned value (a vinyl file object) is pushed into the stream. You may also push files into the stream by calling `this.push(file)` for each of them. Since this function will be syncronous, it is ok to `throw` inside it:

```js
gulp.task('throw', function () {
  var stream = gulp.src('./*.js')
    .pipe(use(function (file) {
      throw new Error('uh-oh!');
    }, 'thrower'));

  return stream;
});
```

Thrown errors are re-emitted as `gutil.PluginError`s from the stream, you can optionally specify the name that the plugin error will using with the `name` parameter.

If you pass 'null' as `transform`, a no-op; `function (file) { return file }` will be used in it's place.

#### flush

Type: `function`

An optional syncronous function to be invoked when all files have passed through the stream. If you return a vinyl file, it will be pushed onto the stream. As with `transform`, you may push any number of vinyl files using `this.push(file)`.

#### name

Type: `string`

This will be the second or third parameter depending on whether a `flush` function is provided. It is the name that will be used for `gutil.PluginError`s that are emitted from the stream. Where no `name` is specified `gulp-use` will be used instead.

### use.async(transform [,flush])

You should use this where either `transform` or `flush` must be asyncronous.

#### transform

Type: `function`

The same as the syncronous version, except that it will be passed a second parameter `next`. Which is used to signal the completion of the the operation. Errors should be passed to `next` as the first argument, and optional as file object to push into the stream as a sceond argument:

```js
var gulp = require('gulp');
var useAsync = require('gulp-use').async;

gulp.task('default', function() {
  return gulp.src('./src/*.js')
    .pipe(useAsync(function(file, next) {
      file.contents = Buffer.concat(
        file.contents, 
        new Buffer('//* last build; ' + Date.now() + '*/');
      );

      // make it asyncronous
      setTimeout(function() {
        next(null, file);
      }, 1000);
    }))
    .pipe(gulp.dest('./dist/'))
});
```

As with the syncronous `transform` you can also call `this.push()`.

#### flush

Type: `function`

The same as syncronous version, except that it is passed `done`, which is used to signal completion and may be called with an optional error as the first argument. `this.push()` must be used if you need to push file onto the stream from `flush`.

## Examples

Some random examples of use cases for `gulp-use`:

### Splitting fasta files

The [fasta](https://en.wikipedia.org/wiki/FASTA_format) file format is the de facto standard for serialization of DNA or protein sequences in bioinformatics. The format is quite simple; each file may contain one or more DNA/protein sequences. Each sequence must be preceded by a 'header' line which begins with a less-than cahracter '>' followed by any number of identifiers, which are typically delimited by a pipe '|' character. Since some software packages output multiple sequences per file, whereas other packages require a single sequence per file, it is sometimes necessary to split a single file into several.

The following gulp task will split a .fasta file containing multiple sequences into multiple files containing one sequence each. The filename for each of the new files is derived from the [gi](http://www.ncbi.nlm.nih.gov/Sitemap/sequenceIDs.html) number in the header for that sequence.

```js
var gulp = require('gulp');
var use = require('gulp-use');

gulp.task('fasta:split', function () {
  function split(file) {
    var self = this;
    var re = /gi\|(\d+)/;
    var sequences = String(file.contents).split('>');
    sequences.shift();

    sequences.forEach(function (sequence) {
      var path = re.exec(sequence)[1] + '.fasta';
      var contents = new Buffer('>' + sequence);
      self.push(new File({
        path: path,
        contents: contents,
      }));
    });
  }

  return gulp.src('./fasta/*.fasta')
    .pipe(use(split))
    .pipe(gulp.dest('./fasta'));
});
```

### 'Reducing' vinyl files

Let's assume that that you are using gulp as the build tool for a static blog, you might use [gulp-markdown](https://github.com/sindresorhus/gulp-markdown) to render all of your posts into html. If you then wanted to produce a `.json` file that contained an array of all
posts sorted by time last modified, you could do this:

```js
var gulp = require('gulp');
var markdown = require('gulp-markdown');

gulp.task('build:posts', function () {
  var accumulated = [];
  function transform(file) {
    accumulated.push({
      path: file.path,
      mtime: Date.parse(file.stat.mtime),
    });
  }

  function flush() {
    accumulated.sort(function (a, b) {
      return b.mtime - a.mtime;
    });

    var file = new File({
      path: './summary.json',
      contents: new Buffer(
        JSON.stringify(accumulated, false, '  ')
      ),
    });
    this.push(file);
  }

  return gulp.src('./*.md')
    .pipe(markdown())
    .pipe(gulp.dest('./build/'))
    .pipe(use(transform, flush))
    .pipe(gulp.dest('./build/json/'));
});
```
## License

MIT © 2016 axdg (<axdg@dfant.asia>)
