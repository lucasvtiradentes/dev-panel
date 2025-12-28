import { NodeHttps } from '../helpers/node-helper';

export function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    NodeHttps.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}
