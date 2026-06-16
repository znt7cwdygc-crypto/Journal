const script = `
(function(){
  if (window.__weQuizStepperReady) return;
  window.__weQuizStepperReady = true;

  function sync(root, nextStep) {
    var steps = Array.prototype.slice.call(root.querySelectorAll('[data-quiz-step]'));
    var labels = [];
    try { labels = JSON.parse(root.getAttribute('data-quiz-steps') || '[]'); } catch (_) {}
    var max = Math.max(0, steps.length - 1);
    var step = Math.max(0, Math.min(max, Number(nextStep) || 0));
    root.setAttribute('data-quiz-step-current', String(step));

    steps.forEach(function(item, index) {
      var active = index === step;
      item.classList.toggle('hidden', !active);
      item.classList.toggle('min-h-0', active);
      item.classList.toggle('flex-1', active);
      if (active) item.setAttribute('data-active', 'true');
      else item.removeAttribute('data-active');
    });

    var current = root.querySelector('[data-quiz-current]');
    var title = root.querySelector('[data-quiz-title]');
    var progress = root.querySelector('[data-quiz-progress]');
    var bar = root.querySelector('[data-quiz-progress-bar]');
    var back = root.querySelector('[data-quiz-back]');
    var percent = Math.round(((step + 1) / Math.max(1, steps.length)) * 100);
    if (current) current.textContent = String(step + 1);
    if (title) title.textContent = labels[step] || '';
    if (progress) progress.textContent = percent + '%';
    if (bar) bar.style.width = percent + '%';
    if (back) back.disabled = step === 0;
  }

  function canGoNext(root) {
    var active = root.querySelector('[data-active=\"true\"]');
    if (!active) return true;
    var controls = Array.prototype.slice.call(active.querySelectorAll('input, textarea, select'));
    for (var i = 0; i < controls.length; i++) {
      if (!controls[i].checkValidity()) {
        controls[i].reportValidity();
        return false;
      }
    }
    return true;
  }

  document.addEventListener('click', function(event) {
    var next = event.target.closest('[data-quiz-next]');
    var back = event.target.closest('[data-quiz-back]');
    if (!next && !back) return;
    var root = event.target.closest('[data-quiz-root]');
    if (!root) return;
    event.preventDefault();
    var current = Number(root.getAttribute('data-quiz-step-current') || '0');
    if (next) {
      if (!canGoNext(root)) return;
      sync(root, current + 1);
    } else {
      sync(root, current - 1);
    }
    root.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, true);

  function init() {
    document.querySelectorAll('[data-quiz-root]').forEach(function(root) {
      sync(root, Number(root.getAttribute('data-quiz-step-current') || '0'));
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
`;

export function QuizStepperScript() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
