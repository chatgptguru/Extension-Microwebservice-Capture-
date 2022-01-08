import { Connection } from 'mongoose';
import { DATABASE_CONNECTION, ISSUE_MODEL} from './database.constants';
import { createIssueModel } from './issue.model';

export const databaseModelsProviders = [
  {
    provide: ISSUE_MODEL,
    useFactory: (connection: Connection) => createIssueModel(connection),
    inject: [DATABASE_CONNECTION],
  }
];
