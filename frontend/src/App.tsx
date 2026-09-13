// The app's route table: /login and /register public, / behind RequireAuth,
// everything else redirected home.
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './features/auth/auth-guard';
import { LoginPage } from './features/auth/auth-login-page';
import { RegisterPage } from './features/auth/auth-register-page';
import { HomePage } from './features/auth/auth-home-page';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
