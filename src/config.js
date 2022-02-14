module.exports = {
  port: 9527,
  root: "H://workspace_5c24//static-server", // 默认使用启动 node 的目录作为根目录
  maxAge: 60 * 1000, // 本地缓存时间，默认 60s
  enableEtag: true,
  enableLastModified: true,
};
