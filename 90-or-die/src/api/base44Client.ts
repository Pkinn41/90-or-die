/**
 * Mock persistence layer using localStorage since Firebase was declined.
 * Follows the pattern requested in the code snippet.
 */

const STORAGE_KEY = 'apex_throwing_entries';
const MEALS_KEY = 'apex_meal_entries';

export const base44 = {
  entities: {
    ThrowingEntry: {
      list: async () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
      },
      create: async (data: any) => {
        const stored = localStorage.getItem(STORAGE_KEY);
        const entries = stored ? JSON.parse(stored) : [];
        const newEntry = { ...data, id: Math.random().toString(36).substr(2, 9) };
        entries.push(newEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        return newEntry;
      }
    },
    MealEntry: {
      list: async () => {
        const stored = localStorage.getItem(MEALS_KEY);
        return stored ? JSON.parse(stored) : [];
      },
      update: async (data: any) => {
        const stored = localStorage.getItem(MEALS_KEY);
        let entries = stored ? JSON.parse(stored) : [];
        // data should have date and meals array
        const index = entries.findIndex((e: any) => e.date === data.date);
        if (index > -1) {
          entries[index] = { ...entries[index], ...data };
        } else {
          entries.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
        }
        localStorage.setItem(MEALS_KEY, JSON.stringify(entries));
        return data;
      }
    },
    ChecklistEntry: {
      list: async () => {
        const stored = localStorage.getItem('apex_checklist_entries');
        return stored ? JSON.parse(stored) : [];
      },
      update: async (data: any) => {
        const stored = localStorage.getItem('apex_checklist_entries');
        let entries = stored ? JSON.parse(stored) : [];
        const index = entries.findIndex((e: any) => e.date === data.date);
        if (index > -1) {
          entries[index] = { ...entries[index], ...data };
        } else {
          entries.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
        }
        localStorage.setItem('apex_checklist_entries', JSON.stringify(entries));
        return data;
      }
    },
    TrackEntry: {
      list: async () => {
        const stored = localStorage.getItem('apex_track_entries');
        return stored ? JSON.parse(stored) : [];
      },
      update: async (data: any) => {
        const stored = localStorage.getItem('apex_track_entries');
        let entries = stored ? JSON.parse(stored) : [];
        const index = entries.findIndex((e: any) => e.date === data.date);
        if (index > -1) {
          entries[index] = { ...entries[index], ...data };
        } else {
          entries.push({ ...data, id: Math.random().toString(36).substr(2, 9) });
        }
        localStorage.setItem('apex_track_entries', JSON.stringify(entries));
        return data;
      }
    }
  }
};

