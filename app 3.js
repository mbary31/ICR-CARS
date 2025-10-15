/* ICR_HOTFIX_V2_20251015204140_UTC */
/* HOTFIX: 
   - 'Ver ficha' button must always navigate (prevent parent handlers)
   - On LISTING pages, clicking images/cards must NOT open lightbox/overlays
   - Detail page lightbox remains unchanged
*/
(function(){"use strict";
  const on = (el, ev, fn, cap=false)=> el && el.addEventListener(ev, fn, cap);

  document.addEventListener('DOMContentLoaded', function(){

    // 1) Force 'Ver ficha' to navigate (block parent interceptors)
    on(document.body, 'click', function(e){
      const a = e.target.closest('a.btn');
      if(!a) return;
      if(a.href && a.href.indexOf('detalle.html') !== -1){
        e.stopPropagation(); // block any card/lightbox handlers
        // allow default navigation
      }
    }, true); // capture = true

    // 2) On LISTING pages, prevent images/cards from triggering overlays
    const isListing = document.querySelector('#ultimo, #lista');
    if(isListing){
      // prevent clicks on media area from bubbling to any global overlay openers
      on(document.body, 'click', function(e){
        // If click is inside a card media (image area) and NOT on a real link, absorb it
        const media = e.target.closest('.card .media');
        const link  = e.target.closest('a');
        if(media && !link){
          e.preventDefault();
          e.stopPropagation();
        }
      }, true); // capture to catch before others
    }
  });
})();
