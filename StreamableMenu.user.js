// ==UserScript==
// @name         Streamable Menu
// @namespace    streamablemenu
// @version      0.1
// @description  Dodaje przycisk pobierania i dodatkowe ustawienia prędkości do Streamable
// @author       devRJ45
// @match        https://streamable.com/*
// @icon         https://www.google.com/s2/favicons?domain=streamable.com
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  // download
  let menu = document.querySelector('#context-menu');
  let copyURLItem = menu.querySelector('#copyurl');

  let downloadButton = document.createElement('a');
  downloadButton.className = 'context-menu-item';
  downloadButton.innerText = 'Download video';
  downloadButton.href = document.querySelector('video').src;
  downloadButton.target = '_blank';

  copyURLItem.after(downloadButton);

  // speed
  let newSpeed = document.createElement('span');
  newSpeed.className = 'speed-button context-menu-selection-item-button';
  newSpeed.innerText = '1.25';
  newSpeed.setAttribute('data-speed', '1.25');

  let speedNormal = document.querySelector(`.speed-button.context-menu-selection-item-button[data-speed="1"]`);

  speedNormal.before(newSpeed);

  newSpeed.addEventListener('click', () => {
    document.querySelectorAll(`.speed-button.context-menu-selection-item-button`).forEach(n => n.classList.remove('active'));
    newSpeed.classList.add('active');
    document.querySelector(`video`).playbackRate = 1.25;
  });

  let sliderRow = document.createElement(`div`);
  sliderRow.style.width = `100%`;

  let slider = document.createElement(`input`);
  slider.setAttribute(`type`, `range`);
  slider.setAttribute(`min`, `20`);
  slider.setAttribute(`max`, `200`);
  slider.setAttribute(`value`, `100`);
  slider.setAttribute(`step`, `5`);
  slider.style.width = `100%`;

  sliderRow.append(slider);

  document.querySelector(`.context-menu-item.context-menu-selection-item.separator`).lastElementChild.after(sliderRow);

  document.querySelectorAll(`.speed-button`).forEach(n => {
    n.addEventListener(`click`, () => {
      let speed = n.getAttribute('data-speed');
      speed = parseFloat(speed);

      slider.value = speed*100;
    });
  });

  slider.addEventListener(`input`, () => {
    let newSpeed = parseInt(slider.value)/100;
    document.querySelector(`video`).playbackRate = newSpeed;

    let speedString = newSpeed.toString();

    if (speedString.indexOf('0.') == 0) {
      speedString = speedString.substring(1);
    }

    document.querySelectorAll(`.speed-button.context-menu-selection-item-button`).forEach(n => n.classList.remove('active'));

    let speedButton = document.querySelector(`.speed-button.context-menu-selection-item-button[data-speed="${speedString}"]`);
    if (speedButton != null) {
      speedButton.classList.add(`active`);
    }
  })
})();