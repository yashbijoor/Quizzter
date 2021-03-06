require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const md5 = require("md5");
const _ = require("lodash");

const app = express();

app.use(
  session({
    name: process.env.SESSION_NAME,
    resave: false,
    saveUninitialized: false,
    secret: process.env.SECRET,
    cookie: {
      maxAge: 1000 * 60 * 60,
      sameSite: true,
    },
  })
);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

mongoose.connect("mongodb://localhost:27017/quizzterDB", {
  useNewUrlParser: true,
});

const userSchema = new mongoose.Schema({
  name: { type: String, require: true },
  email: {
    type: String,
    require: true,
    index: true,
    unique: true,
    sparse: true,
  },
  password: { type: String, require: true },
  logStatus: Boolean,
  category: String,
  currentScore: Number,
  highscore: Number,
});

const User = new mongoose.model("User", userSchema);

app.get("/dashboard", function (req, res) {
  GlobalCategory = []; //Emptying the category array for the next iteration
  req.session.flag = 0; //Stores the number of iterations i.e. the no of questions the user will answer
  // Flag is 0 for the next iteration
  req.session.listOfCorrectOptions = []; //List of correct options as the local 'correctOption' does not sync with the user selected option
  req.session.result = []; // Result
  req.session.questions = [];
  req.session.chosenOption = [];
  req.session.correctOption = [];
  req.session.optionList = [];

  var username = req.session.email;

  module.exports = username;

  User.updateOne({ email: username }, { currentScore: 0 }, function (err) {
    if (err) {
      console.log(err);
    }
  });

  User.findOne({ email: username }, function (err, foundUser) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      if (foundUser) {
        if (foundUser.logStatus === true) {
          if (req.session.score >= foundUser.highscore) {
            var username = require("./app.js");
            User.updateOne(
              { email: username },
              { highscore: req.session.score },
              function (err) {
                if (err) {
                  console.log(err);
                }
              }
            );
          }
          req.session.score = 0; // Score saved in a session variable
          res.render("dashboard", { name: foundUser.name });
        } else {
          res.redirect("/signin");
        }
      } else {
        res.redirect("/register");
      }
    }
  });

  app.post("/dashboard", function (req, res) {
    var username = req.session.email;
    User.updateOne(
      { email: username },
      { category: req.body.category },
      function (err) {
        if (err) {
          console.log(err);
        } else {
          chosenOption = parseInt(req.body.options); //Local user option
          if (req.session.flag > 0) {
            req.session.chosenOption.push(
              req.session.optionList[chosenOption - 1]
            );
          }
          var username = req.session.email;
          User.findOne({ email: username }, function (err, foundUser) {
            if (err) {
              console.log(err);
            } else {
              if (foundUser) {
                request(
                  "https://opentdb.com/api.php?amount=1&category=" +
                    foundUser.category +
                    "&type=multiple",
                  function (error, response, body) {
                    if (error) {
                      res.render("failure");
                    } else if (response.statusCode != 200) {
                      res.render("failure");
                    } else {
                      var scoreCount = 0;
                      const data = JSON.parse(body);
                      const question = data.results[0].question
                        .replace(/&amp;/g, "&")
                        .replace(/&quot;/g, '"')
                        .replace(/&#039;/g, "'");
                      req.session.questions.push(question);
                      const category = data.results[0].category;
                      const optionList = [];
                      const options = data.results[0].incorrect_answers;
                      req.session.flag = req.session.flag + 1;
                      var flag = req.session.flag;
                      const correctOption = data.results[0].correct_answer;
                      req.session.correctOption.push(correctOption);
                      let option = parseInt(Math.floor(Math.random() * 4));
                      req.session.listOfCorrectOptions.push(option);
                      var count = 0; //To know when to push the options in the array
                      for (var i = 0; i <= 3; i++) {
                        if (option === i) {
                          optionList.push(correctOption);
                        } else {
                          optionList.push(options[count]);
                          count++;
                        }
                      }
                      req.session.optionList = optionList;
                      // The index of 'listOfCorrectOptions' is flag-2 cuz the list is 2 indices behind the user chosen option
                      if (
                        chosenOption - 1 ===
                        req.session.listOfCorrectOptions[flag - 2]
                      ) {
                        req.session.score = req.session.score + 1;
                        var username = req.session.email;
                        req.session.result.push(1);
                        User.findOne(
                          { email: username },
                          function (err, foundUser) {
                            if (err) {
                              console.log(err);
                            } else {
                              if (foundUser) {
                                scoreCount = foundUser.currentScore + 1;
                                var username = req.session.email;
                                User.updateOne(
                                  { email: username },
                                  { currentScore: scoreCount },
                                  function (err) {
                                    if (err) {
                                      console.log(err);
                                    }
                                  }
                                );
                              }
                            }
                          }
                        );
                      } else {
                        if (flag > 1) {
                          req.session.result.push(0);
                        }
                      }
                      if (flag > 10) {
                        var username = req.session.email;
                        User.findOne(
                          { email: username },
                          function (err, foundUser) {
                            if (err) {
                              console.log(err);
                            } else {
                              if (foundUser) {
                                res.render("scoreboard", {
                                  user: foundUser,
                                  category: category,
                                  data: req.session.result,
                                  score: req.session.score,
                                  questions: req.session.questions,
                                  chosenOption: req.session.chosenOption,
                                  correctOption: req.session.correctOption,
                                });
                              }
                            }
                          }
                        );
                      } else if (flag === 10) {
                        res.render("quiz", {
                          question: question,
                          optionList: optionList,
                          res: req.session.score,
                          flag: flag,
                          category: category,
                        });
                      } else if (flag === 1) {
                        res.render("quiz", {
                          question: question,
                          optionList: optionList,
                          res: req.session.score,
                          flag: flag,
                          category: category,
                        });
                      } else {
                        res.render("quiz", {
                          question: question,
                          optionList: optionList,
                          res: req.session.score,
                          flag: flag,
                          category: category,
                        });
                      }
                    }
                  }
                );
              } else {
                res.redirect("/dashboard");
              }
            }
          });
        }
      }
    );
  });

  app.get("/leaderboard", function (req, res) {
    User.find().count(function (err, count) {
      if (err) {
        console.log(err);
      }
      User.find()
        .sort([["highscore", -1]])
        .exec(function (err, docs) {
          res.render("leaderboard", {
            count: count,
            docs: docs,
            user: req.session.email,
          });
        });
    });
  });

  app.get("/failure", function (req, res) {
    res.redirect("/");
  });
});

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/register", function (req, res) {
  if (req.session.email) {
    res.redirect("/dashboard");
  } else {
    res.render("register");
  }
});

