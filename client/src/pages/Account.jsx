import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.js';

export default function Account() {
  const { user, loading, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isLogin = mode === 'login';

  // Return to the page the customer came from after signing in.
  const redirectTo = location.state?.from || '/account';

  function switchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setNotice('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Read the form before the first await; React may reuse the event.
    const form = event.currentTarget;
    const data = new FormData(form);

    const email = String(data.get('email')).trim();
    const password = String(data.get('password'));

    setError('');
    setNotice('');

    if (!isLogin && password !== String(data.get('confirmPassword'))) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
        navigate(redirectTo, { replace: true });
        return;
      }

      await register({
        username: String(data.get('fullName')).trim(),
        email,
        password,
      });

      form.reset();
      setMode('login');
      setNotice('Account created. Please sign in.');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="placeholder-page">
        <p>Loading your account...</p>
      </main>
    );
  }

  // Signed-in customers land on the account overview inside the shared sidebar layout.
  if (user) {
    return (
      <section className="account-overview">
        <div className="account-content-heading">
          <p className="account-eyebrow">ACCOUNT OVERVIEW</p>
          <h2>Welcome back, {user.username || 'there'}.</h2>
          <p>Manage your purchases and keep your delivery details up to date.</p>
        </div>

        <div className="account-overview-grid">
          <Link to="/account/orders" className="account-overview-card">
            <span className="account-overview-icon" aria-hidden="true">↗</span>
            <span className="account-overview-card-title">Order History</span>
            <span className="account-overview-card-description">
              Review your purchases, check their status, and view order details.
            </span>
            <span className="account-overview-card-link">View your orders →</span>
          </Link>

          <Link to="/account/profile" className="account-overview-card">
            <span className="account-overview-icon" aria-hidden="true">◎</span>
            <span className="account-overview-card-title">Profile Settings</span>
            <span className="account-overview-card-description">
              Update your name, phone number, and default delivery address.
            </span>
            <span className="account-overview-card-link">Edit your profile →</span>
          </Link>
        </div>

        <div className="account-overview-note">
          <strong>Signed in as</strong>
          <span>{user.email}</span>
        </div>
      </section>
    );
  }

  return (
    <main className="container account-page">
      <section className="account-card">
        <div className="account-heading">
          <h1>{isLogin ? 'Welcome Back' : 'Create an Account'}</h1>

          <p>
            {isLogin
              ? 'Sign in to your Rando account.'
              : 'Join Rando to explore our furniture collection.'}
          </p>
        </div>

        <div className="account-tabs">
          <button
            type="button"
            className={isLogin ? 'active' : ''}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>

          <button
            type="button"
            className={!isLogin ? 'active' : ''}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {error && (
          <p className="form-message form-error" role="alert">
            {error}
          </p>
        )}

        {notice && (
          <p className="form-message form-success" role="status">
            {notice}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="account-field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </div>
          )}

          <div className="account-field">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="account-field">
            <label htmlFor="password">Password</label>

            <div className="password-input">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete={
                  isLogin ? 'current-password' : 'new-password'
                }
                minLength={8}
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((visible) => !visible)
                }
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="account-field">
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          )}

          {isLogin && (
            <div className="account-options">
              <label>
                <input type="checkbox" name="rememberMe" />
                Remember me
              </label>

              <button
                type="button"
                className="text-button"
                onClick={() =>
                  alert('Password recovery is not connected yet.')
                }
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            className="account-submit"
            disabled={submitting}
          >
            {submitting
              ? 'Please wait...'
              : isLogin
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        <p className="account-switch">
          {isLogin
            ? "Don't have an account?"
            : 'Already have an account?'}{' '}

          <button
            type="button"
            className="text-button"
            onClick={() => switchMode(isLogin ? 'register' : 'login')}
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </p>

        <div className="account-back">
          <Link to="/shop">Continue Shopping</Link>
        </div>
      </section>
    </main>
  );
}
