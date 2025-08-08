// Navigation functionality
function navigateToPage(pageUrl) {
  window.location.href = pageUrl;
}

// Theme Toggle Functionality
function initThemeToggle() {
  const themeToggle = document.querySelector('.theme-toggle');
  
  // Check for saved theme preference or respect OS preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  
  // Only apply initial theme if not already set by inline script
  // This prevents overriding the theme set by the early inline script
  if (!document.documentElement.getAttribute('data-theme')) {
    document.documentElement.setAttribute('data-theme', initialTheme);
  }
  
  // Toggle theme function
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Dispatch custom event for other scripts to listen to theme changes
    window.dispatchEvent(new CustomEvent('themeChange', { detail: newTheme }));
  }
  
  // Add event listener to toggle button
  if (themeToggle) {
    themeToggle.removeEventListener('click', toggleTheme); // Remove any existing listener
    themeToggle.addEventListener('click', toggleTheme);
  }
  
  // Listen for storage changes from other tabs/pages
  window.addEventListener('storage', function(e) {
    if (e.key === 'theme') {
      const newTheme = e.newValue || 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  });
  
  return initialTheme;
}

// Initialize theme (only once)
if (document.readyState === 'loading') {
  // DOM is still loading, wait for DOMContentLoaded
  document.addEventListener('DOMContentLoaded', initThemeToggle);
} else {
  // DOM is already loaded
  initThemeToggle();
}

// Timeline Interactions
document.addEventListener('DOMContentLoaded', () => {
  // Navigation links
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href) {
        navigateToPage(href);
      }
    });
  });

  // Timeline interactions
  const timelineItems = document.querySelectorAll('.timeline-item');
  timelineItems.forEach((item, index) => {
    // Add staggered animation delay
    item.style.animationDelay = `${index * 0.2}s`;

    // Add click animation only
    item.addEventListener('click', () => {
      const content = item.querySelector('.timeline-content');
      if (content) {
        content.style.transform = 'scale(1.05)';
        setTimeout(() => {
          content.style.transform = 'scale(1)';
        }, 200);
      }
    });
  });

  // Smooth scrolling for all links
  document.querySelectorAll('a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const href = this.getAttribute('href');
      if (href) {
        const sectionId = href.split('.')[0];
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
          targetSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  // Add scroll animations
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
      }
    });
  }, {
    threshold: 0.2
  });

  timelineItems.forEach(item => observer.observe(item));
  
  // Listen for theme changes from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      document.documentElement.setAttribute('data-theme', e.newValue || 'light');
    }
  });
});
