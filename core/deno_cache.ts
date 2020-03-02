import * as path from "path";
import { URL } from "url";

import { getDenoDepsDir } from "./deno";
import { HashMeta } from "./hash_meta";
import { pathExistsSync, isHttpURL, hashURL } from "./util";
import { Logger } from "./logger";

export interface DenoCacheModule {
  filepath: string;
  url: URL;
  resolveModule(moduleName: string): DenoCacheModule | void;
}

export class CacheModule implements DenoCacheModule {
  static create(filepath: string, logger?: Logger): DenoCacheModule | void {
    const DENO_DEPS_DIR = getDenoDepsDir();
    // if not a Deno deps module
    if (filepath.indexOf(DENO_DEPS_DIR) !== 0) {
      return;
    }

    const hash = path.basename(filepath);
    const originDir = path.dirname(filepath);
    const metaFilepath = path.join(originDir, `${hash}.metadata.json`);

    const meta = HashMeta.create(metaFilepath);

    if (!meta) {
      return;
    }

    return new CacheModule(filepath, meta.url, logger);
  }

  constructor(
    public filepath: string,
    public url: URL,
    private logger?: Logger
  ) {}
  /**
   * Resolve module in this cache file
   * @param moduleName The module name is for unix style
   */
  resolveModule(moduleName: string): DenoCacheModule | void {
    // eg. import "/npm:tough-cookie@3?dew"
    if (moduleName.indexOf("/") === 0) {
      const url = new URL(this.url.href);
      url.pathname = moduleName;

      const hash = hashURL(url);

      const moduleCacheFilepath = path.join(path.dirname(this.filepath), hash);

      if (!pathExistsSync(moduleCacheFilepath)) {
        return;
      }

      const moduleMetaFilepath = path.join(
        moduleCacheFilepath + ".metadata.json"
      );

      const meta = HashMeta.create(moduleMetaFilepath);

      if (!meta) {
        return;
      }

      return CacheModule.create(moduleCacheFilepath);
    }
    // eg. import "./sub/mod.ts"
    else if (moduleName.indexOf(".") === 0) {
      const targetUrlPath = path.posix.resolve(
        path.posix.dirname(this.url.pathname),
        moduleName
      );

      const url = new URL(this.url.href);
      url.pathname = targetUrlPath;

      const hash = hashURL(url);

      const targetFilepath = path.join(path.dirname(this.filepath), hash);

      return CacheModule.create(targetFilepath);
    }
    // eg import "https://example.com/demo/mod.ts"
    else if (isHttpURL(moduleName)) {
      let url: URL;
      try {
        url = new URL(moduleName);
      } catch {
        return;
      }

      const hash = hashURL(url);

      const targetOriginDir = path.join(
        getDenoDepsDir(),
        url.protocol.replace(/:$/, ""), // https: -> https
        url.hostname
      );

      const hashMeta = HashMeta.create(
        path.join(targetOriginDir, `${hash}.metadata.json`)
      );

      if (!hashMeta) {
        return;
      }

      return CacheModule.create(path.join(targetOriginDir, hash));
    }
  }
}
