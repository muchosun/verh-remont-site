const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/project-gallery.js'), 'utf8').replace(/^import .*;\n/, '');
const dataContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'assets/js/project-gallery-data.js'), 'utf8'), dataContext);
const items = dataContext.window.VERH_PROJECT_GALLERY_ITEMS;

function fixture({ reducedMotion = false, data = items } = {}) {
  let focused, lightbox;
  class Element {
    constructor(tag = 'div') { this.tag = tag; this.dataset = {}; this.attributes = {}; this.children = []; this.events = {}; this.hidden = false; this.scrollLeft = 0; this.clientWidth = 900; this.classList = { toggle() {} }; }
    setAttribute(key, value) { this.attributes[key] = value; }
    append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
    replaceChildren(fragment) { this.children = []; this.append(...fragment.children); }
    addEventListener(name, callback) { this.events[name] = callback; }
    click() { this.events.click?.({ isTrusted: true }); }
    focus() { focused = this; }
    scrollTo(options) { this.scrollLeft = options.left; this.lastScroll = options; }
    scrollBy(options) { this.scrollLeft = Math.max(0, Math.min(this.scrollWidth - this.clientWidth, this.scrollLeft + options.left)); this.lastScroll = options; this.events.scroll?.(); }
    scrollIntoView() { this.scrolledIntoView = true; }
    get offsetLeft() { return this.parent ? this.parent.children.indexOf(this) * 300 : 0; }
    get scrollWidth() { return this.children.length * 300; }
    closest() { return this; }
  }
  const node = dataset => Object.assign(new Element(), { dataset });
  const track = new Element();
  const count = new Element();
  const position = new Element();
  const previous = new Element();
  const next = new Element();
  const navigation = new Element();
  const more = new Element();
  const filters = ['all', 'standard', 'comfort', 'lux', 'details'].map(projectFilter => node({ projectFilter }));
  const views = ['slider', 'grid'].map(projectView => node({ projectView }));
  const gallery = node({ projectAssetsPrefix: 'assets/projects/' });
  gallery.querySelector = selector => ({ '[data-project-track]': track, '[data-project-count]': count, '[data-project-position]': position, '[data-project-prev]': previous, '[data-project-next]': next, '[data-project-navigation]': navigation, '[data-project-more]': more })[selector];
  gallery.querySelectorAll = selector => selector === '[data-project-filter]' ? filters : views;
  class Lightbox {
    constructor(options) { this.options = options; this.events = {}; lightbox = this; }
    on(name, callback) { this.events[name] = callback; }
    init() { this.initialized = true; }
  }
  const document = { querySelector: () => gallery, createElement: tag => new Element(tag), createDocumentFragment: () => new Element() };
  const window = { VERH_PROJECT_GALLERY_ITEMS: data, matchMedia: () => ({ matches: reducedMotion }), addEventListener() {}, cancelAnimationFrame() {}, requestAnimationFrame: callback => { callback(); return 1; } };
  vm.runInNewContext(source, { document, window, PhotoSwipeLightbox: Lightbox });
  return { track, count, position, previous, next, navigation, more, filters, views, gallery, lightbox, get focused() { return focused; }, get cards() { return track.children; }, get links() { return track.children.map(card => card.children[0]); } };
}

