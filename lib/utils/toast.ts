export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

type ToastListener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach((l) => l([...toasts]));
}

export const toast = {
  show(text: string, type: 'success' | 'error' | 'info' = 'info') {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, type, text };
    toasts = [...toasts, newToast];
    notify();

    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify();
    }, 3000);
  },
  success(text: string) {
    this.show(text, 'success');
  },
  error(text: string) {
    this.show(text, 'error');
  },
  info(text: string) {
    this.show(text, 'info');
  },
  subscribe(listener: ToastListener) {
    listeners.add(listener);
    listener([...toasts]);
    return () => {
      listeners.delete(listener);
    };
  },
};
