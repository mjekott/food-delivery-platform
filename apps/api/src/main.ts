import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody is needed to verify Paystack webhook signatures.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors();
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 6000;

  await app.listen(port);
  console.log(`Server is running on http://localhost:${port}`);
}
void bootstrap();
