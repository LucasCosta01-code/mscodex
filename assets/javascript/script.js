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
const musicToggleText = musicToggle?.querySelector('.music-toggle-text');
const animatedTitles = document.querySelectorAll('.section-heading h2, .split-section h2, .contact-copy h2');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (year) {
  year.textContent = new Date().getFullYear();
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
  musicToggle?.classList.toggle('is-playing', isPlaying);
  musicToggle?.setAttribute('aria-pressed', String(isPlaying));
  musicToggle?.setAttribute('aria-label', isPlaying ? 'Pausar música Do Zero ao Império' : 'Tocar música Do Zero ao Império');

  if (musicToggleIcon) {
    musicToggleIcon.textContent = isPlaying ? '❚❚' : '▶';
  }

  if (musicToggleText) {
    musicToggleText.textContent = 'Do Zero ao Império';
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

        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        ticking = false;
      });
    }, { passive: true });

    card.addEventListener('pointerleave', () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg)';
    });
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeMenu();
  }
});
