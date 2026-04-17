import { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isTr } from '../utils/i18n';

function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const setTransientMessage = (setter, message) => {
    setter(message);
    window.clearTimeout(setTransientMessage.timerId);
    setTransientMessage.timerId = window.setTimeout(() => setter(''), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        if (data?.user?.identities?.length === 0) {
          setTransientMessage(setError, isTr ? 'Bu e-posta zaten kayıtlı.' : 'This email is already registered.');
        } else if (!data.session) {
          setTransientMessage(setSuccess, isTr ? 'Kayıt başarılı! Ancak Supabase e-posta onayı istiyor (Mailinize bakın veya ayarlardan Mail Onayını kapatın).' : 'Signup successful! Please confirm your email.');
        }
      }
    } catch (err) {
      if (err.message.includes('Invalid login credentials')) {
        setTransientMessage(setError, isTr ? 'Hatalı e-posta veya şifre.' : 'Invalid email or password.');
      } else if (err.message.includes('Password should be at least 6 characters')) {
        setTransientMessage(setError, isTr ? 'Şifre en az 6 karakter olmalıdır.' : 'Password must be at least 6 characters.');
      } else {
        setTransientMessage(setError, err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-header">
          <img src="/logo.png" alt="Logo" className="auth-logo" />
          <h2>{isLogin ? (isTr ? 'Hoş Geldiniz' : 'Welcome Back') : (isTr ? 'Hesap Oluştur' : 'Create Account')}</h2>
          <p>
            {isLogin 
              ? (isTr ? 'Devam etmek için giriş yapın.' : 'Log in to continue to your workspace.')
              : (isTr ? 'Yeni bir çalışma alanı başlatın.' : 'Start your personal workspace curations.')}
          </p>
        </div>

        {error && <div className="flash flash-error">{error}</div>}
        {success && <div className="flash flash-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <Mail size={18} className="input-icon" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isTr ? 'E-posta' : 'Email address'}
              required
            />
          </div>
          
          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isTr ? 'Şifre' : 'Password'}
              required
              minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-submit btn-primary">
            {loading ? (isTr ? 'Bekleniyor...' : 'Processing...') : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                <span>{isLogin ? (isTr ? 'Giriş Yap' : 'Sign In') : (isTr ? 'Kayıt Ol' : 'Sign Up')}</span>
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="auth-switch">
            {isLogin 
              ? (isTr ? 'Hesabınız yok mu? Kayıt Olun' : "Don't have an account? Sign Up")
              : (isTr ? 'Zaten hesabınız var mı? Giriş Yapın' : 'Already have an account? Sign In')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
