//Show ecommerce techn
document.addEventListener("DOMContentLoaded", () => {
      let anchor_list = document.querySelectorAll('.nav-item')[1].children;
      let about_anchor = anchor_list[0];
      about_anchor.addEventListener('click', (e)=>{
        e.preventDefault();
        const section  = document.getElementById('about'); 
        window.scrollTo({
          top:section.offsetHeight
        })
      })
});
