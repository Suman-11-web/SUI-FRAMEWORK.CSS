export type SuiThemeMode = 'light' | 'dark' | 'oled' | 'auto' | 'system';
export type SuiToastType = 'info' | 'success' | 'warning' | 'danger' | 'error';
export type SuiToastPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'top-center';

export interface SuiInstanceOptions {
  backdrop?: 'static' | boolean;
  keyboard?: boolean;
}

export interface SuiComponentInstance {
  element: HTMLElement;
  options: SuiInstanceOptions;
  open(trigger?: HTMLElement | null): boolean;
  close(): boolean;
  toggle(trigger?: HTMLElement | null): boolean;
  dispose(): void;
}

export interface SuiToastOptions {
  title?: string;
  message?: string;
  type?: SuiToastType;
  duration?: number;
  dismissible?: boolean;
}

export interface SuiRuntime {
  readonly version: string;
  init(root?: Document | HTMLElement): void;
  destroy(): void;
  positioner: {
    adjust(panel: HTMLElement): void;
    reset(panel: HTMLElement): void;
  };
  theme: {
    get(): string;
    getMode(): string;
    set(mode: SuiThemeMode, store?: boolean): string;
    toggle(): string;
  };
  modal: {
    open(target: string | HTMLElement, trigger?: HTMLElement | null): boolean;
    close(target?: string | HTMLElement | null): boolean;
    toggle(target: string | HTMLElement, trigger?: HTMLElement | null): boolean;
    closeAll(): void;
    getOrCreateInstance(target: string | HTMLElement, options?: SuiInstanceOptions): SuiComponentInstance | null;
  };
  offcanvas: {
    open(target: string | HTMLElement, trigger?: HTMLElement | null): boolean;
    close(target?: string | HTMLElement | null): boolean;
    toggle(target: string | HTMLElement, trigger?: HTMLElement | null): boolean;
    getOrCreateInstance(target: string | HTMLElement, options?: SuiInstanceOptions): SuiComponentInstance | null;
  };
  dropdown: {
    open(target: string | HTMLElement, trigger?: HTMLElement | null): boolean;
    close(target?: string | HTMLElement | null, restoreFocus?: boolean): boolean;
    toggle(target: string | HTMLElement, trigger?: HTMLElement | null): boolean;
    getOrCreateInstance(target: string | HTMLElement, options?: SuiInstanceOptions): SuiComponentInstance | null;
  };
  popover: {
    open(target: string | HTMLElement, trigger?: HTMLElement | null): boolean;
    close(target?: string | HTMLElement | null, restoreFocus?: boolean): boolean;
    toggle(target: string | HTMLElement, trigger?: HTMLElement | null): boolean;
    closeAll(restoreFocus?: boolean): void;
  };
  navbar: {
    toggle(toggleBtn: HTMLElement): boolean;
    closeAll(restoreFocus?: boolean): void;
  };
  accordion: {
    open(item: HTMLElement): boolean;
    close(item: HTMLElement): boolean;
    toggle(item: HTMLElement): boolean;
  };
  tabs: {
    select(tabBtn: HTMLElement): boolean;
    hydrate(root?: Document | HTMLElement): void;
  };
  forms: {
    hydrate(root?: Document | HTMLElement): void;
  };
  toast: {
    setPosition(position: SuiToastPosition): void;
    show(options?: SuiToastOptions): HTMLElement;
    success(message: string, title?: string): HTMLElement;
    error(message: string, title?: string): HTMLElement;
    danger(message: string, title?: string): HTMLElement;
    warning(message: string, title?: string): HTMLElement;
    info(message: string, title?: string): HTMLElement;
    dismiss(toast: HTMLElement): boolean;
    dismissAll(): void;
  };
  alert: {
    dismiss(alertEl: HTMLElement): boolean;
  };
  carousel: {
    goTo(wrapper: HTMLElement, index: number): void;
    hydrate(root?: Document | HTMLElement): void;
  };
  scrollspy: {
    init(root?: Document | HTMLElement): void;
    hydrate(root?: Document | HTMLElement): void;
  };
  command: {
    open(target?: string | HTMLElement | null, trigger?: HTMLElement | null): boolean;
    close(target?: string | HTMLElement | null): boolean;
    filter(palette: HTMLElement, query: string): number;
  };
  clipboard: {
    text(str: string): Promise<boolean>;
    element(selector: string): Promise<boolean>;
  };
  copy: SuiRuntime['clipboard'];
  highlight(root?: Document | HTMLElement): void;
}

declare global {
  interface Window {
    SUI: SuiRuntime;
  }
}

declare const SUI: SuiRuntime;
export default SUI;
