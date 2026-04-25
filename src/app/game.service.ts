import { computed, Injectable, signal } from '@angular/core';

type InventoryKey = 'berry' | 'soap' | 'medicine' | 'ball';
export type PetSpecies = 'mochi' | 'pipo' | 'luma' | 'bubu' | 'niko';

interface InventoryItem {
  key: InventoryKey;
  name: string;
  icon: string;
  description: string;
  price: number;
}

interface PetDefinition {
  id: PetSpecies;
  displayName: string;
  speciesName: string;
  personality: string;
  bonus: string;
  weakness: string;
  stages: string[];
  imageBase: string;
  accent: string;
  initialStats: Pick<GameState, 'hunger' | 'energy' | 'happiness' | 'hygiene' | 'health'>;
}

interface GameState {
  name: string;
  species: PetSpecies;
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

export interface ActionResult {
  success: boolean;
  message: string;
  coins?: number;
  xp?: number;
}

const STORAGE_KEY = 'tamagotchi-pet-state';

const PETS: PetDefinition[] = [
  {
    id: 'mochi',
    displayName: 'Mochi',
    speciesName: 'Nube gatito',
    personality: 'Equilibrada y mimosa',
    bonus: 'Se recupera mejor al dormir.',
    weakness: 'Pierde higiene un poco mas rapido.',
    stages: ['Algodon pequeno', 'Nube saltarina', 'Guardian algodon'],
    imageBase: 'mochi',
    accent: '#ff7aa8',
    initialStats: { hunger: 82, energy: 76, happiness: 84, hygiene: 72, health: 92 },
  },
  {
    id: 'pipo',
    displayName: 'Pipo',
    speciesName: 'Dino bebe',
    personality: 'Jugueton e inquieto',
    bonus: 'Gana mas felicidad al jugar.',
    weakness: 'Le da hambre mas seguido.',
    stages: ['Dino curioso', 'Dino travieso', 'Mini dragon'],
    imageBase: 'pipo',
    accent: '#42c883',
    initialStats: { hunger: 72, energy: 88, happiness: 86, hygiene: 70, health: 90 },
  },
  {
    id: 'luma',
    displayName: 'Luma',
    speciesName: 'Estrella viva',
    personality: 'Sensible y brillante',
    bonus: 'Sube de nivel con menos esfuerzo.',
    weakness: 'Pierde felicidad si se descuida.',
    stages: ['Chispa tierna', 'Cometa alegre', 'Constelacion viva'],
    imageBase: 'luma',
    accent: '#8b5cf6',
    initialStats: { hunger: 78, energy: 80, happiness: 90, hygiene: 76, health: 84 },
  },
  {
    id: 'bubu',
    displayName: 'Bubu',
    speciesName: 'Blob acuatico',
    personality: 'Tranquilo y resistente',
    bonus: 'Tiene mas salud y aguanta mejor.',
    weakness: 'Se cansa antes en minijuegos.',
    stages: ['Gotita curiosa', 'Blob burbuja', 'Rey laguna'],
    imageBase: 'bubu',
    accent: '#38bdf8',
    initialStats: { hunger: 80, energy: 68, happiness: 80, hygiene: 88, health: 98 },
  },
  {
    id: 'niko',
    displayName: 'Niko',
    speciesName: 'Zorro magico',
    personality: 'Aventurero y astuto',
    bonus: 'Gana mas monedas en minijuegos.',
    weakness: 'Gasta mas energia al jugar.',
    stages: ['Zorrito chispa', 'Zorro explorador', 'Kitsune estelar'],
    imageBase: 'niko',
    accent: '#f97316',
    initialStats: { hunger: 80, energy: 84, happiness: 82, hygiene: 74, health: 88 },
  },
];

const SHOP_ITEMS: InventoryItem[] = [
  {
    key: 'berry',
    name: 'Bayas dulces',
    icon: '🍓',
    description: 'Suben hambre y dan un poco de energia.',
    price: 12,
  },
  {
    key: 'soap',
    name: 'Burbujabon',
    icon: '🫧',
    description: 'Deja a tu mascota limpia y feliz.',
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
    description: 'Permite jugar sin gastar tanta energia.',
    price: 18,
  },
];

const DEFAULT_INVENTORY: Record<InventoryKey, number> = {
  berry: 2,
  soap: 1,
  medicine: 0,
  ball: 1,
};

@Injectable({ providedIn: 'root' })
export class GameService {
  readonly shopItems = SHOP_ITEMS;
  readonly pets = PETS;
  readonly needsOnboarding = signal(!hasSavedState());
  readonly state = signal<GameState>(this.loadState());

  readonly pet = computed(() => this.findPet(this.state().species));

