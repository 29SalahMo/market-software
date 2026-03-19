import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      login: 'Login',
      email: 'Email',
      password: 'Password',
      loginTitle: 'Sign in to ESMS',
      invalidCredentials: 'Invalid email or password',
      dashboard: 'Dashboard',
      welcome: 'Welcome to Egypt Supermarket Management System',
    },
  },
  ar: {
    translation: {
      login: 'تسجيل الدخول',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      loginTitle: 'الدخول إلى النظام',
      invalidCredentials: 'البريد أو كلمة المرور غير صحيحة',
      dashboard: 'لوحة التحكم',
      welcome: 'مرحباً بك في نظام إدارة السوبرماركت المصري',
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'ar',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
