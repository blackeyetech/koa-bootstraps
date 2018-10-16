"use strict";

const { Readable } = require("stream");

// Configuration settings
const CFG_FORMAT_PARAM = "format-param";
const CFG_ORDER_BY_PARAM = "order-by-param";
const CFG_ORDER_BY_DESC_PARAM = "order-by-desc-param";
const CFG_FIELDS_PARAM = "fields-param";
const CFG_MAX_ROWS_LIMIT = "max-rows-limit";

const CFG_FORMAT_PARAM_DEFAULT = "format";
const CFG_FIELDS_PARAM_DEFAULT = "fields";
const CFG_ORDER_BY_PARAM_DEFAULT = "order";
const CFG_ORDER_BY_DESC_PARAM_DEFAULT = "order-desc";
const CFG_MAX_ROWS_LIMIT_DEFAULT = 1000;

module.exports = http => {
  if (http === undefined) {
    throw new Error("Must pass http bap to bootstrap scripts!");
  }

  http.log.info("Initialising crud-basics bootstrap script ...");

  http.formatParam = http.getCfg(CFG_FORMAT_PARAM, CFG_FORMAT_PARAM_DEFAULT);
  http.log.info(`Format parameter set to (${http.formatParam})`);

  http.fieldsParam = http.getCfg(CFG_FIELDS_PARAM, CFG_FIELDS_PARAM_DEFAULT);
  http.log.info(`Fields parameter set to (${http.fieldsParam})`);

  http.orderByParam = http.getCfg(
    CFG_ORDER_BY_PARAM,
    CFG_ORDER_BY_PARAM_DEFAULT,
  );
  http.log.info(`Order by parameter set to (${http.orderByParam})`);

  http.orderByDescParam = http.getCfg(
    CFG_ORDER_BY_DESC_PARAM,
    CFG_ORDER_BY_DESC_PARAM_DEFAULT,
  );
  http.log.info(`Order by Desc parameter set to (${http.orderByDescParam})`);

  http.maxRowLimit = http.getCfg(
    CFG_MAX_ROWS_LIMIT,
    CFG_MAX_ROWS_LIMIT_DEFAULT,
  );
  http.log.info(`Max row limit to (${http.maxRowLimit})`);

  http.CONTENT_TYPE_JSON = "application/json";
  http.CONTENT_TYPE_XLSX =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  http.acceptContentTypes = [http.CONTENT_TYPE_JSON, http.CONTENT_TYPE_XLSX];

  http.getProps = function(data, pattern) {
    let found = {};

    for (let prop of Object.entries(pattern)) {
      let name = prop[0];
      let check = prop[1];
      let value = data[name] === undefined ? check.default : data[name];

      if ((value === undefined || value === "") && check.required) {
        let msg = `Missing required field '${name}'`;

        throw new this.UserError(msg);
      }

      if (check.allowed !== undefined) {
        if (Array.isArray(check.allowed)) {
          if (!check.allowed.includes(value)) {
            let msg = `'${name}' value '${value}' is not valid. `;
            msg += `Allowed values are [${check.allowed}]`;

            throw new this.UserError(msg);
          }
        } else {
          if (value !== check.allowed) {
            let msg = `'${name}' value '${value}' is not valid. `;
            msg += `Allowed value is '${check.allowed}'`;

            throw new this.UserError(msg);
          }
        }
      }

      if (value !== undefined) {
        found[name] = value;
      }
    }

    this.log.debug("found: %j", found);

    return found;
  };

  http.createRoute = function(router, path, cb) {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.log.info(`Adding POST route on ${router.opts.prefix}${path}`);

    router.post(path, async (ctx, next) => {
      let id = await cb(ctx.request.body, ctx.params);

      ctx.set("Location", `${ctx.origin}${ctx.url}/${id}`);
      ctx.status = 201;

      await next();
    });
  };

  http.readQueryStr = function(ctx) {
    let opts = {};

    opts.format = ctx.query[this.formatParam];

    if (opts.format !== undefined) {
      delete ctx.query[this.formatParam];
    }

    opts.orderBy = ctx.query[this.orderByParam];

    if (opts.orderBy !== undefined) {
      delete ctx.query[this.orderByParam];

      if (typeof opts.orderBy === "string") {
        opts.orderBy = opts.orderBy.split(",");
      }
    }

    opts.orderByDesc = ctx.query[this.orderByDescParam];

    if (opts.orderByDesc !== undefined) {
      delete ctx.query[this.orderByDescParam];

      if (typeof opts.orderByDesc === "string") {
        opts.orderByDesc = opts.orderByDesc.split(",");
      }
    }

    let fields = ctx.query[this.fieldsParam];

    if (fields !== undefined) {
      delete ctx.query[this.fieldsParam];

      if (typeof fields === "string") {
        fields = fields.split(",");
      }
    } else {
      fields = ["*"];
    }

    return { opts, fields };
  };

  http.sendChunkedArray = function(ctx, data) {
    return new Promise((resolve, reject) => {
      let body = new Readable();
      body._read = function() {};

      ctx.type = "application/json; charset=utf-8";
      ctx.body = body;

      body.push("[\n");

      let i = 0;
      let cb = async () => {
        while (i < data.length) {
          body.push(JSON.stringify(data[i]));
          if (i !== data.length - 1) {
            body.push(",\n");
          } else {
            body.push("\n");
          }

          i++;

          if (i % this.maxRowLimit === 0) {
            setImmediate(cb);
            return;
          }
        }

        body.push("]");
        body.push(null);
        resolve();
      };

      cb();
    });
  };

  http.readRoute = function(router, path, cb) {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.log.info(`Adding GET route on ${router.opts.prefix}${path}`);

    router.get(path, async (ctx, next) => {
      let { opts, fields } = this.readQueryStr(ctx);

      let accepts = ctx.accepts(this.acceptContentTypes);
      let data = await cb(
        fields,
        { ...ctx.query, ...ctx.params },
        opts,
        accepts,
      );

      switch (accepts) {
        case this.CONTENT_TYPE_XLSX:
          ctx.type = this.CONTENT_TYPE_XLSX;
          ctx.set("Content-Disposition", `attachment; filename=${data.name}`);

          ctx.status = 200;
          ctx.body = data.buffer;
          break;

        case this.CONTENT_TYPE_JSON:
          ctx.type = "application/json; charset=utf-8";

          if (Array.isArray(data) && data.length > 1) {
            ctx.set("Transfer-Encoding", "chunked");
            await this.sendChunkedArray(ctx, data);
          } else {
            ctx.status = 200;
            ctx.body = JSON.stringify(data[0]);
          }

          break;
        default:
          ctx.status = 406;
      }

      await next();
    });
  };

  http.updateRoute = function(router, path, cb) {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.log.info(`Adding PUT route on ${router.opts.prefix}${path}`);

    router.put(path, async (ctx, next) => {
      await cb(ctx.request.body, ctx.params);

      ctx.status = 200;

      await next();
    });
  };

  http.deleteRoute = function(router, path, cb) {
    path = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;

    this.log.info(`Adding DELETE route on ${router.opts.prefix}${path}`);

    router.delete(path, async (ctx, next) => {
      await cb(ctx.params);

      ctx.status = 200;

      await next();
    });
  };

  http.log.info("Finished initialising crud-basics bootstrap script");
};
