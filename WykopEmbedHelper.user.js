// ==UserScript==
// @name         WykopEmbedHelper
// @namespace    wykopembedhelper
// @version      0.3
// @description  Skrypt pozwala na wklejanie obrazka ze schowka bez zapisywania go na dysku komputera
// @author       RJ45
// @match        https://wykop.pl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.addEventListener('paste', e => {
        if (document.querySelector('.upload') && e.clipboardData.files[0]) {
            let input = document.querySelector('.upload').querySelector('input[type=file]');
            input.files = e.clipboardData.files;

            //dispatch Event
            let event = new Event('HTMLEvents');
            event.initEvent('change', false, true);
            input.dispatchEvent(event);
        }
    });
})();
