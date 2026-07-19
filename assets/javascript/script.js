const cursorGlow = document.querySelector('.cursor-glow');
const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('[data-menu]');
const navLinks = document.querySelectorAll('.nav-menu a');
const revealElements = document.querySelectorAll('.reveal');
const sections = document.querySelectorAll('main section[id]');
const year = document.querySelector('[data-year]');
const countElements = document.querySelectorAll('[data-count]');
const tiltCards = document.querySelectorAll('.tilt-card');
const backToTop = document.querySelector('[data-back-to-top]');
const themeToggle = document.querySelector('[data-theme-toggle]');
const themeToggleIcon = themeToggle?.querySelector('.theme-toggle-icon');
const themeToggleText = themeToggle?.querySelector('.theme-toggle-text');
const musicToggle = document.querySelector('[data-music-toggle]');
const siteMusic = document.querySelector('[data-site-music]');
const musicToggleIcon = musicToggle?.querySelector('.music-toggle-icon');
const musicToggleLabel = musicToggle?.querySelector('.music-toggle-label');
const musicToggleText = musicToggle?.querySelector('.music-toggle-text');
const animatedTitles = document.querySelectorAll('.section-heading h2, .split-section h2, .contact-copy h2');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (year) {
  year.textContent = new Date().getFullYear();
}

const welcomeLoader = document.querySelector('[data-welcome-loader]');

if (welcomeLoader) {
  document.body.classList.add('is-loading');

  const speakWelcome = () => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;

    window.speechSynthesis.cancel();

    const message = new SpeechSynthesisUtterance('Sejam bem-vindos à MSCODEX.');
    message.lang = 'pt-BR';
    message.rate = 0.92;
    message.pitch = 0.92;
    message.volume = 0.72;

    window.speechSynthesis.speak(message);
  };

  const hideWelcomeLoader = () => {
    welcomeLoader.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    setTimeout(() => welcomeLoader.remove(), 950);
  };

  window.addEventListener('load', () => {
    speakWelcome();
    setTimeout(hideWelcomeLoader, 1850);
  }, { once: true });

  setTimeout(hideWelcomeLoader, 3600);
}

const savedTheme = localStorage.getItem('mscodex-theme');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
const initialTheme = savedTheme || (prefersLight ? 'light' : 'dark');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;

  if (themeToggleIcon) {
    themeToggleIcon.textContent = theme === 'light' ? '☾' : '☀';
  }

  if (themeToggleText) {
    themeToggleText.textContent = theme === 'light' ? 'Escuro' : 'Claro';
  }

  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(theme === 'light'));
    themeToggle.setAttribute('aria-label', theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro');
  }
}

applyTheme(initialTheme);

themeToggle?.addEventListener('click', () => {
  const currentTheme = document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
  const nextTheme = currentTheme === 'light' ? 'dark' : 'light';

  localStorage.setItem('mscodex-theme', nextTheme);
  applyTheme(nextTheme);
});

function updateMusicButton(isPlaying) {
  const trackName = 'Do Zero ao Império';

  musicToggle?.classList.toggle('is-playing', isPlaying);
  musicToggle?.setAttribute('aria-pressed', String(isPlaying));
  musicToggle?.setAttribute('aria-label', isPlaying ? `Pausar música ${trackName}` : `Tocar música ${trackName}`);

  if (musicToggleIcon) {
    musicToggleIcon.textContent = isPlaying ? '❚❚' : '▶';
  }

  if (musicToggleLabel) {
    musicToggleLabel.textContent = isPlaying ? 'Tocando agora' : 'Player';
  }

  if (musicToggleText) {
    musicToggleText.textContent = trackName;
  }
}

if (musicToggle && siteMusic) {
  siteMusic.volume = 0.55;
  updateMusicButton(false);

  musicToggle.addEventListener('click', async () => {
    if (siteMusic.paused) {
      try {
        await siteMusic.play();
        updateMusicButton(true);
      } catch (error) {
        updateMusicButton(false);
      }
      return;
    }

    siteMusic.pause();
    updateMusicButton(false);
  });

  siteMusic.addEventListener('play', () => updateMusicButton(true));
  siteMusic.addEventListener('pause', () => updateMusicButton(false));
  siteMusic.addEventListener('ended', () => updateMusicButton(false));
}

function splitText(element) {
  const text = element.textContent.trim();
  element.textContent = '';
  element.classList.add('text-split');

  [...text].forEach((char, index) => {
    const span = document.createElement('span');
    span.className = 'char';
    span.style.setProperty('--i', index);
    span.innerHTML = char === ' ' ? '&nbsp;' : char;
    element.appendChild(span);
  });
}

animatedTitles.forEach(splitText);

if (cursorGlow && canHover) {
  let ticking = false;

  window.addEventListener('pointermove', (event) => {
    if (ticking) return;

    ticking = true;
    requestAnimationFrame(() => {
      const x = Math.round((event.clientX / window.innerWidth) * 100);
      const y = Math.round((event.clientY / window.innerHeight) * 100);

      cursorGlow.style.opacity = '1';
      cursorGlow.style.transform = `translate3d(${event.clientX - 170}px, ${event.clientY - 170}px, 0)`;
      document.documentElement.style.setProperty('--glow-x', `${x}%`);
      document.documentElement.style.setProperty('--glow-y', `${y}%`);
      ticking = false;
    });
  }, { passive: true });

  window.addEventListener('pointerleave', () => {
    cursorGlow.style.opacity = '0';
  });
}