test('all source photographs exist and have dimensions required by the viewer', () => {
  assert.equal(items.length, 116);
  for (const item of items) {
    assert.ok(item.width > 0 && item.height > 0);
    assert.ok(fs.existsSync(path.join(root, 'assets/projects', item.path)), item.path);
  }
});
test('slider renders real image links with dimensions, fallback and lazy loading', () => {
  const f = fixture();
  assert.equal(f.cards.length, 116);
  assert.equal(f.count.textContent, '116 фото');
  assert.equal(f.previous.disabled, true);
  assert.equal(f.next.disabled, false);
  assert.equal(f.links.filter(link => link.tabIndex === 0).length, 1);
  assert.equal(f.links[0].href, `assets/projects/${items[0].path}`);
  assert.equal(f.links[0].dataset.pswpWidth, String(items[0].width));
  assert.equal(f.links[0].children[0].loading, 'lazy');
  assert.equal(f.lightbox.options.children, '.project-gallery__link');
  assert.equal(f.lightbox.initialized, true);
});
test('grid shows twelve at a time and the slider remains available', () => {
  const f = fixture();
  f.views[1].click();
  assert.equal(f.gallery.dataset.projectLayout, 'grid');
  assert.equal(f.cards.filter(card => !card.hidden).length, 12);
  assert.equal(f.more.hidden, false);
  assert.equal(f.navigation.hidden, true);
  f.more.click();
  assert.equal(f.cards.filter(card => !card.hidden).length, 24);
  assert.equal(f.focused, f.links[12]);
  f.views[0].click();
  assert.equal(f.cards.filter(card => !card.hidden).length, 116);
  assert.equal(f.more.hidden, true);
  assert.equal(f.navigation.hidden, false);
});
test('filters rebuild the lightbox source and reset progressive grid pagination', () => {
  const f = fixture();
  f.views[1].click(); f.more.click(); f.filters[2].click();
  assert.equal(f.cards.length, 35);
  assert.equal(f.count.textContent, '35 фото');
  assert.equal(f.cards.filter(card => !card.hidden).length, 12);
  assert.ok(f.links.every(link => link.href.includes('/comfort/')));
  f.more.click(); f.more.click();
  assert.equal(f.cards.filter(card => !card.hidden).length, 35);
  assert.equal(f.more.hidden, true);
});
test('category filters and slider photos have keyboard navigation', () => {
  const f = fixture();
  f.filters[0].events.keydown({ key: 'ArrowRight', preventDefault() {} });
  assert.equal(f.focused, f.filters[1]);
  assert.equal(f.count.textContent, '31 фото');
  f.track.events.keydown({ key: 'ArrowRight', target: f.links[0], preventDefault() {} });
  assert.equal(f.focused, f.links[1]);
  assert.equal(f.track.scrollLeft, 300);
});
test('reduced motion affects both the slider and the full-screen viewer', () => {
  const f = fixture({ reducedMotion: true });
  f.next.click();
  assert.equal(f.track.lastScroll.behavior, 'auto');
  assert.equal(f.lightbox.options.showHideAnimationType, 'none');
  assert.equal(f.lightbox.options.zoomAnimationDuration, 0);
});
test('closing from an unrevealed grid photo reveals it and restores focus', () => {
  const f = fixture();
  f.views[1].click();
  f.lightbox.pswp = { currIndex: 25 };
  f.lightbox.events.beforeClose(); f.lightbox.events.destroy();
  assert.equal(f.cards.filter(card => !card.hidden).length, 36);
  assert.equal(f.focused, f.links[25]);
  assert.equal(f.cards[25].scrolledIntoView, true);
});
test('closing the viewer restores the current slider photo without a page jump', () => {
  const f = fixture();
  f.lightbox.pswp = { currIndex: 4 };
  f.lightbox.events.beforeClose(); f.lightbox.events.destroy();
  assert.equal(f.track.scrollLeft, 1200);
  assert.equal(f.focused, f.links[4]);
});
test('captions use text content rather than injecting image titles as HTML', () => {
  const f = fixture();
  let registration, update;
  f.lightbox.pswp = { ui: { registerElement: options => { registration = options; } } };
  f.lightbox.events.uiRegister();
  const element = { setAttribute() {} };
  const pswp = { currSlide: { data: { element: { dataset: { caption: '<b>room</b>' } } } }, on: (name, fn) => { update = fn; } };
  registration.onInit(element, pswp);
  assert.equal(element.textContent, '<b>room</b>');
  assert.equal(element.innerHTML, undefined);
  pswp.currSlide.data.element.dataset.caption = 'Next room'; update();
  assert.equal(element.textContent, 'Next room');
});
test('empty image list has no broken navigation or visible load-more control', () => {
  const f = fixture({ data: [] });
  assert.equal(f.count.textContent, '0 фото');
  assert.equal(f.position.textContent, '0 / 0');
  assert.equal(f.next.disabled, true);
  f.views[1].click();
  assert.equal(f.more.hidden, true);
});
