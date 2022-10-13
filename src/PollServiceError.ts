import { IPollServiceProps } from './typings/IPollServiceProps';

export class PollServiceError extends Error {
  constructor(props: IPollServiceProps) {
    const { message, serviceName = 'default' } = props;
    super(message);

    this.name = `PollServiceError:${serviceName}`;
  }
}