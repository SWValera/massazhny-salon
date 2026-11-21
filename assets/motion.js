/* Progressive enhancement: content is always visible without animation or JS. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let cleanup = [];
  const running = new Set();

  function animate(element, frames, options) {
    if (typeof element.animate !== 'function') return;
    const animation = element.animate(frames, options);
    running.add(animation);
    animation.finished.then(() => running.delete(animation), () => running.delete(animation));
  }

  function setup() {
    cleanup.forEach(fn => fn());
    cleanup = [];
    running.forEach(animation => animation.cancel());
    running.clear();
    if (reducedMotion.matches) return;

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          // A focused control must never move away from a keyboard user.
          if (entry.target.contains(document.activeElement)) return;
          const index = [...entry.target.parentElement.children].indexOf(entry.target);
          animate(entry.target, [
            { opacity: .3, translate: '0 18px' },
            { opacity: 1, translate: '0 0' }
          ], { duration: 620, delay: Math.min(index, 2) * 65, easing: 'cubic-bezier(.2,.65,.25,1)' });
        });
      }, { threshold: .08 });
      document.querySelectorAll('.section-heading,.service-card,.approach-image,.approach-copy,.choice-result,.faq-section>div,.contact-section>div,.cta,.steps>div,.price-aside').forEach(element => {
        if (element.getBoundingClientRect().top > innerHeight) observer.observe(element);
      });
      cleanup.push(() => observer.disconnect());
    }

    if (finePointer.matches) {
      document.querySelectorAll('.service-card,.hero-visual').forEach(element => {
        element.dataset.depth = '';
        let frame = 0;
        function reset() {
          cancelAnimationFrame(frame);
          frame = 0;
          ['--rotate-x','--rotate-y','--spot-x','--spot-y'].forEach(name => element.style.removeProperty(name));
        }
        function move(event) {
          if (event.pointerType !== 'mouse') return;
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const bounds = element.getBoundingClientRect();
            const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
            const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
            element.style.setProperty('--rotate-x', `${(0.5-y)*2.4}deg`);
            element.style.setProperty('--rotate-y', `${(x-0.5)*2.4}deg`);
            element.style.setProperty('--spot-x', `${x*100}%`);
            element.style.setProperty('--spot-y', `${y*100}%`);
          });
        }
        element.addEventListener('pointermove', move, { passive: true });
        element.addEventListener('pointerleave', reset);
        element.addEventListener('pointercancel', reset);
        cleanup.push(() => {
          reset();
          delete element.dataset.depth;
          element.removeEventListener('pointermove', move);
          element.removeEventListener('pointerleave', reset);
          element.removeEventListener('pointercancel', reset);
        });
      });
    }
  }

  document.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    if (reducedMotion.matches) return;
    const result = document.querySelector('.choice-result');
    if (result) animate(result, [{ opacity: .6, translate: '0 5px' },{ opacity: 1, translate: '0 0' }], { duration: 250, easing: 'ease-out' });
  }));
  function updateVisibility() {
    document.documentElement.classList.toggle('motion-paused', document.hidden);
  }
  document.addEventListener('visibilitychange', updateVisibility);
  reducedMotion.addEventListener('change', setup);
  finePointer.addEventListener('change', setup);
  updateVisibility();
  setup();
})();
