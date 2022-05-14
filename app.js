require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const md5 = require("md5");
const _ = require("lodash");
const listOfCorrectOptions = []; //List of correct options as the local 'correctOption' does not sync with the user selected option
var flag = 0; //Stores the number of iterations i.e. the no of questions the user will answer

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
  flag = 0; // Flag is 0 for the next iteration

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
                      var result = "Oops! The answer you chose was wrong!";
                      const data = JSON.parse(body);
                      const question = data.results[0].question;
                      const optionList = [];
                      const options = data.results[0].incorrect_answers;
                      flag++;
                      const correctOption = data.results[0].correct_answer;
                      let option = parseInt(Math.floor(Math.random() * 4));
                      listOfCorrectOptions.push(option);
                      var count = 0; //To know when to push the options in the array
                      for (var i = 0; i <= 3; i++) {
                        if (option === i) {
                          optionList.push(correctOption);
                        } else {
                          optionList.push(options[count]);
                          count++;
                        }
                      }
                      // The index of 'listOfCorrectOptions' is flag-2 cuz the list is 2 indices behind the user chosen option
                      if (chosenOption - 1 === listOfCorrectOptions[flag - 2]) {
                        result = "The answer you chose was correct!";
                        var username = req.session.email;
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
                      }
                      if (flag > 11) {
                        var username = req.session.email;
                        User.findOne(
                          { email: username },
                          function (err, foundUser) {
                            if (err) {
                              console.log(err);
                            } else {
                              if (foundUser) {
                                res.render("scoreboard", {
                                  score: foundUser.currentScore,
                                });
                              }
                            }
                          }
                        );
                      } else if (flag === 11) {
                        res.render("quiz", {
                          question: "Congratulations on completing the quiz.",
                          optionList: [],
                          res: " ",
                          button: "PROCEED",
                          flag: flag,
                        });
                      } else if (flag === 10) {
                        res.render("quiz", {
                          question: question,
                          optionList: optionList,
                          res: result,
                          flag: flag,
                          button: "FINISH",
                        });
                      } else if (flag === 1) {
                        res.render("quiz", {
                          question: question,
                          optionList: optionList,
                          res: "Your current score is 0",
                          flag: flag,
                          button: "CONTINUE",
                        });
                      } else {
                        res.render("quiz", {
                          question: question,
                          optionList: optionList,
                          res: result,
                          flag: flag,
                          button: "CONTINUE",
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
      // User.find(function (err, docs) {
      //   res.render("leaderboard", { count: count, docs: docs });
      // });
      User.find()
        .sort([["highscore", -1]])
        .exec(function (err, docs) {
          res.render("leaderboard", { count: count, docs: docs });
        });
    });
  });
});

app.get("/", function (req, res) {
  if (req.session.email) {
    res.redirect("/dashboard");
  } else {
    res.render("home");
  }
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
  }
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
      console.log(err);
      res.redirect("/signin");
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
  var username = req.session.email;
  User.findOne({ email: username }, function (err, foundUser) {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        if (foundUser.currentScore >= foundUser.highscore) {
          var s = foundUser.currentScore;
          var username = require("./app.js");
          User.updateOne({ email: username }, { highscore: s }, function (err) {
            if (err) {
              console.log(err);
            }
          });
        }
      }
    }
  });
  res.redirect("/dashboard");
});

app.listen(3000, function () {
  console.log("Server running on port 3000");
});
