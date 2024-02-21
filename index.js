const express = require("express");
const app = express();
const port = 3000;

const zlib = require("zlib");
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");

const router = express.Router();

const _ = require("lodash");
const brotli = require("zlib");
const accepts = require("accepts");
const mime = require("mime-types");
const basicAuth = require("basic-auth");
const requestIp = require("request-ip");

const uuid = require("./util/uuid");
const base64 = require("./util/base64");
const toInt = require("./util/toint");
const constants = require("./constants");
const Context = require("./context");

app.use((req, res, next) => {
  req.ctx = new Context(req, res);
  next();
});

// based off https://github.com/isayme/node-httpbin/blob/master/app/router/httpbin.js
router.get("/", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.html);
  res.sendFile("index.html", {
    root: "./public",
  });
});

router.get("/favicon.ico", (req, res) => {
  res.sendFile("favicon.ico", {
    root: "./public",
  });
});

router.get("/favicon.png", (req, res) => {
  res.sendFile("favicon.png", {
    root: "./public",
  });
});

router.get("/ip", function (req, res) {
  res.json({
    origin: requestIp.getClientIp(req),
  });
});

router.get("/uuid", function (req, res) {
  res.json({
    uuid: uuid(),
  });
});

router.get("/user-agent", function (req, res) {
  res.json({
    "user-agent": req.ctx.ua,
  });
});

router.get("/headers", function (req, res) {
  res.json({
    headers: req.ctx.headers,
  });
});

