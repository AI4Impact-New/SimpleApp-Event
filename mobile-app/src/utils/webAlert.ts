// React Native Web has no Alert implementation. Render every Alert.alert as an in-app,
// portal-styled <dialog> (never the browser's native alert/confirm) and preserve all named actions.
import { Alert, Platform, type AlertButton } from 'react-native';

// Tokens mirror src/theme/colors.ts. Inlined so this polyfill (loaded before the app) has no app imports.
const colors = { text: '#0b1628', textSecondary: '#4f5869', border: '#dce2e8', borderStrong: '#c3c8ce', backgroundCard: '#ffffff',
  backgroundAlt: '#f2f6fb', primary: '#018a74', primaryDark: '#016e5d', error: '#dc2626', white: '#ffffff' };
const navy950 = '#060f22';
const fonts = { display: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif', body: 'Inter, ui-sans-serif, system-ui, sans-serif' };

let stylesInjected = false;

const css = `
.ai4i-alert{max-width:420px;width:calc(100% - 40px);padding:24px 24px 20px;box-sizing:border-box;border:1px solid ${colors.border};border-radius:16px;
  background:${colors.backgroundCard};color:${colors.text};font-family:${fonts.body};
  box-shadow:0 24px 64px -16px ${navy950}59;}
.ai4i-alert::backdrop{background:${navy950}8c;backdrop-filter:blur(2px);}
.ai4i-alert[open]{display:flex;flex-wrap:wrap;justify-content:flex-end;column-gap:8px;animation:ai4i-alert-in .16s ease-out;}
@keyframes ai4i-alert-in{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
.ai4i-alert__title{flex:0 0 100%;margin:0;font-family:${fonts.display};font-size:19px;line-height:1.3;font-weight:600;color:${colors.text};}
.ai4i-alert__message{flex:0 0 100%;margin:8px 0 0;font-size:15px;line-height:1.55;color:${colors.textSecondary};white-space:pre-wrap;}
.ai4i-alert__btn{margin-top:20px;font:600 14px/1 ${fonts.body};padding:11px 18px;border-radius:10px;cursor:pointer;
  border:1px solid ${colors.borderStrong};background:${colors.backgroundCard};color:${colors.text};}
.ai4i-alert__btn:hover{background:${colors.backgroundAlt};}
.ai4i-alert__btn:focus-visible{outline:2px solid ${colors.primary};outline-offset:2px;}
.ai4i-alert__btn--primary{border-color:${colors.primary};background:${colors.primary};color:${colors.white};}
.ai4i-alert__btn--primary:hover{background:${colors.primaryDark};border-color:${colors.primaryDark};}
.ai4i-alert__btn--destructive{border-color:${colors.error};background:${colors.error};color:${colors.white};}
.ai4i-alert__btn--destructive:hover{background:#b91c1c;border-color:#b91c1c;}
@media (prefers-reduced-motion:reduce){.ai4i-alert[open]{animation:none;}}
`;

function ensureStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head ?? document.body).append(style);
}

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons, options) => {
    ensureStyles();
    const actions: AlertButton[] = buttons?.length ? buttons : [{ text: 'OK' }];
    const cancel = actions.find(b => b.style === 'cancel');
    // Cancel first, so the affirmative action sits on the right as in the rest of the portal.
    const ordered = cancel ? [cancel, ...actions.filter(b => b !== cancel)] : actions;
    const primary = ordered[ordered.length - 1];

    const dialog = document.createElement('dialog');
    dialog.className = 'ai4i-alert';
    dialog.setAttribute('aria-labelledby', 'ai4i-alert-title');
    if (message) dialog.setAttribute('aria-describedby', 'ai4i-alert-message');

    const heading = document.createElement('h2');
    heading.id = 'ai4i-alert-title';
    heading.className = 'ai4i-alert__title';
    heading.textContent = title;
    dialog.append(heading);
    if (message) {
      const text = document.createElement('p');
      text.id = 'ai4i-alert-message';
      text.className = 'ai4i-alert__message';
      text.textContent = message;
      dialog.append(text);
    }

    let settled = false;
    let lastButton: HTMLButtonElement | undefined;
    const finish = (run?: () => void) => {
      if (settled) return;
      settled = true;
      dialog.close();
      dialog.remove();
      run?.();
    };
    for (const action of ordered) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.text || 'OK';
      const variant = action.style === 'destructive' ? ' ai4i-alert__btn--destructive'
        : action === primary && action !== cancel ? ' ai4i-alert__btn--primary' : '';
      button.className = 'ai4i-alert__btn' + variant;
      button.onclick = () => finish(() => action.onPress?.());
      dialog.append(button);
      lastButton = button;
    }

    // Escape / backdrop dismissal: run cancel if there is one, a lone action counts as acknowledged,
    // otherwise just dismiss.
    const dismiss = () => finish(() => {
      if (cancel) cancel.onPress?.();
      else {
        if (actions.length === 1) actions[0].onPress?.();
        options?.onDismiss?.();
      }
    });
    dialog.oncancel = event => { event.preventDefault(); dismiss(); };
    // Buttons sit directly in the dialog, so a click on the dialog itself is either its padding or the backdrop.
    dialog.onclick = event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismiss();
    };

    document.body.append(dialog);
    dialog.showModal();
    lastButton?.focus?.();
  };
}
