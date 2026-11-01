// Catches a render error in a page so the app shows a message, not a blank
// screen.
import { Component, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '../ui/ui-alert';
import { Button } from '../ui/ui-button';

/** What a page that crashed shows: the generic error and a way out. */
function CrashMessage() {
  const { t } = useTranslation('common');

  return (
    <div className="mx-auto my-12 flex max-w-md flex-col gap-4">
      <Alert tone="error">{t('errors.generic')}</Alert>
      <Button variant="outline" onClick={() => window.location.reload()}>
        {t('errors.reload')}
      </Button>
    </div>
  );
}

export interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  crashed: boolean;
}

/**
 * Error boundary around the page in the layout: an exception thrown while a
 * page renders shows {@link CrashMessage} in its place, and the header stays
 * usable. React only offers this as a class component. The layout keys it on
 * the path, so moving to another page starts from a clean state. Errors in
 * event handlers and requests are not render errors: their callers handle
 * them.
 */
export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { crashed: true };
  }

  render() {
    return this.state.crashed ? <CrashMessage /> : this.props.children;
  }
}
