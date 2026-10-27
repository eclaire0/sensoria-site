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

// Background videos (hero arch + full-width bands)
// - phones get the lighter 720p file (data-small="assets/video/name-720")
// - videos marked data-lazy only load/play when scrolled into view
// - reduced-motion visitors see the still poster instead
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isSmall = window.matchMedia('(max-width: 900px)').matches;
document.querySelectorAll('video[data-small]').forEach(video => {
  if (isSmall) {
    const webm = video.canPlayType('video/webm; codecs="vp9"');
    video.src = video.dataset.small + (webm ? '.webm' : '.mp4');
  }
  if (reduceMotion) {
    video.removeAttribute('autoplay');
    video.pause();
    return;
  }
  if (video.hasAttribute('data-lazy') && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { video.play().catch(() => {}); }
        else { video.pause(); }
      });
    }, { rootMargin: '200px 0px' });
    io.observe(video);
  }
});

// Curiosity grid: picked topics are added to the contact message
const curioChips = document.querySelectorAll('.curio-chip');
const curioCount = document.getElementById('curioCount');
const curioMessage = document.getElementById('message');
const CURIO_PREFIX = "I'm curious about: ";
function updateCuriosity() {
  const picked = [...curioChips]
    .filter(c => c.getAttribute('aria-pressed') === 'true')
    .map(c => c.textContent.trim());
  if (curioCount) {
    curioCount.textContent = picked.length
      ? picked.length + (picked.length === 1 ? ' topic' : ' topics') + ' added to your message'
      : '';
  }
  if (curioMessage) {
    const lines = curioMessage.value.split('\n').filter(l => !l.startsWith(CURIO_PREFIX));
    if (picked.length) lines.unshift(CURIO_PREFIX + picked.join(', ') + '.');
    curioMessage.value = lines.join('\n').replace(/^\n+|\n+$/g, '');
  }
}
curioChips.forEach(chip => {
  chip.addEventListener('click', () => {
    chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
    updateCuriosity();
  });
});
