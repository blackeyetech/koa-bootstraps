"use strict";

const koaPinoLogger = require("koa-pino-logger");
const koaHelmet = require("koa-helmet");
const koaBodyparser = require("koa-bodyparser");
const koaMulter = require("koa-multer");

module.exports = (http) => {
  if (http === undefined) {
    throw new Error("Must pass http bap to bootstrap scripts!");
  }

  http.app.use(koaHelmet());
  http.app.use(koaBodyparser());
  http.app.use(koaPinoLogger({name: http.name}));

  http.multer = koaMulter;
}
