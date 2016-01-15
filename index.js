var stream = require('readable-stream');
var PluginError = require('gulp-util').PluginError;

const PLUGIN_NAME = 'gulp-use';

/**
 * use an async Vinyl transform function,
 * and optional async flush function to
 * create a gulp plugin.
 *
 * @param {String} [name] - not implemented..
 * @param {Function} transform
 * @param {Function} [flush]
 * @return {stream.Transform}
 */
function use(/**name,*/ transform, flush) {
  return new stream.Transform({
    objectMode: true,
    transform: function(chunk, encoding, next) {
      transform.call(this, chunk, next);
    },
    flush: function(done) {
      if(!flush) return done();
      flush.call(this, done)
    }
  });
}

/**
 * use a sync Vinyl transform function,
 * and optional sync flush function to
 * create a gulp plugin. Primarily
 * implemented to simply error handling
 * for very simple transforms.
 *
 * @param {String} [name] - not implemented..
 * @param {Function} transform
 * @param {Function} [flush]
 * @return {stream.Transform}
 */
function sync(/**name,*/ transform, flush) {
  return new stream.Transform({
    objectMode: true,
    transform: function(chunk, encoding, next) {
      try {
        var file = transform.call(this, chunk);
      } catch(err) {
        next(new PluginError(name, err));
      }
      if(file) this.push(file);
      next();
    },
    flush: function(done) {
      if(!flush) return done();
      try {
        var file = flush.call(this);
      } catch(err) {
        done(new PluginError(name, this));
      }
      if(file) this.push(file);
      done();
    }
  })
}

module.exports = use;
module.exports.sync = sync;
