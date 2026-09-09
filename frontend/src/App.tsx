// The app's route table: /login public, / behind RequireAuth, everything
// else redirected home.
import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './features/auth/auth-guard';
import { LoginPage } from './features/auth/auth-login-page';
import { HomePage } from './features/auth/auth-home-page';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
