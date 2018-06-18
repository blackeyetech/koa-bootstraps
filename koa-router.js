"use strict";

const KoaRouter = require("koa-router");

module.exports = (http) => {
  if (http === undefined) {
    throw new Error("Must pass http bap to bootstrap scripts!");
  }

  http.router = function (base) {
    base = this.fullPath(base);

    this.log.info(`Adding all routes to ${base}`);

    return new KoaRouter({ 
      prefix: base 
    });
  };

  http.use = function (router) {
    this.app.use(router.routes());
  }
}
