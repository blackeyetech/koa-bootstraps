"use strict";

// Config consts
const CFG_STATS_PATH = "stats-path";

module.exports = (http) => {
  if (http === undefined) {
    throw new Error("Must pass http bap to bootstrap scripts!");
  }

  http.log.info("Initialising stats bootstrap script ...");

  let stats = http.getRequiredBap("stats");
  let statsPath = stats.getCfg(CFG_STATS_PATH);

  if (statsPath !== undefined) {
    stats.log.info(`Using http-server (${http.name})`);

    let path = http.fullPath(statsPath);
    stats.log.info(`Adding route (${path}) for stats`);

    http.app.use(async (ctx, next) => {
      if (ctx.method === "GET" && ctx.request.path === path) {
        let data = stats.get();
        let response = {
            interval: stats.interval,
            stats: data
          };
          
        ctx.body = JSON.stringify(response);
        ctx.status = 200;
        ctx.response.set("Content-Type",  "application/json; charset=utf-8");
      }
      
      await next();        
    });
  }

  http.log.info("Finished initialising stats bootstrap script");
}
