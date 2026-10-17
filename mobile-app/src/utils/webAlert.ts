// react-native-web ships Alert.alert as a no-op, so error messages and
// confirm dialogs silently disappear in the browser. Map them onto
// window.alert / window.confirm instead.
import { Alert, Platform, type AlertButton } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const actions = buttons ?? [];

    if (actions.length < 2) {
      window.alert(text);
      actions[0]?.onPress?.();
      return;
    }

    const cancel = actions.find((b) => b.style === 'cancel');
    const confirm = actions.filter((b) => b !== cancel).pop();
    if (window.confirm(text)) confirm?.onPress?.();
    else cancel?.onPress?.();
  };
}
