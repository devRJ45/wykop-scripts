// ==UserScript==
// @name         WykopFloatingPlayer
// @namespace    wykopfloatingplayer
// @version      0.1
// @description  Dodaje player znaleziska widoczny podczas czytania komentarzy.
// @author       RJ45
// @match        https://www.wykop.pl/link/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const style = `
        .dockedWrapper {
            position: absolute;
            width: 100%;
            height: 100%;
        }
        .dockedWrapper .originalVideoWrapper {
            height: 100%;
            width: 100%;
        }
        .dockedWrapper .originalVideoWrapper iframe {
            height: 100%;
        }

        .floatingWrapper {
            position: fixed;
            width: 320px;
            top: 50px;
            left: 20px;
            z-index: 100;
        }
        .floatingWrapper .originalVideoWrapper {
            position: absolute;
            height: 100%;
            width: 100%;
            padding-bottom: 56.25%;
        }
        .floatingWrapper .originalVideoWrapper iframe {
            position: absolute;
            height: 100%;
            width: 100%;
        }
    `;

    //inject style
    var styleElement = document.createElement('style');
    styleElement.setAttribute('type', 'text/css');
    styleElement.innerHTML = style;
    document.head.after(styleElement);

    $(document).ready(function () {
        var $wrapper = $('.videoWrapper');

        if ($wrapper.length == 0)
            return;

        //DOM helper
        var $floatingWrapper = $('<div class="dockedWrapper" />');
        var $mainContainer = $wrapper.parent();

        $mainContainer.append($floatingWrapper);

        $mainContainer.append('<div class="videoWrapper" />');
        $floatingWrapper.append($wrapper);

        $wrapper.removeClass('videoWrapper');
        $wrapper.addClass('originalVideoWrapper');

        var playerTopPosition = $('#nav').height() + 15;        
        var positionStyle = ``;

        function updatePositionStyle () {
            var width = $('.grid-right').width();
            var left = $('.grid-right').offset().left;

            positionStyle = `top: ${playerTopPosition}px; left: ${left}px; width: ${width}px;`;
            
            if ($floatingWrapper.hasClass('floatingWrapper'))
                $floatingWrapper[0].style = positionStyle;
            else
            $floatingWrapper[0].style = '';
        }
        updatePositionStyle();

        
        //scroll
        var top = $mainContainer.offset().top + $mainContainer.height() - $('#nav').height();

        $(window).on('resize', () => {
            top = $mainContainer.offset().top + $mainContainer.height() - $('#nav').height();
            updatePositionStyle();
        }).on('scroll', () => {
            if ($(window).scrollTop() > top) {
                if (!$floatingWrapper.hasClass('floatingWrapper')) {
                    $floatingWrapper.addClass('floatingWrapper');
                    $floatingWrapper.removeClass('dockedWrapper');
                    updatePositionStyle();
                }
            } else {
                if ($floatingWrapper.hasClass('floatingWrapper')) {
                    $floatingWrapper.removeClass('floatingWrapper');
                    $floatingWrapper.addClass('dockedWrapper');
                    updatePositionStyle();
                }
            }
        });
    });

})();