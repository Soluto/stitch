import waitOn = require('wait-on');
import { URL } from 'url';

before('waiting for graphql server', async function () {
    const timeout = Number(process.env.TIMEOUT);
    this.timeout(timeout);
    const { hostname: gtwHostName, port: gtwPort, protocol: gtwProtocol } = new URL(process.env.GRAPHQL_SERVER_URL);
    await waitFor(gtwHostName, gtwPort, gtwProtocol, timeout);

    const { hostname: tknHostname, port: tknPort, protocol: tknProtocol } = new URL(process.env.TOKEN_ENDPOINT);
    await waitFor(tknHostname, tknPort, tknProtocol, timeout);
});

const getImplicitPort = protocol => {
    switch (protocol) {
        case 'http:':
            return 80;
        case 'https:':
            return 443;
        default:
    }
};

const waitFor = async (hostname: string, port: string, protocol: string, timeout: number): Promise<void> => {
    const explicitPort = port || getImplicitPort(protocol);
    await waitOn({
        log: true,
        verbose: true,
        resources: [
            `tcp:${hostname}:${explicitPort}`,
        ],
        delay: 1000,
        interval: 100,
        timeout,
        window: 1000,
    });
}