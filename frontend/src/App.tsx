// The app's route table, inside the shared layout: /login, /register and
// /oauth/callback public, / behind RequireAuth, anything else a 404 page.
import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from './features/auth/auth-guard';
import { LoginPage } from './features/auth/auth-login-page';
import { RegisterPage } from './features/auth/auth-register-page';
import { OAuthCallbackPage } from './features/auth/auth-oauth-callback-page';
import { HomePage } from './features/auth/auth-home-page';
import { useLanguageSync } from './app/language-sync';
import { AppLayout } from './app/app-layout';
import { NotFoundPage } from './app/app-not-found-page';

/** Root component: keeps the UI language in sync, then renders the route table. */
function App() {
  useLanguageSync();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
