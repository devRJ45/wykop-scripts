// ==UserScript==
// @name         PustoWpis
// @namespace    wykoppustowpis
// @version      0.1
// @description  Dodaje przycisk do wysyłania pustych wpisów
// @author       devRJ45
// @match        https://www.wykop.pl/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  const getRandomId = () => Array(6).fill(0).map(n => Math.round(Math.random()*9)).join('');
  const getRandomIMGUrl = () => `https://www.wykop.pl/cdn/c3201142/comment_1604${getRandomId()}.jpg`;

  const getClosestWithClassName = (element, className) => {
    while (element && element !== document) {
      if (element.className == className)
        return element;
      element = element.parentElement;
    }
    return null;
  }

  function sendEmptyEntry(event) {
    event.preventDefault();

    let form = getClosestWithClassName(event.target.parentElement, 'mfUploadHolder');

    form.querySelector('textarea[name=body]').innerHTML = '';
    form.querySelector('textarea[name=body]').value = '';

    let attachment = form.querySelector('input[name=attachment]');
    if (attachment == null) {
      attachment = document.createElement('input');
      attachment.type = 'hidden';
      attachment.name = 'attachment';
      form.append(attachment)
    }
    attachment.value = getRandomIMGUrl();

    form.querySelector('button.submit').click();

    return false;
  }

  document.addEventListener('DOMNodeInserted', (e) => {
    let form = e.target.parentElement;

    if (form.className !== 'mfUploadHolder')
        return;

    if (form.querySelector('a.erjotte-empty') != null)
        return;

    let row = form.querySelector('fieldset.row.buttons.dnone');
    let container = [...row.querySelectorAll('p')].pop();

    let button = document.createElement('a');
    button.href = '#';
    button.className = 'button erjotte-empty';
    button.innerText = 'Wyślij pusty';
    button.style = 'margin-right: 5px;';

    button.addEventListener('click', sendEmptyEntry);

    container.prepend(button);
  })
})();