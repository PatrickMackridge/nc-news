const apiRouter = require("express").Router();
const topicsRouter = require("./topics.router");
const usersRouter = require("./users.router");
const articlesRouter = require("./articles.router");
const commentsRouter = require("./comments.router");
const endpoints = require("../endpoints");
const { handle405s } = require("../errors/errors");

apiRouter
  .route("/")
  .get((req, res, next) => {
    res.send(endpoints);
  })
  .all(handle405s);

apiRouter.use("/topics", topicsRouter);

apiRouter.use("/users", usersRouter);

apiRouter.use("/articles", articlesRouter);

apiRouter.use("/comments", commentsRouter);

module.exports = apiRouter;
