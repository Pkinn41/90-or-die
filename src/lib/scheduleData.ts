export const getIntentColor = (type: string) => {
  switch (type) {
    case 'Green': return '#10b981';
    case 'Yellow': return '#fbbf24';
    case 'Red': return '#f87171';
    default: return '#94a3b8';
  }
};
