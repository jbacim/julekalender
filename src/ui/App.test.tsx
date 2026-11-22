import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { setup, setDate } from '../test/helpers';
import { DANISH_ALPHABET } from '../domain/letters';
import { KEYBOARD_ROWS } from './components/Keyboard';

// Lyd og canvas findes ikke i jsdom – stil dem af.
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as never;

async function createProfile(user: ReturnType<typeof userEvent.setup>, name: string, difficulty: 'Nem' | 'Normal' = 'Normal') {
  await user.type(await screen.findByLabelText(/Kaldenavn/), name);
  await user.click(screen.getByText(difficulty));
  await user.click(screen.getByRole('button', { name: 'Lav profil' }));
  await screen.findByRole('button', { name: new RegExp(`Aktiv profil: ${name}`) });
}

function keyboard() {
  return screen.getByRole('group', { name: 'Bogstaver' });
}

async function currentWord(service: ReturnType<typeof setup>['service'], profileName: string, day: number) {
  const p = (await service.listProfiles()).find((x) => x.nickname === profileName)!;
  const yp = await service.getYear(p.id, 2026);
  return yp!.days[day]!.round!.word.normalized;
}

describe('app-flow', () => {
  it('opret profil, åbn dagens låge, vind og se gaver og pynt', async () => {
    const { service } = setup([2026, 12, 3]);
    const user = userEvent.setup();
    render(<App service={service} />);
    await createProfile(user, 'Ida');
    expect(screen.getByRole('status', { name: '0 gaver i alt' })).toBeInTheDocument();
    // 2D-fallback bruges uden WebGL
    expect(document.querySelector('.world2d')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /Låge 3, i dag/ }));
    await screen.findByRole('heading', { name: 'Låge 3' });
    const word = await currentWord(service, 'Ida', 3);
    const wrong = DANISH_ALPHABET.filter((l) => !word.includes(l));
    // To fejl, gentaget fejl koster intet
    await user.click(within(keyboard()).getByRole('button', { name: wrong[0] }));
    await user.click(within(keyboard()).getByRole('button', { name: wrong[1] }));
    await user.click(within(keyboard()).getByRole('button', { name: new RegExp(`^${wrong[0]},`) }));
    await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === '8 af 10 gaver tilbage i dag');
    for (const l of new Set([...word].filter((c) => DANISH_ALPHABET.includes(c)))) {
      await user.click(within(keyboard()).getByRole('button', { name: l }));
    }
    await screen.findByRole('heading', { name: 'Godt gået!' });
    expect(screen.getByText(/Du reddede/).textContent).toContain('8');
    await user.click(screen.getByRole('button', { name: 'Se det i din juleverden' }));
    await screen.findByRole('status', { name: '8 gaver i alt' });
    expect(screen.getByRole('button', { name: /Låge 3, i dag: vundet/ })).toBeInTheDocument();
  });

  it('skærmtastaturet er dansk QWERTY med Æ, Ø og Å', async () => {
    expect(KEYBOARD_ROWS.flat().slice(0, 6).join('')).toBe('QWERTY');
    expect(KEYBOARD_ROWS[0].at(-1)).toBe('Å');
    expect(KEYBOARD_ROWS[1].slice(-2)).toEqual(['Æ', 'Ø']);
    expect(new Set(KEYBOARD_ROWS.flat())).toEqual(new Set(DANISH_ALPHABET));
  });

  it('fysisk tastatur virker i spillet, men ikke i tekstfelter', async () => {
    const { service } = setup([2026, 12, 3]);
    const user = userEvent.setup();
    render(<App service={service} />);
    // I profilfeltet må tastetryk ikke gætte noget
    await createProfile(user, 'Bo');
    await user.click(screen.getByRole('button', { name: /^Låge 1[,:]/ }));
    await screen.findByRole('heading', { name: 'Låge 1' });
    const word = await currentWord(service, 'Bo', 1);
    const wrong = DANISH_ALPHABET.find((l) => !word.includes(l))!;
    fireEvent.keyDown(window, { key: wrong.toLowerCase() });
    await screen.findByText((_, el) => el?.tagName === 'P' && el.textContent === '9 af 10 gaver tilbage i dag');
    fireEvent.keyDown(window, { key: wrong.toLowerCase() });
    await new Promise((r) => setTimeout(r, 30));
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === '9 af 10 gaver tilbage i dag')).toBeInTheDocument();
  });

  it('låste låger kan ikke åbnes', async () => {
    const { service } = setup([2026, 12, 3]);
    const user = userEvent.setup();
    render(<App service={service} />);
    await createProfile(user, 'Al');
    await user.click(screen.getByRole('button', { name: /Låge 10: låst/ }));
    await screen.findByText('Låge 10 kan åbnes den 10. december.');
    expect(screen.queryByRole('group', { name: 'Bogstaver' })).toBeNull();
  });

  it('Freeplay er tydeligt markeret og ændrer ikke kalendergaver', async () => {
    const { service } = setup([2026, 12, 3]);
    const user = userEvent.setup();
    render(<App service={service} />);
    await createProfile(user, 'Fri');
    await user.click(screen.getByRole('button', { name: /Fri leg/ }));
    await screen.findByText('Fri leg – tæller ikke med i kalenderen');
    const p = (await service.listProfiles())[0];
    const fp = await service.getFreeplay(p.id);
    for (const l of new Set([...fp!.round!.word.normalized].filter((c) => DANISH_ALPHABET.includes(c)))) {
      await user.click(within(keyboard()).getByRole('button', { name: l }));
    }
    await screen.findByRole('heading', { name: 'Flot klaret!' });
    await user.click(screen.getByRole('button', { name: 'Til kalenderen' }));
    await screen.findByRole('status', { name: '0 gaver i alt' });
    expect(await service.getYear(p.id, 2026)).toBeUndefined();
  });

  it('profilskift viser kun den valgte profils data', async () => {
    const { service } = setup([2026, 12, 3]);
    const a = await service.createProfile({ nickname: 'Anna', avatar: 'ræv', difficulty: 'normal' });
    await service.createProfile({ nickname: 'Bent', avatar: 'ugle', difficulty: 'easy' });
    const s = await service.startDay(a, 2026, 1);
    if (!s.ok) throw new Error();
    for (const l of new Set([...s.value.word.normalized].filter((c) => DANISH_ALPHABET.includes(c))))
      await service.guessCalendar(a.id, 2026, { kind: 'day', day: 1 }, s.value.id, l);
    const user = userEvent.setup();
    render(<App service={service} />);
    await user.click(await screen.findByRole('button', { name: /Anna/ }));
    await screen.findByRole('status', { name: '10 gaver i alt' });
    await user.click(screen.getByRole('button', { name: /Skift profil/ }));
    await user.click(await screen.findByRole('button', { name: /Bent/ }));
    await screen.findByRole('status', { name: '0 gaver i alt' });
    expect(screen.getByRole('button', { name: /^Låge 1: klar/ })).toBeInTheDocument();
  });

  it('skrivefejl giver en forståelig besked', async () => {
    const { service, storage } = setup([2026, 12, 3]);
    const user = userEvent.setup();
    render(<App service={service} />);
    await createProfile(user, 'Fejl');
    await user.click(screen.getByRole('button', { name: /^Låge 2[,:]/ }));
    await screen.findByRole('heading', { name: 'Låge 2' });
    storage.failWrites = true;
    await user.click(within(keyboard()).getByRole('button', { name: 'Q' }));
    await screen.findByText(/kunne ikke gemme det seneste/);
    // Ingen falsk fremgang i UI'et
    expect(screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === '10 af 10 gaver tilbage i dag')).toBeInTheDocument();
  });

  it('uden for sæsonen: låst kalender og Fri leg tilgængelig', async () => {
    const { service } = setup([2027, 3, 1]);
    const user = userEvent.setup();
    render(<App service={service} />);
    await createProfile(user, 'Sol');
    expect(screen.getByText(/Kalenderen åbner den 1. december/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fri leg/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Låge 1: låst/ }));
    expect(screen.queryByRole('group', { name: 'Bogstaver' })).toBeNull();
  });

  it('åben fane lukker kalenderspillet ved 24/12 → 25/12', async () => {
    const { service, dates } = setup([2026, 12, 24, 23]);
    const user = userEvent.setup();
    render(<App service={service} />);
    await createProfile(user, 'Nat');
    await user.click(screen.getByRole('button', { name: /^Låge 5[,:]/ }));
    await screen.findByRole('heading', { name: 'Låge 5' });
    setDate(dates, 2026, 12, 25, 0, 1);
    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });
    await screen.findByText('Kalenderen er lukket for i år. Du kan stadig spille Fri leg!');
    expect(screen.queryByRole('group', { name: 'Bogstaver' })).toBeNull();
  });

  it('finale: tab, nyt ord, vind og se 240 gaver – også uden WebGL og med færre effekter', async () => {
    const { service } = setup([2026, 12, 24]);
    const p = await service.createProfile({ nickname: 'Stjerne', avatar: 'kat', difficulty: 'normal' });
    await service.saveSettings({ schema: 1, soundOn: false, speechOn: false, reducedEffects: true, activeProfileId: p.id });
    const user = userEvent.setup();
    render(<App service={service} />);
    expect(await screen.findByRole('button', { name: /Låge 24, i dag/ })).toBeInTheDocument();
    expect(document.documentElement.dataset.reducedMotion).toBe('true');
    await user.click(screen.getByRole('button', { name: /Låge 24, i dag/ }));
    await screen.findByRole('heading', { name: 'Juleaften – finalen' });
    let yp = await service.getYear(p.id, 2026);
    let word = yp!.finale.round!.word.normalized;
    for (const l of DANISH_ALPHABET.filter((x) => !word.includes(x)).slice(0, 10)) {
      await user.click(within(keyboard()).getByRole('button', { name: l }));
    }
    await user.click(await screen.findByRole('button', { name: 'Prøv et nyt ord' }));
    await waitFor(async () => {
      yp = await service.getYear(p.id, 2026);
      expect(yp!.finale.roundsPlayed).toBe(2);
    });
    word = yp!.finale.round!.word.normalized;
    for (const l of new Set([...word].filter((c) => DANISH_ALPHABET.includes(c)))) {
      await user.click(within(keyboard()).getByRole('button', { name: l }));
    }
    await user.click(await screen.findByRole('button', { name: 'Se nissen aflevere gaverne' }));
    await screen.findByRole('heading', { name: 'Alle 240 gaver er tilbage!' }, { timeout: 4000 });
    expect(screen.getByRole('status', { name: '240 gaver i alt' })).toBeInTheDocument();
    expect(document.querySelector('.world2d')).not.toBeNull();
  });
});
