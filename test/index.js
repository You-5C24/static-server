const StaticServer = require("../src/index");

const staticServer = new StaticServer({
  port: 9527,
  root: "H://workspace_5c24//static-server",
});

staticServer.start();
