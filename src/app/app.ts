import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActionResult, GameService, PetSpecies } from './game.service';

type InventoryAction = 'berry' | 'soap' | 'medicine' | 'ball';
type ActionName = 'feed' | 'play' | 'sleep' | 'clean' | 'heal' | InventoryAction;
type ShopAction = { key: InventoryAction; name: string; icon: string; description: string; price: number };

interface Firefly {
  id: number;
  x: number;
  y: number;
  delay: number;
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
  private fireflyId = 0;

  protected activeAction?: ActionName;
  protected feedback?: ActionResult;
  protected miniGameActive = false;
  protected miniGameFinished = false;
  protected miniGameResult?: ActionResult;
  protected miniGameScore = 0;
  protected miniGameTime = 0;
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

    this.miniGameScore += 1;
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
    clearTimeout(this.actionTimer);
    this.actionTimer = setTimeout(() => {
      this.activeAction = undefined;
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
    this.miniGameTime = 12;
    this.fireflies = Array.from({ length: 5 }, () => this.createFirefly());

    this.miniGameTimer = setInterval(() => {
      this.miniGameTime -= 1;

      if (this.miniGameTime <= 0) {
        this.finishReflexGame();
      }
    }, 1000);
  }

  private finishReflexGame(): void {
    clearInterval(this.miniGameTimer);
    this.miniGameActive = false;
    this.fireflies = [];
    this.miniGameResult = this.game.finishReflexGame(this.miniGameScore);
    this.miniGameFinished = true;
    this.showFeedback(this.miniGameResult);

    if (this.miniGameResult.success) {
      this.playAction('play');
    }
  }

  private createFirefly(): Firefly {
    this.fireflyId += 1;

    return {
      id: this.fireflyId,
      x: Math.floor(Math.random() * 78) + 8,
      y: Math.floor(Math.random() * 70) + 12,
      delay: Math.random() * 0.8,
    };
  }
}
