var through = require('through2');
var File = require('vinyl');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;

// consts
// this name needs to be changed (and so does the overall scope of the plugin).
// it will be changed to gulp-asym-flow (what comes in does not go out - necessarily).
const PLUGIN_NAME = 'gulp-asym-flow';

// plugin function
module.exports = function(path, callback, initial) {
  if ('function' != typeof callback) {
    throw new PluginError(PLUGIN_NAME, 'Missing callback!');
  }

  // output object
  var output = initial || [];

  var stream = through.obj(function(file, enc, cb) {
    if(file.isStream() {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streams are not supported!'));
      return cb();
    });

    if (file.isBuffer() {
      callback(output, file)
    });
  }, function(file) {

    var contents = JSON.stringify(file.contents)
    var file = new File({

    });
    this.push(file);
    return cb();
  });
}
