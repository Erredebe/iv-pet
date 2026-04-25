import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { GameService } from './game.service';

type InventoryAction = 'berry' | 'soap' | 'medicine' | 'ball';
type ActionName = 'feed' | 'play' | 'sleep' | 'clean' | 'heal' | InventoryAction;

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
  private miniGameTimer?: ReturnType<typeof setInterval>;
  private fireflyId = 0;

  protected activeAction?: ActionName;
  protected miniGameActive = false;
  protected miniGameScore = 0;
  protected miniGameTime = 0;
  protected fireflies: Firefly[] = [];

  ngOnInit(): void {
    this.game.tick();
    this.timer = setInterval(() => this.game.tick(), 4000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    clearTimeout(this.actionTimer);
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
    if (action === 'feed') {
      this.game.feed();
      this.playAction('feed');
    } else if (action === 'play') {
      this.game.play();
      this.playAction('play');
    } else if (action === 'sleep') {
      this.game.sleep();
      this.playAction('sleep');
    } else if (action === 'clean') {
      this.game.clean();
      this.playAction('clean');
    } else if (action === 'heal') {
      this.game.heal();
      this.playAction('heal');
    } else if (action === 'trainReflexes') {
      this.startReflexGame();
    }
  }

  protected useItem(key: InventoryAction): void {
    this.game.useItem(key);
    this.playAction(key);
  }

  protected catchFirefly(id: number): void {
    if (!this.miniGameActive) {
      return;
    }

    this.miniGameScore += 1;
    this.fireflies = [...this.fireflies.filter((firefly) => firefly.id !== id), this.createFirefly()];
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
      this.game.trainReflexes();
      this.playAction('play');
      return;
    }

    clearInterval(this.miniGameTimer);
    this.miniGameActive = true;
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
    this.game.finishReflexGame(this.miniGameScore);
    this.playAction('play');
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
