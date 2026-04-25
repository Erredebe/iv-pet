import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActionResult, GameService, PetSpecies } from './game.service';

type InventoryAction = 'berry' | 'soap' | 'medicine' | 'ball';
type ActionName = 'feed' | 'play' | 'sleep' | 'clean' | 'heal' | InventoryAction;
type FireflyType = 'normal' | 'gold' | 'trick';
type ShopAction = { key: InventoryAction; name: string; icon: string; description: string; price: number };

interface Firefly {
  id: number;
  type: FireflyType;
  x: number;
  y: number;
  delay: number;
}

interface ArcadeParticle {
  id: number;
  label: string;
  x: number;
  y: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly game = inject(GameService);
  private timer?: ReturnType<typeof setInterval>;
  private actionTimer?: ReturnType<typeof setTimeout>;
  private feedbackTimer?: ReturnType<typeof setTimeout>;
  private miniGameTimer?: ReturnType<typeof setInterval>;
  private comboTimer?: ReturnType<typeof setTimeout>;
  private fireflyId = 0;
  private particleId = 0;

  protected activeAction?: ActionName;
  protected actionScene = 'idle';
  protected actionPhase = 0;
  protected arcadeParticles: ArcadeParticle[] = [];
  protected feedback?: ActionResult;
  protected miniGameActive = false;
  protected miniGameFinished = false;
  protected miniGameResult?: ActionResult;
  protected miniGameScore = 0;
  protected miniGameTime = 0;
  protected miniGameCombo = 0;
  protected miniGameBestCombo = 0;
  protected miniGameRank = 'Aprendiz nocturno';
  protected fireflies: Firefly[] = [];
  protected selectedSpecies: PetSpecies = this.game.state().species;
  protected petName = this.game.state().name;
  protected confirmReset = false;

