export function formatCurrency(amount: number | string, currency: string = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0.00';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCompactCurrency(amount: number | string, currency: string = 'INR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '₹0';

  if (Math.abs(num) >= 10000000) {
    return `₹${(num / 10000000).toFixed(2)}Cr`;
  }
  if (Math.abs(num) >= 100000) {
    return `₹${(num / 100000).toFixed(2)}L`;
  }
  if (Math.abs(num) >= 1000) {
    return `₹${(num / 1000).toFixed(1)}K`;
  }
  return formatCurrency(num, currency);
}

export function formatDate(date: Date | string, format: string = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  switch (format) {
    case 'dd/MM/yyyy':
      return `${day}/${month}/${year}`;
    case 'MMM dd, yyyy':
      return `${monthNames[d.getMonth()]} ${day}, ${year}`;
    case 'dd MMM yyyy':
      return `${day} ${monthNames[d.getMonth()]} ${year}`;
    case 'relative': {
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${monthNames[d.getMonth()]} ${day}, ${year}`;
    }
    default:
      return `${day}/${month}/${year}`;
  }
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}
