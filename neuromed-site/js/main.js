// Neuromed Medical — page behaviour: FAQ accordion and WhatsApp booking.
(function () {
  'use strict';
  window.nmReady = true;

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

  // Scroll reveals: fade sections in as they enter the screen.
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    // Stagger items that sit side by side or in a list.
    reveals.forEach(function (el) {
      var group = el.parentElement && el.parentElement.tagName === 'LI' ? el.parentElement.parentElement : el.parentElement;
      var siblings = group ? group.querySelectorAll(':scope > .reveal, :scope > li > .reveal') : [];
      var index = Array.prototype.indexOf.call(siblings, el);
      if (index > 0) el.style.setProperty('--delay', Math.min(index, 4) * 0.08 + 's');
    });
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          el.classList.add('is-in');
          revealer.unobserve(el);
          // Once faded in, drop the reveal styles so the element's own hover and tap
          // transitions work normally again.
          setTimeout(function () {
            el.classList.remove('reveal', 'is-in');
            el.style.removeProperty('--delay');
          }, 1400);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { revealer.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Phones: hide the header while scrolling down, bring it back when scrolling up,
  // and move the quick-contact bar aside while the booking form is on screen.
  var header = document.querySelector('.site-header');
  var mbar = document.getElementById('mbar');
  var hero = document.getElementById('top');
  var phone = window.matchMedia('(max-width: 760px)');
  var lastY = window.scrollY;
  var ticking = false;
  var bookInView = false;

  function onScroll() {
    var y = window.scrollY;
    if (phone.matches && header) {
      var goingDown = y > lastY;
      if (Math.abs(y - lastY) > 6) {
        header.classList.toggle('is-hidden', goingDown && y > 160);
        lastY = y;
      }
    } else if (header) {
      header.classList.remove('is-hidden');
      lastY = y;
    }
    if (mbar) mbar.classList.toggle('is-hidden', bookInView);
    if (header && hero) header.classList.toggle('show-cta', y > hero.offsetTop + hero.offsetHeight * 0.55);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onScroll);
    }
  }, { passive: true });

  // Keep the bar out of the way while the booking form is on screen.
  var book = document.getElementById('book');
  if (book && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      bookInView = entries[0].isIntersecting;
      onScroll();
    }, { threshold: 0.15 }).observe(book);
  }
})();
