document.querySelector(".hamburger").addEventListener("click", function () {
  document.querySelector(".line1").classList.toggle("line1-clicked");
  document.querySelector(".line2").classList.toggle("line2-clicked");
  document.querySelector(".line3").classList.toggle("line3-clicked");
  document.querySelector(".nav-list").classList.toggle("nav-list-clicked");
  document.querySelector(".wrapper-wrapper").classList.toggle("clicked");
});
