const questions = [
  "What is the world's most expensive spice?",
  "How old is the Earth?",
  "How many nobel prizes did Einstein win?",
];
const options = [
  ["A. Cardamom", "B. Cinnamon", "C. Saffron", "D. Turmeric"],
  ["A. 4.5 billion", "B. 2 billion", "C. 5.8 billion", "D. 500 million"],
  ["A. 1", "B. 2", "C. 3", "D. 4"],
];
const answers = ["3", "1", "1"];
var flag = 0;
var score = 0;
var finalPoints = [];
const endFlag = [];

if (flag === 0) {
  quiz();
}

function quiz() {
  if (flag < 3) {
    document.querySelector(".question").innerHTML = questions[flag];
    for (let i = 0; i < 4; i++) {
      document.querySelectorAll(".option")[i].innerHTML = options[flag][i];
    }
    document.querySelector(".score").innerHTML = "Score: " + score;
  } else {
    window.location.href = "sample-score";
  }
}

for (let i = 0; i < 4; i++) {
  document
    .querySelectorAll(".option")
    [i].addEventListener("click", function () {
      if (this.id === answers[flag]) {
        finalPoints.push("1");
        score++;
      } else {
        finalPoints.push("0");
      }
      document.querySelector("progress").value = flag + 1;
      flag++;
      quiz();
    });
}

export { finalPoints, score };
