/**
 * Smart Media Downloader Landing Page
 * Interactive elements & animations
 */

document.addEventListener('DOMContentLoaded', () => {
  // Make toggles in the extension mockup interactive
  const toggles = document.querySelectorAll('.toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
    });
  });

  // Animate mock progress bars dynamically to make the UI look alive
  const progressFills = document.querySelectorAll('.prog-bar-mock .fill');
  setInterval(() => {
    progressFills.forEach(fill => {
      // Generate a small fluctuation in progress
      let currentWidth = parseFloat(fill.style.width);
      if (currentWidth < 98) {
        let increment = Math.random() * 4;
        let newWidth = Math.min(99, currentWidth + increment);
        fill.style.width = `${newWidth}%`;
        
        // Find percentage element
        const row = fill.closest('.table-row-mock');
        if (row) {
          const pctText = row.querySelector('.pct');
          if (pctText) {
            pctText.textContent = `${Math.floor(newWidth)}%`;
          }
        }
      } else {
        // Reset to initial mockup state to loop animation
        if (fill.style.width === '99%') {
          setTimeout(() => {
            fill.style.width = fill.closest('.table-row-mock').innerText.includes('Space-Launch') ? '50%' : '20%';
          }, 3000);
        }
      }
    });
  }, 1500);

  // Smooth scroll offsets for internal links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        window.scrollTo({
          top: target.offsetTop - 80,
          behavior: 'smooth'
        });
      }
    });
  });
});
