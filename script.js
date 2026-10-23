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

// Intake form -> /api/intake (only present on the homepage)
const intakeForm = document.getElementById('intakeForm');
if (intakeForm) {
  const status = document.getElementById('intakeStatus');
  const submit = document.getElementById('intakeSubmit');

  const setStatus = (text, state) => {
    status.textContent = text;
    status.className = 'form-status' + (state ? ' ' + state : '');
  };

  intakeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      name: intakeForm.name.value.trim(),
      email: intakeForm.email.value.trim(),
      message: intakeForm.message.value.trim(),
      website: intakeForm.website.value,
    };

    if (!payload.name || !payload.email || !payload.message) {
      setStatus('Please fill in your name, email, and a short message.', 'error');
      return;
    }

    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = 'Sending…';
    setStatus('');

    try {
      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        intakeForm.reset();
        setStatus('Thank you — your message is with Claire. You will hear back within a couple of days.', 'success');
      } else {
        setStatus(data.error || 'Something went wrong. Please try again.', 'error');
      }
    } catch {
      setStatus('Could not reach the server. Please check your connection and try again.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = original;
    }
  });
}

// Hero video: smaller file on phones; respect reduced-motion (show the still poster instead)
const heroVideo = document.querySelector('.hero-video');
if (heroVideo && window.matchMedia('(max-width: 900px)').matches) {
  const webm = heroVideo.canPlayType('video/webm; codecs="vp9"');
  heroVideo.src = webm ? 'assets/video/paddle-720.webm' : 'assets/video/paddle-720.mp4'; // lighter file for phones
}
if (heroVideo && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  heroVideo.removeAttribute('autoplay');
  heroVideo.pause();
}
