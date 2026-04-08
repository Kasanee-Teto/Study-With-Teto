import { useState } from "react";
import "./sign_up.css";
import { supabase } from '../lib/supabaseClient';

export default function SignUpPage() {
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
            setError('Passwords do not match');
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
        <section className="sign-up-page forms-section">
            <h1 className="section-title">Welcome To Teto Chatbot</h1>

            <div className="sign-up-hightlight">Sign up</div>
            
            <div className="forms">
                <form className="form" onSubmit={handleSubmit}>
                    <fieldset>
                        <legend>Please, enter your email, password and password confirmation for sign up.</legend>

                        {error && <div className="error-message">{error}</div>}

                        <div className="input-block">
                            <label htmlFor="signup-email">E-mail</label>
                            <input 
                                id="signup-email" 
                                type="email" 
                                required 
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="input-block">
                            <label htmlFor="signup-username">Username</label>
                            <input 
                                id="signup-username" 
                                type="text" 
                                required 
                                value={formData.username}
                                onChange={handleInputChange}
                            />
                        </div>
                        
                        <div className="input-block">
                            <label htmlFor="signup-password">Password</label>
                            <input 
                                id="signup-password" 
                                type="password" 
                                required 
                                value={formData.password}
                                onChange={handleInputChange}
                            />
                        </div>

                        <div className="input-block">
                            <label htmlFor="signup-passwordConfirm">Confirm password</label>
                            <input 
                                id="signup-passwordConfirm" 
                                type="password" 
                                required 
                                value={formData.passwordConfirm}
                                onChange={handleInputChange}
                            />
                        </div>
                    </fieldset>

                    <button type="submit" className="btn-signup" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Continue'}
                    </button>
                </form>
            </div>
        </section>
    );
}
