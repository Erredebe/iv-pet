import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { GameService } from './game.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  protected readonly game = inject(GameService);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.game.tick();
    this.timer = setInterval(() => this.game.tick(), 4000);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
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
    } else if (action === 'play') {
      this.game.play();
    } else if (action === 'sleep') {
      this.game.sleep();
    } else if (action === 'clean') {
      this.game.clean();
    } else if (action === 'heal') {
      this.game.heal();
    } else if (action === 'trainReflexes') {
      this.game.trainReflexes();
    }
  }
}
