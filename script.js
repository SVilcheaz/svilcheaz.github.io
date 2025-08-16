// i18n functionality
const i18n = {
  currentLanguage: 'en',
  fallbackLanguage: 'en',
  translations: {},
  
  // Helper function to safely get nested object properties
  getNestedValue(obj, keys) {
    let result = obj;
    for (const key of keys) {
      if (result && typeof result === 'object' && key in result) {
        result = result[key];
      } else {
        return null;
      }
    }
    return result;
  },
  
  // Load translations for a specific language
  async loadLanguage(lang) {
    try {
      const response = await fetch(`/lang/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang} translations`);
      }
      this.translations[lang] = await response.json();
      return true;
    } catch (error) {
      console.error('Error loading translations:', error);
      return false;
    }
  },
  
  // Translate all elements with data-i18n attribute
  async translatePage(lang) {
    // Don't do anything if the language hasn't changed and we already have translations
    if (this.currentLanguage === lang && this.translations[lang]) {
      return;
    }
    
    // Try to load the language if we don't have it yet
    if (!this.translations[lang]) {
      const loaded = await this.loadLanguage(lang);
      if (!loaded && lang !== this.fallbackLanguage) {
        console.warn(`Falling back to ${this.fallbackLanguage} as ${lang} could not be loaded`);
        return this.translatePage(this.fallbackLanguage);
      }
    }
    
    this.currentLanguage = lang;
    
    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', lang);
    
    // Save language preference
    try {
      localStorage.setItem('preferredLanguage', lang);
    } catch (e) {
      console.warn('Could not save language preference to localStorage', e);
    }
    
    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const keys = element.getAttribute('data-i18n').split('.');
      let translation = this.translations[lang];
      
      // Handle special attribute syntax: [attr]key.path
      let attribute = null;
      if (keys[0].startsWith('[') && keys[0].endsWith(']')) {
        attribute = keys[0].slice(1, -1);
        keys.shift();
      }
      
      // Traverse the translation object
      let translationFound = true;
      for (const key of keys) {
        if (translation && typeof translation === 'object' && key in translation) {
          translation = translation[key];
        } else {
          translationFound = false;
          break;
        }
      }
      
      // If translation not found in current language, try fallback language
      if (!translationFound && lang !== this.fallbackLanguage) {
        console.warn(`Translation not found for key: ${keys.join('.')} in ${lang}, trying fallback`);
        const fallbackTranslation = this.getNestedValue(this.translations[this.fallbackLanguage], keys);
        if (fallbackTranslation) {
          translation = fallbackTranslation;
          translationFound = true;
        }
      }
      
      // If still not found, show warning and skip this element
      if (!translationFound) {
        console.warn(`Translation not found for key: ${keys.join('.')} in any language`);
        return; // Skip this element but continue with others
      }
      
      // Handle arrays by joining with spaces
      if (Array.isArray(translation)) {
        translation = translation.join(' ');
      }
      
      // Set the content or attribute
      if (attribute) {
        element.setAttribute(attribute, translation);
      } else {
        element.textContent = translation;
      }
    });
    
    // Update active state of language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      if (btn.getAttribute('data-lang') === lang) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    
    // Update the URL without reloading the page
    const url = new URL(window.location);
    if (url.searchParams.get('lang') !== lang) {
      url.searchParams.set('lang', lang);
      window.history.replaceState({}, '', url);
    }
  },
  
  // Initialize i18n
  async init() {
    // Check URL for language parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang');
    
    // Then check localStorage, then browser language
    let lang = urlLang || localStorage.getItem('preferredLanguage') || 
              navigator.language.split('-')[0];
    
    // Ensure the language is supported
    if (!['en', 'de'].includes(lang)) {
      lang = 'en';
    }
    
    // Load translations and translate the page
    await this.translatePage(lang);
    
    // Set up language switcher
    document.querySelectorAll('.lang-btn').forEach(button => {
      button.addEventListener('click', () => {
        const lang = button.getAttribute('data-lang');
        this.translatePage(lang);
      });
    });
    
    return lang;
  }
};

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

// Initialize everything when the DOM is loaded
async function initApp() {
  // Initialize i18n first
  await i18n.init();
  
  // Then initialize theme
  initThemeToggle();
  
  // Set up navigation links
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      if (link.getAttribute('href') && !link.getAttribute('href').startsWith('#')) {
        e.preventDefault();
        navigateToPage(link.getAttribute('href'));
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
  
  // Smooth scrolling for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
}

// Start the app when the DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
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
