const http = requrie("http");
const path = require("path");

const compose = require("./utils/compose");
const defaultConf = require("./config");

// middleware
const error = require("./middleware/error");
const serve = require("./middleware/serve");
const compress = require("./middleware/compress");
const cache = require("./middleware/cache");

class StaticServer {
  constructor(options = {}) {
    this.config = Object.assign(defaultConf, options);
  }

  start() {
    const { port, root } = this.config;
    this.server = http
      .createServer((req, res) => {
        const { url } = req;

        // 准备中间件执行环境
        const ctx = {
          req,
          res,
          filePath: path.join(root, url),
          confg: this.confg,
        };

        // 按顺序调用中间件
        compose([error, serve, compress, cache])(ctx);
      })
      .listen(port, () => {
        console.log(`Static serve started at port ${port}`);
      });
  }

  stop() {
    this.server.close(() => {
      console.log(`Static server closed.`);
    });
  }
}

module.exports = StaticServer;
