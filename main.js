//Show ecommerce techn
document.addEventListener("DOMContentLoaded", () => {
    $(function () {
        $('[data-toggle="tooltip"]').tooltip()
      })

  let projectList = document.querySelectorAll(".card-img-top");
  console.log(projectList);
  projectList.forEach((element) => {
    element.addEventListener("mousedown", () => {
      element.style.opacity = "-.08";
      element.previousElementSibling.classList.remove("d-none");
    });
    element.addEventListener("mouseout", () => {
      element.style.opacity = "1";
      element.previousElementSibling.classList.add("d-none");
    });
  });
});
