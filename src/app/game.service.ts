import { computed, Injectable, signal } from '@angular/core';

type PetStat = 'hunger' | 'energy' | 'happiness' | 'hygiene' | 'health';

type InventoryKey = 'berry' | 'soap' | 'medicine' | 'ball';

interface InventoryItem {
  key: InventoryKey;
  name: string;
  icon: string;
  description: string;
  price: number;
}

interface GameState {
  name: string;
  coins: number;
  age: number;
  level: number;
  xp: number;
  hunger: number;
  energy: number;
  happiness: number;
  hygiene: number;
  health: number;
  inventory: Record<InventoryKey, number>;
  log: string[];
  lastTick: number;
}

const STORAGE_KEY = 'tamagotchi-pet-state';

const SHOP_ITEMS: InventoryItem[] = [
  {
    key: 'berry',
    name: 'Bayas dulces',
    icon: '🍓',
    description: 'Suben el hambre y dan un poco de energia.',
    price: 12,
  },
  {
    key: 'soap',
    name: 'Burbujabon',
    icon: '🫧',
    description: 'Deja a la mascota limpia y feliz.',
    price: 15,
  },
  {
    key: 'medicine',
    name: 'Jarabe arcoiris',
    icon: '💊',
    description: 'Recupera salud cuando el cuidado bajo.',
    price: 22,
  },
  {
    key: 'ball',
    name: 'Pelota saltarina',
    icon: '⚽',
    description: 'Permite jugar sin gastar tantas energias.',
    price: 18,
  },
];

