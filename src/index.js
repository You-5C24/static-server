const http = require("http");
const path = require("path");
const fs = require("fs");
const mime = require("mime-types");
const handlebars = require("handlebars");
const compare = require("natural-compare");
const zlib = require("zlib");
const compressible = require("compressible");
const accepts = require("accepts");

const defaultConf = require("./config");
const handleCache = require("./cache");

const htmlTpl = fs.readFileSync(path.join(__dirname, "./tpl/direcoty.hbs"));
const template = handlebars.compile(htmlTpl.toString());

class StaticServer {
  constructor(options = {}) {
    this.config = Object.assign(defaultConf, options);
  }

  start() {
    const { port, root } = this.config;

    this.server = http
      .createServer((req, res) => {
        const { url, method } = req;

        if (method !== "GET") {
          res.writeHead(404, {
            "content-type": "text/html;charset=utf8;",
          });
          res.end("请使用 GET 方法访问文件");
          return false;
        }

        const filePath = path.join(root, url);
        fs.access(filePath, fs.constants.R_OK, async (err) => {
          if (err) {
            res.writeHead(404, {
              "content-type": "text/html;charset=utf8",
            });
            res.end("文件不存在");
          } else {
            const stats = fs.statSync(filePath);
            const list = [];
            if (stats.isDirectory()) {
              // 如果是文件夹则遍历文件夹，生成改文件夹内的文件树
              const dir = fs.opendirSync(filePath);
              let dirent = dir.readSync();
              while (dirent) {
                list.push({
                  name: dirent.name,
                  path: path.join(url, dirent.name),
                  type: dirent.isDirectory() ? "folder" : "file",
                });

                dirent = dir.readSync();
              }
              dir.close();

              res.writeHead(200, {
                "content-type": "text/html;charset=utf8;",
              });

              // 对文件顺序重排，文件夹在文件前面，相同类型按字母排序，不区分大小写
              list.sort((x, y) => {
                if (x.type > y.type) {
                  // 'folder' > 'file'， 返回 -1，folder 在 file 之前
                  return -1;
                } else if (x.type == y.type) {
                  return compare(x.name.toLowerCase(), y.name.toLowerCase());
                } else {
                  return 1;
                }
              });

              // 使用 handlebars 模板引擎，生成目录页面 html
              const html = template({ list });
              res.end(html);
            } else {
              handleCache(req, res);

              const contentType = mime.contentType(path.extname(url));
              res.setHeader("Content-Type", `${contentType};charset:utf8`);

              let compression;
              // 判断模块是否需要压缩
              if (compressible(contentType)) {
                const encodings = accepts(req).encodings();
                console.log(encodings);
                const serverCompatibleCompressions = [
                  { method: "gzip", stream: zlib.createGzip() },
                  { method: "deflate", stream: zlib.createDeflate() },
                  { method: "br", stream: zlib.createBrotliCompress() },
                ];

                for (let i = 0; i < encodings.length; i++) {
                  compression = serverCompatibleCompressions.find(
                    (com) => com.method === encodings[i]
                  );
                  if (compression) {
                    break;
                  }
                }
              }

              if (res.statusCode !== 304) {
                if (compression) {
                  res.setHeader("Content-Encoding", compression.method);
                  fs.createReadStream(filePath)
                    .pipe(compression.stream)
                    .pipe(res);
                } else {
                  fs.createReadStream(filePath).pipe(res);
                }
              }
            }
          }
        });
      })
      .listen(port, () => {
        console.log(`Static server started at port ${port}`);
      });
  }

  stop() {
    this.server.close(() => {
      console.log(`Static server closed.`);
    });
  }
}

module.exports = StaticServer;
