import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

// Ensure BigInts serialize automatically to JSON string
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

async function bootstrap() {
  const logger = new Logger('AskrEV_API');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`=================================================`);
  logger.log(`  🚀 ASKR EV API Backend Running on http://localhost:${port}/api`);
  logger.log(`  ⚡ Mode: ${process.env.COMPLIANCE_MODE || 'SIMULATION_ONLY'}`);
  logger.log(`  🔒 Live Payouts: ${process.env.ENABLE_LIVE_PAYOUTS === 'true' ? 'ENABLED' : 'DISABLED (SECURE)'}`);
  logger.log(`=================================================`);
}

bootstrap();
