"use strict";

const { Readable } = require("stream");

module.exports = (http) => {
  if (http === undefined) {
    throw new Error("Must pass http bap to bootstrap scripts!");
  }

  http.log.info("Initialising helper-basics bootstrap script ...");

  http.actionRoute = function (router, path, action, cb, id) {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    if (id !== undefined) {
      path = `${path}/:${id}/${action}`;
    } else {
      path = `${path}/${action}`;      
    }

    this.log.info(`Adding POST action route on ${router.opts.prefix}${path}`);

    router.post(path, async (ctx, next) => {
      let response = await cb(ctx.request.body, ctx.params[id]);

      this.log.debug("%j", response);
      ctx.status = 200;
      ctx.type = "application/json; charset=utf-8";
      ctx.body = JSON.stringify(response);

      await next();
    });
  };

  http.uploadSingleFile = function (router, path, fieldName, cb, maxFileSize, dest) {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    maxFileSize = maxFileSize === undefined ? 1024*1024*4 : maxFileSize;
    dest = dest === undefined ? "/tmp" : dest;

    this.log.info(
      `Adding single file upload on route ${router.opts.prefix}${path}`);

    let multer = this.multer(
      { dest: dest, limits: { fileSize: maxFileSize }});

    router.post(path, async (ctx, next) => {
      await multer.single(fieldName)(ctx);
      let response = await cb(ctx.req.file.path);

      ctx.status = 200;

      if (response !== undefined) {
        ctx.type = "application/json; charset=utf-8";
        ctx.body = JSON.stringify(response); 
      }

      await next();
    });
  };

  http.staticRoute = function (router, path, response) {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.log.info(`Adding static GET route on ${router.opts.prefix}${path}`);

    router.get(path, async (ctx, next) => {
      ctx.status = 200;
      ctx.type = "application/json; charset=utf-8";
      ctx.body = JSON.stringify(response);
      await next();
    });
  }

  http.log.info("Finished initialising helper-basics bootstrap script");

}
