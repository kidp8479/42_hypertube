// Keeps the browser tab title in step with the page shown.
import { useEffect } from 'react';

export const APP_NAME = 'Hypertube';

/**
 * Sets the tab title to `<page> - Hypertube`, or the app name alone when the
 * page has no title of its own (the home page, a page still loading). Called
 * by each page with its translated heading, so the title follows the
 * language too.
 */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} - ${APP_NAME}` : APP_NAME;
  }, [page]);
}
