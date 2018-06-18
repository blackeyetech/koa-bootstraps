"use strict";

// Config consts
const CFG_STATUS_PATH = "status-path";
const CFG_HEALTH_CHECK_PATH = "health-check-path";

module.exports = (http) => {
  if (http === undefined) {
    throw new Error("Must pass http bap to bootstrap scripts!");
  }

  http.log.info("Initialising status bootstrap script ...");

  let status = http.getRequiredBap("status");
  let healthCheckPath = status.getCfg(CFG_HEALTH_CHECK_PATH);

  if (healthCheckPath !== undefined ) {
    status.log.info(`Using http-server (${http.name})`);
    let path = http.fullPath(healthCheckPath);
    status.log.info(`Adding route (${path}) for status health check`);

    http.app.use(async (ctx, next) => {      
      if (ctx.method === "GET" && ctx.request.path === path) {
        let { healthy } = await status.get();
        if (healthy) {
          ctx.status = 200;
        }
        else {
          ctx.status = 503;
        }
      } 

      await next();
    });
  }

  let statusPath = status.getCfg(CFG_STATUS_PATH);

  if (statusPath !== undefined) {
    status.log.info(`Using http-server (${http.name})`);
    let path = http.fullPath(statusPath);
    status.log.info(`Adding route (${path}) for status`);

    http.app.use(async (ctx, next) => {
      if (ctx.method === "GET" && ctx.request.path === path) {
        let { results } = await status.get();

        ctx.body = JSON.stringify(results);
        ctx.status = 200;
        ctx.response.set("Content-Type", "application/json; charset=utf-8");
      }
      
      await next();
    });
  }

  http.log.info("Finished initialising status bootstrap script");
}
