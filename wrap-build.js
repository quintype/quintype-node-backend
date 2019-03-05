function wrapBuildFunction (clazz, upstream) {
  clazz.build = function() {
    if(!arguments[0])
      return null;

    return new Proxy(new clazz(...arguments), {
      get: function(target, key) {
        if(key in target)
          return target[key];
        if(key in target[upstream])
          return target[upstream][key];
      }
    });
  }
}

module.exports = {
  wrapBuildFunction
}