const scrollProgress = document.createElement('div');
scrollProgress.className = 'scroll-progress';
scrollProgress.setAttribute('aria-hidden', 'true');
document.body.prepend(scrollProgress);

function updateScrollProgress() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
  const progress = Math.min(window.scrollY / maxScroll, 1);
  document.documentElement.style.setProperty('--scroll-progress', progress.toFixed(4));
}

let lastScrollY = window.scrollY;
let headerTicking = false;
const siteHeader = document.querySelector('.site-header');

function updateHeaderBehavior() {
  const currentY = window.scrollY;
  const shouldHide = currentY > lastScrollY && currentY > 180 && !document.body.classList.contains('menu-open');

  siteHeader?.classList.toggle('header-hidden', shouldHide);
  lastScrollY = currentY;
  updateScrollProgress();
  headerTicking = false;
}

window.addEventListener('scroll', () => {
  if (headerTicking) return;

  headerTicking = true;
  requestAnimationFrame(updateHeaderBehavior);
}, { passive: true });

updateScrollProgress();

function addPressFeedback(element) {
  element.addEventListener('pointerdown', () => {
    element.classList.remove('is-pressed');
    void element.offsetWidth;
    element.classList.add('is-pressed');
  });

  element.addEventListener('animationend', (event) => {
    if (event.animationName === 'premiumRipple') {
      element.classList.remove('is-pressed');
    }
  });
}

document.querySelectorAll('.btn, .contact-link, .theme-toggle, .back-to-top, .nav-menu a').forEach(addPressFeedback);

if (canHover) {
  const magneticElements = document.querySelectorAll('.btn, .theme-toggle, .music-toggle, .back-to-top, .contact-link');

  magneticElements.forEach((element) => {
    element.classList.add('magnetic');

    element.addEventListener('pointermove', (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      const strength = element.classList.contains('contact-link') ? 0.06 : 0.12;

      element.style.translate = `${x * strength}px ${y * strength}px`;
    }, { passive: true });

    element.addEventListener('pointerleave', () => {
      element.style.translate = '0 0';
    });
  });
}

function closeMenu() {
  document.body.classList.remove('menu-open');
  navMenu?.classList.remove('open');
  navToggle?.classList.remove('active');
  navToggle?.setAttribute('aria-expanded', 'false');
}

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const isOpen = navMenu.classList.toggle('open');
    navToggle.classList.toggle('active', isOpen);
    document.body.classList.toggle('menu-open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener('click', closeMenu);
  });
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const element = entry.target;

    if (entry.isIntersecting) {
      element.classList.add('visible');
      element.classList.remove('exit-up');
      return;
    }

    if (entry.boundingClientRect.top < 0) {
      element.classList.remove('visible');
      element.classList.add('exit-up');
    } else {
      element.classList.remove('visible', 'exit-up');
    }
  });
}, {
  threshold: 0.18,
  rootMargin: '0px 0px -8% 0px'
});

revealElements.forEach((element) => revealObserver.observe(element));

const activeObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    navLinks.forEach((link) => {
      const isActive = link.getAttribute('href') === `#${entry.target.id}`;
      link.classList.toggle('active', isActive);
    });
  });
}, {
  threshold: 0.45
});

sections.forEach((section) => activeObserver.observe(section));

const animatedCounters = new WeakSet();
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const element = entry.target;

    if (!entry.isIntersecting || animatedCounters.has(element)) return;

    animatedCounters.add(element);
    const target = Number(element.dataset.count || 0);
    const duration = 1000;
    const start = performance.now();

    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  });
}, { threshold: 0.8 });

countElements.forEach((element) => countObserver.observe(element));

backToTop?.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
  closeMenu();
});

if (canHover) {
  tiltCards.forEach((card) => {
    let ticking = false;

    card.addEventListener('pointermove', (event) => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const rotateY = ((x / rect.width) - 0.5) * 7;
        const rotateX = -((y / rect.height) - 0.5) * 7;

        card.style.setProperty('--card-x', `${Math.round((x / rect.width) * 100)}%`);
        card.style.setProperty('--card-y', `${Math.round((y / rect.height) * 100)}%`);
        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        ticking = false;
      });
    }, { passive: true });

    card.addEventListener('pointerleave', () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  });
}

if (canHover) {
  document.querySelectorAll('.glass-card, .project-card, .contact-card').forEach((card) => {
    let ticking = false;

    card.addEventListener('pointermove', (event) => {
      if (ticking) return;

      ticking = true;
      requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = Math.round(((event.clientX - rect.left) / rect.width) * 100);
        const y = Math.round(((event.clientY - rect.top) / rect.height) * 100);

        card.style.setProperty('--card-x', `${x}%`);
        card.style.setProperty('--card-y', `${y}%`);
        ticking = false;
      });
    }, { passive: true });
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
  }
});



