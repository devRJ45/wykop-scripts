// ==UserScript==
// @name         WykopEmbedHelper
// @namespace    wykopembedhelper
// @version      0.4.1
// @description  Skrypt pozwala na wklejanie obrazka ze schowka bez zapisywania go na dysku komputera
// @author       RJ45
// @match        https://wykop.pl/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.addEventListener('paste', e => {
        let file = e?.clipboardData?.files[0];
        
        if (file == null) {
            return;
        }

        let dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);


        if (document.querySelector('.upload')) {
            let input = document.querySelector('.upload').querySelector('input[type=file]');
            input.files = dataTransfer.files;

            console.log(input.files);

            //dispatch Event
            let event = new Event('HTMLEvents');
            event.initEvent('change', false, true);
            input.dispatchEvent(event);
            
            return;
        }

        if (document.activeElement.tagName != 'TEXTAREA') {
            return;
        }

        let sectionNode = document.activeElement.closest('section.editor');

        if (sectionNode == null) {
            return;
        }

        let fakeDropEvent = {
            preventDefault: () => {},
            stopPropagation: () => {},
            dataTransfer: dataTransfer
        };

        document.activeElement.closest('section').__vue__.drop(fakeDropEvent);
    });
})();
