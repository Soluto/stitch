import * as fs from 'fs/promises';
import {certDir } from '../config';
import logger from '../__mocks__/logger';

export default function applyCertificates() {
  logger.info('Loading certificate');
  
  fs.readdir(certDir, (err: any, files: any[]) => {
    files.forEach((file: any) => {
      logger.info('certificate: ', file);
    });
  });

  process.env.NODE_EXTRA_CA_CERTS = certDir;

  logger.info('update NODE_EXTRA_CA_CERTS' ,process.env.NODE_EXTRA_CA_CERTS );
}
