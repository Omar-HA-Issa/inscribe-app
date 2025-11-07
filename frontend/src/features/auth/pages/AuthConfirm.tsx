import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthConfirm() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type');
        const accessToken = hashParams.get('access_token');

        if (type === 'signup' && accessToken) {
          setStatus('success');

          // Redirect to home after 2 seconds
          setTimeout(() => {
            navigate('/');
          }, 5000);
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Confirmation error:', error);
        setStatus('error');
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
      <div className="max-w-md w-full px-8 py-12">
        {status === 'loading' && (
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-6">
              <div className="w-full h-full border-2 border-gray-200 border-t-transparent rounded-full animate-spin bg-gradient-to-br from-purple-600 to-blue-600 bg-clip-border"
                   style={{
                     borderImage: 'linear-gradient(135deg, rgb(147, 51, 234), rgb(37, 99, 235)) 1',
                     borderTopColor: 'transparent'
                   }}
              />
            </div>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Confirming your email</h2>
            <p className="text-gray-500">Just a moment...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Email confirmed</h2>
            <p className="text-gray-500">Taking you to the login page...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-medium text-gray-900 mb-2">Confirmation failed</h2>
            <p className="text-gray-500 mb-6">The confirmation link may be invalid or expired</p>
            <button
              onClick={() => navigate('/login')}
              className="text-gray-900 hover:text-gray-600 font-medium transition-colors"
            >
              Return to login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}