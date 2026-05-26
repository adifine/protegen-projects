(function () {
  var PASSWORD = 'FineDesigns';
  var SESSION_KEY = 'af_auth';

  function isAuthenticated() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }

  function unlock() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
    var overlay = document.getElementById('auth-overlay');
    if (overlay) overlay.remove();
  }

  function showGate() {
    var overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.innerHTML =
      '<div class="auth-box">' +
        '<p class="auth-eyebrow">Welcome</p>' +
        '<h1 class="auth-heading">Adi Fine</h1>' +
        '<p class="auth-sub">This portfolio is password protected.</p>' +
        '<form id="auth-form" novalidate>' +
          '<input type="password" id="auth-input" placeholder="Password" autocomplete="current-password" aria-label="Password">' +
          '<button type="submit" class="btn btn-primary auth-btn">Enter</button>' +
        '</form>' +
        '<p id="auth-error" class="auth-error" role="alert" aria-live="polite"></p>' +
      '</div>';
    document.body.appendChild(overlay);

    var input = document.getElementById('auth-input');
    var error = document.getElementById('auth-error');
    input.focus();

    document.getElementById('auth-form').addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value === PASSWORD) {
        unlock();
      } else {
        error.textContent = 'Incorrect password — please try again.';
        input.value = '';
        input.focus();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!isAuthenticated()) {
      showGate();
    }
  });
}());