router.get("/get", function (req, res) {
  res.json({
    args: req.ctx.query,
    headers: req.ctx.headers,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.post("/post", function (req, res) {
  res.json({
    args: req.ctx.query,
    data: req.ctx.text,
    files: req.ctx.files,
    form: req.ctx.form,
    headers: req.ctx.headers,
    json: req.ctx.body,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.patch("/patch", function (req, res) {
  res.json({
    args: req.ctx.query,
    data: req.ctx.text,
    files: req.ctx.files,
    form: req.ctx.form,
    headers: req.ctx.headers,
    json: req.ctx.body,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.put("/put", function (req, res) {
  res.json({
    args: req.ctx.query,
    data: req.ctx.text,
    files: req.ctx.files,
    form: req.ctx.form,
    headers: req.ctx.headers,
    json: req.ctx.body,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.delete("/delete", function (req, res) {
  res.json({
    args: req.ctx.query,
    data: req.ctx.text,
    files: req.ctx.files,
    form: req.ctx.form,
    headers: req.ctx.headers,
    json: req.ctx.body,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.all("/anything/:anything?", function (req, res) {
  res.json({
    args: req.ctx.query,
    data: req.ctx.text,
    files: req.ctx.files,
    form: req.ctx.form,
    headers: req.ctx.headers,
    json: req.ctx.body,
    method: req.ctx.method,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.get("/base64/:encoded", (req, res) => {
  const encoded = req.params["encoded"];
  res.send(base64.decode(encoded));
});

router.get("/encoding/utf8", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, "text/html; charset=UTF-8");
  res.sendFile("UTF-8-demo.txt", {
    root: "./public",
  });
});

router.get("/gzip", (req, res, next) => {
  res.setHeader(constants.HTTPHeaderContentEncoding, "gzip");
  res.removeHeader(constants.HTTPHeaderContentLength);
  res.setHeader(constants.HTTPHeaderContentType, mime.types.json);

  zlib.gzip(
    JSON.stringify({
      gzipped: true,
      headers: req.ctx.headers,
      method: req.ctx.method,
      origin: req.ctx.ip,
    }),
    (err, result) => {
      if (err) {
        return next(err);
      }

      res.end(result);
    }
  );
});

router.get("/deflate", (req, res, next) => {
  res.setHeader(constants.HTTPHeaderContentEncoding, "deflate");
  res.removeHeader(constants.HTTPHeaderContentLength);
  res.setHeader(constants.HTTPHeaderContentType, mime.types.json);

  zlib.deflate(
    JSON.stringify({
      deflated: true,
      headers: req.ctx.headers,
      method: req.ctx.method,
      origin: req.ctx.ip,
    }),
    (err, result) => {
      if (err) {
        return next(err);
      }

      res.end(result);
    }
  );
});

router.get("/brotli", (req, res, next) => {
  res.setHeader(constants.HTTPHeaderContentEncoding, "br");
  res.removeHeader(constants.HTTPHeaderContentLength);
  res.setHeader(constants.HTTPHeaderContentType, mime.types.json);

  brotli.compress(
    Buffer.from(
      JSON.stringify({
        brotli: true,
        headers: req.ctx.headers,
        method: req.ctx.method,
        origin: req.ctx.ip,
      })
    ),
    (err, result) => {
      if (err) {
        return next(err);
      }

      res.end(result);
    }
  );
});

router.all("/status/:code", (req, res) => {
  const code = req.params["code"];

  const isValidCode = !!http.STATUS_CODES[code];
  if (!isValidCode) {
    return res.status(400).end(`invalid statuc code: ${code}`);
  }

  res.status(code).json({
    code,
    message: http.STATUS_CODES[code],
  });
});

router.all("/response-headers", (req, res) => {
  const query = req.ctx.query;

  for (let key in query) {
    let val = query[key];
    res.setHeader(key, `${val}`);
  }

  res.json(query);
});

router.get(["/redirect/:n", "/relative-redirect/:n", "/absolute-redirect/:n"], (req, res) => {
  const n = _.toInteger(req.params["n"]);

  if (!_.inRange(n, 1, 16)) {
    res.status(400).end("`n` should be a number in [1, 15]");
    return;
  }

  if (n > 1) {
    res.redirect(`/redirect/${n - 1}`);
  } else {
    res.redirect("/get");
  }
});

router.all("/redirect-to", (req, res) => {
  const query = req.ctx.query;

  const url = query.url;
  if (!url) {
    res.status(400).end("query `url` required");
    return;
  }

  let code = _.toInteger(query.status_code);
  // not exist
  if (code === 0) {
    code = 302;
  }

  if (!_.inRange(code, 300, 400)) {
    res.status(400).end("query `status_code` should be a number in [300, 400)");
    return;
  }

  res.redirect(code, url);
});

router.get("/cookies", (req, res) => {
  res.json({
    cookies: req.ctx.cookies,
  });
});

router.get("/cookies/set", (req, res) => {
  const query = req.ctx.query;

  for (let key in query) {
    res.cookie(key, `${query[key]}`);
  }

  res.redirect("/cookies");
});

router.get("/cookies/delete", (req, res) => {
  const query = req.ctx.query;

  for (let key in query) {
    res.clearCookie(key);
  }

  res.redirect("/cookies");
});

router.get("/image", (req, res) => {
  const accept = accepts(req);

  let acceptType = accept.type(["jpg", "jpeg", "webp", "svg", "png", "image/*"]);

  let file;
  switch (acceptType) {
    case "jpg":
    case "jpeg":
      file = "jackal.jpg";
      break;
    case "svg":
      file = "svg_logo.svg";
      break;
    case "webp":
      file = "wolf_1.webp";
      break;
    case "image/*":
      acceptType = "png"; // default to png
    // falls through
    case "png":
      file = "pig_icon.png";
      break;
    default:
      return res.status(406).end();
  }

  res.setHeader(constants.HTTPHeaderContentType, mime.types[acceptType]);
  res.sendFile(file, {
    root: "./public/images",
  });
});

router.get("/image64", (req, res) => {
  var imageAsBase64 = fs.readFileSync("./public/images/pig_icon.png", "base64");
  res.writeHead(200, {
    "Content-Type": "image/png",
    "Content-Length": imageAsBase64.length,
  });
  res.end(imageAsBase64);
});

router.get("/image/png", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.png);
  res.sendFile("pig_icon.png", {
    root: "./public/images",
  });
});

router.get("/image/jpeg", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.jpg);
  res.sendFile("jackal.jpg", {
    root: "./public/images",
  });
});

router.get("/image/webp", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.webp);
  res.sendFile("wolf_1.webp", {
    root: "./public/images",
  });
});

router.get("/image/svg", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.svg);
  res.sendFile("svg_logo.svg", {
    root: "./public/images",
  });
});

router.get("/xml", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.xml);
  res.sendFile("sample.xml", {
    root: "./public",
  });
});

router.get("/robots.txt", (res, req) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.txt);
  res.sendFile("robots.txt", {
    root: "./public",
  });
});

router.get("/deny", (req, res) => {
  const text = `
          .-''''''-.
        .' _      _ '.
       /   O      O   \\
      :                :
      |                |
      :       __       :
       \\  .-"\`  \`"-.  /
        '.          .'
          '-......-'
     YOU SHOULDN'T BE HERE
  `;
  res.setHeader(constants.HTTPHeaderContentType, mime.types.txt);
  res.end(text);
});

router.get("/html", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.html);
  res.sendFile("moby.html", {
    root: "./public",
  });
});

router.get("/links/:n/:offset?", (req, res) => {
  let n = _.toInteger(req.params["n"]);
  if (!_.inRange(n, 0, 200)) {
    n = 10;
  }

  let offset = req.params["offset"];
  if (_.isUndefined(offset)) {
    res.redirect(`/links/${n}/0`);
    return;
  }

  offset = _.toInteger(offset);

  var result = [];
  for (let i = 0; i < n; i++) {
    if (i === offset) {
      result.push(`${i}`);
    } else {
      result.push(`<a href='/links/${n}/${i}'>${i}</a>`);
    }
  }

  res.setHeader(constants.HTTPHeaderContentType, mime.types.html);
  res.end(
    ["<html><head><title>Links</title></head><body>", result.join(" "), "</body></html>"].join("")
  );
});

router.get("/etag/:etag", (req, res) => {
  const etag = req.params["etag"];

  const ifMatch = req.header(constants.HTTPHeaderIfMatch);
  if (ifMatch) {
    const matches = ifMatch.split(",");
    if (!matches.includes(etag) && !matches.includes("*")) {
      res.status(412).end();
      return;
    }
  }

  res.setHeader(constants.HTTPHeaderETag, etag);

  let status = 200;

  const ifNoneMatch = req.header(constants.HTTPHeaderIfNoneMatch);
  if (ifNoneMatch) {
    const matches = ifNoneMatch.split(",");
    if (matches.includes(etag) || matches.includes("*")) {
      status = 304;
    }
  }

  res.status(status).json({
    args: req.ctx.query,
    headers: req.ctx.headers,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.get("/cache", (req, res) => {
  const ifModifiedSince = req.header(constants.HTTPHeaderIfModifiedSince);
  const ifNoneMatch = req.header(constants.HTTPHeaderIfNoneMatch);

  if (ifModifiedSince || ifNoneMatch) {
    res.status(304).end();
    return;
  }

  const now = new Date();
  res.setHeader(constants.HTTPHeaderLastModified, now.toGMTString());
  res.setHeader(constants.HTTPHeaderETag, uuid());
  res.json({
    args: req.ctx.query,
    headers: req.ctx.headers,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.get("/cache/:value", (req, res) => {
  const value = req.params["value"];

  const cacheControl = `public, max-age=${_.toInteger(value)}`;
  res.setHeader(constants.HTTPHeaderCacheControl, cacheControl);
  res.json({
    args: req.ctx.query,
    headers: req.ctx.headers,
    origin: req.ctx.ip,
    url: req.ctx.url,
  });
});

router.get("/delay/:delay", (req, res) => {
  let delay = _.toInteger(req.params["delay"]);
  delay = _.min([delay, 10]);

  setTimeout(() => {
    res.json({
      args: req.ctx.query,
      data: req.ctx.text,
      files: req.ctx.files,
      form: req.ctx.form,
      headers: req.ctx.headers,
      json: req.ctx.body,
      origin: req.ctx.ip,
      url: req.ctx.url,
    });
  }, delay * 1000);
});

router.get("/stream/:n", (req, res) => {
  const n = toInt(req.params["n"], {
    min: 0,
    max: 100,
  });

  for (let i = 0; i < n; i++) {
    res.write(
      JSON.stringify({
        args: req.ctx.query,
        headers: req.ctx.headers,
        origin: req.ctx.ip,
        url: req.ctx.url,
      })
    );
    res.write("\n");
  }
  res.end();
});

router.get("/bytes/:n", (req, res) => {
  const n = toInt(req.params["n"], {
    min: 0,
    max: 100 * 1024, // set 100KB limit
  });

  res.setHeader(constants.HTTPHeaderContentType, mime.types.bin);
  res.end(crypto.randomBytes(n));
});

router.get("/stream-bytes/:n", (req, res) => {
  const n = toInt(req.params["n"], {
    min: 0,
    max: 100 * 1024, // set 100KB limit
  });

  res.setHeader(constants.HTTPHeaderContentType, mime.types.bin);

  const chunkSize = _.toInteger(req.ctx.query.chunk_size) || 10 * 1024;
  for (let i = 0; i < chunkSize; i++) {
    res.write(crypto.randomBytes(n));
  }
  res.end();
});

router.get("/basic-auth/:user/:passwd", (req, res) => {
  const user = req.params.user;
  const passwd = req.params.passwd;

  const credentials = basicAuth(req);

  if (!credentials || credentials.name !== user || credentials.pass !== passwd) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Fake Realm"');
    res.status(401).end();
  } else {
    res.json({
      user,
      authenticated: true,
    });
  }
});

router.get("/hidden-basic-auth/:user/:passwd", (req, res) => {
  const user = req.params.user;
  const passwd = req.params.passwd;

  const credentials = basicAuth(req);

  if (!credentials || credentials.name !== user || credentials.pass !== passwd) {
    res.status(404).end();
  } else {
    res.json({
      user,
      authenticated: true,
    });
  }
});

router.get("/forms/post", (req, res) => {
  res.setHeader(constants.HTTPHeaderContentType, mime.types.html);
  res.sendFile("forms-post.html", {
    root: "./public",
  });
});

app.use("/", router);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
