/**
 * Green Sentinel - 404 Not Found Page
 */

import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { useTranslation } from '@/stores/preferencesStore';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-9xl font-bold text-slate-200 mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t('notFound.title')}
        </h1>
        <p className="text-slate-500 mb-8 max-w-md">
          {t('notFound.message')}
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('notFound.goBack')}
          </button>
          <Link to="/" className="btn-primary">
            <Home className="w-4 h-4" />
            {t('notFound.home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
