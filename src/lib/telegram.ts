import WebApp from '@twa-dev/sdk';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

class TelegramService {
  private isReady = false;
  
  constructor() {
    if (typeof window !== 'undefined' && WebApp) {
      WebApp.ready();
      this.isReady = true;
      WebApp.expand();
    }
  }

  getUser(): TelegramUser | null {
    if (!this.isReady || !WebApp.initDataUnsafe?.user) {
      // For development/testing, return mock user
      return {
        id: 123456789,
        first_name: "Тестовый",
        last_name: "Пользователь",
        username: "testuser",
        language_code: "ru"
      };
    }
    
    return WebApp.initDataUnsafe.user as TelegramUser;
  }

  getUserId(): string {
    const user = this.getUser();
    if (!user) {
      // Для разработки используем сохраненный ID или генерируем новый
      const savedId = localStorage.getItem('telegram_user_id');
      if (savedId) return savedId;
      const guestId = `guest_${Date.now()}`;
      localStorage.setItem('telegram_user_id', guestId);
      return guestId;
    }
    const tgId = `tg_${user.id}`;
    localStorage.setItem('telegram_user_id', tgId);
    return tgId;
  }

  getUsername(): string {
    const user = this.getUser();
    if (!user) return "Гость";
    return user.username || user.first_name || "Игрок";
  }

  isAvailable(): boolean {
    return this.isReady && !!WebApp.initDataUnsafe?.user;
  }

  close() {
    if (this.isReady) {
      WebApp.close();
    }
  }

  showAlert(message: string) {
    if (this.isReady) {
      WebApp.showAlert(message);
    } else {
      alert(message);
    }
  }
}

export const telegram = new TelegramService();
