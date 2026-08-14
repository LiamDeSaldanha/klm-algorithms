// React 19 removed the global `JSX` namespace in favour of `React.JSX`.
// This shim restores the global namespace so existing `JSX.Element` type
// annotations keep working without touching every component.
export {};

declare global {
  namespace JSX {
    type Element = import("react").JSX.Element;
    type ElementType = import("react").JSX.ElementType;
    type ElementClass = import("react").JSX.ElementClass;
    type IntrinsicElements = import("react").JSX.IntrinsicElements;
    type IntrinsicAttributes = import("react").JSX.IntrinsicAttributes;
  }
}
