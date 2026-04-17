import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('Verifying your email...');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No verification token provided');
        return;
      }

      try {
        const response = await fetch('http://localhost:3000/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully!');
          setEmail(data.email);
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        {status === 'verifying' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
            <h1 className="text-2xl font-bold text-gray-800 mt-4">{message}</h1>
            <p className="text-gray-600 mt-2">Please wait while we verify your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="inline-block bg-green-100 rounded-full p-3 mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">Success!</h1>
            <p className="text-gray-700 mb-4">{message}</p>
            <p className="text-gray-600 mb-6">Email: <strong>{email}</strong></p>
            <p className="text-gray-600 mb-4">Redirecting to login in 3 seconds...</p>
            <Link 
              to="/login" 
              className="inline-block bg-rose-500 text-white px-6 py-2 rounded-lg hover:bg-rose-600 transition"
            >
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="inline-block bg-red-100 rounded-full p-3 mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-2">Verification Failed</h1>
            <p className="text-gray-700 mb-6">{message}</p>
            
            <div className="space-y-3">
              <p className="text-gray-600">
                <span className="font-semibold">Token expired or invalid?</span>
              </p>
              <Link 
                to="/resend-verification" 
                className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Resend Verification Email
              </Link>
            </div>

            <p className="text-gray-600 mt-6">
              Already verified?{' '}
              <Link to="/login" className="text-rose-500 hover:text-rose-600 font-semibold">
                Go to Login
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
