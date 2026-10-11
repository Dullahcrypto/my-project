// Neuromed Medical — page behaviour: FAQ accordion and WhatsApp booking.
(function () {
  'use strict';

  var WHATSAPP_NUMBER = '2348131026221';

  // FAQ: one answer open at a time.
  var questions = document.querySelectorAll('.faq-q');
  questions.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wasOpen = btn.getAttribute('aria-expanded') === 'true';
      questions.forEach(function (other) {
        other.setAttribute('aria-expanded', 'false');
        document.getElementById(other.getAttribute('aria-controls')).hidden = true;
      });
      if (!wasOpen) {
        btn.setAttribute('aria-expanded', 'true');
        document.getElementById(btn.getAttribute('aria-controls')).hidden = false;
      }
    });
  });

  // Booking form: build a WhatsApp message and open WhatsApp.
  var form = document.getElementById('book-form');
  var done = document.getElementById('book-done');
  var retry = document.getElementById('wa-retry');
  var again = document.getElementById('book-again');

  if (form && done) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var lines = [
        'Hello Neuromed, I would like to book an appointment.',
        'Name: ' + (data.get('name') || '').trim(),
        'Phone: ' + (data.get('phone') || '').trim(),
        'Service: ' + data.get('service')
      ];
      var notes = (data.get('notes') || '').trim();
      if (notes) lines.push('Symptoms: ' + notes);

      var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      retry.href = url;

      var win = window.open(url, '_blank');
      if (win) {
        win.opener = null;
      } else {
        // Pop-up blocked: go to WhatsApp in this tab instead.
        window.location.href = url;
      }

      form.hidden = true;
      done.hidden = false;
      done.focus();
    });

    again.addEventListener('click', function () {
      form.reset();
      done.hidden = true;
      form.hidden = false;
      form.querySelector('input[name="name"]').focus();
    });
  }

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
