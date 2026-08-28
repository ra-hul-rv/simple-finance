export type ColorTheme = {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    background: string;
    card: string;
    accent: string;
  };
};

export const THEMES: ColorTheme[] = [
  {
    id: 'selvault',
    name: 'Bankco Green',
    description: 'Clean green banking theme inspired by Bankco.',
    colors: {
      primary: '#22C55E',
      background: '#151515',
      card: '#1D1E24',
      accent: '#2A313C',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'A crisp, modern green and dark grey theme.',
    colors: {
      primary: '#34d674',
      background: '#080b10',
      card: '#0f1218',
      accent: '#121a22',
    },
  },
  {
    id: 'mint-leaf',
    name: 'Mint Leaf',
    description: 'A refreshing light and dark green palette.',
    colors: {
      primary: '#5cbe80',
      background: '#050a07',
      card: '#091410',
      accent: '#112a1a',
    },
  },
  {
    id: 'amethyst-smoke',
    name: 'Amethyst Smoke',
    description: 'An elegant violet and purple palette.',
    colors: {
      primary: '#b86cc0',
      background: '#0a060b',
      card: '#120a14',
      accent: '#201224',
    },
  },
];
