// PWA Registration Utility
export class PWAInstaller {
  private deferredPrompt: Event | null = null;
  private installButton: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    // Listen for the beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      
      // Show the install button
      this.showInstallButton();
    });

    // Listen for the appinstalled event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.deferredPrompt = null;
      this.hideInstallButton();
    });
  }

  private showInstallButton(): void {
    // Create or show the install button
    let button = document.getElementById('pwa-install-button');
    
    if (!button) {
      button = document.createElement('button');
      button.id = 'pwa-install-button';
      button.textContent = 'ثبت التطبيق';
      button.className = 'pwa-install-button'; // Add your own CSS classes
      
      // Position the button appropriately in your UI
      // For example, append to header or footer
      const header = document.querySelector('header') || document.querySelector('nav');
      if (header) {
        header.appendChild(button);
      } else {
        document.body.appendChild(button);
      }
    }

    button.style.display = 'block';
    button.addEventListener('click', () => this.installPWA());
    
    this.installButton = button;
  }

  private hideInstallButton(): void {
    if (this.installButton) {
      this.installButton.style.display = 'none';
    }
  }

  private async installPWA(): Promise<void> {
    if (!this.deferredPrompt) {
      console.warn('Tried to install but no deferred prompt available');
      return;
    }

    // Show the install prompt
    (this.deferredPrompt as any).prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await (this.deferredPrompt as any).userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Reset the deferred prompt variable
    this.deferredPrompt = null;
    this.hideInstallButton();
  }

  // Method to check if the app is running as PWA
  public static isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (navigator.standalone as boolean) ||  // iOS Safari
           document.referrer.includes('android-app://');
  }

  // Method to get PWA installation status
  public getInstallationStatus(): 'not-installed' | 'installed' | 'installable' {
    if (PWAInstaller.isStandalone()) {
      return 'installed';
    }
    
    return this.deferredPrompt ? 'installable' : 'not-installed';
  }
}

// Initialize PWA installer when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PWAInstaller();
});