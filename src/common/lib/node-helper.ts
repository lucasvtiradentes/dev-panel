import { createHash } from 'node:crypto';
import { get } from 'node:https';
import { homedir, tmpdir } from 'node:os';

export class NodeOsHelper {
  static homedir = homedir;

  static tmpdir = tmpdir;
}

export class NodeCryptoHelper {
  static createHash = createHash;
}

export class NodeHttps {
  static get = get;
}
