import { createApp } from 'vue';
import App from './App.vue';
import './styles.css';

createApp(App).mount('#app');

if (
  typeof globalThis !== 'undefined' &&
  'document' in globalThis &&
  'ontouchend' in globalThis
) {
  let lastTouchEnd = 0;
  const doc = globalThis.document;
  doc.addEventListener(
    'touchend',
    (event: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}
