import { useState } from "react";
import "./sign_up.css";
import { supabase } from '../../lib/supabaseClient';
import { useTranslation } from '../../i18n/useTranslation.js';

export default function SignUpPage() {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        passwordConfirm: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id.replace('signup-', '')]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        
        if (formData.password !== formData.passwordConfirm) {
            setError(t('login.passwordMismatch'));
            return;
        }

        setLoading(true);
        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        username: formData.username
                    }
                }
            });

            if (signUpError) throw signUpError;

            // Redirect to dashboard on successful signup
            if (data?.user) {
                window.location.href = window.location.origin + '/dashboard';
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="sign-up-page min-h-screen flex flex-col justify-center items-center font-sans bg-cover bg-center bg-fixed px-7 py-12 md:px-1 md:py-1">
            <h1 className="text-4xl font-sans tracking-wide text-white text-center mb-12">{t('login.welcome')}</h1>
            <div className="text-lime-400 font-sans flex justify-center mb-4">{t('login.signUp')}</div>
            
            <div className="flex items-center justify-center w-full">
                <form className="min-w-64 max-w-96 mt-5 px-6 py-6 rounded-md bg-gray-400 shadow-md animate-slideUp" onSubmit={handleSubmit}>
                    <fieldset className="m-0 p-0 border-none">
                        <legend className="absolute overflow-hidden w-1 h-1" style={{clip: 'rect(0 0 0 0)'}}>{t('login.emailSignUpLegend')}</legend>

                        {error && <div className="bg-red-100 text-red-900 px-3.75 py-3 rounded-md mb-5 border border-red-200 text-sm">{error}</div>}

                        <div className="mb-5 animate-fadeIn" style={{animationDelay: '0.05s'}}>
                            <label className="text-sm text-gray-700 font-medium" htmlFor="signup-email">{t('login.email')}</label>
                            <input 
                                id="signup-email" 
                                type="email" 
                                required 
                                className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="mb-5 animate-fadeIn" style={{animationDelay: '0.1s'}}>
                            <label className="text-sm text-gray-700 font-medium" htmlFor="signup-username">{t('login.username')}</label>
                            <input 
                                id="signup-username" 
                                type="text" 
                                required 
                                className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                value={formData.username}
                                onChange={handleInputChange}
                            />
                        </div>
                        
                        <div className="mb-5 animate-fadeIn" style={{animationDelay: '0.15s'}}>
                            <label className="text-sm text-gray-700 font-medium" htmlFor="signup-password">{t('login.password')}</label>
                            <input 
                                id="signup-password" 
                                type="password" 
                                required 
                                className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="mb-5 animate-fadeIn" style={{animationDelay: '0.1s'}}>
                            <label className="text-sm text-gray-700 font-medium" htmlFor="signup-passwordConfirm">{t('login.confirmPassword')}</label>
                            <input 
                                id="signup-passwordConfirm" 
                                type="password" 
                                required 
                                className="block w-full mt-2 px-3.75 py-2.5 text-base text-gray-700 bg-gray-100 border border-gray-300 rounded-md box-border focus:outline-none focus:border-gray-400"
                                value={formData.passwordConfirm}
                                onChange={handleInputChange}
                            />
                        </div>
                    </fieldset>

                    <button type="submit" className="opacity-100 block min-w-30 mx-auto my-2.5 text-lg px-5 py-2.5 leading-10 rounded-full border-none transition-all duration-300 text-white bg-lime-400 cursor-pointer font-semibold disabled:cursor-not-allowed disabled:opacity-40" disabled={loading}>
                        {loading ? t('login.creatingAccount') : t('login.continue')}
                    </button>
                </form>
            </div>
        </section>
    );
}

