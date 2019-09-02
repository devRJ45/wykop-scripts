// ==UserScript==
// @name         WykopEmbedHelper
// @namespace    wykopembedhelper
// @version      0.2
// @description  Skrypt pozwala na wklejanie obrazka ze schowka bez zapisywania go na dysku komputera
// @author       RJ45
// @match        https://www.wykop.pl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.addEventListener('paste', e => {
        if (document.querySelector('.embedFile') && e.clipboardData.files[0]) {
            let input = document.querySelector('.embedFile').querySelector('input');
            input.files = e.clipboardData.files;

            //dispatch Event
            let event = new Event('HTMLEvents');
            event.initEvent('change', false, true);
            input.dispatchEvent(event);
        }
    });
})();
