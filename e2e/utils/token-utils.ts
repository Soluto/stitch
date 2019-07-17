import axios from 'axios';
import * as querystring from 'querystring';

const getToken = async (): Promise<string> => {

    const params = {
        grant_type: 'client_credentials',
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        scope: process.env.AGOGOS_SCOPE,
    };

    const tokenResponse = await axios.post(process.env.TOKEN_ENDPOINT, querystring.stringify(params));

    return tokenResponse.data.access_token;
};

export { getToken };