process.env.NODE_ENV = "test";
const request = require("supertest");
const chai = require("chai");
const chaiSorted = require("sams-chai-sorted");
const { expect } = chai;
const endpoints = require("../endpoints");

chai.use(chaiSorted);

const connection = require("../db/connection");
const app = require("../app");

after(() => connection.destroy());
beforeEach(() => {
  return connection.seed.run();
});
describe("/api", () => {
  it("GET 200 - responds with a json object of all available endpoints for this api", () => {
    return request(app)
      .get("/api")
      .expect(200)
      .then(res => {
        expect(res.body).to.be.an("Object");
        expect(res.body).to.eql(endpoints);
      });
  });
  it("DELETE 405 - Throws a method not allowed error when sent a delete request to the /api endpoint", () => {
    return request(app)
      .delete("/api")
      .expect(405)
      .then(err => {
        expect(err.body).to.eql({ status: 405, msg: "Method not allowed" });
      });
  });
  describe("/topics", () => {
    it("GET 200 - responds with an object that contains an array of all topic objects with slug and description", () => {
      return request(app)
        .get("/api/topics")
        .expect(200)
        .then(res => {
          expect(res.body.topics).to.be.an("Array");
          res.body.topics.forEach(topic => {
            expect(topic).to.contain.keys("description", "slug");
          });
        });
    });
    it("PATCH 405 - responds with a method not allowed error when sent a patch request not supported by the topics endpoint", () => {
      return request(app)
        .patch("/api/topics")
        .send({
          description: "Not cats",
          slug: "dogs"
        })
        .expect(405)
        .then(err => {
          expect(err.body).to.eql({ status: 405, msg: "Method not allowed" });
        });
    });
  });
  describe("/users", () => {
    describe("/:username", () => {
      it("GET 200 - responds with the user object corresponding to the given username", () => {
        return request(app)
          .get("/api/users/butter_bridge")
          .expect(200)
          .then(res => {
            expect(res.body.user).to.be.an("Object");
            expect(res.body.user).to.contain.keys(
              "username",
              "avatar_url",
              "name"
            );
          });
      });
      it("GET 404 - responds with an error when given a non-existent username", () => {
        return request(app)
          .get("/api/users/not-a-yuser")
          .expect(404)
          .then(res => {
            expect(res.body).to.eql({
              msg: "This user does not exist",
              status: 404
            });
          });
      });
      it("PUT 405 - responds with a method not allowed error when sent a put request to a username that already exists", () => {
        return request(app)
          .put("/api/users/butter_bridge")
          .send({
            username: "This id is mine now!",
            name: "Cuckoo"
          })
          .expect(405)
          .then(err => {
            expect(err.body).to.eql({ status: 405, msg: "Method not allowed" });
          });
      });
    });
  });
  describe("/articles", () => {
    it("GET 200 - returns an array of all articles, defaulting to sorted by most recent first", () => {
      return request(app)
        .get("/api/articles")
        .expect(200)
        .then(res => {
          expect(res.body.articles).to.be.an("Array");
          res.body.articles.forEach(article => {
            if (article.article_id === 1) {
              expect(article.comment_count).to.equal("13");
            }
            expect(article).to.have.all.keys([
              "author",
              "title",
              "article_id",
              "topic",
              "created_at",
              "votes",
              "comment_count"
            ]);
          });
          expect(res.body.articles).to.be.sortedBy("created_at", {
            descending: true
          });
        });
    });
    it("GET 200 - returns an array of all articles, sorted and ordered by the specified queries", () => {
      return request(app)
        .get("/api/articles?sort_by=article_id&&order=asc")
        .expect(200)
        .then(res => {
          expect(res.body.articles).to.be.sortedBy("article_id", {
            descending: false
          });
        });
    });
    it("GET 200 - returns an array of all articles, filtered by the author specified in the given query", () => {
      return request(app)
        .get("/api/articles?author=butter_bridge")
        .expect(200)
        .then(res => {
          res.body.articles.forEach(article => {
            expect(article.author).to.equal("butter_bridge");
          });
        });
    });
    it("GET 200 - returns an array of all articles, filtered by the topic specified in the given query", () => {
      return request(app)
        .get("/api/articles?topic=mitch")
        .expect(200)
        .then(res => {
          res.body.articles.forEach(article => {
            expect(article.topic).to.equal("mitch");
          });
        });
    });
    it("GET 200 - returns an empty array when given a user that has no associated articles", () => {
      return request(app)
        .get("/api/articles?author=lurker")
        .expect(200)
        .then(res => {
          expect(res.body).to.eql({ articles: [] });
        });
    });
    it("GET 200 - returns an empty array when given a topic that has no associated articles", () => {
      return request(app)
        .get("/api/articles?topic=paper")
        .expect(200)
        .then(res => {
          expect(res.body).to.eql({ articles: [] });
        });
    });
    it("GET 400 - throws an error when passed an invalid sort query", () => {
      return request(app)
        .get("/api/articles?sort_by=NoColumnHere")
        .expect(400)
        .then(res => {
          expect(res.body).to.eql({
            status: 400,
            msg: "Invalid input data"
          });
        });
    });
    it("GET 404 - throws an error when passed an author that doesn't exist", () => {
      return request(app)
        .get("/api/articles?author=CharlesDickens")
        .expect(404)
        .then(res => {
          expect(res.body).to.eql({
            status: 404,
            msg: "User does not exist"
          });
        });
    });
    it("GET 404 - throws an error when passed a topic that doesn't exist", () => {
      return request(app)
        .get("/api/articles?topic=howToJavaScript")
        .expect(404)
        .then(res => {
          expect(res.body).to.eql({
            status: 404,
            msg: "Topic does not exist"
          });
        });
    });
    it("PATCH 405 - responds with a method not allowed error when sent a patch request not supported by the articles endpoint", () => {
      return request(app)
        .patch("/api/articles")
        .send({
          author: "Me",
          inc_votes: 10000
        })
        .expect(405)
        .then(err => {
          expect(err.body).to.eql({
            status: 405,
            msg: "Method not allowed"
          });
        });
    });
    describe("/:article_id", () => {
      it("GET 200 - responds with the article object corresponding to the given article_id with added comment count", () => {
        return request(app)
          .get("/api/articles/1")
          .expect(200)
          .then(res => {
            expect(res.body.article).to.be.an("Object");
            expect(res.body.article).to.contain.keys(
              "author",
              "title",
              "article_id",
              "body",
              "topic",
              "created_at",
              "votes",
              "comment_count"
            );
          });
      });
      it("GET 404 - responds with an error when given a non-existent article id", () => {
        return request(app)
          .get("/api/articles/999")
          .expect(404)
          .then(res => {
            expect(res.body).to.eql({
              msg: "Article not found",
              status: 404
            });
          });
      });
      it("GET 400 - responds with an error when given an invalid article id", () => {
        return request(app)
          .get("/api/articles/gimme-an-article")
          .expect(400)
          .then(res => {
            expect(res.body).to.eql({
              status: 400,
              msg: "Invalid input data"
            });
          });
      });
      it("PATCH 200 - updates specified article's votes by the amount given", () => {
        return request(app)
          .patch("/api/articles/1")
          .send({ inc_votes: 1 })
          .expect(200)
          .then(res => {
            expect(res.body.article).to.have.all.keys([
              "article_id",
              "title",
              "body",
              "votes",
              "topic",
              "author",
              "created_at",
              "comment_count"
            ]);
            expect(res.body.article.votes).to.equal(101);
          });
      });
      it("PATCH 200 - update of votes works with minus numbers", () => {
        return request(app)
          .patch("/api/articles/1")
          .send({ inc_votes: -200 })
          .expect(200)
          .then(res => {
            expect(res.body.article).to.have.all.keys([
              "article_id",
              "title",
              "body",
              "votes",
              "topic",
              "author",
              "created_at",
              "comment_count"
            ]);
            expect(res.body.article.votes).to.equal(-100);
          });
      });
      it("PATCH 400 - throws an error when given an invalid article id", () => {
        return request(app)
          .patch("/api/articles/no-article-here")
          .send({ inc_votes: 10 })
          .expect(400)
          .then(res => {
            expect(res.body).to.eql({
              status: 400,
              msg: "Invalid input data"
            });
          });
      });
      it("PATCH 404 - throws an error when given an article id that doesn't exist", () => {
        return request(app)
          .patch("/api/articles/999")
          .send({ inc_votes: 10 })
          .expect(404)
          .then(res => {
            expect(res.body).to.eql({
              msg: "Article not found",
              status: 404
            });
          });
      });
      it("PATCH 400 - throws an error when inc_votes is set to an invalid value", () => {
        return request(app)
          .patch("/api/articles/1")
          .send({ inc_votes: "LOADS OF VOTES!" })
          .expect(400)
          .then(res => {
            expect(res.body).to.eql({ status: 400, msg: "Invalid input data" });
          });
      });
      it("PATCH 400 - throws an error when trying to update a value other than inc_votes", () => {
        return request(app)
          .patch("/api/articles/1")
          .send({ username: "newUser" })
          .expect(400)
          .then(res => {
            expect(res.body).to.eql({ status: 400, msg: "Invalid input data" });
          });
      });
      it("PUT 405 - throws throws a method not allowed error when trying to put a new article at an address where one already exists", () => {
        return request(app)
          .put("/api/articles/1")
          .send({ newArticle: "New Article HERE" })
          .expect(405)
          .then(err => {
            expect(err.body).to.eql({
              status: 405,
              msg: "Method not allowed"
            });
          });
      });
      describe("/comments", () => {
        it("POST 201 - posts a new comment to the article specified by the article_id parameter", () => {
          return request(app)
            .post("/api/articles/1/comments")
            .send({
              username: "butter_bridge",
              body: "This article changed my life - FOR THE WORSE!!!"
            })
            .expect(201)
            .then(res => {
              expect(res.body.comment).to.have.all.keys([
                "article_id",
                "author",
                "body",
                "comment_id",
                "created_at",
                "votes"
              ]);
            });
        });
        it("POST 400 - throws an error when given an invalid article id", () => {
          return request(app)
            .post("/api/articles/articleNumber5/comments")
            .send({
              username: "butter_bridge",
              body: "This article changed my life - FOR THE WORSE!!!"
            })
            .expect(400)
            .then(res => {
              expect(res.body).to.eql({
                status: 400,
                msg: "Invalid input data"
              });
            });
        });
        it("POST 422 - throws an un-processable entity error when given a non-existent article id", () => {
          return request(app)
            .post("/api/articles/999/comments")
            .send({
              username: "butter_bridge",
              body: "This article changed my life - FOR THE WORSE!!!"
            })
            .expect(422)
            .then(res => {
              expect(res.body).to.eql({
                status: 422,
                msg: "Un-processable entity"
              });
            });
        });
        it("POST 422 - throws an error when given a non-existent username", () => {
          return request(app)
            .post("/api/articles/1/comments")
            .send({
              username: "U.Z.A",
              body: "This article changed my life - FOR THE WORSE!!!"
            })
            .expect(422)
            .then(res => {
              expect(res.body).to.eql({
                status: 422,
                msg: "Un-processable entity"
              });
            });
        });
        it("POST 400 - throws an error when given an invalid key", () => {
          return request(app)
            .post("/api/articles/1/comments")
            .send({
              username: "butter_bridge",
              whatTheCommentSays:
                "This article changed my life - FOR THE WORSE!!!"
            })
            .expect(400)
            .then(res => {
              expect(res.body).to.eql({
                status: 400,
                msg: "Invalid input data"
              });
            });
        });
        it("PUT 405 - throws throws a method not allowed error when trying to put a new comment at a specific article", () => {
          return request(app)
            .put("/api/articles/1/comments")
            .send({ newComment: "I AM ANGRY1!!!" })
            .expect(405)
            .then(err => {
              expect(err.body).to.eql({
                status: 405,
                msg: "Method not allowed"
              });
            });
        });
        it("GET 200 - returns an array of all comments of the given article_id, sorted by most recent first by default", () => {
          return request(app)
            .get("/api/articles/1/comments")
            .expect(200)
            .then(res => {
              expect(res.body.comments).to.be.an("Array");
              res.body.comments.forEach(comment => {
                expect(comment).to.have.all.keys([
                  "article_id",
                  "comment_id",
                  "votes",
                  "created_at",
                  "author",
                  "body"
                ]);
              });
              res.body.comments.forEach(comment => {
                expect(comment.article_id).to.equal(1);
              });
              expect(res.body.comments).to.be.sortedBy("created_at", {
                descending: true
              });
            });
        });
        it("GET 200 - returns an array of all comments of the given article_id, sorted by specified column in specified order", () => {
          return request(app)
            .get("/api/articles/1/comments?sort_by=votes&&order=asc")
            .expect(200)
            .then(res => {
              expect(res.body.comments).to.be.an("Array");
              res.body.comments.forEach(comment => {
                expect(comment).to.have.all.keys([
                  "article_id",
                  "comment_id",
                  "votes",
                  "created_at",
                  "author",
                  "body"
                ]);
              });
              expect(res.body.comments).to.be.sortedBy("votes", {
                descending: false
              });
            });
        });
        it("GET 200 - returns an empty array when passed an existent valid article id with no associated comments", () => {
          return request(app)
            .get("/api/articles/2/comments")
            .expect(200)
            .then(res => {
              expect(res.body.comments).to.be.an("Array");
              expect(res.body.comments).to.eql([]);
            });
        });
        it("GET 400 - throws an error when given an invalid article id", () => {
          return request(app)
            .get("/api/articles/ARTICLE/comments")
            .expect(400)
            .then(res => {
              expect(res.body).to.eql({
                status: 400,
                msg: "Invalid input data"
              });
            });
        });
        it("GET 404 - throws an error when given a non-existent article", () => {
          return request(app)
            .get("/api/articles/999/comments")
            .expect(404)
            .then(res => {
              expect(res.body).to.eql({
                status: 404,
                msg: "Article not found"
              });
            });
        });
        it("GET 400 - throws an error when trying to sort by a column that doesn't exist", () => {
          return request(app)
            .get("/api/articles/1/comments?sort_by=madeUpColumn")
            .expect(400)
            .then(res => {
              expect(res.body).to.eql({
                status: 400,
                msg: "Invalid input data"
              });
            });
        });
      });
    });
  });
  describe("/comments", () => {
    describe("/:comment_id", () => {
      it("PATCH 200 - Updates the vote property of the comment specified by given id by the given amount and returns the updated comment object", () => {
        return request(app)
          .patch("/api/comments/2")
          .send({ inc_votes: 1 })
          .expect(200)
          .then(res => {
            expect(res.body.comment).to.have.all.keys([
              "comment_id",
              "author",
              "article_id",
              "votes",
              "created_at",
              "body"
            ]);
            expect(res.body.comment.comment_id).to.equal(2);
            expect(res.body.comment.votes).to.equal(15);
          });
      });
      it("PATCH 200 - Updates the vote property of the comment specified by given id by negative amount and returns the updated comment object", () => {
        return request(app)
          .patch("/api/comments/2")
          .send({ inc_votes: -4 })
          .expect(200)
          .then(res => {
            expect(res.body.comment).to.have.all.keys([
              "comment_id",
              "author",
              "article_id",
              "votes",
              "created_at",
              "body"
            ]);
            expect(res.body.comment.comment_id).to.equal(2);
            expect(res.body.comment.votes).to.equal(10);
          });
      });
      it("PATCH 400 - throws an error when inc_votes is set to an invalid value", () => {
        return request(app)
          .patch("/api/comments/2")
          .send({ inc_votes: "LOADS OF VOTES!" })
          .expect(400)
          .then(res => {
            expect(res.body).to.eql({ status: 400, msg: "Invalid input data" });
          });
      });
      it("PATCH 400 - throws an error when trying to update a value other than inc_votes", () => {
        return request(app)
          .patch("/api/comments/2")
          .send({ username: "newUser" })
          .expect(400)
          .then(res => {
            expect(res.body).to.eql({ status: 400, msg: "Invalid input data" });
          });
      });
      it("PATCH 400 - throws an error when given an invalid comment id", () => {
        return request(app)
          .patch("/api/comments/this-is-not-a-comment")
          .send({ inc_votes: 10 })
          .expect(400)
          .then(res => {
            expect(res.body).to.eql({
              status: 400,
              msg: "Invalid input data"
            });
          });
      });
      it("PATCH 404 - throws an error when given an article id that doesn't exist", () => {
        return request(app)
          .patch("/api/comments/999")
          .send({ inc_votes: 10 })
          .expect(404)
          .then(res => {
            expect(res.body).to.eql({
              msg: "Comment not found",
              status: 404
            });
          });
      });
      it("PUT 405 - throws throws a method not allowed error when trying to put a new comment at an id where one already exists", () => {
        return request(app)
          .put("/api/comments/1")
          .send({ newComment: "I AM ANGRY1!!!" })
          .expect(405)
          .then(err => {
            expect(err.body).to.eql({
              status: 405,
              msg: "Method not allowed"
            });
          });
      });
      it("DELETE 204 - deletes the comment specified by the given id", () => {
        return request(app)
          .delete("/api/comments/1")
          .expect(204);
      });
      it("DELETE 400 - throws an error when given an invalid comment id", () => {
        return request(app)
          .delete("/api/comments/I-demand-you-remove-this-comment-NOW")
          .expect(400)
          .then(err => {
            expect(err.body).to.eql({ status: 400, msg: "Invalid input data" });
          });
      });
      it("DELETE 404 - throws an error when given a valid but non-existent comment id", () => {
        return request(app)
          .delete("/api/comments/999")
          .expect(404)
          .then(err => {
            expect(err.body).to.eql({ status: 404, msg: "Comment not found" });
          });
      });
    });
  });
});
describe("./*", () => {
  it("404 - sends a does not exist error for any routes that do not have a specified endpoint", () => {
    return request(app)
      .get("/topics/mitch/articles")
      .expect(404)
      .then(err => {
        expect(err.body).to.eql({
          status: 404,
          msg: "This route does not exist"
        });
      });
  });
});
