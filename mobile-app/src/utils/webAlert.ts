// React Native Web has no Alert implementation. Preserve all named actions.
import { Alert, Platform, type AlertButton } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons, options) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions: AlertButton[] = buttons?.length ? buttons : [{ text: 'OK' }];
    if (actions.length === 1) {
      window.alert(text);
      actions[0].onPress?.();
      return;
    }
    const cancel = actions.find(b => b.style === 'cancel');
    if (actions.length === 2 && cancel) {
      const confirm = actions.find(b => b !== cancel)!;
      if (window.confirm(text)) confirm.onPress?.();
      else cancel.onPress?.();
      return;
    }
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', title);
    dialog.style.cssText = 'max-width:420px;width:calc(100% - 48px);border:1px solid #dbeafe;border-radius:16px;padding:24px;color:#0f172a;background:white;';
    const heading = document.createElement('h2'); heading.textContent = title;
    const body = document.createElement('p'); body.textContent = message || ''; body.style.whiteSpace = 'pre-wrap';
    dialog.append(heading, body);
    const close = () => { dialog.close(); dialog.remove(); };
    for (const action of actions) {
      const button = document.createElement('button'); button.textContent = action.text || 'OK';
      button.style.cssText = 'margin:8px 8px 0 0;padding:10px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#f0f9ff;cursor:pointer;';
      button.onclick = () => { close(); action.onPress?.(); }; dialog.append(button);
    }
    dialog.oncancel = event => { event.preventDefault(); close(); if (cancel) cancel.onPress?.(); else options?.onDismiss?.(); };
    document.body.append(dialog); dialog.showModal();
  };
}
