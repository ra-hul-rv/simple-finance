export interface CardTemplate {
  id: string;
  name: string;
  brand: 'visa' | 'master' | 'amex' | 'rupay';
  gradient: string; // CSS gradient string
  textColor: string; // Tailwind text color
  accentColor: string; // Hex accent
  logoText: string;
  cardTitle: string;
  chipStyle: 'gold' | 'silver';
  pattern?: 'guilloche' | 'geometric' | 'waves' | 'mandala' | 'aurora' | 'facets';
}

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'STANDARD',
    name: 'Standard (Theme Color)',
    brand: 'visa',
    gradient: 'linear-gradient(135deg, var(--primary) 0%, #18181b 100%)',
    textColor: 'text-white',
    accentColor: '#ffffff',
    logoText: 'Credit Card',
    cardTitle: 'STANDARD',
    chipStyle: 'gold',
  },
  {
    id: 'SBM_NOVIO',
    name: 'SBM Novio Virtual Card',
    brand: 'rupay',
    gradient: 'linear-gradient(135deg, #3B1472 0%, #6B21A8 50%, #4c1d95 100%)',
    textColor: 'text-white',
    accentColor: '#10B981',
    logoText: 'SBM Bank',
    cardTitle: 'NOVIO',
    chipStyle: 'silver',
    pattern: 'geometric',
  },
  {
    id: 'AMEX_REWARDS',
    name: 'American Express Membership Rewards',
    brand: 'amex',
    gradient: 'linear-gradient(135deg, #F3E5AB 0%, #D4AF37 40%, #B8860B 100%)',
    textColor: 'text-slate-900',
    accentColor: '#006FCF',
    logoText: 'AMERICAN EXPRESS',
    cardTitle: 'MEMBERSHIP REWARDS',
    chipStyle: 'gold',
    pattern: 'guilloche',
  },
  {
    id: 'ICICI_RUBYX',
    name: 'ICICI Rubyx Credit Card',
    brand: 'visa',
    gradient: 'linear-gradient(135deg, #800020 0%, #5c0018 50%, #3B000C 100%)',
    textColor: 'text-[#e2e8f0]',
    accentColor: '#e2e8f0',
    logoText: 'ICICI Bank',
    cardTitle: 'RUBYX',
    chipStyle: 'silver',
    pattern: 'facets',
  },
  {
    id: 'ICICI_AMAZON_PAY',
    name: 'ICICI Amazon Pay Credit Card',
    brand: 'visa',
    gradient: 'linear-gradient(135deg, #121212 0%, #1E1E1E 50%, #232f3e 100%)',
    textColor: 'text-[#ff9900]',
    accentColor: '#ff9900',
    logoText: 'amazon pay | ICICI',
    cardTitle: 'Amazon Pay',
    chipStyle: 'gold',
  },
  {
    id: 'FEDERAL_SCAPIA',
    name: 'Scapia Federal Bank Credit Card',
    brand: 'visa',
    gradient: 'linear-gradient(135deg, #0B192C 0%, #142d4c 50%, #1E3E62 100%)',
    textColor: 'text-[#06B6D4]',
    accentColor: '#06B6D4',
    logoText: 'Scapia | Federal Bank',
    cardTitle: 'SCAPIA',
    chipStyle: 'silver',
    pattern: 'aurora',
  },
  {
    id: 'AXIS_FLIPKART',
    name: 'Axis Flipkart Credit Card',
    brand: 'master',
    gradient: 'linear-gradient(135deg, #171717 0%, #262626 60%, #1a1a1a 100%)',
    textColor: 'text-white',
    accentColor: '#FFE11B',
    logoText: 'Axis Bank | Flipkart',
    cardTitle: 'Flipkart',
    chipStyle: 'gold',
    pattern: 'geometric',
  },
  {
    id: 'AXIS_MYZONE',
    name: 'Axis My Zone Credit Card',
    brand: 'master',
    gradient: 'linear-gradient(135deg, #4A0423 0%, #2d0216 50%, #1C0D17 100%)',
    textColor: 'text-white',
    accentColor: '#e2e8f0',
    logoText: 'Axis Bank',
    cardTitle: 'MY ZONE',
    chipStyle: 'silver',
    pattern: 'waves',
  },
  {
    id: 'AXIS_AIRTEL',
    name: 'Axis Airtel Credit Card',
    brand: 'master',
    gradient: 'linear-gradient(135deg, #0F0F10 0%, #1a1a1a 40%, #0F0F10 100%)',
    textColor: 'text-white',
    accentColor: '#E40000',
    logoText: 'Axis Bank | airtel',
    cardTitle: 'Airtel',
    chipStyle: 'gold',
    pattern: 'waves',
  },
  {
    id: 'SBI_CASHBACK',
    name: 'SBI Cashback Credit Card',
    brand: 'visa',
    gradient: 'linear-gradient(135deg, #2E0854 0%, #4C1D95 50%, #1E1B4B 100%)',
    textColor: 'text-white',
    accentColor: '#06b6d4',
    logoText: 'SBI Card',
    cardTitle: 'CASHBACK',
    chipStyle: 'gold',
  },
  {
    id: 'SBI_SIMPLY_CLICK',
    name: 'SBI SimplyCLICK Credit Card',
    brand: 'visa',
    gradient: 'linear-gradient(135deg, #0284C7 0%, #0EA5E9 50%, #38bdf8 100%)',
    textColor: 'text-white',
    accentColor: '#ffffff',
    logoText: 'SBI Card',
    cardTitle: 'SimplyCLICK',
    chipStyle: 'silver',
    pattern: 'mandala',
  },
  {
    id: 'YES_BANK_KIWI',
    name: 'Yes Bank Kiwi Credit Card',
    brand: 'rupay',
    gradient: 'linear-gradient(135deg, #0A0A0A 0%, #171717 50%, #0A0A0A 100%)',
    textColor: 'text-[#CCFF00]',
    accentColor: '#CCFF00',
    logoText: 'Kiwi | YES BANK',
    cardTitle: 'Kiwi',
    chipStyle: 'gold',
  },
  {
    id: 'HDFC_TATA_NEU',
    name: 'HDFC Tata Neu Infinity Credit Card',
    brand: 'visa',
    gradient: 'linear-gradient(135deg, #0B132B 0%, #1C2541 50%, #0f1a38 100%)',
    textColor: 'text-[#c084fc]',
    accentColor: '#7928CA',
    logoText: 'HDFC Bank | Tata Neu',
    cardTitle: 'INFINITY',
    chipStyle: 'gold',
    pattern: 'geometric',
  },
];

export function getTemplate(id: string): CardTemplate {
  return CARD_TEMPLATES.find(t => t.id === id) || CARD_TEMPLATES[0];
}

export function getOrdinalSuffix(i: number): string {
  const j = i % 10;
  const k = i % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}
