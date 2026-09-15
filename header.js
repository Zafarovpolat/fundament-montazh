"use strict";
(() => {
  const header = document.querySelector(".header-inner");
  const nav = document.getElementById("main-navigation");
  const socials = document.querySelector(".header-social");
  const callback = document.querySelector(".header-callback");
  const contact = document.querySelector(".header-contact");
  const quote = document.querySelector(".header-quote");
  const actionSlot = document.createElement("div");
  actionSlot.className = "menu-actions-slot";
  document.querySelector(".menu-social-slot").before(actionSlot);
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.getElementById("header-menu");
  const closeButton = menu.querySelector(".menu-close");
  const navSlot = menu.querySelector(".menu-navigation-slot"),
    socialSlot = menu.querySelector(".menu-social-slot");
  function home(element) {
    const marker = document.createComment("responsive home");
    element.before(marker);
    return () => marker.after(element);
  }
  const restoreNav = home(nav),
    restoreSocial = home(socials),
    restoreCallback = home(callback),
    restoreContact = home(contact),
    restoreQuote = home(quote);
  let animation = null,
    closing = null,
    previousOverflow = "",
    formFromMenu = false;
  function closeMenu(animate = true) {
    if (!menu.open) return Promise.resolve();
    if (closing && animate) return closing;
    animation?.cancel();
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Открыть меню");
    const done = () => {
      animation?.cancel();
      animation = null;
      if (menu.open) menu.close();
      document.body.style.overflow = previousOverflow;
      closing = null;
    };
    if (!animate || window.siteMotion?.enabled === false) {
      done();
      return Promise.resolve();
    }
    animation = menu.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-16px)" },
      ],
      { duration: 280, easing: "ease-in", fill: "forwards" },
    );
    closing = animation.finished.catch(() => {}).then(done);
    return closing;
  }
  function openMenu() {
    if (menu.open || innerWidth > 1280) return;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    menu.showModal();
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Закрыть меню");
    if (window.siteMotion?.enabled !== false)
      animation = menu.animate(
        [
          { opacity: 0, transform: "translateY(-20px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 420, easing: "cubic-bezier(.22,.8,.25,1)" },
      );
    closeButton.focus();
  }
  toggle.addEventListener("click", () =>
    menu.open ? closeMenu() : openMenu(),
  );
  closeButton.addEventListener("click", () => closeMenu());
  menu.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeMenu();
  });
  menu.addEventListener(
    "click",
    (event) => {
      if (!menu.open) return;
      const action = event.target.closest("[data-action]");
      if (action) {
        event.preventDefault();
        event.stopPropagation();
        formFromMenu = true;
        closeMenu().then(() => action.click());
        return;
      }
      const link = event.target.closest('a[href^="#"]');
      if (link) {
        event.preventDefault();
        const hash = link.getAttribute("href");
        closeMenu().then(() => {
          const target = document.querySelector(hash);
          if (!target) return;
          history.pushState(null, "", hash);
          target.scrollIntoView({
            behavior: window.siteMotion?.enabled === false ? "auto" : "smooth",
            block: "start",
          });
        });
      }
    },
    true,
  );
  document.getElementById("contact-dialog").addEventListener("close", () => {
    if (formFromMenu) {
      formFromMenu = false;
      toggle.focus();
    }
  });
  function layout() {
    if (innerWidth > 1280) {
      closeMenu(false);
      restoreNav();
    } else navSlot.append(nav);
    if (innerWidth <= 768) socialSlot.append(socials);
    else restoreSocial();
    if (innerWidth <= 1280) {
      restoreCallback();
      actionSlot.append(contact, quote);
    } else {
      restoreContact();
      restoreQuote();
      if (innerWidth <= 1550) header.insertBefore(callback, socials);
      else restoreCallback();
    }
  }
  window.addEventListener("resize", layout);
  layout();
})();
