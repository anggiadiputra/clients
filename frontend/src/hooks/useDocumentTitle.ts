import { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export function useDocumentTitle(title: string) {
  const { settings } = useSettings();

  useEffect(() => {
    const projectName = settings.projectName?.trim() || 'Client CRM';
    if (title) {
      document.title = `${title} - ${projectName}`;
    } else {
      document.title = projectName;
    }
  }, [title, settings.projectName]);
}