const INITIAL_STATE: GameState = {
  name: 'Mochi',
  coins: 35,
  age: 1,
  level: 1,
  xp: 0,
  hunger: 82,
  energy: 76,
  happiness: 84,
  hygiene: 72,
  health: 92,
  inventory: {
    berry: 2,
    soap: 1,
    medicine: 0,
    ball: 1,
  },
  log: ['Mochi acaba de despertar en su nueva casita.'],
  lastTick: Date.now(),
};

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly shopItems = SHOP_ITEMS;
  readonly state = signal<GameState>(this.loadState());

  readonly averageCare = computed(() => {
    const pet = this.state();
    return Math.round(
      (pet.hunger + pet.energy + pet.happiness + pet.hygiene + pet.health) / 5,
    );
  });

  readonly mood = computed(() => {
    const care = this.averageCare();
    const pet = this.state();

    if (pet.health < 35) {
      return { label: 'enfermito', face: '🤒', color: 'danger' };
    }

    if (pet.energy < 30) {
      return { label: 'dormilon', face: '😴', color: 'sleepy' };
    }

    if (care >= 80) {
      return { label: 'radiante', face: '😄', color: 'happy' };
    }

    if (care >= 55) {
      return { label: 'tranquilo', face: '🙂', color: 'calm' };
    }

    return { label: 'necesita mimos', face: '🥺', color: 'needy' };
  });

  readonly evolution = computed(() => {
    const pet = this.state();

    if (pet.level >= 4) {
      return { name: 'Guardiana nube', emoji: '🦄' };
    }

    if (pet.level >= 3) {
      return { name: 'Criatura estrella', emoji: '🐲' };
    }

    if (pet.level >= 2) {
      return { name: 'Bebe explorador', emoji: '🐱' };
    }

    return { name: 'Bebe mochi', emoji: '🐣' };
  });

  tick(): void {
    const now = Date.now();

    this.update((pet) => {
      const elapsedSteps = Math.max(1, Math.floor((now - pet.lastTick) / 4000));
      const next = {
        ...pet,
        age: pet.age + elapsedSteps,
        hunger: clamp(pet.hunger - 2 * elapsedSteps),
        energy: clamp(pet.energy - elapsedSteps),
        happiness: clamp(pet.happiness - elapsedSteps),
        hygiene: clamp(pet.hygiene - 2 * elapsedSteps),
        lastTick: now,
      };

      if (next.hunger < 25 || next.hygiene < 25 || next.energy < 15) {
        next.health = clamp(next.health - 2 * elapsedSteps);
      }

      return this.levelUp(next, elapsedSteps);
    });
  }

  feed(): void {
    this.update((pet) => this.addLog(this.levelUp({
      ...pet,
      hunger: clamp(pet.hunger + 18),
      energy: clamp(pet.energy + 4),
      happiness: clamp(pet.happiness + 5),
      xp: pet.xp + 5,
    }), 'Comio un snack casero y movio la colita.'));
  }

  play(): void {
    this.update((pet) => {
      if (pet.energy < 12) {
        return this.addLog(pet, 'Esta demasiado cansado para jugar.');
      }

      return this.addLog(this.levelUp({
        ...pet,
        happiness: clamp(pet.happiness + 18),
        energy: clamp(pet.energy - 12),
        hygiene: clamp(pet.hygiene - 8),
        hunger: clamp(pet.hunger - 5),
        xp: pet.xp + 8,
      }), 'Jugaron en el patio y gano experiencia.');
    });
  }

  sleep(): void {
    this.update((pet) => this.addLog(this.levelUp({
      ...pet,
      energy: clamp(pet.energy + 26),
      health: clamp(pet.health + 7),
      hunger: clamp(pet.hunger - 6),
      xp: pet.xp + 4,
    }), 'Durmio una siesta esponjosa.'));
  }

  clean(): void {
    this.update((pet) => this.addLog(this.levelUp({
      ...pet,
      hygiene: clamp(pet.hygiene + 25),
      happiness: clamp(pet.happiness + 4),
      xp: pet.xp + 4,
    }), 'Quedo brillante despues del bano.'));
  }

  heal(): void {
    this.update((pet) => {
      if (pet.coins < 10) {
        return this.addLog(pet, 'Faltan monedas para visitar la clinica.');
      }

      return this.addLog({
        ...pet,
        coins: pet.coins - 10,
        health: clamp(pet.health + 22),
        happiness: clamp(pet.happiness - 3),
      }, 'La clinica lo reviso y ya se siente mejor.');
    });
  }

  buy(item: InventoryItem): void {
    this.update((pet) => {
      if (pet.coins < item.price) {
        return this.addLog(pet, `No alcanzan las monedas para ${item.name}.`);
      }

      return this.addLog({
        ...pet,
        coins: pet.coins - item.price,
        inventory: {
          ...pet.inventory,
          [item.key]: pet.inventory[item.key] + 1,
        },
      }, `Compraste ${item.name}.`);
    });
  }

  useItem(key: InventoryKey): void {
    this.update((pet) => {
      if (pet.inventory[key] <= 0) {
        return this.addLog(pet, 'No queda ese objeto en el inventario.');
      }

      const next = {
        ...pet,
        inventory: {
          ...pet.inventory,
          [key]: pet.inventory[key] - 1,
        },
      };

      if (key === 'berry') {
        return this.addLog(this.levelUp({
          ...next,
          hunger: clamp(next.hunger + 24),
          energy: clamp(next.energy + 8),
          xp: next.xp + 6,
        }), 'Las bayas desaparecieron en segundos.');
      }

      if (key === 'soap') {
        return this.addLog(this.levelUp({
          ...next,
          hygiene: clamp(next.hygiene + 35),
          happiness: clamp(next.happiness + 6),
          xp: next.xp + 5,
        }), 'Un bano de burbujas le cambio el humor.');
      }

      if (key === 'medicine') {
        return this.addLog({
          ...next,
          health: clamp(next.health + 38),
          energy: clamp(next.energy + 4),
        }, 'El jarabe arcoiris hizo efecto.');
      }

      return this.addLog(this.levelUp({
        ...next,
        happiness: clamp(next.happiness + 24),
        energy: clamp(next.energy - 4),
        xp: next.xp + 8,
      }), 'La pelota saltarina fue un exito.');
    });
  }

  trainReflexes(): void {
    this.update((pet) => {
      if (pet.energy < 18) {
        return this.addLog(pet, 'Necesita energia para el minijuego.');
      }

      const score = Math.floor(Math.random() * 26) + 10;
      const coins = Math.floor(score / 3);

      return this.addLog(this.levelUp({
        ...pet,
        coins: pet.coins + coins,
        energy: clamp(pet.energy - 16),
        happiness: clamp(pet.happiness + 10),
        hunger: clamp(pet.hunger - 6),
        xp: pet.xp + score,
      }), `Atrapo ${score} luciernagas y gano ${coins} monedas.`);
    });
  }

  reset(): void {
    this.state.set({
      ...INITIAL_STATE,
      lastTick: Date.now(),
      log: ['Nueva partida iniciada.'],
    });
    this.save();
  }

  private update(project: (state: GameState) => GameState): void {
    this.state.update((state) => project(state));
    this.save();
  }

  private levelUp(pet: GameState, xpBonus = 0): GameState {
    let next = { ...pet, xp: pet.xp + xpBonus };
    let leveled = false;

    while (next.xp >= next.level * 100) {
      next = {
        ...next,
        xp: next.xp - next.level * 100,
        level: next.level + 1,
        coins: next.coins + 25,
        health: clamp(next.health + 10),
      };
      leveled = true;
    }

    return leveled ? this.addLog(next, `Subio a nivel ${next.level} y evoluciono un poco.`) : next;
  }

  private addLog(pet: GameState, entry: string): GameState {
    return {
      ...pet,
      log: [entry, ...pet.log].slice(0, 7),
    };
  }

  private loadState(): GameState {
    if (typeof localStorage === 'undefined') {
      return { ...INITIAL_STATE, lastTick: Date.now() };
    }

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return { ...INITIAL_STATE, lastTick: Date.now() };
    }

    try {
      return {
        ...INITIAL_STATE,
        ...JSON.parse(saved),
        inventory: {
          ...INITIAL_STATE.inventory,
          ...JSON.parse(saved).inventory,
        },
      };
    } catch {
      return { ...INITIAL_STATE, lastTick: Date.now() };
    }
  }

  private save(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    }
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
