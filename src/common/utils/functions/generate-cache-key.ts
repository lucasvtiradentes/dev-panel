import { NodeCryptoHelper } from '../helpers/node-helper';

export const generateHashForFileContent = (content: string) =>
  NodeCryptoHelper.createHash('sha1').update(content).digest('hex');
