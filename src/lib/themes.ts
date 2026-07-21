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
    name: 'Selvault Amber',
    description: 'The classic deep dark and amber aesthetic.',
    colors: {
      primary: 'oklch(0.72 0.17 55)',
      background: 'oklch(0.1 0.01 60)',
      card: 'oklch(0.14 0.012 60)',
      accent: 'oklch(0.18 0.018 55)',
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Green',
    description: 'A crisp, modern green and dark grey theme.',
    colors: {
      primary: '#22c55e',
      background: '#24262c',
      card: '#1e1e24',
      accent: '#dafbe5',
    },
  },
  {
    id: 'mint-leaf',
    name: 'Mint Leaf',
    description: 'A refreshing light and dark green palette.',
    colors: {
      primary: '#50af71',
      background: '#0b1810',
      card: '#102317',
      accent: '#306944',
    },
  },
  {
    id: 'amethyst-smoke',
    name: 'Amethyst Smoke',
    description: 'An elegant violet and purple palette.',
    colors: {
      primary: '#a553ac',
      background: '#170c18',
      card: '#211122',
      accent: '#633267',
    },
  },
];
