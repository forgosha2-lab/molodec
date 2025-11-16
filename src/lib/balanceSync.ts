export class BalanceSync {
  private static instance: BalanceSync;
  private listeners: Set<(balance: number) => void> = new Set();

  private constructor() {
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  static getInstance(): BalanceSync {
    if (!BalanceSync.instance) {
      BalanceSync.instance = new BalanceSync();
    }
    return BalanceSync.instance;
  }

  subscribe(listener: (balance: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getBalance(): number {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        return userData.diamonds_balance || 100;
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    return 100;
  }

  setBalance(newBalance: number): void {
    let user = localStorage.getItem('user');
    let userData: any;
    
    if (user) {
      try {
        userData = JSON.parse(user);
      } catch (e) {
        console.error('Failed to parse user data:', e);
        userData = { diamonds_balance: newBalance };
      }
    } else {
      userData = { diamonds_balance: newBalance };
    }
    
    userData.diamonds_balance = newBalance;
    localStorage.setItem('user', JSON.stringify(userData));
    this.notifyListeners(newBalance);
  }

  private handleStorageChange(e: StorageEvent): void {
    if (e.key === 'user' && e.newValue) {
      try {
        const userData = JSON.parse(e.newValue);
        const balance = userData.diamonds_balance || 100;
        this.notifyListeners(balance);
      } catch (err) {
        console.error('Failed to sync balance:', err);
      }
    }
  }

  private notifyListeners(balance: number): void {
    this.listeners.forEach(listener => listener(balance));
  }
}

export const useBalanceSync = () => {
  const balanceSync = BalanceSync.getInstance();
  return {
    getBalance: () => balanceSync.getBalance(),
    setBalance: (balance: number) => balanceSync.setBalance(balance),
    subscribe: (listener: (balance: number) => void) => balanceSync.subscribe(listener),
  };
};

export const getBalance = () => BalanceSync.getInstance().getBalance();
export const setBalance = (balance: number) => BalanceSync.getInstance().setBalance(balance);
export const subscribeToBalance = (listener: (balance: number) => void) => BalanceSync.getInstance().subscribe(listener);
