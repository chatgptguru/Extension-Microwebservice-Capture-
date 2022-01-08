import { Controller, Get, Inject } from '@nestjs/common';
import { AppService, Movie } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,
    ) {}

  @Get()
  getMovies(): Movie[] {
    return this.appService.getMovies();
  }
  
}
