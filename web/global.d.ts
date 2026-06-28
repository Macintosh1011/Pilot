declare module "*.css";

// Optional dependency loaded lazily via `await import("@zxing/browser")` in
// components/QRScanner.tsx. This shorthand ambient declaration keeps `tsc`
// green even before the coordinator installs the package (it's treated as
// `any`); once installed, the real package types coexist and the scanner code
// uses it loosely as `any` regardless.
declare module "@zxing/browser";
