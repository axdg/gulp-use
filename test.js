var use = require('./');
var stream = require('readable-stream');
var File = require('vinyl');
var expect = require('expect');

/**
 * Some fixture vinyl files
 */
 var files = [];
 for(var i = 0; i < 10; i++) {
  files.push(new File({
    cwd: '/',
    base: '/test/',
    path: '/test/file_' + i + '.file',
    contents: new Buffer('' + i),
  }));
 }

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

  if(!arr) {
    arr = [];
  }

  // neat way to clone an array
  var input = arr.slice(0);

  // clone vinyls so-as not to mutate
  input.forEach(function(c, i) {
    input[i] = c.clone();
  });

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

describe('use', function() {
  describe('#sync()', function() {
    it('should throw given an invalid transform arg', function() {
      expect(function() {
        return use('string');
      }).toThrow();
    });

    it('should throw given an invalid flush arg', function() {
      expect(function() {
        return use(null, string);
      }).toThrow();
    });

    it('should return an instance of stream.Duplex', function() {
      var through = use();
      expect(through).toBeA(stream.Duplex);
      expect(through).toBeA(stream.Transform);
    });

    it('should return a noop stream when invoked with no args', function(complete) {
      var output = [];
      var file = new File({ contents: new Buffer('noop') });

      var s = producer([file])
        .pipe(use())
        .pipe(consumer(output))

      s.on('finish', function () {
        expect(String(output[0].contents)).toBe('noop');
        complete();
      });
    });

    it('should re-emit errors thrown in the provided transform', function(complete) {
      var file = new File({ contents: new Buffer('uh-oh!') });

      var through = use(function(file) {
          throw new Error(String(file.contents));
      })

      producer([file])
        .pipe(through)
        .pipe(consumer([]))

      through.on('error', function(err) {
        expect(err).toBeA(Error);
        expect(err.message).toEqual('uh-oh!')
        complete();
      });
    });

    /**
     * Implementation of vinyl filters, reducers etc.
     * The streams created below are the primary use
     * case for this module.
     */
    it('could be used to filter vinyls in the pipeline', function(complete) {
      var output = [];
      var s = producer(files)
        .pipe(use(threes))
        .pipe(consumer(output));

      // re-emit files evenly divisible by three
      var count = 0;
      function threes(file) {
        if(count && !(count % 3)) {
          this.push(file)
        }
        count++;
      }

      // getting a bit wierd - unreadable
      s.on('finish', function() {
        expect(output.length).toBe(3);
        output.forEach(function(file, i) {
          expect(+file.contents).toBe((i + 1) * 3);
        })
        complete();
      });
    });

    it('could be used to emit multiple version of a vinyl file', function(complete) {
      var output = [];
      var s = producer(files)
        .pipe(use(function(file) {
          this.push(prepend(file, 'first:'));
          this.push(prepend(file, 'second:'));
          return file;
        }))
        .pipe(consumer(output));

      // creates a version of the file with
      // text prepended to file.contents,
      // doesn't mutate the original
      function prepend(file, text) {
        var file = file.clone();
        file.contents = new Buffer(text + String(file.contents));
        return file;
      }

      s.on('finish', function() {
        expect(output.length).toBe(30);
        complete();
      });
    });

    it('could be used to implement a vinyl `reducer`');
  });

  describe('#async()', function() {
    it('should throw given an invalid transform arg', function() {
      expect(function() {
        return use.async('string');
      }).toThrow();
    });

    it('should throw given an invalid flush arg', function() {
      expect(function() {
        return use.async(null, string);
      }).toThrow();
    });

    it('should return an instance of stream.Duplex', function() {
      var through = use.async();
      expect(through).toBeA(stream.Duplex);
      expect(through).toBeA(stream.Transform);
    });

    it('should return a noop stream when invoked with no args', function(complete) {
      var output = [];
      var file = new File({ contents: new Buffer('noop') });

      var s = producer([file])
        .pipe(use.async())
        .pipe(consumer(output));

      s.on('finish', function () {
        expect(String(output[0].contents)).toBe('noop');
        complete();
      });
    });

    it('should return a stream.Transform given a transform function', function(complete) {
      var output = [];

      var s = producer([new File({ contents: new Buffer('test') })])
        .pipe(use.async(function(file, next) {
          file.contents = new Buffer(String(file.contents) + ':append');
          next(null, file);
        }))
        .pipe(consumer(output));

      s.on('finish', function() {
        expect(String(output[0].contents)).toBe('test:append');
        complete();
      });
    });

    it('should return a stream.Transform given a flush function', function(complete) {
      var output = [];
      var s = producer()
        .pipe(use.async(null, function(done) {
          this.push(new File({ contents: new Buffer('flushed') }));
          done();
        }))
        .pipe(consumer(output));

      s.on('finish', function() {
        expect(String(output[0].contents)).toBe('flushed');
        complete();
      });
    });

    it('should return a stream.Transform given both transform and flush', function(complete) {
      var output = [];
      var s = producer([new File({ contents: new Buffer('test') })])
        .pipe(use.async(function(file, next) {
          file.contents = new Buffer('prepend:' + String(file.contents))
          next(null, file);
        },
        function(done) {
          this.push(new File({ contents: new Buffer('flushed') }));
          done();
        }))
        .pipe(consumer(output));

      s.on('finish', function() {
        expect(String(output[0].contents)).toBe('prepend:test');
        expect(String(output[1].contents)).toBe('flushed');
        complete();
      });
    })
  });
});