  ngOnInit(): void {
    this.game.tick();
    this.timer = setInterval(() => {
      if (!this.miniGameActive) {
        this.game.tick();
      }
    }, 4000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearTimeout(this.actionTimer);
    clearTimeout(this.feedbackTimer);
    clearTimeout(this.comboTimer);
    clearInterval(this.miniGameTimer);
  }

  protected statLevel(value: number): string {
    if (value < 30) {
      return 'low';
    }

    if (value < 60) {
      return 'mid';
    }

    return 'high';
  }

  protected petCondition(): string {
    const pet = this.game.state();

    if (pet.health < 35) {
      return 'sick';
    }

    if (pet.energy < 30) {
      return 'tired';
    }

    if (pet.hygiene < 35) {
      return 'messy';
    }

    if (pet.hunger < 35) {
      return 'hungry';
    }

    if (this.game.averageCare() >= 80) {
      return 'hype';
    }

    return 'idle';
  }

  protected runAction(action: string): void {
    let result: ActionResult | undefined;

    if (action === 'feed') {
      result = this.game.feed();
      this.handleResult('feed', result);
    } else if (action === 'play') {
      result = this.game.play();
      this.handleResult('play', result);
    } else if (action === 'sleep') {
      result = this.game.sleep();
      this.handleResult('sleep', result);
    } else if (action === 'clean') {
      result = this.game.clean();
      this.handleResult('clean', result);
    } else if (action === 'heal') {
      result = this.game.heal();
      this.handleResult('heal', result);
    } else if (action === 'trainReflexes') {
      this.startReflexGame();
    }
  }

  protected buy(item: ShopAction): void {
    this.showFeedback(this.game.buy(item));
  }

  protected useItem(key: InventoryAction): void {
    this.handleResult(key, this.game.useItem(key));
  }

  protected catchFirefly(id: number): void {
    if (!this.miniGameActive) {
      return;
    }

    const firefly = this.fireflies.find((item) => item.id === id);

    if (!firefly) {
      return;
    }

    if (firefly.type === 'trick') {
      this.miniGameCombo = 0;
      this.miniGameTime = Math.max(1, this.miniGameTime - 1);
      this.spawnParticle('¡Trampa!', firefly.x, firefly.y);
    } else {
      this.miniGameCombo += 1;
      this.miniGameBestCombo = Math.max(this.miniGameBestCombo, this.miniGameCombo);

      const base = firefly.type === 'gold' ? 5 : 1;
      const comboBonus = Math.floor(this.miniGameCombo / 4);
      const points = base + comboBonus;
      this.miniGameScore += points;
      this.spawnParticle(firefly.type === 'gold' ? `+${points} dorada` : `+${points}`, firefly.x, firefly.y);
    }

    clearTimeout(this.comboTimer);
    this.comboTimer = setTimeout(() => {
      this.miniGameCombo = 0;
    }, 1400);

    this.fireflies = [...this.fireflies.filter((firefly) => firefly.id !== id), this.createFirefly()];
  }

  protected closeMiniGameResult(): void {
    this.miniGameFinished = false;
    this.miniGameResult = undefined;
  }

  protected selectPet(species: PetSpecies): void {
    this.selectedSpecies = species;
  }

  protected updatePetName(event: Event): void {
    this.petName = (event.target as HTMLInputElement).value;
  }

  protected adoptSelectedPet(): void {
    this.game.adoptPet(this.selectedSpecies, this.petName);
    this.petName = this.game.state().name;
    this.confirmReset = false;
    this.showFeedback({ success: true, message: `${this.game.state().name} ya forma parte de tu equipo.` });
  }

  protected requestReset(): void {
    this.confirmReset = true;
  }

  protected cancelReset(): void {
    this.confirmReset = false;
  }

  protected confirmNewPet(): void {
    this.confirmReset = false;
    this.game.reset();
  }

  private handleResult(action: ActionName, result: ActionResult): void {
    this.showFeedback(result);

    if (result.success) {
      this.playAction(action);
    }
  }

  private showFeedback(result: ActionResult): void {
    this.feedback = result;
    clearTimeout(this.feedbackTimer);
    this.feedbackTimer = setTimeout(() => {
      this.feedback = undefined;
    }, 2200);
  }

  private playAction(action: ActionName): void {
    this.activeAction = action;
    this.actionScene = this.sceneForAction(action);
    this.actionPhase += 1;
    this.spawnActionParticles(action);
    clearTimeout(this.actionTimer);
    this.actionTimer = setTimeout(() => {
      this.activeAction = undefined;
      this.actionScene = 'idle';
    }, 1200);
  }

  private startReflexGame(): void {
    if (!this.game.canTrainReflexes()) {
      this.showFeedback(this.game.trainReflexes());
      return;
    }

    clearInterval(this.miniGameTimer);
    this.miniGameActive = true;
    this.miniGameFinished = false;
    this.miniGameResult = undefined;
    this.miniGameScore = 0;
    this.miniGameCombo = 0;
    this.miniGameBestCombo = 0;
    this.miniGameRank = 'Aprendiz nocturno';
    this.miniGameTime = 12;
    this.fireflies = Array.from({ length: 6 }, () => this.createFirefly());

    this.miniGameTimer = setInterval(() => {
      this.miniGameTime -= 1;

      if (this.miniGameTime <= 0) {
        this.finishReflexGame();
      }
    }, 1000);
  }

  private finishReflexGame(): void {
    clearInterval(this.miniGameTimer);
    clearTimeout(this.comboTimer);
    this.miniGameActive = false;
    this.fireflies = [];
    this.miniGameRank = this.rankForScore(this.miniGameScore);
    this.miniGameResult = this.game.finishReflexGame(this.miniGameScore);
    this.miniGameFinished = true;
    this.showFeedback(this.miniGameResult);

    if (this.miniGameResult.success) {
      this.playAction('play');
    }
  }

  private createFirefly(): Firefly {
    this.fireflyId += 1;
    const roll = Math.random();

    return {
      id: this.fireflyId,
      type: roll > 0.9 ? 'trick' : roll > 0.75 ? 'gold' : 'normal',
      x: Math.floor(Math.random() * 78) + 8,
      y: Math.floor(Math.random() * 70) + 12,
      delay: Math.random() * 0.8,
    };
  }

  private sceneForAction(action: ActionName): string {
    if (action === 'feed' || action === 'berry') {
      return 'kitchen';
    }

    if (action === 'play' || action === 'ball') {
      return 'playground';
    }

    if (action === 'sleep') {
      return 'night';
    }

    if (action === 'clean' || action === 'soap') {
      return 'bath';
    }

    return 'clinic';
  }

  private spawnActionParticles(action: ActionName): void {
    const labels: Record<ActionName, string[]> = {
      feed: ['+Hambre', 'Ñam', '+XP'],
      play: ['Combo', '+Feliz', '+XP'],
      sleep: ['Zzz', '+Energía', '+Salud'],
      clean: ['Splash', '+Higiene', 'Brillo'],
      heal: ['+Salud', '-10', 'Pulso OK'],
      berry: ['Baya', '+Hambre', '+XP'],
      soap: ['Burbuja', '+Higiene', '+XP'],
      medicine: ['Jarabe', '+Salud', 'OK'],
      ball: ['Rebote', '+Feliz', '+XP'],
    };

    labels[action].forEach((label, index) => this.spawnParticle(label, 22 + index * 26, 28 + index * 13));
  }

  private spawnParticle(label: string, x: number, y: number): void {
    this.particleId += 1;
    const id = this.particleId;
    this.arcadeParticles = [...this.arcadeParticles, { id, label, x, y }];
    setTimeout(() => {
      this.arcadeParticles = this.arcadeParticles.filter((particle) => particle.id !== id);
    }, 900);
  }

  private rankForScore(score: number): string {
    if (score >= 45) {
      return 'Leyenda nocturna';
    }

    if (score >= 28) {
      return 'Brillante';
    }

    if (score >= 14) {
      return 'Cazachispas';
    }

    return 'Aprendiz nocturno';
  }
}
