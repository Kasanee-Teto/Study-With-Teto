import { useState } from "react";
import "./login.css";
import { supabase } from '../lib/supabaseClient';

export default function Login() {
    const [activeForm, setActiveForm] = useState("login");
    const [formData, setFormData] = useState({
        email: '',
        username: '',
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
                email: formData.username + '@local',
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
            <div className="background"></div>
            <div className="forms">
                {/* Tab buttons - always visible */}
                <div className="button-tabs">
                    <button
                        type="button"
                        className={`switcher switcher-login ${isLoginActive ? "is-active" : ""}`}
                        onClick={() => setActiveForm("login")}
                    >
                        Login
                        <span className="underline"></span>
                    </button>
                    <button
                        type="button"
                        className={`switcher switcher-signin ${isSigninActive ? "is-active" : ""}`}
                        onClick={() => setActiveForm("signin")}
                    >
                        Sign In
                        <span className="underline"></span>
                    </button>
                </div>

                {/* Login Form */}
                <div className={`form-wrapper ${isLoginActive ? "is-active" : ""}`}>
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
                
                {/* Sign Up Form */}
                <div className={`form-wrapper ${isSigninActive ? "is-active" : ""}`}>
                    <form className="form form-signin" onSubmit={handleSignUpSubmit}>
                        <fieldset>
                            <legend>Please, enter your username, password and password confirmation for sign up.</legend>

                            {error && <div className="error-message">{error}</div>}

                            <div className="input-block">
                                <label htmlFor="signin-username">Username</label>
                                <input 
                                    id="signin-username" 
                                    type="text" 
                                    required 
                                    value={formData.username}
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