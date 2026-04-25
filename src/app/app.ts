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
}