  readonly stage = computed(() => {
    const level = this.state().level;
    const index = level >= 4 ? 2 : level >= 2 ? 1 : 0;

    return {
      index: index + 1,
      name: this.pet().stages[index],
    };
  });

  readonly petImage = computed(
    () => `assets/pets/${this.pet().imageBase}-stage-${this.stage().index}.svg`,
  );

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
      return { label: 'Enfermito', face: '🤒', color: 'danger' };
    }

    if (pet.energy < 30) {
      return { label: 'Dormilon', face: '😴', color: 'sleepy' };
    }

    if (care >= 80) {
      return { label: 'Radiante', face: '😄', color: 'happy' };
    }

    if (care >= 55) {
      return { label: 'Tranquilo', face: '🙂', color: 'calm' };
    }

    return { label: 'Necesita mimos', face: '🥺', color: 'needy' };
  });

  readonly careTip = computed(() => {
    const pet = this.state();
    const lowest = [
      { key: 'hunger', label: 'hambre', value: pet.hunger, tip: 'Dale comida o usa bayas dulces.' },
      { key: 'energy', label: 'energia', value: pet.energy, tip: 'Una siesta lo va a recuperar.' },
      { key: 'happiness', label: 'felicidad', value: pet.happiness, tip: 'Jugar o usar la pelota ayuda rapido.' },
      { key: 'hygiene', label: 'higiene', value: pet.hygiene, tip: 'Un bano o burbujabon lo deja impecable.' },
      { key: 'health', label: 'salud', value: pet.health, tip: 'Usa medicina o visita la clinica.' },
    ].sort((a, b) => a.value - b.value)[0];

    if (lowest.value >= 72) {
      return `${pet.name} esta muy bien. Aprovecha para jugar y ganar experiencia.`;
    }

    return `Atencion: ${pet.name} tiene baja ${lowest.label}. ${lowest.tip}`;
  });

  readonly xpProgress = computed(() => {
    const pet = this.state();
    const threshold = this.xpThreshold(pet);

    return {
      current: pet.xp,
      threshold,
      percent: Math.min(100, Math.round((pet.xp / threshold) * 100)),
    };
  });

  readonly goals = computed(() => {
    const pet = this.state();
    const care = this.averageCare();

    return [
      {
        title: 'Cuidador atento',
        description: 'Mantén el cuidado medio sobre 80%.',
        progress: Math.min(care, 80),
        target: 80,
        complete: care >= 80,
      },
      {
        title: 'Primera evolución',
        description: 'Sube a nivel 2 para cambiar de etapa.',
        progress: Math.min(pet.level, 2),
        target: 2,
        complete: pet.level >= 2,
      },
      {
        title: 'Ahorrador',
        description: 'Junta 75 monedas para la tienda.',
        progress: Math.min(pet.coins, 75),
        target: 75,
        complete: pet.coins >= 75,
      },
    ];
  });

  adoptPet(species: PetSpecies, name: string): void {
    const pet = this.findPet(species);
    const petName = name.trim().slice(0, 18) || pet.displayName;

    this.state.set(this.createInitialState(pet, [`Ha nacido ${petName}, una mascota ${pet.speciesName}.`], petName));
    this.needsOnboarding.set(false);
    this.save();
  }

  tick(): void {
    const now = Date.now();

    this.update((pet) => {
      const elapsedSteps = Math.max(1, Math.floor((now - pet.lastTick) / 4000));
      const hungerLoss = pet.species === 'pipo' ? 3 : 2;
      const hygieneLoss = pet.species === 'mochi' ? 3 : 2;
      const happinessLoss = pet.species === 'luma' ? 2 : 1;
      const next = {
        ...pet,
        age: pet.age + elapsedSteps,
        hunger: clamp(pet.hunger - hungerLoss * elapsedSteps),
        energy: clamp(pet.energy - elapsedSteps),
        happiness: clamp(pet.happiness - happinessLoss * elapsedSteps),
        hygiene: clamp(pet.hygiene - hygieneLoss * elapsedSteps),
        lastTick: now,
      };

      if (next.hunger < 25 || next.hygiene < 25 || next.energy < 15) {
        const healthLoss = pet.species === 'bubu' ? elapsedSteps : 2 * elapsedSteps;
        next.health = clamp(next.health - healthLoss);
      }

      return this.levelUp(next, elapsedSteps);
    });
  }

  feed(): ActionResult {
    const result = { success: true, message: '', xp: 5 };

    this.update((pet) => this.addLog(this.levelUp({
      ...pet,
      hunger: clamp(pet.hunger + 18),
      energy: clamp(pet.energy + 4),
      happiness: clamp(pet.happiness + 5),
      xp: pet.xp + 5,
    }), result.message = `${pet.name} comio un snack casero y quedo satisfecho.`));

    return result;
  }

  play(): ActionResult {
    let result: ActionResult = { success: true, message: '', xp: 8 };

    this.update((pet) => {
      const energyCost = pet.species === 'niko' ? 16 : 12;

      if (pet.energy < energyCost) {
        result = { success: false, message: `${pet.name} esta demasiado cansado para jugar.` };
        return this.addLog(pet, result.message);
      }

      const happinessBonus = pet.species === 'pipo' ? 24 : 18;
      result.message = `${pet.name} jugo en el patio y gano experiencia.`;

      return this.addLog(this.levelUp({
        ...pet,
        happiness: clamp(pet.happiness + happinessBonus),
        energy: clamp(pet.energy - energyCost),
        hygiene: clamp(pet.hygiene - 8),
        hunger: clamp(pet.hunger - 5),
        xp: pet.xp + 8,
      }), result.message);
    });

    return result;
  }

  sleep(): ActionResult {
    const result = { success: true, message: '', xp: 4 };

    this.update((pet) => {
      const healthBonus = pet.species === 'mochi' ? 12 : 7;
      result.message = `${pet.name} durmio una siesta esponjosa.`;

      return this.addLog(this.levelUp({
        ...pet,
        energy: clamp(pet.energy + 26),
        health: clamp(pet.health + healthBonus),
        hunger: clamp(pet.hunger - 6),
        xp: pet.xp + 4,
      }), result.message);
    });

    return result;
  }

  clean(): ActionResult {
    const result = { success: true, message: '', xp: 4 };

    this.update((pet) => this.addLog(this.levelUp({
      ...pet,
      hygiene: clamp(pet.hygiene + 25),
      happiness: clamp(pet.happiness + 4),
      xp: pet.xp + 4,
    }), result.message = `${pet.name} quedo brillante despues del bano.`));

    return result;
  }

  heal(): ActionResult {
    let result: ActionResult = { success: true, message: '', coins: -10 };

    this.update((pet) => {
      if (pet.coins < 10) {
        result = { success: false, message: 'Faltan monedas para visitar la clinica.' };
        return this.addLog(pet, result.message);
      }

      result.message = `${pet.name} paso por la clinica y ya se siente mejor.`;

      return this.addLog({
        ...pet,
        coins: pet.coins - 10,
        health: clamp(pet.health + 22),
        happiness: clamp(pet.happiness - 3),
      }, result.message);
    });

    return result;
  }

  canTrainReflexes(): boolean {
    const pet = this.state();
    const energyCost = pet.species === 'bubu' ? 20 : 18;

    return pet.energy >= energyCost;
  }

  buy(item: InventoryItem): ActionResult {
    let result: ActionResult = { success: true, message: '', coins: -item.price };

    this.update((pet) => {
      if (pet.coins < item.price) {
        result = { success: false, message: `No alcanzan las monedas para ${item.name}.` };
        return this.addLog(pet, result.message);
      }

      result.message = `Compraste ${item.name}.`;

      return this.addLog({
        ...pet,
        coins: pet.coins - item.price,
        inventory: {
          ...pet.inventory,
          [item.key]: pet.inventory[item.key] + 1,
        },
      }, result.message);
    });

    return result;
  }

  useItem(key: InventoryKey): ActionResult {
    let result: ActionResult = { success: true, message: '' };

    this.update((pet) => {
      if (pet.inventory[key] <= 0) {
        result = { success: false, message: 'No queda ese objeto en el inventario.' };
        return this.addLog(pet, result.message);
      }

      const next = {
        ...pet,
        inventory: {
          ...pet.inventory,
          [key]: pet.inventory[key] - 1,
        },
      };

      if (key === 'berry') {
        result = { success: true, message: 'Las bayas desaparecieron en segundos.', xp: 6 };
        return this.addLog(this.levelUp({
          ...next,
          hunger: clamp(next.hunger + 24),
          energy: clamp(next.energy + 8),
          xp: next.xp + 6,
        }), result.message);
      }

      if (key === 'soap') {
        result = { success: true, message: 'Un bano de burbujas cambio el humor de la mascota.', xp: 5 };
        return this.addLog(this.levelUp({
          ...next,
          hygiene: clamp(next.hygiene + 35),
          happiness: clamp(next.happiness + 6),
          xp: next.xp + 5,
        }), result.message);
      }

      if (key === 'medicine') {
        result = { success: true, message: 'El jarabe arcoiris hizo efecto.' };
        return this.addLog({
          ...next,
          health: clamp(next.health + 38),
          energy: clamp(next.energy + 4),
        }, result.message);
      }

      result = { success: true, message: 'La pelota saltarina fue un exito.', xp: 8 };
      return this.addLog(this.levelUp({
        ...next,
        happiness: clamp(next.happiness + 24),
        energy: clamp(next.energy - 4),
        xp: next.xp + 8,
      }), result.message);
    });

    return result;
  }

  trainReflexes(): ActionResult {
    let result: ActionResult = { success: true, message: '' };

    this.update((pet) => {
      const energyCost = pet.species === 'bubu' ? 20 : 18;

      if (pet.energy < energyCost) {
        result = { success: false, message: 'Necesita energia para el minijuego.' };
        return this.addLog(pet, result.message);
      }

      const score = Math.floor(Math.random() * 26) + 10;
      result = this.reflexResult(pet, score);

      return this.applyReflexScore(pet, score, energyCost);
    });

    return result;
  }

  finishReflexGame(score: number): ActionResult {
    let result: ActionResult = { success: true, message: '' };

    this.update((pet) => {
      const energyCost = pet.species === 'bubu' ? 20 : 18;

      if (pet.energy < energyCost) {
        result = { success: false, message: 'Necesita energia para el minijuego.' };
        return this.addLog(pet, result.message);
      }

      result = this.reflexResult(pet, score);

      return this.applyReflexScore(pet, score, energyCost);
    });

    return result;
  }

  reset(): void {
    this.needsOnboarding.set(true);
  }

  private createInitialState(pet: PetDefinition, log: string[], name = pet.displayName): GameState {
    return {
      name,
      species: pet.id,
      coins: 35,
      age: 1,
      level: 1,
      xp: 0,
      ...pet.initialStats,
      inventory: { ...DEFAULT_INVENTORY },
      log,
      lastTick: Date.now(),
    };
  }

  private update(project: (state: GameState) => GameState): void {
    this.state.update((state) => project(state));
    this.save();
  }

  private levelUp(pet: GameState, xpBonus = 0): GameState {
    let next = { ...pet, xp: pet.xp + xpBonus };
    let leveled = false;

    while (next.xp >= this.xpThreshold(next)) {
      next = {
        ...next,
        xp: next.xp - this.xpThreshold(next),
        level: next.level + 1,
        coins: next.coins + 25,
        health: clamp(next.health + 10),
      };
      leveled = true;
    }

    return leveled ? this.addLog(next, `${next.name} subio a nivel ${next.level} y evoluciono un poco.`) : next;
  }

  private addLog(pet: GameState, entry: string): GameState {
    return {
      ...pet,
      log: [entry, ...pet.log].slice(0, 7),
    };
  }

  private xpThreshold(pet: Pick<GameState, 'level' | 'species'>): number {
    const thresholdModifier = pet.species === 'luma' ? 0.85 : 1;

    return Math.round(pet.level * 100 * thresholdModifier);
  }

  private applyReflexScore(pet: GameState, score: number, energyCost: number): GameState {
    const result = this.reflexResult(pet, score);

    return this.addLog(this.levelUp({
      ...pet,
      coins: pet.coins + (result.coins ?? 0),
      energy: clamp(pet.energy - energyCost),
      happiness: clamp(pet.happiness + 10 + Math.min(score, 12)),
      hunger: clamp(pet.hunger - 6),
      xp: pet.xp + (result.xp ?? 0),
    }), result.message);
  }

  private reflexResult(pet: GameState, score: number): ActionResult {
    const coinMultiplier = pet.species === 'niko' ? 2 : 1;
    const coins = Math.floor(score / 3) * coinMultiplier;
    const xp = pet.species === 'luma' ? score + 10 : score;

    return {
      success: true,
      message: `${pet.name} atrapo ${score} luciernagas y gano ${coins} monedas.`,
      coins,
      xp,
    };
  }

  private loadState(): GameState {
    const fallbackPet = randomPet();

    if (typeof localStorage === 'undefined') {
      return this.createInitialState(fallbackPet, [`Ha nacido ${fallbackPet.displayName}.`]);
    }

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return this.createInitialState(fallbackPet, [`Ha nacido ${fallbackPet.displayName}.`]);
    }

    try {
      const parsed = JSON.parse(saved) as Partial<GameState>;
      const species = this.findPet(parsed.species);

      return {
        ...this.createInitialState(species, parsed.log ?? [`Ha nacido ${species.displayName}.`]),
        ...parsed,
        name: parsed.name ?? species.displayName,
        species: species.id,
        inventory: {
          ...DEFAULT_INVENTORY,
          ...parsed.inventory,
        },
        lastTick: parsed.lastTick ?? Date.now(),
      };
    } catch {
      return this.createInitialState(fallbackPet, [`Ha nacido ${fallbackPet.displayName}.`]);
    }
  }

  private findPet(species?: PetSpecies): PetDefinition {
    return PETS.find((pet) => pet.id === species) ?? PETS[0];
  }

  private save(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    }
  }
}

function randomPet(): PetDefinition {
  return PETS[Math.floor(Math.random() * PETS.length)];
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function hasSavedState(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null;
}
