import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { STORAGE_KEY } from '@/utils/userStorage.js';
import { secondaryButtonClass, tertiaryButtonClass } from "@/styles/UIClasses.jsx"

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');
  const [email, setEmail] = useState('');
  const [successRedirectPath, setSuccessRedirectPath] = useState('/login');
  const didVerifyRef = useRef(false);

  /* ======= Effect to verify email token  ======= */
  useEffect(() => {
    if (didVerifyRef.current) {
      return;
    }
    didVerifyRef.current = true;

    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        const response = await fetch('/api/auth/verify-email', 
          {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ token }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully!');
          setEmail(data.email);

          if (data?.user_id && data?.email) {
            try {
              const raw = localStorage.getItem(STORAGE_KEY);
              const parsed = raw ? JSON.parse(raw) : null;

              if (parsed && Number(parsed.id) === Number(data.user_id)) {
                localStorage.setItem(
                  STORAGE_KEY,
                  JSON.stringify({
                    ...parsed,
                    email: data.email,
                    email_verified: true,
                  }),
                );
                window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
              }
            } catch {
              // Keep verification UX working even if local storage parsing fails.
            }
          }

          const targetPath = 
            data?.redirect_to === 
            '/profile' 
              ? '/profile' 
              : '/login';

          setSuccessRedirectPath(targetPath);
          setTimeout(() => {
            navigate(targetPath);
          }, 3000);
        } else {
          if (data?.error === 'Email is already verified') {
            setStatus('success');
            setMessage('Email is already verified.');
            setEmail(data.email || '');
            setSuccessRedirectPath('/login');
            setTimeout(() => {
              navigate('/login');
            }, 3000);

            return;
          }
          setStatus('error');
          setMessage(data.error || 'Failed to verify email');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying your email');
        
        console.error('Verification error:', error);
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
        { /*  ========== LOADING  ========== */}
        {status === 'verifying' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            
            <h1 className="text-2xl font-bold text-gray-800 mt-4">{message}</h1>
            
            <p className="text-gray-600 mt-2">Please wait while we verify your email address...</p>
          </div>
        )}

        { /*  ========== SUCCESS  ========== */}
        {status === 'success' && (
          <div className="text-center">
            <div className="inline-block bg-green-100 rounded-full p-3 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Header */}
            <h1 className="text-2xl font-bold text-green-600 mb-2">Success!</h1>

            {/* Success message and email */}
            <p className="text-gray-700 mb-4">{message}</p>
            <p className="text-gray-600 mb-6">Email: <strong>{email}</strong></p>
            <p className="text-gray-600 mb-4">Redirecting in 3 seconds...</p>

            <Link
              to={successRedirectPath}
              className={secondaryButtonClass}
            >
              Continue
            </Link>
          </div>
        )}

        { /*  ========== ERROR  ========== */}
        {status === 'error' && (
          <div className="text-center">
            {/* Header*/}
            <h1 className="text-2xl font-bold text-primary-dark mb-2">
              Verification Failed
            </h1>
            
            {/* Error message */}
            <p className="text-gray-700 mb-6">{message}</p>

            {/* Resend verification link and login link */}
            <div className="space-y-3">
              <p className="text-gray-600">
                <span className="font-semibold">Token expired or invalid?</span>
              </p>

              <Link 
                to="/resend-verification" 
                className={secondaryButtonClass}
              >
                Resend verification email
              </Link>
            </div>

            <p className="text-gray-600 mt-6">
              Already verified?{' '}
              <Link to="/login" className={tertiaryButtonClass }>
                Go to login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
