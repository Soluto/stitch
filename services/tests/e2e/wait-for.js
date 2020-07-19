const waitOn = require('wait-on');

async function waitForIt(resources, reverse = false, timeout = 10000) {
  await waitOn({
    resources,
    timeout,
    reverse,
    interval: 100,
    simultaneous: 1,
  });
}

const serviceUrls = [
  'http-get://localhost:8080/.well-known/apollo/server-health',
  'http-get://localhost:8090/.well-known/apollo/server-health',
];

module.exports.start = waitForIt.bind(undefined, serviceUrls, false);
module.exports.stop = waitForIt.bind(undefined, serviceUrls, true);
