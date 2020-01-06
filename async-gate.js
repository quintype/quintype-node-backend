// Returns an async gate. If two functions try to execute with the same key,
// then they all resolve to the results of the first one.
function asyncGate() {
  const pendingPromises = {};

  return async function execute(key, f) {
    if(pendingPromises[key]) {
      return await pendingPromises[key];
    }

    pendingPromises[key] = f();

    try {
      return await pendingPromises[key];
    } finally {
      delete pendingPromises[key];
    }
  }
}

exports.asyncGate = asyncGate;