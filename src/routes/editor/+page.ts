// Remove this file since we now have +page.server.ts handling the load function
// This is an editor page, so we don't want it to be prerendered or cached
export const prerender = false;
export const ssr = false;
