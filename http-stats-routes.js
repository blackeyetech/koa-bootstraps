"use strict";

// Stats consts
const STAT_NUM_REQS = "num-reqs";
const STAT_NUM_400s = "num-400s";
const STAT_NUM_500s = "num-500s";

module.exports = (http) => {
  if (http === undefined) {
    throw new Error("Must pass http bap to bootstrap scripts!");
  }

  http.log.info("Initialising http-stats bootstrap script ...");

  http.stats.add(STAT_NUM_REQS);
  http.stats.add(STAT_NUM_400s);
  http.stats.add(STAT_NUM_500s);

  http.app.use(async (ctx, next) => {
    http.stats.increment(STAT_NUM_REQS);

    await next();

    http.stats.increment(ctx.status);

    if (ctx.status >= 400 && ctx.status < 500) {
      http.stats.increment(STAT_NUM_400s);
    }
    if (ctx.status >= 500 && ctx.status < 600) {
      http.stats.increment(STAT_NUM_500s);
    }
  });

  http.log.info("Finished initialising http-stats bootstrap script");
}


