// Context menu window — runs inside context-menu.html
import { getCurrentWindow } from '@tauri-apps/api/window';
import { emit } from '@tauri-apps/api/event';

var appWindow = getCurrentWindow();

function action(name) {
  // Hide after emit completes so the event reaches main before the window closes
  console.log('Action:', name);
  emit('contextmenu:action', { action: name })
    .then(function() {
      console.log('Event sent, hiding window');
      appWindow.hide().catch(function(e) { console.error('Hide error:', e); });
    })
    .catch(function(e) {
      console.error('Emit error:', e);
      appWindow.hide().catch(function() {});
    });
}

// Use mousedown so action fires before blur hides the window
document.getElementById('menu-settings').addEventListener('mousedown', function() { action('settings'); });
document.getElementById('menu-inspect').addEventListener('mousedown', function() { action('inspect'); });
document.getElementById('menu-quit').addEventListener('mousedown', function() { action('quit'); });

// Close when window loses focus (user clicked elsewhere).
// Delay prevents blur firing immediately after setFocus() on open.
var blurEnabled = false;
appWindow.listen('tauri://focus', function() {
  blurEnabled = false;
  setTimeout(function() { blurEnabled = true; }, 250);
});
window.addEventListener('blur', function() {
  if (blurEnabled) appWindow.hide().catch(function() {});
});
