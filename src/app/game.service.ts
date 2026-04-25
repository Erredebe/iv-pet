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
  progress: GameProgress;
  achievements: string[];
  log: string[];
  lastTick: number;
}

interface GameProgress {
  actionsDone: number;
  itemsBought: number;
  itemsUsed: number;
  gamesPlayed: number;
  firefliesCaught: number;
  goldFirefliesCaught: number;
  bestCombo: number;
}

export interface ActionResult {
  success: boolean;
  message: string;
  coins?: number;
  xp?: number;
  leveledUp?: boolean;
  evolved?: boolean;
  stageName?: string;
  achievements?: string[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  complete: boolean;
  reward: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
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

const DEFAULT_PROGRESS: GameProgress = {
  actionsDone: 0,
  itemsBought: 0,
  itemsUsed: 0,
  gamesPlayed: 0,
  firefliesCaught: 0,
  goldFirefliesCaught: 0,
  bestCombo: 0,
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

  readonly goals = computed<Mission[]>(() => {
    const pet = this.state();
    const care = this.averageCare();

    return [
      {
        id: 'care-80',
        title: 'Cuidador atento',
        description: 'Mantén el cuidado medio sobre 80%.',
        progress: Math.min(care, 80),
        target: 80,
        complete: care >= 80,
        reward: '+ cuidado estable',
      },
      {
        id: 'level-2',
        title: 'Primera evolución',
        description: 'Sube a nivel 2 para cambiar de etapa.',
        progress: Math.min(pet.level, 2),
        target: 2,
        complete: pet.level >= 2,
        reward: 'nueva etapa',
      },
      {
        id: 'coins-75',
        title: 'Ahorrador',
        description: 'Junta 75 monedas para la tienda.',
        progress: Math.min(pet.coins, 75),
        target: 75,
        complete: pet.coins >= 75,
        reward: '+ opciones',
      },
      {
        id: 'actions-12',
        title: 'Rutina arcade',
        description: 'Realiza 12 acciones exitosas.',
        progress: Math.min(pet.progress.actionsDone, 12),
        target: 12,
        complete: pet.progress.actionsDone >= 12,
        reward: '+ práctica',
      },
      {
        id: 'fireflies-30',
        title: 'Cazachispas',
        description: 'Atrapa 30 luciérnagas en minijuegos.',
        progress: Math.min(pet.progress.firefliesCaught, 30),
        target: 30,
        complete: pet.progress.firefliesCaught >= 30,
        reward: '+ reflejos',
      },
      {
        id: 'combo-8',
        title: 'Combo x8',
        description: 'Logra un combo de 8 en luciérnagas.',
        progress: Math.min(pet.progress.bestCombo, 8),
        target: 8,
        complete: pet.progress.bestCombo >= 8,
        reward: 'rango arcade',
      },
    ];
  });

  readonly achievements = computed<Achievement[]>(() => {
    const state = this.state();
    const unlocked = new Set(state.achievements);
    const definitions = this.achievementDefinitions(state);

    return definitions.map((achievement) => ({
      ...achievement,
      unlocked: unlocked.has(achievement.id),
    }));
  });

  readonly evolutionProgress = computed(() => {
    const pet = this.state();
    const nextLevel = pet.level < 2 ? 2 : pet.level < 4 ? 4 : 6;
    const nextStage = pet.level < 2 ? this.pet().stages[1] : pet.level < 4 ? this.pet().stages[2] : 'Maestro arcade';

    return {
      currentStage: this.stage().name,
      nextStage,
      nextLevel,
      complete: pet.level >= 4,
    };
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
    let result: ActionResult = { success: true, message: '', xp: 5 };

    this.update((pet) => this.withResult(this.addLog(this.levelUp({
      ...pet,
      progress: this.bumpProgress(pet.progress, 'actionsDone'),
      hunger: clamp(pet.hunger + 18),
      energy: clamp(pet.energy + 4),
      happiness: clamp(pet.happiness + 5),
      xp: pet.xp + 5,
    }), result.message = `${pet.name} comio un snack casero y quedo satisfecho.`), pet, result));

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

      return this.withResult(this.addLog(this.levelUp({
        ...pet,
        progress: this.bumpProgress(pet.progress, 'actionsDone'),
        happiness: clamp(pet.happiness + happinessBonus),
        energy: clamp(pet.energy - energyCost),
        hygiene: clamp(pet.hygiene - 8),
        hunger: clamp(pet.hunger - 5),
        xp: pet.xp + 8,
      }), result.message), pet, result);
    });

    return result;
  }

  sleep(): ActionResult {
    const result = { success: true, message: '', xp: 4 };

    this.update((pet) => {
      const healthBonus = pet.species === 'mochi' ? 12 : 7;
      result.message = `${pet.name} durmio una siesta esponjosa.`;

      return this.withResult(this.addLog(this.levelUp({
        ...pet,
        progress: this.bumpProgress(pet.progress, 'actionsDone'),
        energy: clamp(pet.energy + 26),
        health: clamp(pet.health + healthBonus),
        hunger: clamp(pet.hunger - 6),
        xp: pet.xp + 4,
      }), result.message), pet, result);
    });

    return result;
  }

  clean(): ActionResult {
    const result = { success: true, message: '', xp: 4 };

    this.update((pet) => this.withResult(this.addLog(this.levelUp({
      ...pet,
      progress: this.bumpProgress(pet.progress, 'actionsDone'),
      hygiene: clamp(pet.hygiene + 25),
      happiness: clamp(pet.happiness + 4),
      xp: pet.xp + 4,
    }), result.message = `${pet.name} quedo brillante despues del bano.`), pet, result));

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

      return this.withResult(this.addLog({
        ...pet,
        progress: this.bumpProgress(pet.progress, 'actionsDone'),
        coins: pet.coins - 10,
        health: clamp(pet.health + 22),
        happiness: clamp(pet.happiness - 3),
      }, result.message), pet, result);
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

      return this.withResult(this.addLog({
        ...pet,
        coins: pet.coins - item.price,
        progress: this.bumpProgress(pet.progress, 'itemsBought'),
        inventory: {
          ...pet.inventory,
          [item.key]: pet.inventory[item.key] + 1,
        },
      }, result.message), pet, result);
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
        return this.withResult(this.addLog(this.levelUp({
          ...next,
          progress: this.bumpProgress(next.progress, 'itemsUsed'),
          hunger: clamp(next.hunger + 24),
          energy: clamp(next.energy + 8),
          xp: next.xp + 6,
        }), result.message), pet, result);
      }

      if (key === 'soap') {
        result = { success: true, message: 'Un bano de burbujas cambio el humor de la mascota.', xp: 5 };
        return this.withResult(this.addLog(this.levelUp({
          ...next,
          progress: this.bumpProgress(next.progress, 'itemsUsed'),
          hygiene: clamp(next.hygiene + 35),
          happiness: clamp(next.happiness + 6),
          xp: next.xp + 5,
        }), result.message), pet, result);
      }

      if (key === 'medicine') {
        result = { success: true, message: 'El jarabe arcoiris hizo efecto.' };
        return this.withResult(this.addLog({
          ...next,
          progress: this.bumpProgress(next.progress, 'itemsUsed'),
          health: clamp(next.health + 38),
          energy: clamp(next.energy + 4),
        }, result.message), pet, result);
      }

      result = { success: true, message: 'La pelota saltarina fue un exito.', xp: 8 };
      return this.withResult(this.addLog(this.levelUp({
        ...next,
        progress: this.bumpProgress(next.progress, 'itemsUsed'),
        happiness: clamp(next.happiness + 24),
        energy: clamp(next.energy - 4),
        xp: next.xp + 8,
      }), result.message), pet, result);
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
      result = this.reflexResult(pet, score, 0, 0);

      return this.applyReflexScore(pet, score, energyCost, 0, 0);
    });

    return result;
  }

  finishReflexGame(score: number, bestCombo = 0, goldCaught = 0): ActionResult {
    let result: ActionResult = { success: true, message: '' };

    this.update((pet) => {
      const energyCost = pet.species === 'bubu' ? 20 : 18;

      if (pet.energy < energyCost) {
        result = { success: false, message: 'Necesita energia para el minijuego.' };
        return this.addLog(pet, result.message);
      }

      result = this.reflexResult(pet, score, bestCombo, goldCaught);

      return this.applyReflexScore(pet, score, energyCost, bestCombo, goldCaught);
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
      progress: { ...DEFAULT_PROGRESS },
      achievements: [],
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

  private withResult(next: GameState, previous: GameState, result: ActionResult): GameState {
    const previousStage = this.stageIndex(previous.level);
    const nextStage = this.stageIndex(next.level);
    const achievements = this.unlockAchievements(next);

    result.leveledUp = next.level > previous.level;
    result.evolved = nextStage > previousStage;
    result.stageName = result.evolved ? this.findPet(next.species).stages[nextStage] : undefined;
    result.achievements = achievements;

    return achievements.length > 0 ? { ...next, achievements: [...next.achievements, ...achievements] } : next;
  }

  private unlockAchievements(state: GameState): string[] {
    const unlocked = new Set(state.achievements);

    return this.achievementDefinitions(state)
      .filter((achievement) => achievement.complete && !unlocked.has(achievement.id))
      .map((achievement) => achievement.id);
  }

  private achievementDefinitions(state: GameState): Array<Omit<Achievement, 'unlocked'> & { complete: boolean }> {
    return [
      {
        id: 'first-care',
        title: 'Primer cuidado',
        description: 'Realiza tu primera acción exitosa.',
        complete: state.progress.actionsDone >= 1,
      },
      {
        id: 'happy-pet',
        title: 'Mascota radiante',
        description: 'Alcanza 90% de cuidado medio.',
        complete: this.averageCareFor(state) >= 90,
      },
      {
        id: 'combo-5',
        title: 'Combo x5',
        description: 'Logra combo x5 en luciérnagas.',
        complete: state.progress.bestCombo >= 5,
      },
      {
        id: 'gold-hunter',
        title: 'Cazador dorado',
        description: 'Atrapa una luciérnaga dorada.',
        complete: state.progress.goldFirefliesCaught >= 1,
      },
      {
        id: 'collector',
        title: 'Coleccionista',
        description: 'Compra 6 objetos de la tienda.',
        complete: state.progress.itemsBought >= 6,
      },
      {
        id: 'evolution-1',
        title: 'Evolución I',
        description: 'Alcanza la segunda etapa.',
        complete: state.level >= 2,
      },
      {
        id: 'evolution-2',
        title: 'Evolución II',
        description: 'Alcanza la tercera etapa.',
        complete: state.level >= 4,
      },
      {
        id: 'rich-pet',
        title: 'Tesoro arcade',
        description: 'Junta 150 monedas.',
        complete: state.coins >= 150,
      },
    ];
  }

  private averageCareFor(pet: GameState): number {
    return Math.round((pet.hunger + pet.energy + pet.happiness + pet.hygiene + pet.health) / 5);
  }

  private bumpProgress(progress: GameProgress, key: keyof GameProgress, amount = 1): GameProgress {
    return {
      ...progress,
      [key]: progress[key] + amount,
    };
  }

  private stageIndex(level: number): number {
    return level >= 4 ? 2 : level >= 2 ? 1 : 0;
  }

  private xpThreshold(pet: Pick<GameState, 'level' | 'species'>): number {
    const thresholdModifier = pet.species === 'luma' ? 0.85 : 1;

    return Math.round(pet.level * 100 * thresholdModifier);
  }

  private applyReflexScore(pet: GameState, score: number, energyCost: number, bestCombo: number, goldCaught: number): GameState {
    const result = this.reflexResult(pet, score, bestCombo, goldCaught);

    return this.withResult(this.addLog(this.levelUp({
      ...pet,
      coins: pet.coins + (result.coins ?? 0),
      energy: clamp(pet.energy - energyCost),
      happiness: clamp(pet.happiness + 10 + Math.min(score, 12)),
      hunger: clamp(pet.hunger - 6),
      xp: pet.xp + (result.xp ?? 0),
      progress: {
        ...pet.progress,
        gamesPlayed: pet.progress.gamesPlayed + 1,
        firefliesCaught: pet.progress.firefliesCaught + score,
        goldFirefliesCaught: pet.progress.goldFirefliesCaught + goldCaught,
        bestCombo: Math.max(pet.progress.bestCombo, bestCombo),
      },
    }), result.message), pet, result);
  }

  private reflexResult(pet: GameState, score: number, bestCombo: number, goldCaught: number): ActionResult {
    const coinMultiplier = pet.species === 'niko' ? 2 : 1;
    const comboBonus = Math.floor(bestCombo / 3);
    const coins = (Math.floor(score / 3) + comboBonus + goldCaught * 2) * coinMultiplier;
    const xp = (pet.species === 'luma' ? score + 10 : score) + bestCombo;

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
        progress: {
          ...DEFAULT_PROGRESS,
          ...parsed.progress,
        },
        achievements: parsed.achievements ?? [],
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
