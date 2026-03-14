// Type declaration shim for puppeteer-extra-plugin-stealth.
// The package doesn't include TypeScript definitions, so this prevents
// TypeScript errors in the worker (which runs as a standalone Node process).
declare module "puppeteer-extra-plugin-stealth" {
  const plugin: () => import("puppeteer-extra").PuppeteerExtraPlugin;
  export default plugin;
}
