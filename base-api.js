class BaseAPI {
  static build() {
    if(!arguments[0]) {
      return null;
    }

    return new Proxy(new this.prototype.constructor(...arguments), {
      get: (target, key) => {
        if(key in target)
          return target[key];
        if(key in target[this.upstream])
          return target[this.upstream][key];
      }
    });
  }
}

module.exports = {
  BaseAPI
}