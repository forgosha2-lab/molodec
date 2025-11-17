const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3003';

function getUserId(): string | null {
  const user = localStorage.getItem('user');
  if (user) {
    try {
      const userData = JSON.parse(user);
      return userData.id || null;
    } catch (e) {
      console.error('Failed to parse user data:', e);
    }
  }
  return null;
}

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
        return userData.diamondsBalance || userData.diamonds_balance || 100;
      } catch (e) {
        console.error('Failed to parse user data:', e);
      }
    }
    return 100;
  }

  async fetchBalanceFromServer(): Promise<number> {
    const userId = getUserId();
    if (!userId) {
      return this.getBalance();
    }

    try {
      const response = await fetch(`${API_URL}/api/profile/${userId}`);
      const data = await response.json();
      
      if (data.data && data.data.diamondsBalance !== undefined) {
        const newBalance = data.data.diamondsBalance;
        this.updateLocalBalance(newBalance);
        return newBalance;
      }
    } catch (error) {
      console.error('Failed to fetch balance from server:', error);
    }

    return this.getBalance();
  }

  private updateLocalBalance(newBalance: number): void {
    let user = localStorage.getItem('user');
    let userData: any;
    
    if (user) {
      try {
        userData = JSON.parse(user);
      } catch (e) {
        console.error('Failed to parse user data:', e);
        userData = { diamondsBalance: newBalance };
      }
    } else {
      userData = { diamondsBalance: newBalance };
    }
    
    userData.diamondsBalance = newBalance;
    userData.diamonds_balance = newBalance;
    localStorage.setItem('user', JSON.stringify(userData));
    this.notifyListeners(newBalance);
  }

  async updateBalance(amount: number, operation: 'add' | 'subtract' | 'set'): Promise<number> {
    const userId = getUserId();
    if (!userId) {
      console.error('No user ID found');
      return this.getBalance();
    }

    try {
      const response = await fetch(`${API_URL}/api/profile/${userId}/balance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount, operation }),
      });

      const data = await response.json();
      
      if (data.data && data.data.balance !== undefined) {
        const newBalance = data.data.balance;
        this.updateLocalBalance(newBalance);
        return newBalance;
      } else {
        throw new Error(data.error || 'Failed to update balance');
      }
    } catch (error) {
      console.error('Failed to update balance on server:', error);
      throw error;
    }
  }

  setBalance(newBalance: number): void {
    this.updateLocalBalance(newBalance);
  }

  private handleStorageChange(e: StorageEvent): void {
    if (e.key === 'user' && e.newValue) {
      try {
        const userData = JSON.parse(e.newValue);
        const balance = userData.diamondsBalance || userData.diamonds_balance || 100;
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
    updateBalance: (amount: number, operation: 'add' | 'subtract' | 'set') => balanceSync.updateBalance(amount, operation),
    fetchBalanceFromServer: () => balanceSync.fetchBalanceFromServer(),
    subscribe: (listener: (balance: number) => void) => balanceSync.subscribe(listener),
  };
};

export const getBalance = () => BalanceSync.getInstance().getBalance();
export const setBalance = (balance: number) => BalanceSync.getInstance().setBalance(balance);
export const updateBalance = (amount: number, operation: 'add' | 'subtract' | 'set') => BalanceSync.getInstance().updateBalance(amount, operation);
export const fetchBalanceFromServer = () => BalanceSync.getInstance().fetchBalanceFromServer();
export const subscribeToBalance = (listener: (balance: number) => void) => BalanceSync.getInstance().subscribe(listener);