app.get("/signin", function (req, res) {
  if (req.session.email) {
    res.redirect("/dashboard");
  } else {
    res.render("signin");

    app.get("/forgot-password", function (req, res) {
      res.render("forgot-password");
    });

    app.post("/forgot-password", function (req, res) {
      User.updateOne(
        { email: req.body.email },
        { password: md5(req.body.password + process.env.SALT) },
        function (err) {
          if (err) {
            console.log(err);
          } else {
            res.redirect("/signin");
          }
        }
      );
    });
  }
});

app.get("/sample", function (req, res) {
  res.render("sample");
  app.get("/sample-score", function (req, res) {
    res.render("sample-score");
  });
});

app.get("/logout", function (req, res) {
  const username = req.session.email;
  User.updateOne({ email: username }, { logStatus: false }, function (err) {
    if (err) {
      console.log(err);
    } else {
      req.session.destroy();
      res.redirect("/");
    }
  });
});

app.post("/register", function (req, res) {
  const newUser = new User({
    name: _.startCase(req.body.name.toLowerCase()),
    email: req.body.email,
    password: md5(req.body.password + process.env.SALT),
    logStatus: true,
    category: "9",
    currentScore: 0,
    highscore: 0,
  });
  const email = req.body.email;
  module.exports = email;

  newUser.save(function (err) {
    if (err) {
      app.get("/failure", function (req, res) {
        res.render("failure", {
          err: "This username already exists. Try another username.",
        });
      });
      res.redirect("/failure");
    } else {
      req.session.email = email;
      res.redirect("/dashboard");
    }
  });
});

app.post("/signin", function (req, res) {
  const username = req.body.email;
  const password = md5(req.body.password + process.env.SALT);

  module.exports = username;

  User.findOne({ email: username }, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        if (foundUser.password === password) {
          User.updateOne(
            { email: username },
            { logStatus: true },
            function (err) {
              if (err) {
                console.log(err);
              } else {
                req.session.email = req.body.email;
                res.redirect("/dashboard");
              }
            }
          );
        } else {
          res.redirect("/signin");
        }
      } else {
        res.redirect("/register");
      }
    }
  });
});

app.post("/scoreboard", function (req, res) {
  // var username = req.session.email;
  // User.findOne({ email: username }, function (err, foundUser) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //       if (req.session.score >= foundUser.highscore) {
  //         var username = require("./app.js");
  //         User.updateOne(
  //           { email: username },
  //           { highscore: req.session.score },
  //           function (err) {
  //             if (err) {
  //               console.log(err);
  //             }
  //           }
  //         );
  //       }
  //     }
  //   }
  // });
  res.redirect("/dashboard");
});

app.listen(3000, function () {
  console.log("Server running on port 3000");
});
