import anonymousAuthStrategy from './anonymous';
import apiKeyAuthStrategy from './api-key';
import jwtAuthStrategy from './jwt';

export default [anonymousAuthStrategy, apiKeyAuthStrategy, jwtAuthStrategy];
