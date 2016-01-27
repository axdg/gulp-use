var stream = require('readable-stream');
var PluginError = require('gulp-util').PluginError;

const PLUGIN_NAME = 'gulp-use'

/**
 * use a sync Vinyl transform function,
 * and optional sync flush function to
 * create a gulp plugin. Primarily
 * implemented to simplify error handling
 * in simple transforms
 *
 * @param {Function} transform
 * @param {Function} [flush]
 * @param {String} [name] - optional `PLUGIN_NAME` on catch.
 * @return {stream.Transform} - transform stream in object mode.
 */
function sync(transform, flush, name) {

  if(typeof flush === 'string') {
    name = flush;
    flush = null;
  }

  name = name || 'gulp-use';

  return new stream.Transform({
    objectMode: true,
    transform: transform ? function(chunk, encoding, next) {
      try {
        var file = transform ? transform.call(this, chunk) : chunk;
      } catch(err) {
        next(new PluginError(name, err));
      }
      if(file) this.push(file);
      next();
    } : noop,
    flush: flush ? function(done) {
      try {
        var file = flush.call(this);
      } catch(err) {
        done(new PluginError(name, this));
      }
      if(file) this.push(file);
      done();
    } : null
  })
}

/**
 * use an async Vinyl transform function,
 * and optional async flush function to
 * create a gulp plugin.
 *
 * @param {Function} transform
 * @param {Function} [flush]
 * @return {stream.Transform} - transform stream in object mode.
 */
function async(transform, flush) {

  if (transform && 'function' !== typeof transform) {
    throw new PluginError(PLUGIN_NAME, 'transform must be a function');
  }

  if (flush && 'function' !== typeof flush) {
    throw new PluginError(PLUGIN_NAME, 'flush must be a function');
  }

  return new stream.Transform({
    objectMode: true,
    transform: transform ? function(chunk, encoding, next) {
      transform.call(this, chunk, next);
    } : noop,
    flush: flush ? function(done) {
      flush.call(this, done)
    } : null
  });
}

/**
 * Used where no tranform is provided.
 *
 * @api Private
 */
function noop(chunk, encoding, next) {
  next(null, chunk);
}

module.exports = sync;
module.exports.async = async;
