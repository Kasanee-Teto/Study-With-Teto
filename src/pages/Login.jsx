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
        <section className="sign-in-page min-h-screen flex flex-col justify-center items-center font-sans bg-cover bg-center bg-fixed p-7">
            <h1 className="text-4xl font-sans tracking-wide text-white text-center mb-5 mt-5">Welcome To Teto Chatbot</h1>
            <div className="flex flex-col items-center justify-center w-full mt-11 relative">
                {/* Tab buttons - always visible */}
                <div className="flex gap-15 justify-center mb-9 relative z-10">
                    <button
                        type="button"
                        className={`switcher bg-none border-none text-white text-lg font-semibold cursor-pointer px-5 py-2.5 tracking-wider outline-none ${isLoginActive ? "is-active text-lime-400" : "text-white hover:text-lime-400"}`}
                        onClick={() => setActiveForm("login")}
                    >
                        Login
                        <span className={`block h-1 bg-lime-400 mt-1 transition-all duration-500 ${isLoginActive ? 'w-full' : 'w-0'}`}></span>
                    </button>
                    <button
                        type="button"
                        className={`switcher bg-none border-none text-white text-lg font-semibold cursor-pointer px-5 py-3 tracking-wider outline-none ${isSigninActive ? "is-active text-lime-400" : "text-white hover:text-lime-400"}`}
                        onClick={() => setActiveForm("signin")}
                    >
                        Sign In
                        <span className={`block h-1 bg-lime-400 mt-1 transition-all duration-500 ${isSigninActive ? 'w-full' : 'w-0'}`}></span>
                    </button>
                </div>

                {/* Login Form */}
                <div className={isLoginActive ? "w-full max-w-96 opacity-100 scale-100 pointer-events-auto transition-all duration-500" : "w-full max-w-96 opacity-0 scale-95 pointer-events-none transition-all duration-500"}>
                    <form className="min-w-64 max-w-96 mt-5 px-6 py-6 rounded-md bg-gray-400 shadow-md animate-slideUp" onSubmit={handleLoginSubmit}>
                        <fieldset className="m-0 p-0 border-none">
                            <legend className="absolute overflow-hidden w-1 h-1" style={{clip: 'rect(0 0 0 0)'}}>Please, enter your email and password for login.</legend>

                            {error && <div className="bg-red-100 text-red-900 px-3.75 py-3 rounded-md mb-5 border border-red-200 text-sm">{error}</div>}

                            <div className="mb-5">
                                <label className="text-sm text-gray-700 font-medium" htmlFor="login-email">E-mail</label>
                                <input 
                                    id="login-email" 
                                    type="email" 
                                    required 
                                    className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="mb-5">
                                <label className="text-sm text-gray-700 font-medium" htmlFor="login-password">Password</label>
                                <input 
                                    id="login-password" 
                                    type="password" 
                                    required 
                                    className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="flex justify-center gap-3.75 my-5">
                                <button 
                                    type="button" 
                                    className="social-icon-btn w-10 h-10 border-none rounded-full cursor-pointer bg-cover bg-center bg-no-repeat transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-110 google-icon disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() => handleOAuthSignIn('google')}
                                    disabled={loading}
                                ></button>
                                <button 
                                    type="button" 
                                    className="social-icon-btn w-10 h-10 border-none rounded-full cursor-pointer bg-cover bg-center bg-no-repeat transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-110 github-icon disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() => handleOAuthSignIn('github')}
                                    disabled={loading}
                                ></button>
                                <button 
                                    type="button" 
                                    className="social-icon-btn w-10 h-10 border-none rounded-full cursor-pointer bg-cover bg-center bg-no-repeat transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-110 linkedin-icon disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() => handleOAuthSignIn('linkedin')}
                                    disabled={loading}
                                ></button>
                                <button 
                                    type="button" 
                                    className="social-icon-btn w-10 h-10 border-none rounded-full cursor-pointer bg-cover bg-center bg-no-repeat transition-all duration-300 opacity-80 hover:opacity-100 hover:scale-110 x-icon disabled:cursor-not-allowed disabled:opacity-40"
                                    onClick={() => handleOAuthSignIn('x')}
                                    disabled={loading}
                                ></button>
                            </div>
                        </fieldset>

                        <button type="submit" className="opacity-100 block min-w-30 mx-auto my-2.5 text-lg px-5 py-2.5 leading-10 rounded-full border-none transition-all duration-300 text-white bg-lime-400 cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-40" disabled={loading}>
                            {loading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
                
                {/* Sign Up Form */}
                <div className={isSigninActive ? "absolute left-1/2 -translate-x-1/2 w-full max-w-96 opacity-100 scale-100 pointer-events-auto transition-all duration-500" : "absolute left-1/2 -translate-x-1/2 w-full max-w-96 opacity-0 scale-95 pointer-events-none transition-all duration-500"}>
                    <form className="min-w-64 max-w-95 mt-30 px-6 py-6 rounded-md bg-gray-400 shadow-md animate-slideUp" onSubmit={handleSignUpSubmit}>
                        <fieldset className="m-0 p-0 border-none">
                            <legend className="absolute overflow-hidden w-1 h-1" style={{clip: 'rect(0 0 0 0)'}}>Please, enter your username, password and password confirmation for sign up.</legend>

                            {error && <div className="bg-red-100 text-red-900 px-3.75 py-3 rounded-md mb-5 border border-red-200 text-sm">{error}</div>}

                            <div className="mb-5">
                                <label className="text-sm text-gray-700 font-medium" htmlFor="signin-username">Username</label>
                                <input 
                                    id="signin-username" 
                                    type="text" 
                                    required 
                                    className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="mb-5">
                                <label className="text-sm text-gray-700 font-medium" htmlFor="signin-password">Password</label>
                                <input 
                                    id="signin-password" 
                                    type="password" 
                                    required 
                                    className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className="mb-5">
                                <label className="text-sm text-gray-700 font-medium" htmlFor="signin-confirmPassword">Confirm password</label>
                                <input 
                                    id="signin-confirmPassword" 
                                    type="password" 
                                    required 
                                    className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </fieldset>

                        <button type="submit" className="opacity-100 block min-w-30 mx-auto my-2.5 text-lg px-5 py-2.5 leading-10 rounded-full border-none transition-all duration-300 text-white bg-lime-400 cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-40" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Continue'}
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
}