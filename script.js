// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Dropdown (tap to open on mobile, hover handled by CSS on desktop)
document.querySelectorAll('.dropdown-trigger').forEach(trigger => {
  trigger.addEventListener('click', (e) => {
    if (window.innerWidth > 900) return; // desktop uses hover
    e.preventDefault();
    const li = trigger.closest('li');
    const wasOpen = li.classList.contains('dropdown-open');
    document.querySelectorAll('.nav-links li.dropdown-open').forEach(el => el.classList.remove('dropdown-open'));
    if (!wasOpen) li.classList.add('dropdown-open');
  });
});

// FAQ accordion (only present on pages that have it)
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('.faq-q');
  const answer = item.querySelector('.faq-a');
  const setHeight = () => { answer.style.maxHeight = item.classList.contains('open') ? answer.scrollHeight + 'px' : '0px'; };
  setHeight();
  btn.addEventListener('click', () => {
    const willOpen = !item.classList.contains('open');
    item.classList.toggle('open', willOpen);
    btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    setHeight();
  });
  window.addEventListener('resize', setHeight);
});
