import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';

/** Sets the `message` field of the transformed API response for a route. */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
