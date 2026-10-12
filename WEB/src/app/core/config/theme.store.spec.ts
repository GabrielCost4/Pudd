import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeStore } from './theme.store';

describe('ThemeStore', () => {
  const root = document.createElement('html');
  const storage = { getItem: vi.fn(), setItem: vi.fn() };

  beforeEach(() => {
    root.classList.remove('pudd-dark');
    storage.getItem.mockReset().mockReturnValue('dark');
    storage.setItem.mockReset();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: { documentElement: root, defaultView: { localStorage: storage } },
        },
      ],
    });
  });

  it('restores the chosen theme and persists subsequent changes', () => {
    const store = TestBed.inject(ThemeStore);
    TestBed.tick();
    expect(store.mode()).toBe('dark');
    expect(root.classList.contains('pudd-dark')).toBe(true);
    store.toggle();
    TestBed.tick();
    expect(store.mode()).toBe('light');
    expect(root.classList.contains('pudd-dark')).toBe(false);
    expect(storage.setItem).toHaveBeenLastCalledWith('pudd-theme', 'light');
  });

  it('still switches themes when browser storage is blocked', () => {
    storage.getItem.mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    storage.setItem.mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    const store = TestBed.inject(ThemeStore);
    TestBed.tick();
    expect(store.mode()).toBe('light');
    store.toggle();
    TestBed.tick();
    expect(root.classList.contains('pudd-dark')).toBe(true);
  });
});
