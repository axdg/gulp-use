var through = require('through2');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var File = require('vinyl');

const PLUGIN_NAME = 'gulp-use';

// exported plugin
module.exports.sync = function(fn) {
  if ('function' != typeof fn) {
    throw new PluginError(PLUGIN_NAME, 'A single function argument is required!');
  }

  return through.obj(function(file, enc, cb) {
    try {
      var ret = fn(file);
    } catch(err) {
      throw new PluginError(PLUGIN_NAME, err);
    }

    if(ret) {
      if(Array.isArray(ret)) {
        var len = res.length;
        for(var i = 0; i < len; i++) {
          if(!File.isVinyl(ret[i])) {
            this.emit(new PluginError(PLUGIN_NAME, 'A Vinyl, or an array of Vinyls must be returned!'))
          }
          ret.forEach(Array.prototype.push.bind(this));
        }
      } else {
        if(!File.isVinyl(ret)) {
          this.emit(new PluginError(PLUGIN_NAME, 'A Vinyl, or an array of Vinyls must be returned!'))
        }
      }
      return cb();
    }

    if(ret == undefined) {
      this.push(file);
    }

    cb();
  });
}

// Use an asyncronous function (return a promise or an array of promises))
module.exports.async = function(fn) {
  if('function' != typeof fn) {
    throw new PluginError(PLUGIN_NAME, 'A single function argument is required!');
  }

  return through.obj(function(file, enc, cb) {
    var ret = fn(file)

    var self = this

    if(!Array.isArray(ret)) {
      ret = [ret]
    }

    Promise.all(ret).then(function(files) {
      var len = ret.length
      for(var i = 0; i < len; i++) {
        if(!File.isVinyl(files[i])) {
          self.emit('error', new PluginError(PLUGIN_NAME, 'Promises must resolve vinyl files!'))
          return cb()
        }
      }
      files.forEach(function(file) {
        self.push(file)
      })
      cb()
    }, function(reason) {
      self.emit('error', new PluginError(PLUGIN_NAME, reason))
      cb()
    })
    return
  })
}
