import { useState } from "react";
import "./sign_in.css";
import { supabase } from '../lib/supabaseClient';

export default function Login() {
    const [activeForm, setActiveForm] = useState("signin");
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const isLoginActive = activeForm === "login";
    const isSigninActive = activeForm === "signin";

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        const fieldName = id.replace('login-', '').replace('signin-', '');
        setFormData(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleOAuthSignIn = async (provider) => {
        try {
            setLoading(true);
            await supabase.auth.signInWithOAuth({
                provider: provider,
                options: { redirectTo: window.location.origin + '/dashboard' }
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });
            
            if (signInError) throw signInError;
            window.location.href = window.location.origin + '/dashboard';
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSignUpSubmit = async (event) => {
        event.preventDefault();
        setError('');
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setLoading(true);
        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password
            });
            
            if (signUpError) throw signUpError;
            setError('Check your email for confirmation link');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="sign-in-page forms-section">
            <h1 className="section-title">Welcome To Teto Chatbot</h1>

            <div className="forms">
                <div className={`form-wrapper ${isLoginActive ? "is-active" : ""}`}>
                    <button
                        type="button"
                        className="switcher switcher-login"
                        onClick={() => setActiveForm("login")}
                    >
                        Login
                        <span className="underline"></span>
                    </button>

                    <form className="form form-login" onSubmit={handleLoginSubmit}>
                        <fieldset>
                            <legend>Please, enter your email and password for login.</legend>

                            {error && <div className="error-message">{error}</div>}

                            <div className="input-block">
                                <label htmlFor="login-email">E-mail</label>
                                <input 
                                    id="login-email" 
                                    type="email" 
                                    required 
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="input-block">
                                <label htmlFor="login-password">Password</label>
                                <input 
                                    id="login-password" 
                                    type="password" 
                                    required 
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="social-media">
                                <button 
                                    type="button" 
                                    className="social-icon google" 
                                    onClick={() => handleOAuthSignIn('google')}
                                    disabled={loading}
                                ></button>
                                <button 
                                    type="button" 
                                    className="social-icon github" 
                                    onClick={() => handleOAuthSignIn('github')}
                                    disabled={loading}
                                ></button>
                                <button 
                                    type="button" 
                                    className="social-icon linkedin" 
                                    onClick={() => handleOAuthSignIn('linkedin')}
                                    disabled={loading}
                                ></button>
                                <button 
                                    type="button" 
                                    className="social-icon x" 
                                    onClick={() => handleOAuthSignIn('x')}
                                    disabled={loading}
                                ></button>
                            </div>
                        </fieldset>

                        <button type="submit" className="btn-login" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
                
                <div className={`form-wrapper ${isSigninActive ? "is-active" : ""}`}>
                    <button
                        type="button"
                        className="switcher switcher-signin"
                        onClick={() => setActiveForm("signin")}
                    >
                        Sign in
                        <span className="underline"></span>
                    </button>

                    <form className="form form-signin" onSubmit={handleSignUpSubmit}>
                        <fieldset>
                            <legend>Please, enter your email, password and password confirmation for sign up.</legend>

                            {error && <div className="error-message">{error}</div>}

                            <div className="input-block">
                                <label htmlFor="signin-email">E-mail</label>
                                <input 
                                    id="signin-email" 
                                    type="email" 
                                    required 
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="input-block">
                                <label htmlFor="signin-password">Password</label>
                                <input 
                                    id="signin-password" 
                                    type="password" 
                                    required 
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="input-block">
                                <label htmlFor="signin-confirmPassword">Confirm password</label>
                                <input 
                                    id="signin-confirmPassword" 
                                    type="password" 
                                    required 
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </fieldset>

                        <button type="submit" className="btn-signin" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}