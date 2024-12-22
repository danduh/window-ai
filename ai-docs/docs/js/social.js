document.addEventListener("DOMContentLoaded", function () {
    const nav = document.querySelector("nav.md-tabs > div");
    const social = document.querySelector(".md-social");
    const clonedSocial = social.cloneNode(true); // Clone the element
    nav.appendChild(clonedSocial);
    nav.style.display = "flex";
    nav.style.justifyContent = "space-between";
    // if (nav) {
    //     const socialLinks = `
    //         <a href="https://github.com/your-profile" target="_blank">GitHub</a>
    //         <a href="https://twitter.com/your-profile" target="_blank">Twitter</a>
    //         <a href="https://linkedin.com/in/your-profile" target="_blank">LinkedIn</a>
    //     `;
    //     const div = document.createElement('div');
    //     div.innerHTML = socialLinks;
    //     nav.appendChild(div);
    // }
});