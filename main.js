/* ==========================================================================
   Luis Ramirez — portfolio behaviour
   Progressive enhancement only: every feature below degrades to working,
   scrollable, keyboard-navigable HTML if JS never runs.
   ========================================================================== */

(function () {
    'use strict';

    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var carouselMQ = window.matchMedia('(max-width: 767px)');

    /* ---------------------------------------------------------------- year */

    function setYear() {
        var el = document.getElementById('year');
        if (el) el.textContent = new Date().getFullYear();
    }

    /* ------------------------------------------------- sticky nav condense */

    function initTopbar() {
        var topbar = document.getElementById('topbar');
        if (!topbar) return;

        var ticking = false;

        function update() {
            topbar.classList.toggle('is-scrolled', window.scrollY > 24);
            ticking = false;
        }

        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(update);
        }, { passive: true });

        update();
    }

    /* ------------------------------------------- card tilt + holo sheen */

    function initCards() {
        var cards = document.querySelectorAll('.card');
        if (!cards.length) return;

        var MAX_TILT = 6; // degrees, per spec

        function enable() {
            Array.prototype.forEach.call(cards, function (card) {
                if (card.dataset.tiltBound === 'true') return;
                card.dataset.tiltBound = 'true';

                var frame = card.querySelector('.card__frame');
                if (!frame) return;
                var raf = null;
                var pending = null;

                function apply() {
                    raf = null;
                    if (!pending) return;
                    frame.style.setProperty('--rx', pending.rx.toFixed(2) + 'deg');
                    frame.style.setProperty('--ry', pending.ry.toFixed(2) + 'deg');
                    frame.style.setProperty('--mx', pending.mx.toFixed(1) + '%');
                    frame.style.setProperty('--my', pending.my.toFixed(1) + '%');
                    frame.style.setProperty('--sheen-x', pending.sheen.toFixed(1) + '%');
                }

                card.addEventListener('pointermove', function (e) {
                    if (e.pointerType !== 'mouse' || !finePointer.matches || reducedMotion.matches) return;

                    var r = card.getBoundingClientRect();
                    if (!r.width || !r.height) return;

                    var px = (e.clientX - r.left) / r.width;   // 0..1
                    var py = (e.clientY - r.top) / r.height;   // 0..1

                    pending = {
                        rx: (0.5 - py) * MAX_TILT * 2,
                        ry: (px - 0.5) * MAX_TILT * 2,
                        mx: px * 100,
                        my: py * 100,
                        sheen: px * 100
                    };

                    card.classList.add('is-tilting');
                    if (raf === null) raf = window.requestAnimationFrame(apply);
                }, { passive: true });

                function reset() {
                    pending = null;
                    if (raf !== null) {
                        window.cancelAnimationFrame(raf);
                        raf = null;
                    }
                    card.classList.remove('is-tilting');
                    frame.style.removeProperty('--rx');
                    frame.style.removeProperty('--ry');
                    frame.style.removeProperty('--sheen-x');
                }

                card.addEventListener('pointerleave', reset);
                card.addEventListener('pointercancel', reset);
                card.addEventListener('blur', reset, true);
            });
        }

        function disable() {
            Array.prototype.forEach.call(cards, function (card) {
                var frame = card.querySelector('.card__frame');
                if (!frame) return;
                card.classList.remove('is-tilting');
                frame.removeAttribute('style');
            });
        }

        function sync() {
            if (finePointer.matches && !reducedMotion.matches) enable();
            else disable();
        }

        addMQListener(finePointer, sync);
        addMQListener(reducedMotion, sync);
        sync();
    }

    /* ------------------------------------------------ mobile deck carousel */

    function initDeck() {
        var deck = document.getElementById('deck');
        var dotsWrap = document.getElementById('deck-dots');
        if (!deck || !dotsWrap) return;

        var cards = Array.prototype.slice.call(deck.querySelectorAll('.card'));
        if (cards.length < 2) return;

        /* build dots once */
        /* Scroll one card into view, aligned to the deck's leading edge. */
        function goTo(index) {
            var i = Math.max(0, Math.min(cards.length - 1, index));
            var deckLeft = deck.getBoundingClientRect().left;
            var target = deck.scrollLeft + (cards[i].getBoundingClientRect().left - deckLeft) - 12;
            deck.scrollTo({
                left: Math.max(0, target),
                behavior: reducedMotion.matches ? 'auto' : 'smooth'
            });
        }

        var dots = cards.map(function (card, i) {
            var b = document.createElement('button');
            b.type = 'button';
            b.setAttribute('aria-label', 'Show project ' + (i + 1) + ' of ' + cards.length);
            b.addEventListener('click', function () { goTo(i); });
            dotsWrap.appendChild(b);
            return b;
        });

        function setActive(index) {
            dots.forEach(function (d, i) {
                if (i === index) d.setAttribute('aria-current', 'true');
                else d.removeAttribute('aria-current');
            });
        }

        /* Which card currently leads the viewport. Derived straight from scroll
           position rather than an IntersectionObserver: with a scroll-container
           root, IO delivery is throttled and lags the snap. */
        function currentIndex() {
            var deckLeft = deck.getBoundingClientRect().left;
            var threshold = deck.clientWidth * 0.4;
            var best = 0;
            for (var i = 0; i < cards.length; i++) {
                if (cards[i].getBoundingClientRect().left - deckLeft < threshold) best = i;
            }
            return best;
        }

        var syncing = false;

        function syncDots() {
            syncing = false;
            setActive(currentIndex());
        }

        deck.addEventListener('scroll', function () {
            if (syncing) return;
            syncing = true;
            window.requestAnimationFrame(syncDots);
        }, { passive: true });

        window.addEventListener('resize', syncDots, { passive: true });
        setActive(0);

        /* Mouse wheels only emit vertical deltas. Translate them to horizontal
           scroll while the deck still has room, so the carousel is usable with
           a wheel and not just a touch swipe. Once the deck hits either end the
           event is left alone and the page scrolls as normal. */
        deck.addEventListener('wheel', function (e) {
            if (!carouselMQ.matches || !finePointer.matches) return;
            if (e.ctrlKey) return;
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // native h-scroll

            var max = deck.scrollWidth - deck.clientWidth;
            if (max <= 1) return;

            var next = deck.scrollLeft + e.deltaY;
            if (next <= 0 || next >= max) return; // at an edge: let the page scroll

            e.preventDefault();
            deck.scrollLeft = next;
        }, { passive: false });

        /* Keyboard: make the scroller a focus target only while it is actually
           a scroller, so desktop does not gain a dead tab stop. */
        function syncAffordances() {
            if (carouselMQ.matches) {
                deck.setAttribute('tabindex', '0');
                deck.setAttribute('role', 'group');
                deck.setAttribute('aria-label', 'Projects carousel — scroll or use arrow keys');
                dotsWrap.hidden = false;
            } else {
                deck.removeAttribute('tabindex');
                deck.removeAttribute('role');
                deck.removeAttribute('aria-label');
                dotsWrap.hidden = true;
                deck.scrollLeft = 0;
            }
        }

        deck.addEventListener('keydown', function (e) {
            if (!carouselMQ.matches) return;
            if (e.target !== deck) return;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                goTo(currentIndex() + 1);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goTo(currentIndex() - 1);
            } else if (e.key === 'Home') {
                e.preventDefault();
                goTo(0);
            } else if (e.key === 'End') {
                e.preventDefault();
                goTo(cards.length - 1);
            }
        });

        addMQListener(carouselMQ, syncAffordances);
        syncAffordances();
    }

    /* --------------------------------------------------------------- utils */

    function addMQListener(mq, fn) {
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', fn);
        else if (typeof mq.addListener === 'function') mq.addListener(fn);
    }

    /* ----------------------------------------------------------------- boot */

    function boot() {
        setYear();
        initTopbar();
        initCards();
        initDeck();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
}());
