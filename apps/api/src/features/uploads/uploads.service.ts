import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { UTApi } from 'uploadthing/server';

@Injectable()
export class UploadsService {
  private readonly utapi = new UTApi();

  async uploadImage(file: Express.Multer.File): Promise<string> {
    const upload = new File([new Uint8Array(file.buffer)], file.originalname, {
      type: file.mimetype,
    });

    const result = await this.utapi.uploadFiles(upload);

    if (result.error || !result.data) {
      throw new InternalServerErrorException('Image upload failed');
    }

    return result.data.ufsUrl;
  }
}
