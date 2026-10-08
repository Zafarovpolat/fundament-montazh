"use strict";

const source = process.env.TEST_URL || "http://127.0.0.1:5173";
const sourceUrl = new URL(source);
const origin = sourceUrl.origin;

function routeUrl(path) {
  return new URL(path.replace(/^\/+/, ""), `${origin}/`).href;
}

module.exports = {
  homeUrl: routeUrl("/"),
  foundationUrl:
    process.env.FOUNDATION_URL || routeUrl("/foundation.html"),
  routeUrl,
};
