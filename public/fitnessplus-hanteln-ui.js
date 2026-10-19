/* FitnessPlus currency display: diamonds -> dumbbells, UI only. */
(() => {
  'use strict';
  const textChange = text => text
    .replace(/Diamantenboxen|Diamantboxen/g, 'Hantelboxen')
    .replace(/Diamanten/g, 'Hanteln')
    .replace(/Diamant/g, 'Hantel')
    .replace(/diamanten/g, 'hanteln')
    .replace(/diamant/g, 'hantel')
    .replace(/💎/g, '🏋️');
  const selectors = '[title],[aria-label],[placeholder],[alt],input[type="button"],input[type="submit"]';
  const skip = 'SCRIPT,STYLE,NOSCRIPT,TEXTAREA,OPTION';
  function update(root) {
    if (root.nodeType === 3) {
      if (root.parentElement?.closest('script,style,noscript,textarea')) return;
      const before = root.nodeValue || '';
      const after = textChange(before);
      if (after !== before) root.nodeValue = after;
      return;
    }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    const elems = [];
    if (root.nodeType === 1 && root.matches(selectors)) elems.push(root);
    if (root.querySelectorAll) elems.push(...root.querySelectorAll(selectors));
    for (const el of elems) {
      if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
      for (const att of ['title','aria-label','placeholder','alt']) {
        if (!el.hasAttribute(att)) continue;
        const before = el.getAttribute(att);
        const after = textChange(before);
        if (after !== before) el.setAttribute(att, after);
      }
      if (el instanceof HTMLInputElement && (el.type === 'button' || el.type === 'submit')) {
        const after = textChange(el.value);
        if (after !== el.value) el.value = after;
      }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let text;
    while ((text = walker.nextNode())) {
      if (!text.parentElement || skip.includes(text.parentElement.tagName)) continue;
      const before = text.nodeValue;
      const after = textChange(before);
      if (after !== before) text.nodeValue = after;
    }
  }
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; update(document.body); });
  }
  function start() {
    if (!document.body) return;
    update(document.body);
    new MutationObserver(schedule).observe(document.body, {subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder','alt','value']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
