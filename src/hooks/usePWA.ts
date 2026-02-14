import { useState, useEffect } from 'react';

// Define types for PWA installation status
type PWAInstallationStatus = 'not-installed' | 'installed' | 'installable';

// Define type for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const usePWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installationStatus, setInstallationStatus] = useState<PWAInstallationStatus>('not-installed');
  const [isInstallButtonVisible, setIsInstallButtonVisible] = useState(false);

  useEffect(() => {
    // Check if app is running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (navigator.standalone as boolean) ||  // iOS Safari
                         document.referrer.includes('android-app://');
    
    if (isStandalone) {
      setInstallationStatus('installed');
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      const event = e as BeforeInstallPromptEvent;
      setDeferredPrompt(event);
      setInstallationStatus('installable');
      setIsInstallButtonVisible(true);
    };

    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setDeferredPrompt(null);
      setInstallationStatus('installed');
      setIsInstallButtonVisible(false);
    };

    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Listen for the appinstalled event
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      console.warn('Tried to install but no deferred prompt available');
      return false;
    }

    // Show the install prompt
    await deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Reset the deferred prompt variable
    setDeferredPrompt(null);
    setIsInstallButtonVisible(false);
    
    return outcome === 'accepted';
  };

  return {
    installationStatus,
    isInstallButtonVisible,
    installPWA,
    isStandalone: installationStatus === 'installed'
  };
};