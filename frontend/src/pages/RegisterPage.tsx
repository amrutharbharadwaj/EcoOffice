import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

interface FieldErrors {
  email?: string;
  name?: string;
  password?: string;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateEmail(value: string): string | undefined {
    if (!value.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    if (value.length > 254) return 'Email must be 254 characters or less';
    return undefined;
  }

  function validateName(value: string): string | undefined {
    if (!value.trim()) return 'Name is required';
    if (value.trim().length > 100) return 'Name must be 100 characters or less';
    return undefined;
  }

  function validatePassword(value: string): string | undefined {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (value.length > 128) return 'Password must be 128 characters or less';
    return undefined;
  }

  function validateAll(): FieldErrors {
    return {
      email: validateEmail(email),
      name: validateName(name),
      password: validatePassword(password),
    };
  }

  function isFormValid(): boolean {
    const errors = validateAll();
    return !errors.email && !errors.name && !errors.password;
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errors = validateAll();
    setFieldErrors(errors);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched({ email: true, name: true, password: true });

    const errors = validateAll();
    setFieldErrors(errors);

    if (errors.email || errors.name || errors.password) return;

    setIsSubmitting(true);
    setGeneralError('');

    try {
      await register(email, name, password);
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const apiErr = err as ApiError;
      if (apiErr.fields && apiErr.fields.length > 0) {
        const mapped: FieldErrors = {};
        for (const f of apiErr.fields) {
          if (f.field === 'email') mapped.email = f.message;
          if (f.field === 'name') mapped.name = f.message;
          if (f.field === 'password') mapped.password = f.message;
        }
        setFieldErrors(mapped);
      } else {
        setGeneralError(apiErr.error || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-primary-700 mb-6 text-center">
          Create an Account
        </h1>

        {generalError && (
          <div
            className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-md text-danger-700 text-sm"
            role="alert"
          >
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Email field */}
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              className={`w-full px-3 py-2 border rounded-md text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                touched.email && fieldErrors.email
                  ? 'border-danger-500'
                  : 'border-neutral-300'
              }`}
              placeholder="you@example.com"
              autoComplete="email"
              aria-describedby={touched.email && fieldErrors.email ? 'email-error' : undefined}
              aria-invalid={touched.email && !!fieldErrors.email}
            />
            {touched.email && fieldErrors.email && (
              <p id="email-error" className="mt-1 text-sm text-danger-600">
                {fieldErrors.email}
              </p>
            )}
          </div>

          {/* Name field */}
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur('name')}
              className={`w-full px-3 py-2 border rounded-md text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                touched.name && fieldErrors.name
                  ? 'border-danger-500'
                  : 'border-neutral-300'
              }`}
              placeholder="Your full name"
              autoComplete="name"
              aria-describedby={touched.name && fieldErrors.name ? 'name-error' : undefined}
              aria-invalid={touched.name && !!fieldErrors.name}
            />
            {touched.name && fieldErrors.name && (
              <p id="name-error" className="mt-1 text-sm text-danger-600">
                {fieldErrors.name}
              </p>
            )}
          </div>

          {/* Password field */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password')}
              className={`w-full px-3 py-2 border rounded-md text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                touched.password && fieldErrors.password
                  ? 'border-danger-500'
                  : 'border-neutral-300'
              }`}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              aria-describedby={touched.password && fieldErrors.password ? 'password-error' : undefined}
              aria-invalid={touched.password && !!fieldErrors.password}
            />
            {touched.password && fieldErrors.password && (
              <p id="password-error" className="mt-1 text-sm text-danger-600">
                {fieldErrors.password}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            className="w-full py-2 px-4 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
