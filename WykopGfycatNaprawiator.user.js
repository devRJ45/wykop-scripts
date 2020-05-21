// ==UserScript==
// @name         Wykop GfyCat Naprawiator 3000
// @namespace    wykopgfycatnaprawiator
// @version      0.1
// @description  Dodaje przycisk naprawiający linki gfycat
// @author       devRJ45
// @match        https://www.wykop.pl/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

/*globals $*/

(function() {
    'use strict';

    function repairLink (link) {
        var linkId = link.split('/').pop().split('-').shift();
        return `https://gfycat.com/NaprawionyPrzezRJ45/pl/${linkId}`;
    }

    function removeRepairButton () {
        var container = $('fieldset.row.buttons.selectUrl').first();
        container.find('a.repairGfyButton').remove();
    }

    function showRepairButton () {
        removeRepairButton();

        var container = $('fieldset.row.buttons.selectUrl').first();
        var button = $(`<a href="#" class="repairGfyButton">Napraw link Gfy</a>`);

        button.click(() => {
            var input = $('input.embedUrl').first();
            input.val(repairLink(input.val()));
        });

        container.prepend(button);
    }

    function tryRepairLink (e) {
        var input = $('input.embedUrl').first();
        var url = input.val();
        if (url.indexOf('https://gfycat.com/') == 0 || url.indexOf('http://gfycat.com/') == 0) {
            showRepairButton();
        } else {
            removeRepairButton();
        }
    }

    $(document).on('change', 'input.embedUrl', tryRepairLink);
    $(document).on('paste', 'input.embedUrl', tryRepairLink);
    $(document).on('keyup', 'input.embedUrl', tryRepairLink);
})();
