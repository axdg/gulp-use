var use = require('./');
var stream = require('readable-stream');
var File = require('vinyl');
var expect = require('expect');

describe('use', function() {
  describe('#sync()', function() {
  });

  describe('#async()', function() {
    it('should return an instance of stream.Duplex', function() {
      var through = use();
      expect(through).toBeA(stream.Duplex);
      expect(through).toBeA(stream.Transform);
    });

    it('should return a noop stream when invoked with no args', function(complete) {
      var cache = [];
      var file = new File({ contents: new Buffer('noop') });

      var s = producer([file])
        .pipe(use())
        .pipe(consumer(cache));

      s.on('finish', function () {
        expect(String(cache[0].contents)).toBe('noop');
        expect(cache[0]).toBe(file); // same pointer
        complete();
      });
    });

    it('should accept an optional transform function', function(complete) {
      var cache = [];
      var file = new File({ contents: new Buffer('test') });

      var s = producer([file])
        .pipe(use.async(function(file, next) {
          file.contents = new Buffer(String(file.contents) + ':append');
          next(null, file);
        }))
        .pipe(consumer(cache));

      s.on('finish', function() {
        expect(String(cache[0].contents)).toBe('test:append');
        complete();
      });
    });

    it('should accept an optional flush function', function(complete) {
      var cache = [];
      var s = producer([])
      .pipe(use.async(null, function(done) {
        this.push(new File({ contents: new Buffer('flushed') }));
        done();
      }))
      .pipe(consumer(cache));

      s.on('finish', function(done) {
        expect(String(cache[0].contents)).toBe('flushed');
        complete();
      });
    });
  });
});

/**
 * Some private utility functions for testing the module
 */

/**
 * Returns a new readable stream in object mode
 * that pushes chunks (files) from the provided array
 * into the pipe. Chunks are pushed from left to right.
 * This will not mutate the provided array.
 *
 * @param {Array} arr
 * @return {stream.Readable} readable stream
 * @api private
 */
function producer (arr) {

  // clone the array, so as not to mutate it
  var input = arr.slice(0);

  return new stream.Readable({
    objectMode: true,
    read: function () {
      if (input.length) {
        this.push(input.shift());
      }
      if (!input.length) {
        this.push(null);
      }
    },
  });
}

/**
 * Returns a writable stream in object mode that
 * pushes chunks into the provided array on each
 * write, so mutates that array. Given a reference
 * to the supplied array, we check check it's
 * contents on stream end.
 *
 * @param {Array} arr
 * @return {stream.Writable} writeable
 */
function consumer (arr) {
  return new stream.Writable({
    objectMode: true,
    write: function (file, _, next) {
      arr.push(file);
      next();
    },
  });
}
