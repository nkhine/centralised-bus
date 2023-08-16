import * as fs from 'fs';
import { EventPattern } from 'aws-cdk-lib/aws-events';
import * as YAML from 'yaml';

export interface RepoEntry {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  readonly path: string;
  readonly pipelineName: string;
}

export interface Env {
  readonly name: string;
  readonly account: string;
  readonly region: string;
}

export interface BaseAppConfig {
  readonly env: Env;
}

export interface CicdStackConfig extends BaseAppConfig {
  readonly repo: RepoEntry;
  readonly githubTokenArn: string;
}

export interface Destination {
  // Name is used to identify a destination in the CDK stack.
  // It should not contain any spaces
  // Within a type of destination, The name of destination should be unique
  readonly name: string;
  arn: string;
  // TODO: Figure out filters format
  readonly filter: EventPattern;
  readonly attachTo: AttachTo;
}

export enum AttachTo {
  CustomBus = 'CustomBus',
  DefaultBus = 'DefaultBus',
}

export interface Rules {
  [ruleName: string]: Rule;
}

export interface Rule {
  readonly description: string;
  readonly destinations: Destinations;
  readonly attachTo: AttachTo;
}

export interface Destinations {
  // TODO: Figure out format of each type of rule
  sqs?: Destination[];

  // Cross account lambda destination is not possible
  // https://repost.aws/questions/QUgJg4LwdIRP2jTZCiPgnPyg/invoke-a-lambda-function-cross-account-from-event-bridge
  lambda?: Destination[];
  bus?: Destination[];
}

export interface AppEnvConfig extends BaseAppConfig {
  readonly vpc: VpcConfig;
  readonly codepipeline: {
    readonly logsAccountEventBusArn: string;
  };
  readonly accounts: {
    readonly env: Env;
    readonly rules?: Rules;
  }[];
}

export interface VpcConfig {
  readonly cidr: string;
  readonly maxAzs: number;
}

export class Config {
  readonly cicd: CicdStackConfig;
  readonly production: AppEnvConfig;
  readonly sharedRules?: Rules;

  constructor(fileName?: string) {
    const filename = fileName || 'config.yml';
    const file = fs.readFileSync(filename, 'utf-8');

    const yaml = YAML.parse(file);
    this.cicd = yaml.cicd;
    this.production = yaml.production;
    this.sharedRules = yaml.sharedRules;

    console.log(JSON.stringify(this, null, ' '));
  }
}
