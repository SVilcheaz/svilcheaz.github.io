// Navigation functionality
function navigateToPage(pageUrl) {
  window.location.href = pageUrl;
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
});
