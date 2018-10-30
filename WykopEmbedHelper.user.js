// ==UserScript==
// @name         WykopEmbedHelper
// @namespace    wykopembedhelper
// @version      0.1
// @description  Skrypt pozwala na wklejanie obrazka ze schowka bez zapisywania go na dysku komputera
// @author       RJ45
// @match        https://www.wykop.pl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.addEventListener('paste', e => {
        if (document.querySelector('.embedFile') && e.clipboardData.files[0]) {
            document.querySelector('.embedFile').querySelector('input').files = e.clipboardData.files;
        }
    });
})();