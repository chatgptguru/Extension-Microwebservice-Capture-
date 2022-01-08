import { Connection, Document, Model, Schema, SchemaTypes } from 'mongoose';
import { Issue } from 'src/issues/issues.dto';

type IssueModel = Model<Issue>;

const IssueSchema = new Schema<Issue>(
  {
    title: SchemaTypes.String,
    description: SchemaTypes.String,
    project: SchemaTypes.String,
    logs: {
      target_html: SchemaTypes.String,
      log_data: SchemaTypes.Array,
      system_info: SchemaTypes.Array,
      console_logs: SchemaTypes.String,
      network_logs: SchemaTypes.Array,
      local_storage: SchemaTypes.Array,
      event_logs: SchemaTypes.Array
    },
    metadata: {
      browser: SchemaTypes.String,
      url: SchemaTypes.String,
      page_title: SchemaTypes.String,
      html_selector: SchemaTypes.String,
      os: SchemaTypes.String,
      window: SchemaTypes.String,
      viewport: SchemaTypes.String,
      screen_size: SchemaTypes.String,
      target_selector: SchemaTypes.String,
      locale: SchemaTypes.String,
    },
    extra_properties: {},
    screenshot: SchemaTypes.String,
    video: SchemaTypes.String,
    event_by_tabs: {},
  },
  {
    timestamps: true
  },
);

const createIssueModel: (conn: Connection) => IssueModel = (conn: Connection) =>
  conn.model<Issue>('Issue', IssueSchema, 'issues');

export { Issue, IssueModel, createIssueModel };
