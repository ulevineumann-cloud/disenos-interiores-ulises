// Before/After Slider Functionality
document.addEventListener('DOMContentLoaded', () => {
  const sliders = document.querySelectorAll('.beforeAfterSlider');
  
  sliders.forEach(slider => {
    const sliderContainer = slider.querySelector('.sliderContainer');
    const beforeImageWrapper = slider.querySelector('.beforeImageWrapper');
    const sliderHandle = slider.querySelector('.sliderHandle');
    let isActive = false;

    function updateSliderPosition(e) {
      if (!isActive) return;
      
      const rect = sliderContainer.getBoundingClientRect();
      let x = e.clientX - rect.left;
      
      // Touch support
      if (e.touches) {
        x = e.touches[0].clientX - rect.left;
      }
      
      // Clamp between 0 and container width
      x = Math.max(0, Math.min(x, rect.width));
      
      const percentage = (x / rect.width) * 100;
      
      beforeImageWrapper.style.width = percentage + '%';
      sliderHandle.style.left = percentage + '%';
    }

    sliderContainer.addEventListener('mousedown', () => {
      isActive = true;
    });

    sliderContainer.addEventListener('touchstart', () => {
      isActive = true;
    });

    document.addEventListener('mouseup', () => {
      isActive = false;
    });

    document.addEventListener('touchend', () => {
      isActive = false;
    });

    document.addEventListener('mousemove', updateSliderPosition);
    document.addEventListener('touchmove', updateSliderPosition, { passive: false });

    // Click to position
    sliderContainer.addEventListener('click', (e) => {
      const rect = sliderContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = (x / rect.width) * 100;
      
      beforeImageWrapper.style.width = percentage + '%';
      sliderHandle.style.left = percentage + '%';
    });

    // Initialize at 50%
    beforeImageWrapper.style.width = '50%';
    sliderHandle.style.left = '50%';
  });

  // Case card click functionality
  const caseCards = document.querySelectorAll('.caseCard');
  caseCards.forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-slider');
      console.log('Selected case:', type);
      // You can add logic to swap images or navigate to case details
    });
  });
});
