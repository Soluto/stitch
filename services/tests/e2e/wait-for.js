const fetch = require('node-fetch');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForIt(url, timeoutMs = 10000) {
  let timedOut = false;
  setTimeout(() => (timedOut = true), timeoutMs);

  while (!timedOut) {
    try {
      if ((await fetch(url)).ok) {
        return true;
      }
    } catch {}
    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForItToDie(url, timeoutMs = 10000) {
  let timedOut = false;
  setTimeout(() => (timedOut = true), timeoutMs);

  while (!timedOut) {
    try {
      await fetch(url);
    } catch {
      return true;
    }
    await sleep(100);
  }

  throw new Error(`Timed out waiting for ${url} to die`);
}

module.exports.start = waitForIt;
module.exports.gatewayStart = waitForIt.bind(null, 'http://localhost:8080/.well-known/apollo/server-health');
module.exports.registryStart = waitForIt.bind(null, 'http://localhost:8090/.well-known/apollo/server-health');

module.exports.stop = waitForItToDie;
module.exports.gatewayStop = waitForItToDie.bind(null, 'http://localhost:8080/.well-known/apollo/server-health');
module.exports.registryStop = waitForItToDie.bind(null, 'http://localhost:8090/.well-known/apollo/server-health');
